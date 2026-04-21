import { createServiceClient } from "@/lib/supabase/service-role";
import { parseLogs } from "./parsers";
import { fingerprint } from "./fingerprint";
import { classifyBatch } from "./classify";
import { correlateEvents } from "./correlate";
import { computeRiskScore } from "./score";
import type {
  LogEvent,
  DetectionResult,
  FingerprintMatch,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Events going to internal/non-HTTP destinations that should be skipped. */
function isInternalOrNonHttp(event: LogEvent): boolean {
  const host = event.dst_host.toLowerCase();
  // Skip RFC-1918 / loopback
  if (
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("172.16.") ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1"
  ) {
    return true;
  }
  // Skip common internal suffixes
  if (
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".corp")
  ) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/**
 * End-to-end detection pipeline for a single ingestion job.
 *
 * Steps:
 * 1. Download the uploaded log file from Supabase Storage.
 * 2. Parse log events.
 * 3. Filter internal / non-HTTP traffic.
 * 4. Fingerprint each event against known AI providers.
 * 5. Classify ambiguous (unmatched but suspicious) events via LLM.
 * 6. Correlate tagged events into agent records.
 * 7. Score each agent.
 * 8. Create alerts for high-risk agents.
 * 9. Update the ingestion job status.
 */
export async function processIngestionJob(
  jobId: string,
): Promise<DetectionResult> {
  const supabase = createServiceClient();
  const errors: string[] = [];

  // ---- 0. Mark job as processing ----
  await supabase
    .from("ingestion_jobs")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", jobId);

  // ---- 1. Fetch job metadata & download file ----
  const { data: job, error: jobError } = await supabase
    .from("ingestion_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    const msg = `Failed to fetch job ${jobId}: ${jobError?.message ?? "not found"}`;
    errors.push(msg);
    return emptyResult(jobId, errors);
  }

  const { data: fileData, error: dlError } = await supabase.storage
    .from("log-uploads")
    .download(job.storage_path);

  if (dlError || !fileData) {
    const msg = `Failed to download file: ${dlError?.message ?? "no data"}`;
    errors.push(msg);
    await markJobFailed(supabase, jobId, msg);
    return emptyResult(jobId, errors);
  }

  const content = await fileData.text();

  // ---- 2. Parse ----
  const allEvents = parseLogs(content, "auto");
  if (allEvents.length === 0) {
    await markJobCompleted(supabase, jobId, 0);
    return emptyResult(jobId, errors);
  }

  // ---- 3. Filter ----
  const events = allEvents.filter((e) => !isInternalOrNonHttp(e));

  // ---- 4. Fingerprint ----
  type TaggedEvent = LogEvent & { provider: string };
  const tagged: TaggedEvent[] = [];
  const ambiguous: LogEvent[] = [];

  for (const event of events) {
    const result = fingerprint(event);
    if (result.matched) {
      tagged.push({ ...event, provider: (result as FingerprintMatch).provider.name });
    } else if (result.suspicious) {
      ambiguous.push(event);
    }
    // Non-matched, non-suspicious events are dropped
  }

  // ---- 5. Classify ambiguous events via LLM ----
  let classifiedCount = 0;
  if (ambiguous.length > 0) {
    try {
      const classifications = await classifyBatch(ambiguous);
      for (let i = 0; i < classifications.length; i++) {
        const cls = classifications[i];
        if (cls.isAgent && cls.confidence >= 0.6) {
          tagged.push({
            ...ambiguous[i],
            provider: cls.provider ?? "unknown",
          });
          classifiedCount++;
        }
      }
    } catch (err) {
      errors.push(
        `LLM classification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ---- 6. Correlate ----
  const orgId = job.org_id as string;
  const agentRecords = correlateEvents(orgId, tagged);

  let agentsUpserted = 0;
  for (const record of agentRecords) {
    const { error: upsertError } = await supabase.from("agents").upsert(
      {
        org_id: record.org_id,
        identity: record.identity,
        dst_host: record.dst_host,
        provider: record.provider,
        date_bucket: record.date_bucket,
        event_count: record.event_count,
        first_seen: record.first_seen,
        last_seen: record.last_seen,
      },
      { onConflict: "org_id,identity,dst_host,date_bucket" },
    );
    if (upsertError) {
      errors.push(`Agent upsert failed: ${upsertError.message}`);
    } else {
      agentsUpserted++;
    }
  }

  // ---- 7. Score & 8. Create alerts ----
  let alertsCreated = 0;

  // Build unique agent identities for scoring
  const uniqueAgents = new Map<
    string,
    { identity: string; destinations: string[]; provider: string; eventCount: number }
  >();

  for (const record of agentRecords) {
    const key = `${record.identity}||${record.provider}`;
    const existing = uniqueAgents.get(key);
    if (existing) {
      if (!existing.destinations.includes(record.dst_host)) {
        existing.destinations.push(record.dst_host);
      }
      existing.eventCount += record.event_count;
    } else {
      uniqueAgents.set(key, {
        identity: record.identity,
        destinations: [record.dst_host],
        provider: record.provider,
        eventCount: record.event_count,
      });
    }
  }

  for (const agent of uniqueAgents.values()) {
    const { score, factors } = computeRiskScore({
      associated_identity: agent.identity,
      destinations: agent.destinations,
      event_count_7d: agent.eventCount,
      provider: agent.provider,
      owner: null, // owner not yet assigned for newly detected agents
    });

    if (score >= 50) {
      const { error: alertError } = await supabase.from("alerts").insert({
        org_id: orgId,
        identity: agent.identity,
        provider: agent.provider,
        risk_score: score,
        factors,
        severity: score >= 80 ? "critical" : score >= 65 ? "high" : "medium",
        status: "open",
      });
      if (alertError) {
        errors.push(`Alert creation failed: ${alertError.message}`);
      } else {
        alertsCreated++;
      }
    }
  }

  // ---- 9. Update job status ----
  await markJobCompleted(supabase, jobId, allEvents.length);

  return {
    job_id: jobId,
    total_events: allEvents.length,
    matched_events: tagged.length - classifiedCount,
    classified_events: classifiedCount,
    agents_upserted: agentsUpserted,
    alerts_created: alertsCreated,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function emptyResult(jobId: string, errors: string[]): DetectionResult {
  return {
    job_id: jobId,
    total_events: 0,
    matched_events: 0,
    classified_events: 0,
    agents_upserted: 0,
    alerts_created: 0,
    errors,
  };
}

async function markJobFailed(
  supabase: ReturnType<typeof createServiceClient>,
  jobId: string,
  error: string,
): Promise<void> {
  await supabase
    .from("ingestion_jobs")
    .update({
      status: "failed",
      error_message: error,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

async function markJobCompleted(
  supabase: ReturnType<typeof createServiceClient>,
  jobId: string,
  eventCount: number,
): Promise<void> {
  await supabase
    .from("ingestion_jobs")
    .update({
      status: "completed",
      event_count: eventCount,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}
