import { NextResponse } from 'next/server';
import { createAdminClient } from '@cafetoolbox/supabase';
import { assertSuperadminUser } from '../../../_lib/authz';

async function assertSuperadmin() {
  const authResult = await assertSuperadminUser();
  if ('error' in authResult) return authResult;

  const supabaseAdmin = await createAdminClient();
  return { supabaseAdmin };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const authResult = await assertSuperadmin();
  if ('error' in authResult) return authResult.error;

  const { supabaseAdmin } = authResult;
  const { categoryId } = await params;
  const body = (await request.json()) as {
    slug?: string;
    name?: string;
    description?: string;
    icon?: string;
    sort_order?: number;
  };

  const payload = {
    ...(body.slug !== undefined ? { slug: body.slug } : {}),
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.icon !== undefined ? { icon: body.icon } : {}),
    ...(body.sort_order !== undefined ? { sort_order: body.sort_order } : {}),
  };

  const { data, error } = await supabaseAdmin
    .from('categories')
    .update(payload)
    .eq('id', categoryId)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || 'Không thể cập nhật danh mục' }, { status: 500 });
  }

  return NextResponse.json({ category: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const authResult = await assertSuperadmin();
  if ('error' in authResult) return authResult.error;

  const { supabaseAdmin } = authResult;
  const { categoryId } = await params;

  const { count, error: toolCountError } = await supabaseAdmin
    .from('tools')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId);

  if (toolCountError) {
    return NextResponse.json(
      { error: toolCountError.message || 'Không thể kiểm tra công cụ thuộc danh mục' },
      { status: 500 }
    );
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Không thể xóa danh mục đang có công cụ. Hãy chuyển hoặc xóa công cụ trước.' },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('id', categoryId);

  if (error) {
    return NextResponse.json({ error: error.message || 'Không thể xóa danh mục' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
