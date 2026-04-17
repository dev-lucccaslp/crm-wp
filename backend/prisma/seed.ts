import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const DEFAULT_COLUMNS = [
  { name: 'Novo', color: '#64748b' },
  { name: 'Qualificado', color: '#3b82f6' },
  { name: 'Em atendimento', color: '#f59e0b' },
  { name: 'Ganho', color: '#10b981' },
  { name: 'Perdido', color: '#ef4444' },
];

async function main() {
  console.log('🌱 seeding...');

  const passwordHash = await argon2.hash('12345678');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@crmwp.local' },
    update: {},
    create: {
      email: 'admin@crmwp.local',
      name: 'Admin Dev',
      passwordHash,
      isSuperAdmin: true,
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@crmwp.local' },
    update: {},
    create: {
      email: 'agent@crmwp.local',
      name: 'Agente Dev',
      passwordHash,
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'workspace-dev' },
    update: {},
    create: {
      name: 'Workspace Dev',
      slug: 'workspace-dev',
      subscription: { create: { plan: 'PRO', status: 'ACTIVE' } },
      memberships: {
        create: [
          { userId: admin.id, role: Role.ADMIN },
          { userId: agent.id, role: Role.AGENT },
        ],
      },
    },
  });

  const board = await prisma.kanbanBoard.upsert({
    where: { id: `seed-board-${workspace.id}` },
    update: {},
    create: {
      id: `seed-board-${workspace.id}`,
      workspaceId: workspace.id,
      name: 'Pipeline principal',
      isDefault: true,
    },
  });

  // columns idempotent by (boardId, name) — easier to delete-then-insert for dev
  await prisma.kanbanColumn.deleteMany({ where: { boardId: board.id } });
  const columns = await Promise.all(
    DEFAULT_COLUMNS.map((c, i) =>
      prisma.kanbanColumn.create({
        data: {
          workspaceId: workspace.id,
          boardId: board.id,
          name: c.name,
          color: c.color,
          position: i,
        },
      }),
    ),
  );

  const contactsData = [
    { phone: '5511999990001', name: 'Maria Souza' },
    { phone: '5511999990002', name: 'João Pereira' },
    { phone: '5511999990003', name: 'Ana Lima' },
  ];

  const contacts = await Promise.all(
    contactsData.map((c) =>
      prisma.contact.upsert({
        where: { workspaceId_phone: { workspaceId: workspace.id, phone: c.phone } },
        update: {},
        create: {
          workspaceId: workspace.id,
          phone: c.phone,
          name: c.name,
        },
      }),
    ),
  );

  await prisma.lead.deleteMany({ where: { workspaceId: workspace.id } });
  await Promise.all(
    contacts.map((contact, i) =>
      prisma.lead.create({
        data: {
          workspaceId: workspace.id,
          boardId: board.id,
          columnId: columns[i % columns.length].id,
          contactId: contact.id,
          assigneeId: agent.id,
          title: `Oportunidade — ${contact.name}`,
          value: (1000 + i * 500).toString(),
          position: i,
          tags: i === 0 ? ['quente'] : [],
        },
      }),
    ),
  );

  console.log('✅ seed ok');
  console.log(`   login: admin@crmwp.local / 12345678`);
  console.log(`         agent@crmwp.local / 12345678`);
  console.log(`   workspace slug: ${workspace.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
