import { NextResponse } from 'next/server';
import { createAdminClient } from '@cafetoolbox/supabase';
import { assertSuperadminUser, normalizeRole } from '../../_lib/authz';

async function assertSuperadmin() {
  const authResult = await assertSuperadminUser();
  if ('error' in authResult) return authResult;

  const supabaseAdmin = await createAdminClient();

  return { supabaseAdmin };
}

export async function GET() {
  const authResult = await assertSuperadmin();
  if ('error' in authResult) return authResult.error;

  const { supabaseAdmin } = authResult;
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    return NextResponse.json({ error: error.message || 'Không thể tải danh sách người dùng' }, { status: 500 });
  }

  return NextResponse.json({
    profiles: (data.users ?? []).map((user) => ({
      id: user.id,
      email: user.email ?? '',
      display_name: typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : null,
      avatar_url: typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null,
      role: normalizeRole(user.app_metadata?.role ?? user.user_metadata?.role ?? null),
      created_at: user.created_at,
    })),
  });
}
