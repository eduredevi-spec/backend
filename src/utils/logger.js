const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "authorization",
  "email",
];

const redact = (meta) => {
  if (!meta || typeof meta !== "object") return meta;
  return Object.fromEntries(
    Object.entries(meta).map(([k, v]) =>
      SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))
        ? [k, "[REDACTED]"]
        : [k, v],
    ),
  );
};

const log = (level, msg, meta) => {
  const entry = {
    level,
    msg,
    ...(meta ? redact(meta) : {}),
    ts: new Date().toISOString(),
  };
  const output = JSON.stringify(entry);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.log(output);
};

export const logger = {
  info: (msg, meta) => log("info", msg, meta),
  warn: (msg, meta) => log("warn", msg, meta),
  error: (msg, meta) => log("error", msg, meta),
};
