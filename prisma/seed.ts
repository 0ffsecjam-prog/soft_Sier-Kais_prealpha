import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';

const prisma = new PrismaClient();
const code = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 8);

async function main() {
  console.log('Seeding...');

  const adminPw = await bcrypt.hash('admin123', 10);
  const canchaPw = await bcrypt.hash('cancha123', 10);
  const clientePw = await bcrypt.hash('cliente123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@tempelgroup.com' },
    update: {},
    create: {
      email: 'admin@tempelgroup.com',
      passwordHash: adminPw,
      name: 'Admin Tempel',
      role: 'ADMIN',
    },
  });

  const cancha = await prisma.user.upsert({
    where: { email: 'dueno@complejolosalamos.com' },
    update: {},
    create: {
      email: 'dueno@complejolosalamos.com',
      passwordHash: canchaPw,
      name: 'Juan Pérez',
      role: 'CANCHA',
    },
  });

  const cliente = await prisma.user.upsert({
    where: { email: 'jugador@gmail.com' },
    update: {},
    create: {
      email: 'jugador@gmail.com',
      passwordHash: clientePw,
      name: 'Carlos Jugador',
      role: 'CLIENTE',
    },
  });

  const complex = await prisma.complex.upsert({
    where: { ownerId: cancha.id },
    update: {},
    create: {
      name: 'Complejo Los Álamos',
      address: 'Av. Siempre Viva 742, CABA',
      lat: -34.6037,    // Obelisco, Buenos Aires (sample)
      lng: -58.3816,
      ownerId: cancha.id,
      revenueSharePct: 7000,
    },
  });

  const existingCourts = await prisma.court.findMany({ where: { complexId: complex.id } });
  let courts = existingCourts;
  if (existingCourts.length === 0) {
    courts = await Promise.all([
      prisma.court.create({ data: { name: 'Cancha 1', complexId: complex.id, slotDurationMin: 60, pricePerSlotCents: 1200000, openingHour: 8, closingHour: 23 } }),
      prisma.court.create({ data: { name: 'Cancha 2', complexId: complex.id, slotDurationMin: 60, pricePerSlotCents: 1500000, openingHour: 9, closingHour: 23 } }),
    ]);
  }

  const recCount = await prisma.recording.count({ where: { courtId: { in: courts.map((c) => c.id) } } });
  if (recCount === 0) {
    const now = new Date();
    const dayMs = 1000 * 60 * 60 * 24;
    await prisma.recording.createMany({
      data: [
        {
          courtId: courts[0].id,
          title: 'Partido Sábado 20:00 — Cancha 1',
          recordedAt: new Date(now.getTime() - 2 * dayMs),
          durationSec: 3600,
          filePath: 'sample.mp4',
          priceCents: 350000,
          downloadFeeCents: 80000,
          status: 'READY',
        },
        {
          courtId: courts[0].id,
          title: 'Picadito Miércoles 21:00 — Cancha 1',
          recordedAt: new Date(now.getTime() - 5 * dayMs),
          durationSec: 3600,
          filePath: 'sample-2.mp4',
          priceCents: 350000,
          downloadFeeCents: 80000,
          status: 'READY',
        },
        {
          courtId: courts[1].id,
          title: 'Final Torneo Interno — Cancha 2',
          recordedAt: new Date(now.getTime() - 1 * dayMs),
          durationSec: 4200,
          filePath: 'sample-3.mp4',
          priceCents: 400000,
          downloadFeeCents: 100000,
          status: 'READY',
        },
      ],
    });
  }

  const firstRecording = await prisma.recording.findFirst({ where: { courtId: courts[0].id } });

  if (firstRecording) {
    const tokenExists = await prisma.accessToken.findFirst({
      where: { recordingId: firstRecording.id, isActive: true },
    });
    if (!tokenExists) {
      await prisma.accessToken.create({
        data: {
          code: code(),
          recordingId: firstRecording.id,
          maxUses: 10,
          createdById: cancha.id,
          isActive: true,
        },
      });
    }
  }

  await prisma.configSetting.upsert({
    where: { key: 'default_recording_price_cents' },
    update: {},
    create: { key: 'default_recording_price_cents', value: '350000', description: 'Precio default de un Recording al crearse (centavos).' },
  });
  await prisma.configSetting.upsert({
    where: { key: 'default_download_fee_cents' },
    update: {},
    create: { key: 'default_download_fee_cents', value: '80000', description: 'Fee de descarga adicional default (centavos).' },
  });
  await prisma.configSetting.upsert({
    where: { key: 'emulated_db_ip' },
    update: {},
    create: { key: 'emulated_db_ip', value: '127.0.0.1', description: 'IP de BD emulada (variable de debug, no afecta runtime).' },
  });

  const sampleToken = await prisma.accessToken.findFirst({ where: { isActive: true } });

  console.log('Done.');
  console.log('-----------------------------------');
  console.log('Admin:    admin@tempelgroup.com / admin123');
  console.log('Cancha:   dueno@complejolosalamos.com / cancha123');
  console.log('Cliente:  jugador@gmail.com / cliente123');
  if (sampleToken) console.log(`Sample access code: ${sampleToken.code}`);
  console.log('-----------------------------------');
  void admin; void cliente;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
