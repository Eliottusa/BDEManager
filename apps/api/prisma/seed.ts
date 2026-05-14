import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ─── Nettoyer la base de données ──────────────────────────────────
  console.log('🗑️  Cleaning database...');
  await prisma.payment.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  // ─── Créer les utilisateurs ──────────────────────────────────────
  console.log('👥 Creating users...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Utilisateur standard
  const user1 = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      password: hashedPassword,
      firstName: 'Alice',
      lastName: 'Dupont',
      phone: '+33612345678',
      role: 'USER',
      isVerified: true,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      password: hashedPassword,
      firstName: 'Bob',
      lastName: 'Martin',
      phone: '+33687654321',
      role: 'USER',
      isVerified: true,
    },
  });

  // Utilisateur ORGANIZER
  const organizer = await prisma.user.create({
    data: {
      email: 'organizer@example.com',
      password: hashedPassword,
      firstName: 'Charlie',
      lastName: 'Organizational',
      phone: '+33611223344',
      role: 'ORGANIZER',
      isVerified: true,
    },
  });

  // Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isVerified: true,
    },
  });

  console.log('✅ Users created:', {
    user1: user1.email,
    user2: user2.email,
    organizer: organizer.email,
    admin: admin.email,
  });

  // ─── Créer les événements ──────────────────────────────────────
  console.log('🎉 Creating events...');

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Événement gratuit
  const freeEvent = await prisma.event.create({
    data: {
      title: 'Réunion BDE Gratuite',
      description: 'Une réunion gratuite pour discuter des projets futurs',
      status: 'PUBLISHED',
      addressLabel: 'Salle de réunion',
      addressStreet: '123 Rue de Paris',
      addressCity: 'Paris',
      addressZip: '75001',
      latitude: 48.8566,
      longitude: 2.3522,
      startDate: nextWeek,
      endDate: new Date(nextWeek.getTime() + 2 * 60 * 60 * 1000),
      capacity: 50,
      price: 0,
      isFree: true,
      organizerId: organizer.id,
    },
  });

  // Événement payant - 15€
  const paidEventSmall = await prisma.event.create({
    data: {
      title: 'Concert - Billet 15€',
      description: 'Concert étudiant avec bonne ambiance',
      status: 'PUBLISHED',
      addressLabel: 'Amphi Principal',
      addressStreet: '456 Avenue de la Paix',
      addressCity: 'Lyon',
      addressZip: '69000',
      latitude: 45.7642,
      longitude: 4.8357,
      startDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      capacity: 200,
      price: 15,
      isFree: false,
      organizerId: organizer.id,
    },
  });

  // Événement payant - 50€
  const paidEventLarge = await prisma.event.create({
    data: {
      title: 'Atelier Premium - 50€',
      description: 'Atelier intensif avec expert du domaine',
      status: 'PUBLISHED',
      addressLabel: 'Salle de formation',
      addressStreet: '789 Boulevard Technologique',
      addressCity: 'Bordeaux',
      addressZip: '33000',
      latitude: 44.8378,
      longitude: -0.5792,
      startDate: nextMonth,
      endDate: new Date(nextMonth.getTime() + 4 * 60 * 60 * 1000),
      capacity: 30,
      price: 50,
      isFree: false,
      organizerId: organizer.id,
    },
  });

  console.log('✅ Events created:', {
    free: freeEvent.title,
    paid_15: paidEventSmall.title,
    paid_50: paidEventLarge.title,
  });

  // ─── Créer les inscriptions ──────────────────────────────────────
  console.log('📝 Creating registrations...');

  // Registration pour l'événement gratuit (CONFIRMED)
  const reg1 = await prisma.registration.create({
    data: {
      status: 'CONFIRMED',
      userId: user1.id,
      eventId: freeEvent.id,
    },
  });

  // Registrations pour l'événement payant 15€
  const reg2 = await prisma.registration.create({
    data: {
      status: 'PENDING',
      userId: user1.id,
      eventId: paidEventSmall.id,
    },
  });

  const reg3 = await prisma.registration.create({
    data: {
      status: 'PENDING',
      userId: user2.id,
      eventId: paidEventSmall.id,
    },
  });

  // Registration pour l'événement payant 50€
  const reg4 = await prisma.registration.create({
    data: {
      status: 'PENDING',
      userId: user1.id,
      eventId: paidEventLarge.id,
    },
  });

  const reg5 = await prisma.registration.create({
    data: {
      status: 'PENDING',
      userId: user2.id,
      eventId: paidEventLarge.id,
    },
  });

  console.log('✅ Registrations created:', {
    free_confirmed: reg1.id,
    paid_15_pending_1: reg2.id,
    paid_15_pending_2: reg3.id,
    paid_50_pending_1: reg4.id,
    paid_50_pending_2: reg5.id,
  });

  // ─── Créer les paiements (optionnel - pour simulation) ──────────────────────────────────
  console.log('💳 Creating test payments...');

  // Un paiement en PENDING (pour simuler un paiement en cours)
  const payment1 = await prisma.payment.create({
    data: {
      stripeSessionId: 'cs_test_pending_001',
      amount: 15,
      currency: 'eur',
      status: 'PENDING',
      userId: user1.id,
      eventId: paidEventSmall.id,
      registrationId: reg2.id,
    },
  });

  // Un paiement PAID (pour simuler un paiement réussi)
  const payment2 = await prisma.payment.create({
    data: {
      stripeSessionId: 'cs_test_paid_001',
      stripePaymentId: 'pi_test_123456',
      amount: 50,
      currency: 'eur',
      status: 'PAID',
      userId: user2.id,
      eventId: paidEventLarge.id,
      registrationId: reg5.id,
    },
  });

  // Mettre à jour l'inscription correspondante au statut CONFIRMED
  await prisma.registration.update({
    where: { id: reg5.id },
    data: { status: 'CONFIRMED' },
  });

  console.log('✅ Payments created:', {
    pending: payment1.id,
    paid: payment2.id,
  });

  console.log('');
  console.log('='.repeat(60));
  console.log('🎉 Seed completed successfully!');
  console.log('='.repeat(60));
  console.log('');
  console.log('📊 Summary:');
  console.log(`  • Users: 4 (alice, bob, organizer, admin)`);
  console.log(`  • Events: 3 (1 free, 2 paid)`);
  console.log(`  • Registrations: 5 (mix pending/confirmed)`);
  console.log(`  • Payments: 2 (1 pending, 1 paid)`);
  console.log('');
  console.log('🔑 Test Credentials:');
  console.log(`  • User: alice@example.com / password123`);
  console.log(`  • User: bob@example.com / password123`);
  console.log(`  • Organizer: organizer@example.com / password123`);
  console.log(`  • Admin: admin@example.com / password123`);
  console.log('');
  console.log('📝 Important IDs for testing:');
  console.log(`  • User1 ID: ${user1.id}`);
  console.log(`  • User2 ID: ${user2.id}`);
  console.log(`  • Paid Event (15€) ID: ${paidEventSmall.id}`);
  console.log(`  • Paid Event (50€) ID: ${paidEventLarge.id}`);
  console.log(`  • Registration (PENDING) ID: ${reg2.id}`);
  console.log(`  • Registration (PENDING) ID: ${reg3.id}`);
  console.log(`  • Registration (CONFIRMED w/ payment) ID: ${reg5.id}`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
