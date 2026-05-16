const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const DEFAULT_EMAIL = 'demo@peblo.infinityos.app';
const DEFAULT_PASSWORD = 'DemoInfinity2026!';
const DEFAULT_NAME = 'Demo visitor';

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

async function ensureDemoWorkspace(userId) {
  const existing = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { joinedAt: 'asc' },
  });
  if (existing) {
    return existing.workspace;
  }
  let slug = 'peblo-demo-workspace';
  for (let i = 0; i < 5; i += 1) {
    const taken = await prisma.workspace.findUnique({ where: { slug } });
    if (!taken) break;
    slug = `peblo-demo-${randomSuffix()}`;
  }
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Demo workspace',
      slug,
      type: 'STARTUP',
      members: {
        create: {
          userId,
          role: 'OWNER',
          joinedAt: new Date(),
        },
      },
    },
  });
  return workspace;
}

async function ensureSampleNotes(workspaceId, authorId) {
  const count = await prisma.note.count({
    where: { workspaceId, authorId },
  });
  if (count > 0) return;

  await prisma.note.createMany({
    data: [
      {
        workspaceId,
        authorId,
        title: 'Welcome (demo)',
        content:
          '<p>This is a <strong>demo note</strong>. Edit here — changes autosave while you explore Peblo InfinityOS.</p>',
        format: 'RICH',
      },
      {
        workspaceId,
        authorId,
        title: 'Try the dashboard',
        content:
          '<p>Open <strong>Notes</strong> from the sidebar, create a new note, and switch workspaces from the dropdown.</p>',
        format: 'RICH',
      },
    ],
  });
}

async function main() {
  const email = (process.env.DEMO_EMAIL || DEFAULT_EMAIL).toLowerCase().trim();
  const password = process.env.DEMO_PASSWORD || DEFAULT_PASSWORD;
  const name = process.env.DEMO_NAME || DEFAULT_NAME;

  const passwordHash = await bcrypt.hash(password, 12);

  let user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { include: { workspace: true } } },
  });

  if (!user) {
    const slug = `demo-${randomSuffix()}`;
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        memberships: {
          create: {
            role: 'OWNER',
            joinedAt: new Date(),
            workspace: {
              create: {
                name: 'Demo workspace',
                slug,
                type: 'STARTUP',
              },
            },
          },
        },
      },
      include: { memberships: { include: { workspace: true } } },
    });
    console.log(`[seed] Created demo user ${email}`);
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, name },
    });
    user = await prisma.user.findUnique({
      where: { id: user.id },
      include: { memberships: { include: { workspace: true } } },
    });
    console.log(`[seed] Updated demo user ${email} (password synced from env)`);
  }

  const workspace = await ensureDemoWorkspace(user.id);
  await ensureSampleNotes(workspace.id, user.id);

  console.log(`[seed] Demo workspace: ${workspace.name} (${workspace.slug})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
