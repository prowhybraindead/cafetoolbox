import { NextResponse } from 'next/server';
import { createAdminClient } from '@cafetoolbox/supabase';
import { assertSuperadminUser } from '../../_lib/authz';

function parseStack(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function assertSuperadmin() {
  const authResult = await assertSuperadminUser();
  if ('error' in authResult) return { error: authResult.error };

  const supabaseAdmin = await createAdminClient();
  return { supabaseAdmin };
}

export async function GET() {
  const authResult = await assertSuperadmin();
  if ('error' in authResult) return authResult.error;

  const { supabaseAdmin } = authResult;
  const [toolsResult, categoriesResult] = await Promise.all([
    supabaseAdmin.from('tools').select('*').order('name'),
    supabaseAdmin.from('categories').select('id, name, slug, icon').order('sort_order'),
  ]);

  if (toolsResult.error) {
    return NextResponse.json({ error: toolsResult.error.message || 'Không thể tải công cụ' }, { status: 500 });
  }

  if (categoriesResult.error) {
    return NextResponse.json({ error: categoriesResult.error.message || 'Không thể tải danh mục' }, { status: 500 });
  }

  const tools = (toolsResult.data ?? []).map((tool) => ({
    ...tool,
    stack: Array.isArray(tool.stack) ? tool.stack.join(', ') : String(tool.stack ?? ''),
  }));

  return NextResponse.json({
    tools,
    categories: categoriesResult.data ?? [],
  });
}

export async function POST(request: Request) {
  const authResult = await assertSuperadmin();
  if ('error' in authResult) return authResult.error;

  const { supabaseAdmin } = authResult;
  const body = (await request.json()) as {
    name: string;
    slug: string;
    description?: string;
    status?: string;
    size?: string;
    path?: string;
    icon?: string;
    stack?: string;
    category_id?: string | null;
  };

  const payload = {
    name: body.name,
    slug: body.slug,
    description: body.description ?? '',
    status: body.status ?? 'beta',
    size: body.size ?? 'small',
    path: body.path || `/tools/${body.slug}`,
    icon: body.icon ?? 'lucide:wrench',
    stack: parseStack(body.stack),
    category_id: body.category_id || null,
  };

  const { data, error } = await supabaseAdmin
    .from('tools')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || 'Không thể tạo công cụ' }, { status: 500 });
  }

  return NextResponse.json({
    tool: {
      ...data,
      stack: Array.isArray(data.stack) ? data.stack.join(', ') : String(data.stack ?? ''),
    },
  });
}
