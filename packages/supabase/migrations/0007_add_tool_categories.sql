-- ============================================
-- CafeToolbox - Add Tool Categories
-- Version: 0007
-- Purpose: Create categories table, add category_id to tools, seed default categories
-- ============================================

-- ============================================
-- 1. CATEGORIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'lucide:folder',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);

-- Updated_at trigger
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. RLS POLICIES FOR CATEGORIES
-- ============================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read categories
CREATE POLICY "Categories: Public read"
  ON public.categories FOR SELECT
  USING (true);

-- Superadmin can insert categories
CREATE POLICY "Categories: Superadmins can insert"
  ON public.categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- Superadmin can update categories
CREATE POLICY "Categories: Superadmins can update"
  ON public.categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- Superadmin can delete categories
CREATE POLICY "Categories: Superadmins can delete"
  ON public.categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'superadmin'
    )
  );

-- ============================================
-- 3. ADD category_id TO TOOLS TABLE
-- ============================================

ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tools_category_id ON public.tools(category_id);

-- ============================================
-- 4. SEED DEFAULT CATEGORIES
-- ============================================

INSERT INTO public.categories (slug, name, description, icon, sort_order) VALUES
  ('code', 'Chuyên Code', 'Các công cụ hỗ trợ lập trình: JSON formatter, UUID generator, JWT decoder, regex tester...', 'lucide:code-2', 1),
  ('design', 'Thiết kế', 'Công cụ cho designer: color picker, gradient generator, shadow builder...', 'lucide:palette', 2),
  ('text', 'Văn bản & Nội dung', 'Xử lý văn bản: lorem ipsum, markdown preview, case converter, text diff...', 'lucide:file-text', 3),
  ('network', 'Mạng & API', 'Công cụ mạng: URL parser, HTTP status codes, JSON to TypeScript...', 'lucide:globe', 4)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 5. UPDATE HELPER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
