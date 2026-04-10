import { NextResponse } from 'next/server';
import { createClient } from '@cafetoolbox/supabase/server';
import { createAdminClient } from '@cafetoolbox/supabase';

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

    // Check current user is superadmin
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    // Prevent self-deletion
    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: 'Bạn không thể xóa chính mình' },
        { status: 400 }
      );
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (currentProfile?.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Bạn không có quyền xóa user' },
        { status: 403 }
      );
    }

    // Use admin client to delete user
    const supabaseAdmin = await createAdminClient();

    // Get user profile before deletion
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

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
