import { NextResponse } from 'next/server';
import { createClient } from '@cafetoolbox/supabase/server';

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      password?: string;
      confirmPassword?: string;
    };

    const password = (body.password ?? '').trim();
    const confirmPassword = (body.confirmPassword ?? '').trim();

    if (!password) {
      return NextResponse.json({ error: 'Vui lòng nhập mật khẩu mới' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Xác nhận mật khẩu không khớp' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message || 'Không thể cập nhật mật khẩu' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Có lỗi xảy ra';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
