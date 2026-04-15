import { createServerClient } from '@cafetoolbox/supabase';
import { DashboardShell } from '../../components/dashboard-shell';
import type { UserInfo } from '../../components/dashboard-nav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const initialUser: UserInfo | null = user
    ? {
        email: user.email ?? '',
        display_name: typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : null,
        avatar_url: typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null,
        role: user.app_metadata?.role ?? user.user_metadata?.role ?? null,
      }
    : null;

  return (
    <DashboardShell initialUser={initialUser}>
      {children}
    </DashboardShell>
  );
}
