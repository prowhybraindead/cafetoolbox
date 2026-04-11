import { NextResponse } from 'next/server';
import { createAdminClient } from '@cafetoolbox/supabase';
import { assertSuperadminUser } from '../_lib/authz';

interface DeleteUserRequest {
  userId: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DeleteUserRequest;
    const { userId } = body;

    // Validation
    if (!userId) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp user ID' },
        { status: 400 }
      );
    }

    const authResult = await assertSuperadminUser();
    if ('error' in authResult) return authResult.error;
    const { user: currentUser } = authResult;

    // Prevent self-deletion
    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: 'Bạn không thể xóa chính mình' },
        { status: 400 }
      );
    }

    // Use admin client to delete user
    const supabaseAdmin = await createAdminClient();

    // Delete the user (this cascades to profiles due to foreign key)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Không thể xóa user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa user thành công',
    });

  } catch (error: any) {
    console.error('Error in delete-user API:', error);
    return NextResponse.json(
      { error: error.message || 'Có lỗi xảy ra' },
      { status: 500 }
    );
  }
}
