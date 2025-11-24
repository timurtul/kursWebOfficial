const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'WUkOFXQ0+5Z6lf8WPfaJKYhfjQ2EbwGxgMz82FWJkx0=PORT=3000';
const VIDEO_DIR = path.join(__dirname, 'videos'); // Local video fallback
const prisma = new PrismaClient();

// AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files serving (HTML, CSS, JS dosyaları için)
app.use(express.static(__dirname));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100 // Her IP için maksimum 100 istek
});

// Video stream'leri yüksek istek ürettiği için limiter'dan muaf tut
app.use('/api', (req, res, next) => {
  if (/^\/courses\/\d+\/videos\//.test(req.path)) {
    return next();
  }
  return generalLimiter(req, res, next);
});

// Kod doğrulama için özel rate limiting (brute force koruması)
const codeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 10, // Her IP için maksimum 10 kod denemesi
  message: 'Çok fazla deneme yaptınız. Lütfen 15 dakika sonra tekrar deneyin.'
});

// Video klasörünü oluştur (yoksa)
if (!fs.existsSync(VIDEO_DIR)) {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

// Prisma ile Postgres bağlantısı (ENV üzerinden)

// JWT Token doğrulama middleware
// Video tag'leri Authorization header gönderemediği için query parameter'dan da token okuyoruz
const authenticateToken = (req, res, next) => {
  // Önce Authorization header'dan dene
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // Eğer header'da yoksa query parameter'dan al (video tag'leri için)
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Token bulunamadı' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Geçersiz token' });
    }
    req.user = user;
    next();
  });
};

// Kullanıcının kursa erişim hakkı var mı kontrolü (purchase veya access code)
const checkCourseAccess = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const courseId = parseInt(req.params.courseId, 10);

    // Önce purchase kontrolü
    const purchase = await prisma.purchase.findFirst({
      where: {
        userId,
        courseId,
        status: 'COMPLETED'
      }
    });

    if (purchase) {
      return next(); // Purchase varsa erişim var
    }

    // Purchase yoksa, access code kontrolü (session'dan)
    const accessCodeSession = req.user.accessCodeSession || {};
    if (accessCodeSession[courseId]) {
      return next(); // Access code ile erişim var
    }

    return res.status(403).json({ error: 'Bu kursa erişim yetkiniz yok. Lütfen erişim kodu girin veya kursu satın alın.' });
  } catch (error) {
    next(error);
  }
};

// ========== AUTH ENDPOINTS ==========

