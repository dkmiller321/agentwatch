import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type { LogEvent, Provider, FingerprintResult } from "./types";

// ---------------------------------------------------------------------------
// Load provider signatures at module initialisation
// ---------------------------------------------------------------------------

interface ProvidersFile {
  providers: Provider[];
}

const providersPath = path.join(process.cwd(), "detection", "providers.yml");
const providersRaw = fs.readFileSync(providersPath, "utf-8");
const { providers } = yaml.load(providersRaw) as ProvidersFile;

/** Pre-compiled regex for each provider to avoid repeated compilation. */
interface CompiledProvider {
  provider: Provider;
  destinationRegexes: RegExp[];
  userAgentRegexes: RegExp[];
  pathRegexes: RegExp[];
}

const compiled: CompiledProvider[] = providers.map((p) => ({
  provider: p,
  destinationRegexes: p.destination_patterns.map((r) => new RegExp(r, "i")),
  userAgentRegexes: p.user_agent_patterns.map((r) => new RegExp(r, "i")),
  pathRegexes: p.path_patterns.map((r) => new RegExp(r, "i")),
}));

// ---------------------------------------------------------------------------
// Heuristic patterns for detecting "suspicious" non-matched traffic that
// might still be AI-related (e.g. self-hosted models, proxies).
// ---------------------------------------------------------------------------

const SUSPICIOUS_PATTERNS = [
  /\bllm\b/i,
  /\bgpt\b/i,
  /\bclaude\b/i,
  /\bchat.completion/i,
  /\bembedding/i,
  /\binference\b/i,
  /\bmodel\b.*\binvoke\b/i,
  /\/v1\/chat\b/i,
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Attempt to match a log event against known AI provider signatures.
 *
 * Confidence is computed from how many signal categories matched:
 *   - destination host match: +0.50
 *   - user-agent match:       +0.25
 *   - path match:             +0.25
 */
export function fingerprint(event: LogEvent): FingerprintResult {
  let bestMatch: { provider: Provider; confidence: number } | null = null;

  for (const entry of compiled) {
    let confidence = 0;

    const dstMatch = entry.destinationRegexes.some((re) =>
      re.test(event.dst_host),
    );
    if (dstMatch) confidence += 0.5;

    const uaMatch = entry.userAgentRegexes.some((re) =>
      re.test(event.user_agent),
    );
    if (uaMatch) confidence += 0.25;

    const pathMatch = entry.pathRegexes.some((re) => re.test(event.dst_path));
    if (pathMatch) confidence += 0.25;

    if (confidence > 0 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = { provider: entry.provider, confidence };
    }
  }

  if (bestMatch) {
    return { matched: true, provider: bestMatch.provider, confidence: bestMatch.confidence };
  }

  // No provider matched — check if the event looks suspicious anyway
  const combinedText = `${event.dst_host} ${event.dst_path} ${event.user_agent}`;
  const suspicious = SUSPICIOUS_PATTERNS.some((re) => re.test(combinedText));

  return { matched: false, suspicious };
}
