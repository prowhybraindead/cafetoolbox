'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Terminal, 
  Settings, 
  History, 
  Github,
  Cpu,
  MessageSquare,
  Moon,
  Sun
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useEditorStore, EditorLanguage } from '@/features/editor/stores';
import { cn } from '@/lib/utils';

import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const LANGUAGES: { label: string; value: EditorLanguage }[] = [
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'C++', value: 'cpp' },
  { label: 'PHP', value: 'php' },
  { label: 'Rust', value: 'rust' },
  { label: 'SQL', value: 'sql' },
  { label: 'JSON', value: 'json' },
];

type NavbarProps = {
  fixed?: boolean;
};

export function Navbar({ fixed = false }: NavbarProps) {
  const { language, setLanguage, autoSave, setAutoSave } = useEditorStore();
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('codelint_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme ? savedTheme === 'dark' : prefersDark;

    root.classList.toggle('dark', shouldUseDark);
    setIsDark(shouldUseDark);
  }, []);

  const handleAutoSaveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setAutoSave(newValue);
    localStorage.setItem('codelint_auto_save', newValue ? 'true' : 'false');
  };

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);
    document.documentElement.classList.toggle('dark', nextIsDark);
    localStorage.setItem('codelint_theme', nextIsDark ? 'dark' : 'light');
  };

  return (
    <nav
      className={cn(
        fixed ? 'fixed inset-x-0 top-0' : 'sticky top-0',
        'z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl'
      )}
      suppressHydrationWarning
    >
      <div className="mx-auto flex h-16 w-full max-w-[1680px] items-center justify-between px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-sm shadow-primary/10">
            <Cpu className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">CodeLint AI</h1>
            <p className="hidden text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/80 sm:block">Workspace kernel</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'h-9 cursor-pointer gap-1.5 rounded-full border-border/70 bg-card/80 px-2.5 sm:gap-2 sm:px-3'
                  )}
                >
                  <Terminal className="h-4 w-4" />
                  <span className="hidden text-xs font-medium sm:inline">{LANGUAGES.find((l) => l.value === language)?.label}</span>
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-40">
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.value}
                  onClick={() => setLanguage(lang.value)}
                  className="text-xs"
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden h-4 w-px bg-border/80 sm:block" />

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-foreground"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Link href="/chat" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-9 w-9 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-foreground")} title="AI Chat">
              <MessageSquare className="h-4 w-4" />
            </Link>
            <Button variant="ghost" size="icon" className="hidden h-9 w-9 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-foreground md:inline-flex">
              <History className="h-4 w-4" />
            </Button>

            <Dialog>
              <DialogTrigger
                render={
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-foreground">
                    <Settings className="h-4 w-4" />
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Settings</DialogTitle>
                  <DialogDescription>
                    Manage your editor preferences.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex items-center justify-between space-x-2">
                    <label
                      htmlFor="auto-save"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Auto-save code (every 30s)
                    </label>
                    <input
                      type="checkbox"
                      id="auto-save"
                      checked={autoSave}
                      onChange={handleAutoSaveChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-foreground md:flex")}
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
