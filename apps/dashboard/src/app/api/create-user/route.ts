import { NextResponse } from 'next/server';
import { createClient } from '@cafetoolbox/supabase/server';
import { createAdminClient } from '@cafetoolbox/supabase';

interface CreateUserRequest {
  email: string;
  password: string;
  display_name?: string;
  role?: 'user' | 'superadmin';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateUserRequest;
    const { email, password, display_name, role = 'user' } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp email và mật khẩu' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 }
      );
    }

    // Check current user is superadmin
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (currentProfile?.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Bạn không có quyền tạo user' },
        { status: 403 }
      );
    }

    // Use admin client to create user
    const supabaseAdmin = await createAdminClient();

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers.users.some((u: { email?: string | null }) => u.email === email);

    if (emailExists) {
      return NextResponse.json(
        { error: 'Email này đã được sử dụng' },
        { status: 400 }
      );
    }

    // Create user with admin API
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: display_name || email.split('@')[0],
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: createError.message || 'Không thể tạo user' },
        { status: 500 }
      );
    }

    if (!newUserData.user) {
      return NextResponse.json(
        { error: 'Không thể tạo user' },
        { status: 500 }
      );
    }

    // Update profile with role
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', newUserData.user.id);

    if (updateError) {
      console.error('Error updating profile role:', updateError);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUserData.user.id,
        email: newUserData.user.email,
        role,
      },
    });

  } catch (error: any) {
    console.error('Error in create-user API:', error);
    return NextResponse.json(
      { error: error.message || 'Có lỗi xảy ra' },
      { status: 500 }
    );
  }
}
