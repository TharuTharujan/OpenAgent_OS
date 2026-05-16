export function formatTs(ms: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(ms));
  } catch {
    return String(ms);
  }
}

export function formatJson(value: unknown, pretty = false): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, pretty ? 2 : undefined);
  } catch {
    return String(value);
  }
}
