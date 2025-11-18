const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Demo user
  const passwordHash = await bcrypt.hash('demo1234', 10);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@videokurs.com' },
    update: {},
    create: {
      email: 'demo@videokurs.com',
      name: 'Demo Kullanıcı',
      password: passwordHash
    }
  });

  // Course + modules
  const course = await prisma.course.upsert({
    where: { slug: 'ai-agent-egitimi' },
    update: {
      title: 'AI Agent Eğitimi',
      description: 'Yapay zeka asistanları geliştirmek için kapsamlı eğitim',
      price: 997
    },
    create: {
      title: 'AI Agent Eğitimi',
      slug: 'ai-agent-egitimi',
      description: 'Yapay zeka asistanları geliştirmek için kapsamlı eğitim',
      price: 997
    }
  });

  const modules = [
    { title: 'Hoş Geldiniz', order: 1, videoFile: 'welcome.MP4', duration: 600 },
    { title: 'AI Agent Nedir?', order: 2, videoFile: 'ai-agent-nedir.mp4', duration: 900 },
    { title: 'n8n Nedir ve Neden Kullanıyoruz?', order: 3, videoFile: 'n8n-nedir.mp4', duration: 840 },
    { title: 'OpenAI API Key Temin Edelim', order: 4, videoFile: 'API-hesap-acilimi.mp4', duration: 780 },
    { title: 'n8n Hesap Açılımı', order: 5, videoFile: 'n8n-hesap-acilimi.mp4', duration: 780 },
    { title: 'n8n Arayüzü Keşfedelim ve Trigger’lara Bakalım', order: 6, videoFile: 'n8n-arayuz-trigger.mp4', duration: 780 },
    { title: 'İlk AI Agent’ımızı Yapalım', order: 7, videoFile: 'ilk-ai-agent.mp4', duration: 780 },
    { title: 'Nodeları Keşdefelim', order: 8, videoFile: 'node-kesfet.mp4', duration: 780 },
    { title: 'If ve Switch Yapıları', order: 9, videoFile: 'switch-ve-if.mp4', duration: 780 },
    { title: 'Entegrasyon Bağlantıları (Credentials)', order: 10, videoFile: 'credentials.mp4', duration: 780 },
    { title: 'Workflow Import & Export', order: 11, videoFile: 'workflow-import-export.mp4', duration: 780 },
    { title: 'Egzersiz: Email yollayan Marketing AI Agent', order: 12, videoFile: 'egzersiz-email-marketing-agent.mp4', duration: 780 },
    { title: 'API Nasıl Çalışır?', order: 13, videoFile: 'API-nedir-ve-nasil-calisir.mp4', duration: 780 },
    { title: 'Telegram nasıl bağlanır?', order: 14, videoFile: 'telegram-nasil-baglanir.mp4', duration: 780 },
    { title: 'Proje Tanımı', order: 15, videoFile: 'bolum-uc-proje-tanimi.mp4', duration: 780 },
    { title: 'Telegram Trigger ve AI Agent', order: 16, videoFile: 'telegram-trigger-ve-ai-agent.mp4', duration: 780 },
    { title: 'Tool Entegrasyonları', order: 17, videoFile: 'tool-entegrasyonlari-ve-testler.mp4', duration: 780 },
    { title: 'Mail Yollaması ve Testler', order: 18, videoFile: 'mail-ve-testler.mp4', duration: 780 },



  ];

  await prisma.courseModule.deleteMany({ where: { courseId: course.id } });
  await prisma.courseModule.createMany({
    data: modules.map((module) => ({
      ...module,
      courseId: course.id
    }))
  });

  // Belirli erişim kodları (tire olmadan kaydedilecek)
  const accessCodes = [
    '001201150',
    '002341150',
    '003285393',
    '004505343',
    '005132222',
    '006493232',
    '007494285',
    '008590254',
    '009954237',
    '010858595',
    '011494303',
    '012492242'
  ];

  // Kodları veritabanına ekle
  for (const code of accessCodes) {
    await prisma.accessCode.upsert({
      where: { code },
      update: {},
      create: {
        code: code,
        courseId: course.id,
        maxUses: null, // Sınırsız kullanım
        isActive: true
      }
    });
  }

  console.log('✅ Seed tamamlandı.');
  console.log(`Demo kullanıcı: ${demoUser.email} / demo1234`);
  console.log(`\n📝 Erişim kodları:`);
  accessCodes.forEach((code, index) => {
    const formattedCode = code.match(/.{1,3}/g).join('-');
    console.log(`  ${index + 1}. ${formattedCode}`);
  });
}

main()
  .catch((error) => {
    console.error('Seed hatası:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

