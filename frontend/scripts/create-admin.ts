import { createClient } from '@supabase/supabase-js';

type AdminRole = 'admin' | 'moderator' | 'support';

type Args = {
  email?: string;
  password?: string;
  role?: AdminRole;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) continue;

    if (key === '--email') args.email = value;
    if (key === '--password') args.password = value;
    if (key === '--role') args.role = value as AdminRole;
  }
  return args;
}

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://ftebhqbgmmpiucywufhu.supabase.co';

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_SECRET;

async function ensureAdminRole(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  role: AdminRole,
) {
  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role }, { onConflict: 'user_id,role' });

  if (error) {
    throw new Error(`Failed to upsert admin role: ${error.message}`);
  }
}

async function createOrUpdateAdmin(email: string, password: string, role: AdminRole) {
  if (!SUPABASE_URL) {
    throw new Error('Set SUPABASE_URL (or VITE_SUPABASE_URL) before running this script.');
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Set SUPABASE_SERVICE_ROLE_KEY to your service role key before running.');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError && !createError.message.toLowerCase().includes('already registered')) {
    throw new Error(`Failed to create user: ${createError.message}`);
  }

  let userId = created?.user?.id;

  if (!userId) {
    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserByEmail(
      email,
      {
        password,
        email_confirm: true,
      },
    );

    if (updateError) {
      throw new Error(`Failed to update existing user: ${updateError.message}`);
    }

    userId = updated.user?.id;
  }

  if (!userId) {
    throw new Error('Could not determine user ID after create/update.');
  }

  await ensureAdminRole(supabase, userId, role);

  return { userId };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email || 'admin@nannyelite.ch';
  const password = args.password;
  const role = args.role || 'admin';

  if (!password) {
    throw new Error('Provide a password via --password "<strong-password>".');
  }

  const { userId } = await createOrUpdateAdmin(email, password, role);
  console.log(`Admin ready: ${email} (${userId}) role=${role}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
