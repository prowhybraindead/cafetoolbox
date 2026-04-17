import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type TerminalRequest = {
  command?: string;
  cwd?: string;
};

function normalizeCwd(input?: string) {
  const fallback = process.cwd();
  if (!input) return fallback;
  if (!existsSync(input)) return fallback;
  if (!statSync(input).isDirectory()) return fallback;
  return input;
}

function resolveCd(currentCwd: string, target: string) {
  const rawTarget = target.trim() || '~';
  const nextPath = rawTarget === '~' ? process.env.USERPROFILE || currentCwd : path.resolve(currentCwd, rawTarget);

  if (!existsSync(nextPath) || !statSync(nextPath).isDirectory()) {
    return { cwd: currentCwd, error: `The system cannot find the path specified: ${rawTarget}` };
  }

  return { cwd: nextPath };
}

export async function POST(request: Request) {
  const body = (await request.json()) as TerminalRequest;
  const command = (body.command || '').trim();
  const cwd = normalizeCwd(body.cwd);

  if (!command) {
    return NextResponse.json({ stdout: '', stderr: '', code: 0, cwd });
  }

  if (command.length > 300) {
    return NextResponse.json({ error: 'Command is too long.', stdout: '', stderr: '', code: 1, cwd }, { status: 400 });
  }

  if (command.toLowerCase().startsWith('cd ')) {
    const result = resolveCd(cwd, command.slice(3));
    if ('error' in result) {
      return NextResponse.json({ error: result.error, stdout: '', stderr: '', code: 1, cwd: result.cwd }, { status: 400 });
    }
    return NextResponse.json({ stdout: '', stderr: '', code: 0, cwd: result.cwd });
  }

  return new Promise<Response>((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-Command', command], {
      cwd,
      env: process.env,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      child.kill();
      resolve(
        NextResponse.json(
          {
            error: 'Command timed out after 15 seconds.',
            stdout,
            stderr,
            code: 124,
            cwd,
          },
          { status: 408 }
        )
      );
    }, 15000);

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve(
        NextResponse.json({
          stdout,
          stderr,
          code: code ?? 0,
          cwd,
        })
      );
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve(
        NextResponse.json(
          {
            error: error.message || 'Failed to start command.',
            stdout,
            stderr,
            code: 1,
            cwd,
          },
          { status: 500 }
        )
      );
    });
  });
}
