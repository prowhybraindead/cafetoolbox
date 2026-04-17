# Project Structure Refactoring Guide

## New Architecture

This project has been refactored to use a **feature-based modular architecture**, which promotes better code organization, scalability, and maintainability.

## Directory Structure

```
codelint-ai/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API routes
│   │   │   └── terminal/
│   │   │       └── route.ts
│   │   ├── chat/                     # Chat page
│   │   │   └── page.tsx
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home page
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   └── globals.css
│   │
│   ├── features/                     # Feature modules (core business logic)
│   │   ├── editor/
│   │   │   ├── components/           # Editor-specific components
│   │   │   │   ├── code-editor.tsx
│   │   │   │   ├── code-beautifier-validator.tsx
│   │   │   │   ├── code-snippet-input.tsx
│   │   │   │   ├── html-preview.tsx
│   │   │   │   ├── terminal.tsx
│   │   │   │   └── index.ts
│   │   │   ├── hooks/                # Editor-specific hooks
│   │   │   │   ├── use-code-collaboration.ts
│   │   │   │   └── index.ts
│   │   │   ├── stores/               # Editor state management (Zustand)
│   │   │   │   ├── use-editor-store.ts
│   │   │   │   └── index.ts
│   │   │   ├── types/                # Editor-specific types
│   │   │   │   ├── editor.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts             # Feature barrel export
│   │   │
│   │   ├── chat/
│   │   │   ├── components/           # Chat/AI components
│   │   │   │   ├── ai-assistant-panel.tsx
│   │   │   │   ├── chat-box.tsx
│   │   │   │   ├── chat-history.tsx
│   │   │   │   ├── code-diff-viewer.tsx
│   │   │   │   ├── skill-selector.tsx
│   │   │   │   └── index.ts
│   │   │   ├── hooks/                # Chat-specific hooks
│   │   │   │   ├── use-gemini-skill.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts             # Feature barrel export
│   │   │
│   │   ├── layout/
│   │   │   ├── components/           # Layout components
│   │   │   │   ├── navbar.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── browser-attr-cleaner.tsx
│   │   │   │   └── index.ts
│   │   │   └── index.ts             # Feature barrel export
│   │   │
│   │   ├── home/                    # Home feature (for future expansion)
│   │   │   └── components/
│   │   │
│   │   └── index.ts                 # Main feature barrel export
│   │
│   ├── components/                  # Shared UI components (not feature-specific)
│   │   ├── ui/                      # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── tooltip.tsx
│   │   │   └── index.ts
│   │   └── common/                  # Common/shared components (if needed)
│   │
│   ├── lib/                         # Shared utilities and helpers
│   │   ├── format-code.ts
│   │   ├── json-validator.ts
│   │   ├── supabase.ts
│   │   ├── usage-actions.ts
│   │   ├── utils.ts
│   │   └── index.ts
│   │
│   ├── hooks/                       # Shared hooks (not feature-specific)
│   │   ├── use-mobile.ts
│   │   └── index.ts
│   │
│   └── types/                       # Shared types (not feature-specific)
│       └── index.ts
│
├── package.json
├── tsconfig.json                    # Updated with new path aliases
├── components.json                  # Updated for shadcn/ui
├── next.config.ts
├── postcss.config.mjs
└── README.md
```

## Key Improvements

### 1. **Feature-Based Organization**
   - Each feature (`editor`, `chat`, `layout`) has its own directory
   - Encapsulates components, hooks, stores, and types related to that feature
   - Makes it easy to locate and modify feature-specific code

### 2. **Better Scalability**
   - Easy to add new features (just create a new directory under `src/features/`)
   - Easy to remove features (delete the feature directory)
   - Reduced cognitive load when working on specific features

### 3. **Improved Code Reusability**
   - Barrel exports (`index.ts`) for clean imports
   - Shared utilities in `src/lib/`
   - Shared hooks in `src/hooks/`
   - Shared UI components in `src/components/ui/`

### 4. **Cleaner Imports**
   - Before: `import { CodeEditor } from '@/components/editor/code-editor'`
   - After: `import { CodeEditor } from '@/features/editor/components'`
   - Or even: `import { CodeEditor } from '@/features/editor'`

### 5. **Better Separation of Concerns**
   - UI components are separate from business logic
   - Stores (state management) are isolated by feature
   - Hooks are organized by their purpose

## Path Aliases in tsconfig.json

```json
{
  "paths": {
    "@/*": ["src/*"]
  }
}
```

This allows importing from:
- `@/features/editor/...`
- `@/components/ui/...`
- `@/lib/...`
- `@/hooks/...`
- And more

## Import Patterns

### Feature Components
```typescript
import { CodeEditor, HtmlPreview } from '@/features/editor/components';
// or
import { CodeEditor, HtmlPreview } from '@/features/editor';
```

### Feature Hooks
```typescript
import { useGeminiSkill } from '@/features/chat/hooks';
// or
import { useGeminiSkill } from '@/features/chat';
```

### Feature Stores
```typescript
import { useEditorStore } from '@/features/editor/stores';
// or
import { useEditorStore } from '@/features/editor';
```

### Shared Components
```typescript
import { Button, Badge } from '@/components/ui/button';
```

### Shared Utilities
```typescript
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks';
```

## Migration Notes

- All old `components/`, `hooks/`, and `store/` directories at the root are now obsolete
- The `app/` directory has been moved to `src/app/`
- All imports have been updated to reflect the new structure
- Path aliases in `tsconfig.json` are configured to point to `src/`

## Next Steps

1. Delete old directories: `app/`, `components/`, `hooks/`, `store/`, `types/` at the root
2. Run `npm run build` to ensure everything builds correctly
3. Test the application thoroughly
4. Update any external documentation or deployment scripts

## Benefits of This Structure

✅ **Maintainability** - Find related code easily
✅ **Scalability** - Add new features without cluttering existing code
✅ **Testability** - Features can be tested in isolation
✅ **Encapsulation** - Feature logic is contained within its directory
✅ **Collaboration** - Team members can work on different features independently
✅ **Performance** - Code can be split and lazy-loaded by feature

---

*This refactoring follows industry best practices for Next.js and React applications.*
