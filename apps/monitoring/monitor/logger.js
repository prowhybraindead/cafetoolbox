const LEVEL_ORDER = { debug: 0, info: 1, warn: 2, error: 3, critical: 4 };
const LOG_PRETTY = process.env.LOG_PRETTY === "true";
const _rawLevel = process.env.LOG_LEVEL?.toLowerCase();
const MIN_LEVEL = LEVEL_ORDER[_rawLevel] ?? LEVEL_ORDER.info;
const PID = process.pid;

function serializeCtx(ctx) {
  if (ctx === undefined || ctx === null) return undefined;

  if (ctx instanceof Error) {
    return { message: ctx.message, stack: ctx.stack };
  }

  if (typeof ctx !== "object" || Array.isArray(ctx)) return ctx;

  const out = {};
  for (const [k, v] of Object.entries(ctx)) {
    out[k] = v instanceof Error ? { message: v.message, stack: v.stack } : v;
  }
  return out;
}

function consoleFor(numericLevel) {
  if (numericLevel >= LEVEL_ORDER.error) return console.error;
  if (numericLevel >= LEVEL_ORDER.warn)  return console.warn;
  return console.log;
}

function emit(level, component, msg, ctx) {
  const numericLevel = LEVEL_ORDER[level] ?? LEVEL_ORDER.info;
  if (numericLevel < MIN_LEVEL) return;

  const ts = new Date().toISOString();
  const serializedCtx = serializeCtx(ctx);
  const fn = consoleFor(numericLevel);

  if (LOG_PRETTY) {
    const date = ts.replace("T", " ").replace(/\.\d{3}Z$/, "");
    const levelTag = level.toUpperCase().padEnd(8);
    let out = `[${date}] ${levelTag} ${msg}`;
    out += `\n  → component: ${component}`;
    if (serializedCtx !== undefined && serializedCtx !== null) {
      for (const [k, v] of Object.entries(serializedCtx)) {
        const display = typeof v === "object" ? JSON.stringify(v) : v;
        out += `\n  → ${k}: ${display}`;
      }
    }
    fn(out);
    return;
  }

  const entry = {
    ts,
    level,
    msg,
    ...(serializedCtx !== undefined ? { ctx: serializedCtx } : {}),
    meta: { pid: PID, component },
  };

  fn(JSON.stringify(entry));
}

export function createLogger(component = "unknown") {
  return {
    debug:    (msg, ctx) => emit("debug",    component, msg, ctx),
    info:     (msg, ctx) => emit("info",     component, msg, ctx),
    warn:     (msg, ctx) => emit("warn",     component, msg, ctx),
    error:    (msg, ctx) => emit("error",    component, msg, ctx),
    critical: (msg, ctx) => emit("critical", component, msg, ctx),
  };
}

export const logger = createLogger("monitoring");
