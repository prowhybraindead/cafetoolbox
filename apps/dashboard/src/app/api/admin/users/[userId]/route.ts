import { NextResponse } from 'next/server';
import { createAdminClient } from '@cafetoolbox/supabase';
import { assertSuperadminUser, normalizeRole } from '../../../_lib/authz';

async function assertSuperadmin() {
  const authResult = await assertSuperadminUser();
  if ('error' in authResult) return { error: authResult.error };

  const supabaseAdmin = await createAdminClient();

  return { supabaseAdmin };
}

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const authResult = await assertSuperadmin();
  if ('error' in authResult) return authResult.error;

  const { supabaseAdmin } = authResult;
  const { userId } = await context.params;

  const body = (await request.json()) as {
    display_name?: string;
    avatar_url?: string;
    role?: 'user' | 'superadmin';
    password?: string;
  };

  const updates: Record<string, string | null> = {};
  const nextPassword = typeof body.password === 'string' ? body.password.trim() : '';

  if (typeof body.display_name === 'string') {
    updates.display_name = body.display_name;
  }

  if (typeof body.avatar_url === 'string') {
    updates.avatar_url = body.avatar_url;
  }

  if (typeof body.role === 'string') {
    updates.role = normalizeRole(body.role);
  }

  if (!nextPassword && Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Không có dữ liệu để cập nhật' }, { status: 400 });
  }

  if (nextPassword && nextPassword.length < 6) {
    return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 });
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Không thể cập nhật profile' }, { status: 500 });
    }
  }

  const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
  const authUser = authUserData.user;

  if (authUser) {
    const nextRole = typeof body.role === 'string'
      ? normalizeRole(body.role)
      : normalizeRole(authUser.app_metadata?.role ?? authUser.user_metadata?.role ?? null);

    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ...(nextPassword ? { password: nextPassword } : {}),
      user_metadata: {
        ...(authUser.user_metadata ?? {}),
        ...(typeof body.display_name === 'string' ? { display_name: body.display_name } : {}),
        ...(typeof body.avatar_url === 'string' ? { avatar_url: body.avatar_url } : {}),
        role: nextRole,
      },
      app_metadata: {
        ...(authUser.app_metadata ?? {}),
        role: nextRole,
      },
    });

    if (authUpdateError) {
      return NextResponse.json({ error: authUpdateError.message || 'Không thể đồng bộ metadata auth' }, { status: 500 });
    }
  }

  const { data: refreshed } = await supabaseAdmin.auth.admin.getUserById(userId);
  const refreshedUser = refreshed.user;

  return NextResponse.json({
    profile: {
      id: refreshedUser?.id ?? userId,
      email: refreshedUser?.email ?? '',
      display_name: typeof refreshedUser?.user_metadata?.display_name === 'string' ? refreshedUser.user_metadata.display_name : null,
      avatar_url: typeof refreshedUser?.user_metadata?.avatar_url === 'string' ? refreshedUser.user_metadata.avatar_url : null,
      role: normalizeRole(refreshedUser?.app_metadata?.role ?? refreshedUser?.user_metadata?.role ?? null),
      created_at: refreshedUser?.created_at ?? new Date().toISOString(),
    },
  });
}
