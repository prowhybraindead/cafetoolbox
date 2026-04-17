import { createServerClient } from '@cafetoolbox/supabase';
import { ToolsPageClient } from './tools-client';

export default async function ToolsPage() {
  const supabase = await createServerClient();

  const { data: tools, error } = await supabase
    .from('tools')
    .select('*')
    .order('name');

  return (
    <ToolsPageClient
      tools={tools ?? []}
      error={error?.message ?? null}
    />
  );
}
