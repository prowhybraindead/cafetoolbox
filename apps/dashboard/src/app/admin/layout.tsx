import { createServerClient } from '@cafetoolbox/supabase';
import { redirect } from 'next/navigation';
import { AdminThemeShell } from '../../components/admin-theme-shell';

async function getAdminUserInfo() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { isSuperAdmin: false, user: null };
  }

  const rawRole = user.app_metadata?.role ?? user.user_metadata?.role ?? null;
  const isSuperAdmin = rawRole === 'superadmin' || rawRole === 'admin';

  return {
    isSuperAdmin,
    user: {
      email: user.email ?? '',
      display_name: typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : null,
      avatar_url: typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null,
      role: rawRole,
    },
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSuperAdmin, user } = await getAdminUserInfo();

  if (!isSuperAdmin) {
    redirect('/dashboard');
  }

  return (
    <AdminThemeShell user={user}>{children}</AdminThemeShell>
  );
}
