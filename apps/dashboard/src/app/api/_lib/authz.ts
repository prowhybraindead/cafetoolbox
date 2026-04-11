import { NextResponse } from 'next/server';
import { createClient } from '@cafetoolbox/supabase/server';

export function normalizeRole(role: string | null | undefined) {
  if (!role) return 'user';

  const normalized = role.toLowerCase();
  if (normalized === 'superadmin' || normalized === 'admin') {
    return 'superadmin';
  }

  return 'user';
}

export async function assertSuperadminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 }) };
  }

  const rawRole = user.app_metadata?.role ?? user.user_metadata?.role ?? null;
  if (normalizeRole(rawRole) !== 'superadmin') {
    return { error: NextResponse.json({ error: 'Bạn không có quyền truy cập' }, { status: 403 }) };
  }

  return { user };
}
