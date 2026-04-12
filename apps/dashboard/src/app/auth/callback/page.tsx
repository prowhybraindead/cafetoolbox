import { createServerClient } from '@cafetoolbox/supabase';
import { redirect } from 'next/navigation';

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    type?: string;
    error?: string;
    error_description?: string;
  }>;
}) {
  const params = await searchParams;

  if (params.error) {
    redirect(`/login?error=${encodeURIComponent(params.error_description || params.error)}`);
  }

  if (params.code) {
    const supabase = await createServerClient();
    const { data: oauthData } = await supabase.auth.exchangeCodeForSession(params.code);

    // OAuth providers (Google etc.) inject the avatar as a base64 data URL directly
    // into user_metadata.avatar_url. A single JPEG is ~16 KB; multiplied by 3 copies
    // inside the JWT (session + user + identities) = ~48 KB → 17 cookie chunks → 494.
    // Strip it immediately so the first-ever session cookie is already clean.
    const avatarUrl = oauthData.session?.user?.user_metadata?.avatar_url;
    if (typeof avatarUrl === 'string' && avatarUrl.startsWith('data:')) {
      await supabase.auth.updateUser({ data: { avatar_url: null } });
    }

    // Note: Cookie deduplication is handled automatically by:
    //   - server.ts setAll() (clears host-only variant when domain is configured)
    //   - middleware.ts updateSession() (pre-emptive dedup before refresh)
  }

  if (params.type === 'recovery') {
    redirect('/auth/reset-password');
  }

  redirect('/dashboard');
}
