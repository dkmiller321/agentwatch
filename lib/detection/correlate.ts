import type { LogEvent, AgentUpsertRecord } from "./types";

/**
 * Derive a date bucket (YYYY-MM-DD) from a timestamp string.
 * Falls back to today's date if the timestamp cannot be parsed.
 */
function dateBucket(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

/**
 * Build a composite grouping key for correlation.
 */
function groupKey(identity: string, dstHost: string, bucket: string): string {
  return `${identity}||${dstHost}||${bucket}`;
}

type TaggedEvent = LogEvent & { provider: string };

/**
 * Group tagged events by (identity, dst_host, date_bucket) and produce
 * agent upsert records suitable for writing to the database.
 */
export function correlateEvents(
  orgId: string,
  events: TaggedEvent[],
): AgentUpsertRecord[] {
  const groups = new Map<
    string,
    {
      identity: string;
      dst_host: string;
      provider: string;
      date_bucket: string;
      count: number;
      first_seen: string;
      last_seen: string;
    }
  >();

  for (const event of events) {
    const bucket = dateBucket(event.timestamp);
    const key = groupKey(event.identity, event.dst_host, bucket);

    const existing = groups.get(key);
    if (existing) {
      existing.count++;
      if (event.timestamp < existing.first_seen) {
        existing.first_seen = event.timestamp;
      }
      if (event.timestamp > existing.last_seen) {
        existing.last_seen = event.timestamp;
      }
    } else {
      groups.set(key, {
        identity: event.identity,
        dst_host: event.dst_host,
        provider: event.provider,
        date_bucket: bucket,
        count: 1,
        first_seen: event.timestamp,
        last_seen: event.timestamp,
      });
    }
  }

  const records: AgentUpsertRecord[] = [];
  for (const group of groups.values()) {
    records.push({
      org_id: orgId,
      identity: group.identity,
      dst_host: group.dst_host,
      provider: group.provider,
      date_bucket: group.date_bucket,
      event_count: group.count,
      first_seen: group.first_seen,
      last_seen: group.last_seen,
    });
  }

  return records;
}
