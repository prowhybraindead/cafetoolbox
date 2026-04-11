'use client';

import { useEffect, useState } from 'react';

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  created_at: string;
};

type Tool = {
  id: string;
  name: string;
  category_id: string | null;
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formSlug, setFormSlug] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('lucide:folder');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [showForm, setShowForm] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/categories', { cache: 'no-store' });
      const result = (await response.json()) as {
        error?: string;
        categories?: Category[];
        tools?: Tool[];
      };

      if (!response.ok) {
        setError(result.error || 'Không thể tải dữ liệu danh mục');
        return;
      }

      setCategories(result.categories ?? []);
      setTools(result.tools ?? []);
    } catch {
      setError('Không thể tải dữ liệu danh mục');
    }
    setLoading(false);
  }

  function resetForm() {
    setEditingId(null);
    setFormSlug('');
    setFormName('');
    setFormDescription('');
    setFormIcon('lucide:folder');
    setFormSortOrder(0);
    setShowForm(false);
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setFormSlug(cat.slug);
    setFormName(cat.name);
    setFormDescription(cat.description);
    setFormIcon(cat.icon);
    setFormSortOrder(cat.sort_order);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      slug: formSlug,
      name: formName,
      description: formDescription,
      icon: formIcon,
      sort_order: formSortOrder,
    };

    try {
      const response = await fetch(
        editingId ? `/api/admin/categories/${editingId}` : '/api/admin/categories',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error || 'Không thể lưu danh mục');
      } else {
        setSuccess(editingId ? 'Đã cập nhật danh mục' : 'Đã tạo danh mục mới');
        resetForm();
        await loadData();
      }
    } catch {
      setError('Không thể lưu danh mục');
    }

    setSaving(false);
  }

  async function handleDelete(id: string) {
    const toolsInCategory = tools.filter((t) => t.category_id === id);
    if (toolsInCategory.length > 0) {
      setError(`Không thể xóa: đang có ${toolsInCategory.length} công cụ trong danh mục này. Hãy chuyển công cụ sang danh mục khác trước.`);
      setDeleteId(null);
      return;
    }

    try {
      const response = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error || 'Không thể xóa danh mục');
      } else {
        setSuccess('Đã xóa danh mục');
        setDeleteId(null);
        await loadData();
      }
    } catch {
      setError('Không thể xóa danh mục');
    }
  }

  function getToolCount(categoryId: string) {
    return tools.filter((t) => t.category_id === categoryId).length;
  }

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
          <h1 className="text-2xl font-bold text-charcoal">Quản lý Danh mục</h1>
          <p className="text-sm text-charcoalMuted mt-1">Tạo, sửa, xóa nhóm phân loại công cụ</p>
        </div>
        <button
          onClick={startCreate}
          className="bg-charcoal text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-charcoalLight transition-colors flex items-center gap-2"
        >
          <span className="iconify" data-icon="lucide:plus" data-width="16" />
          Tạo danh mục
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
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-charcoal mb-5">
              {editingId ? 'Chỉnh sửa danh mục' : 'Tạo danh mục mới'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">Slug</label>
                  <input
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="code, design, text..."
                    required
                    className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">Tên hiển thị</label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Chuyên Code"
                    required
                    className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Mô tả</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Mô tả ngắn về danh mục này"
                  rows={2}
                  className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">Icon</label>
                  <input
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    placeholder="lucide:code-2"
                    className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">Thứ tự</label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 border border-borderMain rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neon/50"
                  />
                </div>
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
            <h3 className="text-lg font-semibold text-charcoal text-center mb-2">Xóa danh mục?</h3>
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

      {/* Categories Table */}
      {categories.length === 0 ? (
        <div className="bg-white border border-borderMain rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-borderLight rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="iconify text-charcoalMuted" data-icon="lucide:folder" data-width="32" />
          </div>
          <h3 className="text-lg font-semibold text-charcoal mb-2">Chưa có danh mục</h3>
          <p className="text-sm text-charcoalMuted">Tạo danh mục đầu tiên để phân loại công cụ.</p>
        </div>
      ) : (
        <div className="bg-white border border-borderMain rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-borderMain bg-cream/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-charcoalMuted uppercase tracking-wider">Danh mục</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-charcoalMuted uppercase tracking-wider">Slug</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-charcoalMuted uppercase tracking-wider">Công cụ</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-charcoalMuted uppercase tracking-wider">Thứ tự</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-charcoalMuted uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b border-borderMain last:border-0 hover:bg-cream/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-charcoal rounded-lg flex items-center justify-center shrink-0">
                        <span className="iconify text-neon" data-icon={cat.icon} data-width="14" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-charcoal">{cat.name}</p>
                        {cat.description && (
                          <p className="text-xs text-charcoalMuted truncate max-w-[200px]">{cat.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <code className="text-xs bg-cream px-2 py-1 rounded text-charcoalMuted font-mono">/{cat.slug}</code>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-xs bg-neonGhost text-neon px-2 py-0.5 rounded-full font-medium">
                      {getToolCount(cat.id)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm text-charcoalMuted">{cat.sort_order}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-2 rounded-lg hover:bg-cream transition-colors"
                        title="Chỉnh sửa"
                      >
                        <span className="iconify text-charcoalMuted hover:text-charcoal" data-icon="lucide:pencil" data-width="15" />
                      </button>
                      <button
                        onClick={() => setDeleteId(cat.id)}
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
