import { NextResponse } from 'next/server';
import { createAdminClient } from '@cafetoolbox/supabase';
import { assertSuperadminUser } from '../../../_lib/authz';

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
  if ('error' in authResult) return authResult;

  const supabaseAdmin = await createAdminClient();
  return { supabaseAdmin };
}

export async function PATCH(request: Request, context: { params: Promise<{ toolId: string }> }) {
  const authResult = await assertSuperadmin();
  if ('error' in authResult) return authResult.error;

  const { supabaseAdmin } = authResult;
  const { toolId } = await context.params;

  const body = (await request.json()) as {
    name?: string;
    slug?: string;
    description?: string;
    status?: string;
    size?: string;
    path?: string;
    icon?: string;
    stack?: string;
    category_id?: string | null;
  };

  const updates: Record<string, unknown> = {};

  if (typeof body.name === 'string') updates.name = body.name;
  if (typeof body.slug === 'string') updates.slug = body.slug;
  if (typeof body.description === 'string') updates.description = body.description;
  if (typeof body.status === 'string') updates.status = body.status;
  if (typeof body.size === 'string') updates.size = body.size;
  if (typeof body.path === 'string') updates.path = body.path;
  if (typeof body.icon === 'string') updates.icon = body.icon;
  if (typeof body.stack === 'string') updates.stack = parseStack(body.stack);
  if (body.category_id === null || typeof body.category_id === 'string') updates.category_id = body.category_id || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Không có dữ liệu để cập nhật' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('tools')
    .update(updates)
    .eq('id', toolId)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || 'Không thể cập nhật công cụ' }, { status: 500 });
  }

  return NextResponse.json({
    tool: {
      ...data,
      stack: Array.isArray(data.stack) ? data.stack.join(', ') : String(data.stack ?? ''),
    },
  });
}

export async function DELETE(_: Request, context: { params: Promise<{ toolId: string }> }) {
  const authResult = await assertSuperadmin();
  if ('error' in authResult) return authResult.error;

  const { supabaseAdmin } = authResult;
  const { toolId } = await context.params;

  const { error } = await supabaseAdmin.from('tools').delete().eq('id', toolId);

  if (error) {
    return NextResponse.json({ error: error.message || 'Không thể xóa công cụ' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
