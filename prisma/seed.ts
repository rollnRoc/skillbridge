import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import sql from 'mssql';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

function parseMssqlConfig(url: string): sql.config {
  const withoutScheme = url.replace(/^sqlserver:\/\//, '');
  const parts = withoutScheme.split(';');
  const [host, portStr] = parts[0].split(':');
  const params: Record<string, string> = {};
  for (const part of parts.slice(1)) {
    const eqIdx = part.indexOf('=');
    if (eqIdx !== -1) {
      params[part.slice(0, eqIdx).toLowerCase()] = part.slice(eqIdx + 1);
    }
  }
  return {
    server: host,
    port: portStr ? parseInt(portStr, 10) : 1433,
    database: params['database'],
    user: params['user'],
    password: params['password'],
    options: {
      encrypt: params['encrypt'] !== 'false',
      trustServerCertificate: params['trustservercertificate'] === 'true',
    },
  };
}

const adapter = new PrismaMssql(parseMssqlConfig(process.env.DATABASE_URL || ''));
const prisma = new PrismaClient({ adapter });

async function hash(password: string) {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🌱 Seed başlatılıyor...');

  // ─── Sektörler ──────────────────────────────────────────────────────────────
  const sektorBT = await prisma.sector.upsert({
    where: { name: 'Bilgi Teknolojileri' },
    update: {},
    create: { name: 'Bilgi Teknolojileri' },
  });

  const sektorFinans = await prisma.sector.upsert({
    where: { name: 'Finans & Bankacılık' },
    update: {},
    create: { name: 'Finans & Bankacılık' },
  });

  const sektorSaglik = await prisma.sector.upsert({
    where: { name: 'Sağlık' },
    update: {},
    create: { name: 'Sağlık' },
  });

  console.log('✅ Sektörler oluşturuldu');

  // ─── Meslekler ──────────────────────────────────────────────────────────────
  const meslekYazilim = await prisma.occupation.upsert({
    where: { name_sectorId: { name: 'Yazılım Geliştirme', sectorId: sektorBT.id } },
    update: {},
    create: { name: 'Yazılım Geliştirme', sectorId: sektorBT.id },
  });

  const meslekVeri = await prisma.occupation.upsert({
    where: { name_sectorId: { name: 'Veri Bilimi & Analitik', sectorId: sektorBT.id } },
    update: {},
    create: { name: 'Veri Bilimi & Analitik', sectorId: sektorBT.id },
  });

  const meslekFinans = await prisma.occupation.upsert({
    where: { name_sectorId: { name: 'Finansal Analiz', sectorId: sektorFinans.id } },
    update: {},
    create: { name: 'Finansal Analiz', sectorId: sektorFinans.id },
  });

  console.log('✅ Meslekler oluşturuldu');

  // ─── Birimler ───────────────────────────────────────────────────────────────
  const birimBackend = await prisma.unit.upsert({
    where: { name_occupationId: { name: 'Backend Geliştirme', occupationId: meslekYazilim.id } },
    update: {},
    create: { name: 'Backend Geliştirme', occupationId: meslekYazilim.id },
  });

  const birimFrontend = await prisma.unit.upsert({
    where: { name_occupationId: { name: 'Frontend Geliştirme', occupationId: meslekYazilim.id } },
    update: {},
    create: { name: 'Frontend Geliştirme', occupationId: meslekYazilim.id },
  });

  const birimML = await prisma.unit.upsert({
    where: { name_occupationId: { name: 'Makine Öğrenmesi', occupationId: meslekVeri.id } },
    update: {},
    create: { name: 'Makine Öğrenmesi', occupationId: meslekVeri.id },
  });

  console.log('✅ Birimler oluşturuldu');

  // ─── Ünvanlar ────────────────────────────────────────────────────────────────
  await prisma.title.upsert({
    where: { name_unitId: { name: 'Junior Backend Developer', unitId: birimBackend.id } },
    update: {},
    create: { name: 'Junior Backend Developer', unitId: birimBackend.id },
  });

  await prisma.title.upsert({
    where: { name_unitId: { name: 'Mid-Level Backend Developer', unitId: birimBackend.id } },
    update: {},
    create: { name: 'Mid-Level Backend Developer', unitId: birimBackend.id },
  });

  await prisma.title.upsert({
    where: { name_unitId: { name: 'Senior Backend Developer', unitId: birimBackend.id } },
    update: {},
    create: { name: 'Senior Backend Developer', unitId: birimBackend.id },
  });

  await prisma.title.upsert({
    where: { name_unitId: { name: 'Junior Frontend Developer', unitId: birimFrontend.id } },
    update: {},
    create: { name: 'Junior Frontend Developer', unitId: birimFrontend.id },
  });

  await prisma.title.upsert({
    where: { name_unitId: { name: 'Senior Frontend Developer', unitId: birimFrontend.id } },
    update: {},
    create: { name: 'Senior Frontend Developer', unitId: birimFrontend.id },
  });

  await prisma.title.upsert({
    where: { name_unitId: { name: 'ML Engineer', unitId: birimML.id } },
    update: {},
    create: { name: 'ML Engineer', unitId: birimML.id },
  });

  console.log('✅ Ünvanlar oluşturuldu');

  // ─── Yetkinlikler ────────────────────────────────────────────────────────────
  const yetkinlikAPI = await prisma.competency.create({
    data: {
      name: 'RESTful API Tasarımı',
      category: 'TECHNICAL',
      occupationId: meslekYazilim.id,
      skills: {
        create: [
          { name: 'HTTP metodlarını doğru kullanma' },
          { name: 'OpenAPI / Swagger dokümantasyonu' },
          { name: 'Hata yönetimi ve durum kodları' },
        ],
      },
    },
  });

  await prisma.competency.create({
    data: {
      name: 'Veritabanı Yönetimi',
      category: 'TECHNICAL',
      occupationId: meslekYazilim.id,
      skills: {
        create: [
          { name: 'SQL sorgu optimizasyonu' },
          { name: 'İndeks tasarımı' },
          { name: 'ORM kullanımı' },
        ],
      },
    },
  });

  await prisma.competency.create({
    data: {
      name: 'Takım Çalışması',
      category: 'CORE',
      skills: {
        create: [
          { name: 'Etkili iletişim' },
          { name: 'Görev dağılımı ve koordinasyon' },
        ],
      },
    },
  });

  console.log('✅ Yetkinlikler ve beceriler oluşturuldu');

  // ─── Kullanıcılar ────────────────────────────────────────────────────────────

  // Platform Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@skillbridge.io' },
    update: {},
    create: {
      email: 'admin@skillbridge.io',
      passwordHash: await hash('Admin123!'),
      role: 'PLATFORM_ADMIN',
      firstName: 'Platform',
      lastName: 'Admin',
      credits: 9999,
      emailVerified: true,
    },
  });

  // Bireysel kullanıcı
  const individualUser = await prisma.user.upsert({
    where: { email: 'user@skillbridge.io' },
    update: {},
    create: {
      email: 'user@skillbridge.io',
      passwordHash: await hash('User123!'),
      role: 'INDIVIDUAL',
      firstName: 'Test',
      lastName: 'Kullanıcı',
      credits: 50,
      emailVerified: true,
    },
  });

  // Kurumsal admin
  const corporateAdmin = await prisma.user.upsert({
    where: { email: 'kurumsal@skillbridge.io' },
    update: {},
    create: {
      email: 'kurumsal@skillbridge.io',
      passwordHash: await hash('Kurumsal123!'),
      role: 'CORPORATE_ADMIN',
      firstName: 'Kurumsal',
      lastName: 'Admin',
      emailVerified: true,
    },
  });

  console.log('✅ Kullanıcılar oluşturuldu');

  // ─── Şirket ──────────────────────────────────────────────────────────────────
  const sirket = await prisma.company.upsert({
    where: { taxNumber: '1234567890' },
    update: {},
    create: {
      name: 'Demo Teknoloji A.Ş.',
      taxNumber: '1234567890',
      sectorId: sektorBT.id,
      credits: 500,
      adminUserId: corporateAdmin.id,
    },
  });

  // Kurumsal admin'i şirkete bağla
  await prisma.user.update({
    where: { id: corporateAdmin.id },
    data: { companyId: sirket.id },
  });

  console.log('✅ Şirket oluşturuldu');

  // ─── Hoş geldin kredileri ────────────────────────────────────────────────────
  await prisma.creditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        amount: 9999,
        type: 'WELCOME_BONUS',
        description: 'Platform admin hoş geldin kredisi',
      },
      {
        userId: individualUser.id,
        amount: 50,
        type: 'WELCOME_BONUS',
        description: 'Hoş geldin kredisi',
      },
    ],
  });

  console.log('✅ Kredi logları oluşturuldu');

  console.log('\n🎉 Seed tamamlandı!');
  console.log('─────────────────────────────────────────');
  console.log('👤 Platform Admin  : admin@skillbridge.io     / Admin123!');
  console.log('👤 Bireysel Kullanıcı: user@skillbridge.io    / User123!');
  console.log('👤 Kurumsal Admin  : kurumsal@skillbridge.io  / Kurumsal123!');
  console.log('─────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
