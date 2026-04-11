import { NextResponse } from 'next/server';
import { createAdminClient } from '@cafetoolbox/supabase';
import { assertSuperadminUser } from '../../_lib/authz';

async function assertSuperadmin() {
  const authResult = await assertSuperadminUser();
  if ('error' in authResult) return authResult;

  const supabaseAdmin = await createAdminClient();
  return { supabaseAdmin };
}

export async function GET() {
  const authResult = await assertSuperadmin();
  if ('error' in authResult) return authResult.error;

  const { supabaseAdmin } = authResult;

  const [categoriesResult, toolsResult] = await Promise.all([
    supabaseAdmin.from('categories').select('*').order('sort_order', { ascending: true }),
    supabaseAdmin.from('tools').select('id, name, category_id'),
  ]);

  if (categoriesResult.error) {
    return NextResponse.json({ error: categoriesResult.error.message || 'Không thể tải danh mục' }, { status: 500 });
  }

  if (toolsResult.error) {
    return NextResponse.json({ error: toolsResult.error.message || 'Không thể tải công cụ' }, { status: 500 });
  }

  return NextResponse.json({
    categories: categoriesResult.data ?? [],
    tools: toolsResult.data ?? [],
  });
}

export async function POST(request: Request) {
  const authResult = await assertSuperadmin();
  if ('error' in authResult) return authResult.error;

  const { supabaseAdmin } = authResult;
  const body = (await request.json()) as {
    slug: string;
    name: string;
    description?: string;
    icon?: string;
    sort_order?: number;
  };

  const payload = {
    slug: body.slug,
    name: body.name,
    description: body.description ?? '',
    icon: body.icon ?? 'lucide:folder',
    sort_order: body.sort_order ?? 0,
  };

  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || 'Không thể tạo danh mục' }, { status: 500 });
  }

  return NextResponse.json({ category: data });
}
