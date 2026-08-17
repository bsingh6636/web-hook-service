
// console.log(str, obj) formats obj with util.inspect's default depth of 2 —
// anything nested deeper (a webhook payload, an Expert record) collapses to
// `[Object]`/`[Array]` before Vercel ever captures the line. Emitting one
// JSON.stringify'd line per call keeps the full structure and stays on one
// line, so Vercel's log viewer renders it as a single structured entry
// instead of splitting or truncating it.
const serialize = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (Buffer.isBuffer(value)) {
    return `[Buffer: ${value.length} bytes]`;
  }
  if (Array.isArray(value)) {
    return value.map((item) => serialize(item, seen));
  }
  if (value !== null && typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    try {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        result[key] = serialize(val, seen);
      }
      return result;
    } finally {
      seen.delete(value);
    }
  }
  return value;
};

const write = (level: 'info' | 'error', args: unknown[]) => {
  const [message, ...rest] = args;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(rest.length === 1 ? { data: serialize(rest[0]) } : rest.length > 1 ? { data: serialize(rest) } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
};

const logger = {
  info: (...args: unknown[]) => write('info', args),
  error: (...args: unknown[]) => write('error', args),
};

export default logger;
