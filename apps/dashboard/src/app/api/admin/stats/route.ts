import { NextResponse } from 'next/server';
import { createAdminClient } from '@cafetoolbox/supabase';
import { assertSuperadminUser } from '../../_lib/authz';

export async function GET() {
  const authResult = await assertSuperadminUser();
  if ('error' in authResult) return authResult.error;

  const supabaseAdmin = await createAdminClient();

  const [categoriesResult, toolsResult, usersResult] = await Promise.all([
    supabaseAdmin.from('categories').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('tools').select('id', { count: 'exact', head: true }),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 }),
  ]);

  if (categoriesResult.error) {
    return NextResponse.json({ error: categoriesResult.error.message || 'Không thể tải thống kê danh mục' }, { status: 500 });
  }

  if (toolsResult.error) {
    return NextResponse.json({ error: toolsResult.error.message || 'Không thể tải thống kê công cụ' }, { status: 500 });
  }

  if (usersResult.error) {
    return NextResponse.json({ error: usersResult.error.message || 'Không thể tải thống kê người dùng' }, { status: 500 });
  }

  return NextResponse.json({
    categories: categoriesResult.count ?? 0,
    tools: toolsResult.count ?? 0,
    users: usersResult.data?.total ?? 0,
  });
}
