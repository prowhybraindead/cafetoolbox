import { DashboardNav } from '../../components/dashboard-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream">
      <DashboardNav />
      {children}
    </div>
  );
}