// Kullanıcı kaydı
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Tüm alanlar zorunludur' });
    }

    // Email kontrolü
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Bu email zaten kayıtlı' });
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      }
    });

    // JWT token oluştur
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Kayıt başarılı',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Kullanıcı girişi
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre gerekli' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Geçersiz email veya şifre' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Geçersiz email veya şifre' });
    }

    // JWT token oluştur
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Erişim kodu doğrulama (authentication olmadan çalışır)
app.post('/api/verify-access-code', codeLimiter, async (req, res) => {
  try {
    const { code, courseId } = req.body;
    
    // Eğer token varsa kullan, yoksa geçici kullanıcı oluştur
    let userId;
    let userEmail = 'guest@videokurs.com';
    
    // Token kontrolü (varsa kullan)
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
        userEmail = decoded.email;
      } catch (err) {
        // Token geçersiz, geçici kullanıcı oluştur
        token = null;
      }
    }
    
    // Token yoksa geçici kullanıcı oluştur
    if (!userId) {
      const tempUser = await prisma.user.create({
        data: {
          email: `guest_${Date.now()}@videokurs.com`,
          password: await bcrypt.hash(Math.random().toString(36), 10),
          name: 'Misafir Kullanıcı'
        }
      });
      userId = tempUser.id;
      userEmail = tempUser.email;
    }

    if (!code || !courseId) {
      return res.status(400).json({ error: 'Kod ve kurs ID gerekli' });
    }

    // Kodu temizle (tire ve boşlukları kaldır)
    const cleanCode = code.replace(/[\s-]/g, '').toUpperCase();

    // Access code'u bul
    const accessCode = await prisma.accessCode.findUnique({
      where: { code: cleanCode },
      include: { course: true }
    });

    if (!accessCode) {
      return res.status(404).json({ error: 'Geçersiz erişim kodu' });
    }

    // Kontroller
    if (!accessCode.isActive) {
      return res.status(403).json({ error: 'Bu kod devre dışı bırakılmış' });
    }

    if (accessCode.expiresAt && new Date() > new Date(accessCode.expiresAt)) {
      return res.status(403).json({ error: 'Bu kodun süresi dolmuş' });
    }

    if (accessCode.maxUses && accessCode.usedCount >= accessCode.maxUses) {
      return res.status(403).json({ error: 'Bu kodun kullanım limiti dolmuş' });
    }

    if (accessCode.courseId !== parseInt(courseId, 10)) {
      return res.status(403).json({ error: 'Bu kod bu kurs için geçerli değil' });
    }

    // Kullanım sayısını artır
    await prisma.accessCode.update({
      where: { id: accessCode.id },
      data: { usedCount: accessCode.usedCount + 1 }
    });

    // Mevcut token'dan accessCodeSession'ı al (varsa)
    let existingAccessCodeSession = {};
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        existingAccessCodeSession = decoded.accessCodeSession || {};
      } catch (err) {
        // Token geçersiz, boş session
      }
    }

    // JWT token'a access code bilgisini ekle
    const newToken = jwt.sign(
      {
        userId,
        email: userEmail,
        accessCodeSession: {
          ...existingAccessCodeSession,
          [courseId]: true
        }
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Erişim kodu doğrulandı',
      token: newToken,
      userId,
      email: userEmail,
      course: {
        id: accessCode.course.id,
        title: accessCode.course.title
      }
    });
  } catch (error) {
    console.error('Access code verification error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ========== COURSE ENDPOINTS ==========

// Tüm kursları listele (public)
app.get('/api/courses', async (req, res) => {
  try {
    const allCourses = await prisma.course.findMany({
      include: {
        modules: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const publicCourses = allCourses.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      price: course.price,
      videoCount: course.modules.length
    }));

    res.json(publicCourses);
  } catch (error) {
    console.error('Courses list error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Kurs detayı (public)
app.get('/api/courses/:courseId', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!course) {
      return res.status(404).json({ error: 'Kurs bulunamadı' });
    }

    res.json({
      id: course.id,
      title: course.title,
      description: course.description,
      price: course.price,
      videoCount: course.modules.length,
      modules: course.modules.map(module => ({
        id: module.id,
        title: module.title,
        order: module.order,
        fileName: module.videoFile
      }))
    });
  } catch (error) {
    console.error('Course detail error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ========== VIDEO STREAMING ENDPOINT ==========

// Güvenli video streaming (token ve erişim kontrolü ile)
// ÖNEMLİ: Video'lar backend üzerinden stream edilir, URL paylaşılsa bile token kontrolü her istekte yapılır
app.get('/api/courses/:courseId/videos/:videoFile', authenticateToken, checkCourseAccess, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const videoFile = req.params.videoFile;

    // Kurs + modüller
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { modules: true }
    });
    if (!course) {
      return res.status(404).json({ error: 'Kurs bulunamadı' });
    }

    const videoFileLower = videoFile.toLowerCase();
    const module = course.modules.find(m => m.videoFile.toLowerCase() === videoFileLower);

    if (!module) {
      return res.status(404).json({ error: 'Video bulunamadı' });
    }

    const matchingFile = module.videoFile;
    const range = req.headers.range;

    // Önce S3'ten stream etmeyi dene
    if (process.env.AWS_S3_BUCKET) {
      try {
        const s3Key = `videos/${matchingFile}`;
        console.log(`[Video Stream] S3'ten video stream ediliyor: ${s3Key}`);
        
        // Range request varsa direkt range ile al
        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : undefined;

          const rangeCommand = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: s3Key,
            Range: end !== undefined ? `bytes=${start}-${end}` : `bytes=${start}-`
          });

          const rangeResponse = await s3Client.send(rangeCommand);
          
          // Content-Range header'ından toplam boyutu al
          const contentRange = rangeResponse.ContentRange;
          const totalSize = contentRange ? parseInt(contentRange.split('/')[1]) : rangeResponse.ContentLength;
          const chunksize = rangeResponse.ContentLength;
          
          console.log(`[Video Stream] S3 Range Response: ${contentRange}, Size: ${chunksize}`);
          
          res.writeHead(206, {
            'Content-Range': contentRange || `bytes ${start}-${start + chunksize - 1}/${totalSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': rangeResponse.ContentType || 'video/mp4',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          });

          // S3 stream'ini response'a pipe et
          rangeResponse.Body.pipe(res);
        } else {
          // Tam video stream
          const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: s3Key
          });

          const s3Response = await s3Client.send(command);
          const contentLength = s3Response.ContentLength;
          const contentType = s3Response.ContentType || 'video/mp4';
          
          console.log(`[Video Stream] S3 Full Response: Size: ${contentLength}, Type: ${contentType}`);
          
          res.writeHead(200, {
            'Content-Length': contentLength,
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          });

          s3Response.Body.pipe(res);
        }

        console.log(`[Video Stream] S3 stream başarılı: ${s3Key}`);
        return; // S3 başarılı, çık
      } catch (s3Error) {
        console.error('[Video Stream] S3 video erişim hatası:', {
          message: s3Error.message,
          code: s3Error.Code || s3Error.code,
          key: `videos/${matchingFile}`,
          error: s3Error
        });
        // S3 başarısız olursa local fallback deneriz
      }
    }

    // Local fallback (videolar videos/ klasöründe)
    console.log(`[Video Stream] Local fallback deneniyor: ${matchingFile}`);
    const videoPath = path.join(VIDEO_DIR, matchingFile);
    if (!fs.existsSync(videoPath)) {
      console.error(`[Video Stream] Video dosyası bulunamadı: ${videoPath}`);
      return res.status(404).json({ 
        error: 'Video dosyası bulunamadı',
        details: `S3'te ve local'de video bulunamadı: ${matchingFile}`
      });
    }
    
    console.log(`[Video Stream] Local video bulundu: ${videoPath}`);

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    console.error('Video stream error:', error);
    res.status(500).json({ error: 'Video yüklenirken hata oluştu' });
  }
});

// ========== PURCHASE ENDPOINTS ==========

// Ödeme başlatma (ödeme sağlayıcınızla entegre edin)
app.post('/api/purchase', authenticateToken, async (req, res) => {
  try {
    const { courseId, paymentMethod } = req.body;
    const userId = req.user.userId;

    if (!courseId) {
      return res.status(400).json({ error: 'Kurs ID gerekli' });
    }

    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId, 10) }
    });
    if (!course) {
      return res.status(404).json({ error: 'Kurs bulunamadı' });
    }

    // Zaten satın alınmış mı kontrol et
    const existingPurchase = await prisma.purchase.findFirst({
      where: {
        userId,
        courseId: course.id,
        status: 'COMPLETED'
      }
    });

    if (existingPurchase) {
      return res.status(400).json({ error: 'Bu kurs zaten satın alınmış' });
    }

    // Ödeme işlemi burada yapılacak (iyzico, paytr, stripe vb.)
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        courseId: course.id,
        amount: course.price,
        status: 'COMPLETED',
        transaction: paymentMethod || 'manual'
      }
    });

    res.json({
      message: 'Satın alma başarılı',
      purchase: {
        id: purchase.id,
        courseId: purchase.courseId,
        amount: purchase.amount,
        status: purchase.status
      }
    });
  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Kullanıcının satın aldığı kursları listele (purchase + access code)
app.get('/api/my-courses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const accessCodeSession = req.user.accessCodeSession || {};
    
    // Purchase'ları al
    const userPurchases = await prisma.purchase.findMany({
      where: {
        userId,
        status: 'COMPLETED'
      },
      include: {
        course: {
          include: { modules: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const purchaseCourseIds = userPurchases.map(p => p.course.id);
    
    // Access code ile erişilen kursları al
    const accessCodeCourseIds = Object.keys(accessCodeSession)
      .map(id => parseInt(id, 10))
      .filter(id => accessCodeSession[id] === true);
    
    // Tüm erişimli kurs ID'lerini birleştir
    const allAccessibleCourseIds = [...new Set([...purchaseCourseIds, ...accessCodeCourseIds])];
    
    // Tüm kursları al
    const allCourses = await prisma.course.findMany({
      where: {
        id: { in: allAccessibleCourseIds }
      },
      include: { modules: true }
    });

    const userCourses = allCourses.map(course => {
      const purchase = userPurchases.find(p => p.courseId === course.id);
      return {
        id: course.id,
        title: course.title,
        description: course.description,
        purchasedAt: purchase ? purchase.createdAt : null,
        videoCount: course.modules.length,
        accessType: purchase ? 'purchase' : 'access_code'
      };
    });

    res.json(userCourses);
  } catch (error) {
    console.error('My courses error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend çalışıyor' });
});

// ========== ROOT ROUTE ==========
// Ana sayfa için root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Statik mikro siteler
const serveStaticPage = (relativePath) => (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, relativePath));
};

app.get(['/links', '/links/'], serveStaticPage(path.join('links', 'index.php')));
app.get(['/risk', '/risk/'], serveStaticPage(path.join('risk', 'index.php')));
app.get(['/yapayzeka', '/yapayzeka/'], serveStaticPage(path.join('yapayzeka', 'index.php')));
app.get(['/egitim', '/egitim/'], serveStaticPage(path.join('egitim', 'index.php')));

// ========== ERROR HANDLING ==========
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Bir hata oluştu' });
});

// Server başlat
const server = app.listen(PORT, () => {
  console.log(`🚀 Backend server ${PORT} portunda çalışıyor`);
  console.log(`📁 Video klasörü: ${VIDEO_DIR}`);
  console.log(`🔐 JWT Secret: ${JWT_SECRET.substring(0, 10)}...`);
});

const gracefulShutdown = async () => {
  console.log('🛑 Sunucu kapatılıyor...');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
