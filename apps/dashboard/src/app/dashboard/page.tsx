import { createServerClient } from '@cafetoolbox/supabase';
import { DashboardHomeClient } from './dashboard-home-client';

export default async function DashboardPage() {
  const supabase = await createServerClient();

  // Fetch tools count
  const { count: toolsCount } = await supabase
    .from('tools')
    .select('*', { count: 'exact', head: true });

  // Fetch active services count
  const { count: servicesCount } = await supabase
    .from('services')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'operational');

  const { data: servicesRaw } = await supabase
    .from('services')
    .select('status, uptime');

  const services = servicesRaw || [];

  return (
    <DashboardHomeClient
      toolsCount={toolsCount ?? 0}
      servicesCount={servicesCount ?? 0}
      services={services.map((s) => ({ status: s.status, uptime: Number(s.uptime || 0) }))}
    />
  );
}

