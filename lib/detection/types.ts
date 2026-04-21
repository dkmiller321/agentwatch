/** A single parsed log event from an ingested proxy/firewall log. */
export interface LogEvent {
  timestamp: string;
  src_ip: string;
  dst_host: string;
  dst_path: string;
  http_method: string;
  user_agent: string;
  identity: string;
  raw_payload: string;
}

/** Schema for a provider entry loaded from providers.yml. */
export interface Provider {
  name: string;
  friendly_name: string;
  destination_patterns: string[];
  user_agent_patterns: string[];
  path_patterns: string[];
}

/** Result returned when fingerprinting successfully matches a provider. */
export interface FingerprintMatch {
  matched: true;
  provider: Provider;
  confidence: number;
}

/** Result returned when fingerprinting does not match any provider. */
export interface FingerprintMiss {
  matched: false;
  suspicious: boolean;
}

export type FingerprintResult = FingerprintMatch | FingerprintMiss;

/** LLM classification result for a single log event. */
export interface ClassificationResult {
  isAgent: boolean;
  provider: string | null;
  confidence: number;
  rationale: string;
}

/** Agent record ready to be upserted into the database. */
export interface AgentUpsertRecord {
  org_id: string;
  identity: string;
  dst_host: string;
  provider: string;
  date_bucket: string;
  event_count: number;
  first_seen: string;
  last_seen: string;
}

/** The final output of the full detection pipeline for one ingestion job. */
export interface DetectionResult {
  job_id: string;
  total_events: number;
  matched_events: number;
  classified_events: number;
  agents_upserted: number;
  alerts_created: number;
  errors: string[];
}
