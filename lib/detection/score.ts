/**
 * Risk scoring engine for detected AI agents.
 *
 * Five factors are evaluated, each producing a 0-1 value that is then
 * weighted. The final score is the weighted sum, scaled to 0-100.
 */

interface AgentForScoring {
  associated_identity: string;
  destinations: string[];
  event_count_7d: number;
  provider: string;
  owner: string | null;
}

interface Factor {
  value: number;
  weight: number;
  explanation: string;
}

interface RiskScoreResult {
  score: number;
  factors: Record<string, Factor>;
}

// ---------------------------------------------------------------------------
// Identity sensitivity
// ---------------------------------------------------------------------------

/** Keywords in identities that suggest elevated-privilege accounts. */
const SENSITIVE_IDENTITY_PATTERNS = [
  /admin/i,
  /root/i,
  /service[-_]?account/i,
  /system/i,
  /deploy/i,
  /ci[-_]?cd/i,
  /pipeline/i,
  /automation/i,
  /infra/i,
  /sre/i,
];

function identitySensitivity(identity: string): Factor {
  const matches = SENSITIVE_IDENTITY_PATTERNS.filter((re) =>
    re.test(identity),
  );
  const value = Math.min(1, matches.length * 0.5);
  return {
    value,
    weight: 0.25,
    explanation:
      matches.length > 0
        ? `Identity "${identity}" matches sensitive patterns: high-privilege account`
        : `Identity "${identity}" does not match known sensitive patterns`,
  };
}

// ---------------------------------------------------------------------------
// System / destination sensitivity
// ---------------------------------------------------------------------------

const SENSITIVE_DESTINATION_PATTERNS = [
  /prod/i,
  /payment/i,
  /billing/i,
  /auth/i,
  /iam/i,
  /vault/i,
  /secret/i,
  /kms/i,
  /database/i,
  /\.internal\./i,
];

function systemSensitivity(destinations: string[]): Factor {
  const sensitiveCount = destinations.filter((d) =>
    SENSITIVE_DESTINATION_PATTERNS.some((re) => re.test(d)),
  ).length;
  const value = Math.min(1, sensitiveCount / Math.max(destinations.length, 1));
  return {
    value,
    weight: 0.2,
    explanation:
      sensitiveCount > 0
        ? `${sensitiveCount} of ${destinations.length} destination(s) match sensitive system patterns`
        : "No destinations match sensitive system patterns",
  };
}

// ---------------------------------------------------------------------------
// Volume factor
// ---------------------------------------------------------------------------

/**
 * Score volume on a logarithmic scale.
 * < 10 events/week   = low  (0.1)
 * 10-100              = moderate (0.3-0.5)
 * 100-1000            = elevated (0.5-0.8)
 * > 1000              = high (0.8-1.0)
 */
function volumeFactor(eventCount7d: number): Factor {
  let value: number;
  if (eventCount7d <= 0) {
    value = 0;
  } else {
    // log10 scale: log10(1)=0, log10(10)=1, log10(100)=2, log10(10000)=4
    value = Math.min(1, Math.log10(Math.max(1, eventCount7d)) / 4);
  }
  return {
    value,
    weight: 0.2,
    explanation: `${eventCount7d} events in the last 7 days`,
  };
}

// ---------------------------------------------------------------------------
// Provider trust
// ---------------------------------------------------------------------------

/** Providers with well-known enterprise compliance programs. */
const TRUSTED_PROVIDERS = new Set([
  "openai",
  "anthropic",
  "google_gemini",
  "azure_openai",
  "aws_bedrock",
  "cohere",
  "mistral",
]);

function providerTrust(provider: string): Factor {
  const isTrusted = TRUSTED_PROVIDERS.has(provider);
  const value = isTrusted ? 0.2 : 0.8;
  return {
    value,
    weight: 0.15,
    explanation: isTrusted
      ? `Provider "${provider}" is a well-known enterprise provider`
      : `Provider "${provider}" is not in the trusted enterprise provider list`,
  };
}

// ---------------------------------------------------------------------------
// Owner status
// ---------------------------------------------------------------------------

function ownerStatus(owner: string | null): Factor {
  const value = owner ? 0.1 : 0.9;
  return {
    value,
    weight: 0.2,
    explanation: owner
      ? `Agent has an assigned owner: ${owner}`
      : "Agent has no assigned owner — unmanaged agent",
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute a risk score (0-100) for a detected AI agent based on five
 * weighted factors: identity sensitivity, system sensitivity, volume,
 * provider trust, and owner status.
 */
export function computeRiskScore(agent: AgentForScoring): RiskScoreResult {
  const factors: Record<string, Factor> = {
    identity_sensitivity: identitySensitivity(agent.associated_identity),
    system_sensitivity: systemSensitivity(agent.destinations),
    volume: volumeFactor(agent.event_count_7d),
    provider_trust: providerTrust(agent.provider),
    owner_status: ownerStatus(agent.owner),
  };

  let weightedSum = 0;
  for (const factor of Object.values(factors)) {
    weightedSum += factor.value * factor.weight;
  }

  // Scale to 0-100 and round to one decimal
  const score = Math.round(weightedSum * 1000) / 10;

  return { score, factors };
}
