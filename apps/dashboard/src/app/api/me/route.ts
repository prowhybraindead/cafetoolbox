import { NextResponse } from 'next/server';
import { createClient } from '@cafetoolbox/supabase/server';
import { normalizeRole } from '../_lib/authz';
import { buildCleanUserMetadata } from '../_lib/auth-metadata';

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Có lỗi xảy ra';
    return NextResponse.json(
      { error: message },
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

    // Reject data URL avatars explicitly — they bloat the JWT to 17+ cookie
    // chunks and cause 494 header-too-large errors.
    if (typeof body.avatar_url === 'string' && body.avatar_url.trim().startsWith('data:')) {
      return NextResponse.json({ error: 'Avatar URL không được là data URL (base64 inline)' }, { status: 400 });
    }

    let userMetadata;
    try {
      userMetadata = buildCleanUserMetadata(
        user.user_metadata,
        {
          display_name: body.display_name ?? user.user_metadata?.display_name,
          avatar_url: body.avatar_url ?? user.user_metadata?.avatar_url,
          fallbackDisplayName,
        },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Dữ liệu avatar không hợp lệ';
      return NextResponse.json({ error: message }, { status: 400 });
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Có lỗi xảy ra';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
