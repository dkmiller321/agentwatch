import type { LogEvent } from "./types";

/**
 * Parse log content in CSV or JSONL format into an array of LogEvents.
 * When format is "auto", the first non-empty line is inspected to decide.
 */
export function parseLogs(
  content: string,
  format: "csv" | "jsonl" | "auto" = "auto",
): LogEvent[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  const resolvedFormat =
    format === "auto" ? detectFormat(trimmed) : format;

  return resolvedFormat === "csv" ? parseCsv(trimmed) : parseJsonl(trimmed);
}

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

function detectFormat(content: string): "csv" | "jsonl" {
  const firstLine = content.split("\n")[0].trim();
  // JSONL lines start with { — CSV lines typically start with a header word
  if (firstLine.startsWith("{")) return "jsonl";
  return "csv";
}

// ---------------------------------------------------------------------------
// CSV parser — handles common proxy log column layouts
// ---------------------------------------------------------------------------

/** Well-known column aliases mapped to LogEvent field names. */
const CSV_FIELD_MAP: Record<string, keyof LogEvent> = {
  timestamp: "timestamp",
  time: "timestamp",
  date: "timestamp",
  datetime: "timestamp",
  src_ip: "src_ip",
  source_ip: "src_ip",
  client_ip: "src_ip",
  srcip: "src_ip",
  dst_host: "dst_host",
  destination_host: "dst_host",
  host: "dst_host",
  server: "dst_host",
  dst_path: "dst_path",
  path: "dst_path",
  uri: "dst_path",
  url_path: "dst_path",
  request_uri: "dst_path",
  http_method: "http_method",
  method: "http_method",
  request_method: "http_method",
  user_agent: "user_agent",
  useragent: "user_agent",
  ua: "user_agent",
  identity: "identity",
  user: "identity",
  username: "identity",
  email: "identity",
  raw_payload: "raw_payload",
  payload: "raw_payload",
  body: "raw_payload",
  raw: "raw_payload",
};

function parseCsv(content: string): LogEvent[] {
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return []; // need header + at least one row

  const headers = splitCsvLine(lines[0]).map((h) =>
    h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
  );

  const fieldIndexes: Partial<Record<keyof LogEvent, number>> = {};
  for (let i = 0; i < headers.length; i++) {
    const mapped = CSV_FIELD_MAP[headers[i]];
    if (mapped && fieldIndexes[mapped] === undefined) {
      fieldIndexes[mapped] = i;
    }
  }

  const events: LogEvent[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const event: LogEvent = {
      timestamp: pick(values, fieldIndexes.timestamp),
      src_ip: pick(values, fieldIndexes.src_ip),
      dst_host: pick(values, fieldIndexes.dst_host),
      dst_path: pick(values, fieldIndexes.dst_path),
      http_method: pick(values, fieldIndexes.http_method),
      user_agent: pick(values, fieldIndexes.user_agent),
      identity: pick(values, fieldIndexes.identity),
      raw_payload: pick(values, fieldIndexes.raw_payload),
    };
    events.push(event);
  }
  return events;
}

/** Split a CSV line, respecting quoted fields that may contain commas. */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function pick(values: string[], index: number | undefined): string {
  if (index === undefined || index >= values.length) return "";
  return values[index];
}

// ---------------------------------------------------------------------------
// JSONL parser — handles conventional field names
// ---------------------------------------------------------------------------

/** JSONL field aliases (same approach as CSV). */
const JSONL_FIELD_MAP: Record<string, keyof LogEvent> = {
  ...CSV_FIELD_MAP,
  // camelCase variants common in JSON logs
  srcIp: "src_ip",
  sourceIp: "src_ip",
  clientIp: "src_ip",
  dstHost: "dst_host",
  destinationHost: "dst_host",
  dstPath: "dst_path",
  urlPath: "dst_path",
  requestUri: "dst_path",
  httpMethod: "http_method",
  requestMethod: "http_method",
  userAgent: "user_agent",
  rawPayload: "raw_payload",
};

function parseJsonl(content: string): LogEvent[] {
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const events: LogEvent[] = [];

  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      const event: LogEvent = {
        timestamp: "",
        src_ip: "",
        dst_host: "",
        dst_path: "",
        http_method: "",
        user_agent: "",
        identity: "",
        raw_payload: "",
      };

      for (const [key, value] of Object.entries(obj)) {
        const normalised = key.trim();
        const mapped =
          JSONL_FIELD_MAP[normalised] ??
          JSONL_FIELD_MAP[normalised.toLowerCase().replace(/[^a-z0-9_]/g, "_")];
        if (mapped) {
          event[mapped] = String(value ?? "");
        }
      }

      events.push(event);
    } catch {
      // Skip malformed JSON lines
    }
  }
  return events;
}
