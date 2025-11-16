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
    { title: 'Modül 2', order: 2, videoFile: 'module2.mp4', duration: 900 },
    { title: 'Modül 3', order: 3, videoFile: 'module3.mp4', duration: 840 },
    { title: 'Modül 4', order: 4, videoFile: 'module4.mp4', duration: 780 }
  ];

  await prisma.courseModule.deleteMany({ where: { courseId: course.id } });
  await prisma.courseModule.createMany({
    data: modules.map((module) => ({
      ...module,
      courseId: course.id
    }))
  });

  // Örnek erişim kodu
  await prisma.accessCode.upsert({
    where: { code: '222222222' },
    update: {},
    create: {
      code: '222222222',
      courseId: course.id,
      maxUses: null, // Sınırsız
      isActive: true
    }
  });

  console.log('✅ Seed tamamlandı.');
  console.log(`Demo kullanıcı: ${demoUser.email} / demo1234`);
  console.log(`Erişim kodu: 222-222-222`);
}

main()
  .catch((error) => {
    console.error('Seed hatası:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

