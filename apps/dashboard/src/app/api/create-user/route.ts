import { NextResponse } from 'next/server';
import { createAdminClient } from '@cafetoolbox/supabase';
import { assertSuperadminUser, normalizeRole } from '../_lib/authz';
import { buildAppMetadataPatch, buildUserMetadataReplacement } from '../_lib/auth-metadata';

interface CreateUserRequest {
  email: string;
  password: string;
  display_name?: string;
  role?: 'user' | 'superadmin';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateUserRequest;
    const normalizedRole = normalizeRole(body.role);
    const { email, password, display_name } = body;

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

    const authResult = await assertSuperadminUser();
    if ('error' in authResult) return authResult.error;

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
    const userMetadata = buildUserMetadataReplacement({
      display_name: display_name || email.split('@')[0],
      avatar_url: null,
      fallbackDisplayName: email.split('@')[0] || 'User',
    });

    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
      app_metadata: buildAppMetadataPatch(normalizedRole),
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
      .update({ role: normalizedRole })
      .eq('id', newUserData.user.id);

    if (updateError) {
      console.error('Error updating profile role:', updateError);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUserData.user.id,
        email: newUserData.user.email,
        role: normalizedRole,
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
