import { NextResponse } from 'next/server';
import { createClient } from '@cafetoolbox/supabase/server';
import { normalizeRole } from '../_lib/authz';
import { buildUserMetadataPatch } from '../_lib/auth-metadata';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const email = user.email ?? '';
    const rawRole = user.app_metadata?.role ?? user.user_metadata?.role ?? null;
    const displayName = (typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : null) ?? email.split('@')[0] ?? 'User';

    return NextResponse.json({
      profile: {
        id: user.id,
        email,
        display_name: displayName,
        avatar_url: typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null,
        role: normalizeRole(rawRole),
        last_activity: null,
        updated_at: null,
      },
      rawRole: rawRole ?? 'unknown',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Có lỗi xảy ra' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      display_name?: string;
      avatar_url?: string;
    };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const fallbackDisplayName = user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'User';

    let userMetadata;
    try {
      userMetadata = buildUserMetadataPatch({
        display_name: body.display_name ?? user.user_metadata?.display_name,
        avatar_url: body.avatar_url ?? user.user_metadata?.avatar_url,
        fallbackDisplayName,
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Dữ liệu avatar không hợp lệ' }, { status: 400 });
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: userMetadata,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Không thể cập nhật profile' }, { status: 500 });
    }

    const { data: refreshed } = await supabase.auth.getUser();
    const refreshedUser = refreshed.user ?? user;
    const rawRole = refreshedUser.app_metadata?.role ?? refreshedUser.user_metadata?.role ?? null;
    const email = refreshedUser.email ?? '';
    const displayName = (typeof refreshedUser.user_metadata?.display_name === 'string' ? refreshedUser.user_metadata.display_name : null) ?? email.split('@')[0] ?? 'User';

    return NextResponse.json({
      profile: {
        id: refreshedUser.id,
        email,
        display_name: displayName,
        avatar_url: typeof refreshedUser.user_metadata?.avatar_url === 'string' ? refreshedUser.user_metadata.avatar_url : null,
        role: normalizeRole(rawRole),
        last_activity: null,
        updated_at: null,
      },
      rawRole: rawRole ?? 'unknown',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Có lỗi xảy ra' },
      { status: 500 }
    );
  }
}
