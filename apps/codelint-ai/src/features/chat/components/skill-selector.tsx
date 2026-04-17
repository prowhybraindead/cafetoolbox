'use client';

import { 
  Code2, 
  ShieldCheck, 
  Zap, 
  Box, 
  Sparkles, 
  TestTube2, 
  Database
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { useEditorStore } from '@/features/editor/stores';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const SKILLS = [
  { id: 'refactoring', name: 'Refactor', icon: Code2, description: 'Clean Code & Logic' },
  { id: 'solid', name: 'SOLID', icon: Box, description: 'Architecture & SRP' },
  { id: 'optimizer', name: 'Optimize', icon: Zap, description: 'Syntax & Performance' },
  { id: 'security', name: 'Security', icon: ShieldCheck, description: 'Audit & Secrets' },
  { id: 'vibecoding', name: 'Vibe', icon: Sparkles, description: 'Style Transformation' },
  { id: 'testgen', name: 'Tests', icon: TestTube2, description: 'Unit Test Generator' },
  { id: 'mockdata', name: 'Mock', icon: Database, description: 'Data Generator' },
];

export function SkillSelector() {
  const { skill, setSkill } = useEditorStore();

  const handleSkillSelect = (id: string) => {
    setSkill(id);
  };

  return (
    <div className="flex flex-nowrap gap-2 overflow-x-auto rounded-2xl border border-border/70 bg-muted/30 p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {SKILLS.map((item) => {
        const Icon = item.icon;
        const isActive = skill === item.id;
        
        return (
          <Tooltip key={item.id}>
            <TooltipTrigger
              render={
                <button
                  onClick={() => handleSkillSelect(item.id)}
                  className={cn(
                    buttonVariants({ variant: isActive ? 'default' : 'ghost', size: 'sm' }),
                    "flex h-9 shrink-0 cursor-pointer items-center gap-2 px-3 transition-all duration-200",
                    isActive ? "scale-[1.02] shadow-sm shadow-primary/15" : "hover:bg-background active:scale-95"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                  <span className="font-medium text-xs">{item.name}</span>
                </button>
              }
            />
            <TooltipContent side="bottom">
              <p className="text-xs font-medium">{item.description}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
