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
    await supabase.auth.exchangeCodeForSession(params.code);
    // Note: Cookie deduplication is handled automatically by:
    //   - server.ts setAll() (clears host-only variant when domain is configured)
    //   - middleware.ts updateSession() (pre-emptive dedup before refresh)
  }

  if (params.type === 'recovery') {
    redirect('/auth/reset-password');
  }

  redirect('/dashboard');
}
