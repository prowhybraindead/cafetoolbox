'use client';

import { useEffect, useState } from 'react';

type Tool = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  size: string;
  path: string;
  icon: string;
  stack: string;
  category_id: string | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Hoạt động' },
  { value: 'beta', label: 'Beta' },
  { value: 'archived', label: 'Lưu trữ' },
  { value: 'maintenance', label: 'Bảo trì' },
];

const SIZE_OPTIONS = [
  { value: 'small', label: 'Nhỏ' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'large', label: 'Lớn' },
];

export default function AdminToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    status: 'beta',
    size: 'small',
    path: '',
    icon: 'lucide:wrench',
    stack: '',
    category_id: '',
  });

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/tools', { cache: 'no-store' });
      const result = (await response.json()) as {
        error?: string;
        tools?: Tool[];
        categories?: Category[];
      };

      if (!response.ok) {
        setError(result.error || 'Không thể tải dữ liệu công cụ');
        return;
      }

      setTools(result.tools ?? []);
      setCategories(result.categories ?? []);
    } catch {
      setError('Không thể tải dữ liệu công cụ');
    }
    setLoading(false);
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      name: '',
      slug: '',
      description: '',
      status: 'beta',
      size: 'small',
      path: '',
      icon: 'lucide:wrench',
      stack: '',
      category_id: '',
    });
    setShowForm(false);
  }

  function startEdit(tool: Tool) {
    setEditingId(tool.id);
    setForm({
      name: tool.name,
      slug: tool.slug,
      description: tool.description || '',
      status: tool.status,
      size: tool.size,
      path: tool.path || '',
      icon: tool.icon || 'lucide:wrench',
      stack: tool.stack || '',
      category_id: tool.category_id || '',
    });
    setShowForm(true);
    setError('');
    setSuccess('');
    setDeleteId(null);
  }

  function startCreate() {
    resetForm();
    setShowForm(true);
    setError('');
    setSuccess('');
    setDeleteId(null);
  }

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Auto-generate slug from name
    if (field === 'name') {
      setForm((prev) => ({
        ...prev,
        slug: value
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim(),
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description,
      status: form.status,
      size: form.size,
      path: form.path || `/tools/${form.slug}`,
      icon: form.icon,
      stack: form.stack,
      category_id: form.category_id || null,
    };

    try {
      const response = await fetch(
        editingId ? `/api/admin/tools/${editingId}` : '/api/admin/tools',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error || 'Không thể lưu công cụ');
      } else {
        setSuccess(editingId ? 'Đã cập nhật công cụ' : 'Đã tạo công cụ mới');
        resetForm();
        await loadData();
      }
    } catch {
      setError('Không thể lưu công cụ');
    }

    setSaving(false);
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/admin/tools/${id}`, { method: 'DELETE' });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error || 'Không thể xóa công cụ');
      } else {
        setSuccess('Đã xóa công cụ');
        setDeleteId(null);
        await loadData();
      }
    } catch {
      setError('Không thể xóa công cụ');
    }
  }

  function getCategoryName(categoryId: string | null) {
    if (!categoryId) return '—';
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name ?? '—';
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    beta: 'bg-blue-100 text-blue-700',
    archived: 'bg-gray-100 text-gray-600',
    maintenance: 'bg-yellow-100 text-yellow-700',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-charcoalMuted">Đang tải...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Quản lý Công cụ</h1>
          <p className="text-sm text-charcoalMuted mt-1">Thêm, sửa, xóa và phân loại công cụ</p>
        </div>
        <button
          onClick={startCreate}
          className="bg-charcoal text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-charcoalLight transition-colors flex items-center gap-2"
        >
          <span className="iconify" data-icon="lucide:plus" data-width="16" />
          Thêm công cụ
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <span className="iconify text-red-500" data-icon="lucide:alert-circle" data-width="18" />
          <p className="text-sm text-red-600 flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            <span className="iconify" data-icon="lucide:x" data-width="16" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <span className="iconify text-green-500" data-icon="lucide:check-circle" data-width="18" />
          <p className="text-sm text-green-600 flex-1">{success}</p>
          <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-600">
            <span className="iconify" data-icon="lucide:x" data-width="16" />
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => resetForm()}>
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-charcoal mb-5">
              {editingId ? 'Chỉnh sửa công cụ' : 'Thêm công cụ mới'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">Tên công cụ</label>
                  <input
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="JSON Formatter"
                    required
                    className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">Slug</label>
                  <input
                    value={form.slug}
                    onChange={(e) => updateForm('slug', e.target.value)}
                    placeholder="json-formatter"
                    required
                    className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  placeholder="Mô tả ngắn về công cụ"
                  rows={2}
                  className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">Danh mục</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => updateForm('category_id', e.target.value)}
                    className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50 bg-white"
                  >
                    <option value="">— Chưa phân loại —</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">Trạng thái</label>
                  <select
                    value={form.status}
                    onChange={(e) => updateForm('status', e.target.value)}
                    className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50 bg-white"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">Kích thước</label>
                  <select
                    value={form.size}
                    onChange={(e) => updateForm('size', e.target.value)}
                    className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50 bg-white"
                  >
                    {SIZE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">Path</label>
                  <input
                    value={form.path}
                    onChange={(e) => updateForm('path', e.target.value)}
                    placeholder="/tools/json-formatter (tự động nếu trống)"
                    className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">Icon</label>
                  <input
                    value={form.icon}
                    onChange={(e) => updateForm('icon', e.target.value)}
                    placeholder="lucide:code-2"
                    className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Stack (tech tags, comma separated)</label>
                <input
                  value={form.stack}
                  onChange={(e) => updateForm('stack', e.target.value)}
                  placeholder="nextjs, react, typescript"
                  className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm text-charcoalMuted hover:text-charcoal"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-charcoal text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-charcoalLight transition-colors"
                >
                  {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="iconify text-red-500" data-icon="lucide:trash-2" data-width="24" />
            </div>
            <h3 className="text-lg font-semibold text-charcoal text-center mb-2">Xóa công cụ?</h3>
            <p className="text-sm text-charcoalMuted text-center mb-6">Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 border border-borderMain rounded-lg text-sm text-charcoalMuted hover:text-charcoal"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tools Table */}
      {tools.length === 0 ? (
        <div className="bg-white border border-borderMain rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-borderLight rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="iconify text-charcoalMuted" data-icon="lucide:package" data-width="32" />
          </div>
          <h3 className="text-lg font-semibold text-charcoal mb-2">Chưa có công cụ</h3>
          <p className="text-sm text-charcoalMuted">Bấm &quot;Thêm công cụ&quot; để tạo công cụ đầu tiên.</p>
        </div>
      ) : (
        <div className="bg-white border border-borderMain rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-borderMain bg-cream/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-charcoalMuted uppercase tracking-wider">Công cụ</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-charcoalMuted uppercase tracking-wider">Danh mục</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-charcoalMuted uppercase tracking-wider">Trạng thái</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-charcoalMuted uppercase tracking-wider">Size</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-charcoalMuted uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((tool) => (
                <tr key={tool.id} className="border-b border-borderMain last:border-0 hover:bg-cream/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-charcoal rounded-lg flex items-center justify-center shrink-0">
                        <span className="iconify text-neon" data-icon={tool.icon || 'lucide:wrench'} data-width="14" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-charcoal">{tool.name}</p>
                        <p className="text-xs text-charcoalMuted font-mono">/{tool.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-charcoalMuted">{getCategoryName(tool.category_id)}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[tool.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_OPTIONS.find((s) => s.value === tool.status)?.label || tool.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-xs text-charcoalMuted">
                      {SIZE_OPTIONS.find((s) => s.value === tool.size)?.label || tool.size}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(tool)}
                        className="p-2 rounded-lg hover:bg-cream transition-colors"
                        title="Chỉnh sửa"
                      >
                        <span className="iconify text-charcoalMuted hover:text-charcoal" data-icon="lucide:pencil" data-width="15" />
                      </button>
                      <button
                        onClick={() => setDeleteId(tool.id)}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Xóa"
                      >
                        <span className="iconify text-charcoalMuted hover:text-red-500" data-icon="lucide:trash-2" data-width="15" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
