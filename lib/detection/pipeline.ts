import { createServiceClient } from "@/lib/supabase/service-role";
import { parseLogs } from "./parsers";
import { fingerprint } from "./fingerprint";
import { classifyBatch } from "./classify";
import { computeRiskScore } from "./score";
import type { LogEvent, DetectionResult, FingerprintMatch } from "./types";

function isInternalOrNonHttp(event: LogEvent): boolean {
  const host = event.dst_host.toLowerCase();
  if (
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("172.16.") ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1"
  ) return true;
  if (
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".corp")
  ) return true;
  return false;
}

export async function processIngestionJob(
  jobId: string,
): Promise<DetectionResult> {
  const supabase = createServiceClient();
  const errors: string[] = [];

  // 0. Mark job as running
  await supabase
    .from("ingestion_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", jobId);

  // 1. Fetch job + download file
  const { data: job, error: jobError } = await supabase
    .from("ingestion_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    errors.push(`Failed to fetch job: ${jobError?.message ?? "not found"}`);
    return emptyResult(jobId, errors);
  }

  const { data: fileData, error: dlError } = await supabase.storage
    .from("log-uploads")
    .download(job.file_path);

  if (dlError || !fileData) {
    const msg = `Failed to download file: ${dlError?.message ?? "no data"}`;
    errors.push(msg);
    await markJobFailed(supabase, jobId, msg);
    return emptyResult(jobId, errors);
  }

  const content = await fileData.text();

  // 2. Parse
  const allEvents = parseLogs(content, "auto");
  if (allEvents.length === 0) {
    await markJobCompleted(supabase, jobId, 0);
    return emptyResult(jobId, errors);
  }

  // 3. Filter internal traffic
  const events = allEvents.filter((e) => !isInternalOrNonHttp(e));

  // 4. Fingerprint
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
  }

  // 5. LLM classify ambiguous events
  let classifiedCount = 0;
  if (ambiguous.length > 0) {
    try {
      const classifications = await classifyBatch(ambiguous);
      for (let i = 0; i < classifications.length; i++) {
        const cls = classifications[i];
        if (cls.isAgent && cls.confidence >= 0.6) {
          tagged.push({ ...ambiguous[i], provider: cls.provider ?? "unknown" });
          classifiedCount++;
        }
      }
    } catch (err) {
      errors.push(`LLM classification failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 6. Group into agents and upsert
  const orgId = job.organization_id as string;
  const agentMap = new Map<string, {
    provider: string;
    identity: string;
    destinations: Set<string>;
    eventCount: number;
    firstSeen: string;
    lastSeen: string;
    events: TaggedEvent[];
  }>();

  for (const event of tagged) {
    const key = `${event.identity}||${event.provider}`;
    const existing = agentMap.get(key);
    if (existing) {
      existing.destinations.add(event.dst_host);
      existing.eventCount++;
      if (event.timestamp < existing.firstSeen) existing.firstSeen = event.timestamp;
      if (event.timestamp > existing.lastSeen) existing.lastSeen = event.timestamp;
      existing.events.push(event);
    } else {
      agentMap.set(key, {
        provider: event.provider,
        identity: event.identity,
        destinations: new Set([event.dst_host]),
        eventCount: 1,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        events: [event],
      });
    }
  }

  let agentsUpserted = 0;
  let alertsCreated = 0;

  for (const agent of agentMap.values()) {
    const destinations = Array.from(agent.destinations);

    // Score the agent
    const { score, factors } = computeRiskScore({
      associated_identity: agent.identity,
      destinations,
      event_count_7d: agent.eventCount,
      provider: agent.provider,
      owner: null,
    });

    // Check if agent already exists
    const { data: existingAgent } = await supabase
      .from("agents")
      .select("id")
      .eq("organization_id", orgId)
      .eq("associated_identity", agent.identity)
      .eq("provider", agent.provider)
      .limit(1)
      .single();

    let agentId: string;

    if (existingAgent) {
      // Update existing
      await supabase
        .from("agents")
        .update({
          last_seen_at: agent.lastSeen,
          event_count_7d: agent.eventCount,
          destinations,
          risk_score: score,
          risk_factors: factors,
        })
        .eq("id", existingAgent.id);
      agentId = existingAgent.id;
    } else {
      // Create new agent
      const agentName = `${agent.provider} agent (${agent.identity})`;
      const { data: newAgent, error: insertError } = await supabase
        .from("agents")
        .insert({
          organization_id: orgId,
          name: agentName,
          provider: agent.provider,
          first_seen_at: agent.firstSeen,
          last_seen_at: agent.lastSeen,
          event_count_7d: agent.eventCount,
          associated_identity: agent.identity,
          destinations,
          risk_score: score,
          risk_factors: factors,
          status: "new",
          detection_rationale: `Detected via ${agent.provider} API traffic fingerprinting`,
        })
        .select("id")
        .single();

      if (insertError || !newAgent) {
        errors.push(`Agent insert failed: ${insertError?.message}`);
        continue;
      }
      agentId = newAgent.id;
    }

    agentsUpserted++;

    // Insert agent events
    const eventRows = agent.events.map((e) => ({
      organization_id: orgId,
      agent_id: agentId,
      timestamp: e.timestamp,
      source_ip: e.src_ip,
      destination_host: e.dst_host,
      destination_path: e.dst_path,
      http_method: e.http_method,
      user_agent: e.user_agent,
      identity: e.identity,
    }));

    if (eventRows.length > 0) {
      await supabase.from("agent_events").insert(eventRows);
    }

    // Create alert for high-risk agents
    if (score >= 50 && !existingAgent) {
      const severity = score >= 80 ? "critical" : score >= 65 ? "warning" : "info";
      const { error: alertError } = await supabase.from("alerts").insert({
        organization_id: orgId,
        agent_id: agentId,
        type: "new_agent" as const,
        severity: severity as "critical" | "warning" | "info",
        message: `New ${agent.provider} agent detected: ${agent.identity} (risk score: ${score})`,
      });
      if (alertError) {
        errors.push(`Alert creation failed: ${alertError.message}`);
      } else {
        alertsCreated++;
      }
    }
  }

  // 9. Mark complete
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

function emptyResult(jobId: string, errors: string[]): DetectionResult {
  return {
    job_id: jobId, total_events: 0, matched_events: 0,
    classified_events: 0, agents_upserted: 0, alerts_created: 0, errors,
  };
}

async function markJobFailed(supabase: ReturnType<typeof createServiceClient>, jobId: string, error: string) {
  await supabase.from("ingestion_jobs").update({
    status: "failed", error_message: error, finished_at: new Date().toISOString(),
  }).eq("id", jobId);
}

async function markJobCompleted(supabase: ReturnType<typeof createServiceClient>, jobId: string, eventCount: number) {
  await supabase.from("ingestion_jobs").update({
    status: "completed", event_count: eventCount, finished_at: new Date().toISOString(),
  }).eq("id", jobId);
}
