'use client';

import React from 'react';
import { logUsageAction } from '@/lib/usage-actions';

type TerminalResponse = {
  stdout: string;
  stderr: string;
  code: number;
  cwd: string;
  error?: string;
};

export function Terminal() {
  const [lines, setLines] = React.useState<string[]>([
    'CodeLint AI Terminal',
    'Running on local Node runtime.',
    '',
  ]);
  const [input, setInput] = React.useState('');
  const [cwd, setCwd] = React.useState('C:\\Users\\PCPV\\Code\\codelint-ai');
  const [isRunning, setIsRunning] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines, isRunning]);

  const appendOutput = React.useCallback((text: string) => {
    if (!text) return;
    setLines((prev) => [...prev, ...text.replace(/\r/g, '').split('\n')]);
  }, []);

  const runCommand = React.useCallback(async () => {
    const command = input.trim();
    if (!command || isRunning) return;

    const commandHead = command.split(/\s+/)[0]?.toLowerCase() || '';

    setLines((prev) => [...prev, `${cwd}> ${command}`]);
    setInput('');

    void logUsageAction({
      actionName: 'terminal_command_executed',
      actionSource: 'terminal_component',
      metadata: {
        commandHead,
        cwd,
      },
    });

    if (command.toLowerCase() === 'clear') {
      setLines([]);
      return;
    }

    setIsRunning(true);
    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, cwd }),
      });

      const data = (await response.json()) as TerminalResponse;

      if (!response.ok) {
        appendOutput(data.error || 'Command failed.');
        void logUsageAction({
          actionName: 'terminal_command_failed',
          actionSource: 'terminal_component',
          metadata: {
            commandHead,
            status: response.status,
            code: data.code,
          },
        });
      } else {
        appendOutput(data.stdout);
        appendOutput(data.stderr);
        setCwd(data.cwd || cwd);
        void logUsageAction({
          actionName: 'terminal_command_succeeded',
          actionSource: 'terminal_component',
          metadata: {
            commandHead,
            code: data.code,
          },
        });
      }
    } catch {
      appendOutput('Failed to execute command.');
      void logUsageAction({
        actionName: 'terminal_command_failed',
        actionSource: 'terminal_component',
        metadata: {
          commandHead,
          reason: 'network_or_runtime_error',
        },
      });
    } finally {
      setIsRunning(false);
      setLines((prev) => [...prev, '']);
    }
  }, [appendOutput, cwd, input, isRunning]);

  return (
    <div className="flex h-full w-full flex-col gap-2 overflow-hidden rounded-2xl border border-border/70 bg-card/90 p-3 text-foreground">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Terminal</p>
          <p className="text-xs text-muted-foreground">Local Node runtime</p>
        </div>
        <div className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
          Ready
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto rounded-2xl border border-border/70 bg-slate-950 p-3 font-mono text-xs leading-5 whitespace-pre-wrap text-slate-200 pr-2">
        {lines.map((line, index) => (
          <div key={`${index}-${line}`}>{line}</div>
        ))}
        {isRunning ? <div>Running...</div> : null}
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 py-2 font-mono text-xs">
        <span className="text-primary">$</span>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void runCommand();
            }
          }}
          disabled={isRunning}
          className="flex-1 bg-transparent outline-none text-foreground"
          placeholder="Type a command, e.g. npm -v"
        />
      </div>
    </div>
  );
}
