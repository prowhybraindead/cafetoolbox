import Link from 'next/link';
import { createServerClient } from '@cafetoolbox/supabase';

export default async function ToolsPage() {
  const supabase = await createServerClient();

  // Fetch tools from database
  const { data: tools, error } = await supabase
    .from('tools')
    .select('*')
    .order('name');

  const statusLabels: Record<string, string> = {
    active: 'Hoạt động',
    beta: 'Beta',
    archived: 'Lưu trữ',
    maintenance: 'Bảo trì',
  };

  const sizeLabels: Record<string, string> = {
    small: 'Nhỏ',
    medium: 'Trung bình',
    large: 'Lớn',
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal mb-2">
            Bộ công cụ
          </h1>
          <p className="text-charcoalMuted">
            Duyệt qua tất cả công cụ hiện có trong hệ thống
          </p>
        </div>

        {/* Tools Grid */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3">
              <span
                className="iconify text-red-500"
                data-icon="lucide:alert-circle"
                data-width="20"
              />
              <p className="text-red-600 font-medium">
                Lỗi tải công cụ: {error.message}
              </p>
            </div>
          </div>
        ) : tools && tools.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="bg-white border border-borderMain rounded-xl p-6 hover:border-neon transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-charcoal rounded-lg flex items-center justify-center">
                    <span
                      className="iconify text-neon"
                      data-icon={tool.icon}
                      data-width="24"
                    />
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      tool.status === 'active'
                        ? 'bg-neonGhost text-neon'
                        : tool.status === 'beta'
                        ? 'bg-blue-100 text-blue-600'
                        : tool.status === 'archived'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-yellow-100 text-yellow-600'
                    }`}
                  >
                    {statusLabels[tool.status] || tool.status}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-charcoal mb-2">
                  {tool.name}
                </h3>
                <p className="text-sm text-charcoalMuted mb-4">
                  {tool.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-charcoalMuted">
                    Kích thước: {sizeLabels[tool.size] || tool.size}
                  </span>
                  <Link
                    href={tool.path}
                    className={`text-sm font-medium ${
                      tool.status === 'active' || tool.status === 'beta'
                        ? 'text-charcoal hover:text-neon'
                        : 'text-charcoalMuted cursor-not-allowed'
                    } transition-colors`}
                  >
                    {tool.status === 'active' || tool.status === 'beta' ? 'Mở →' : 'Không khả dụng'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-borderMain rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-borderLight rounded-full flex items-center justify-center mx-auto mb-4">
              <span
                className="iconify text-charcoalMuted"
                data-icon="lucide:package"
                data-width="32"
              />
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-2">
              Chưa có công cụ
            </h3>
            <p className="text-sm text-charcoalMuted">
              Chưa có công cụ nào trong cơ sở dữ liệu. Liên hệ quản trị viên để thêm.
            </p>
          </div>
        )}
    </main>
  );
}
