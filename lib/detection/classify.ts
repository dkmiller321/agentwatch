import Anthropic from "@anthropic-ai/sdk";
import type { LogEvent, ClassificationResult } from "./types";

const anthropic = new Anthropic();

const BATCH_MAX = 20;

const SYSTEM_PROMPT = `You are a security analyst classifying network log entries. For each log line, determine whether the traffic represents an AI agent or LLM API call.

Respond with a JSON array (no markdown fences) where each element has:
- "isAgent": boolean — true if the log line indicates AI/LLM agent activity
- "provider": string | null — the AI provider name if identifiable (e.g. "openai", "anthropic"), else null
- "confidence": number — 0.0 to 1.0 indicating your confidence
- "rationale": string — a brief one-sentence explanation

Be conservative: only flag entries you are reasonably confident about. Consider destination hostnames, URL paths, user-agent strings, and any identifiable payload patterns.`;

/**
 * Redact PII from a string before sending to the LLM.
 * Replaces email addresses and SSN-shaped patterns.
 */
function redactPii(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, "[REDACTED_SSN]");
}

/**
 * Format log events into a compact text block for the LLM.
 */
function formatEventsForLlm(events: LogEvent[]): string {
  return events
    .map(
      (e, i) =>
        `[${i}] ${e.timestamp} | ${e.http_method} ${e.dst_host}${e.dst_path} | UA: ${e.user_agent} | Identity: ${e.identity}`,
    )
    .join("\n");
}

/**
 * Classify a batch of log events using Claude to identify AI agent activity.
 * Events are redacted of PII before being sent.
 * Maximum batch size is 20; larger arrays are chunked automatically.
 */
export async function classifyBatch(
  events: LogEvent[],
): Promise<ClassificationResult[]> {
  if (events.length === 0) return [];

  const results: ClassificationResult[] = [];

  // Process in chunks of BATCH_MAX
  for (let offset = 0; offset < events.length; offset += BATCH_MAX) {
    const chunk = events.slice(offset, offset + BATCH_MAX);
    const chunkResults = await classifyChunk(chunk);
    results.push(...chunkResults);
  }

  return results;
}

async function classifyChunk(
  events: LogEvent[],
): Promise<ClassificationResult[]> {
  const formattedText = redactPii(formatEventsForLlm(events));

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Classify the following ${events.length} log entries:\n\n${formattedText}`,
      },
    ],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(responseText) as ClassificationResult[];
    // Ensure we have exactly the right number of results
    if (!Array.isArray(parsed) || parsed.length !== events.length) {
      return events.map(() => ({
        isAgent: false,
        provider: null,
        confidence: 0,
        rationale: "LLM response did not match expected format",
      }));
    }
    return parsed.map((r) => ({
      isAgent: Boolean(r.isAgent),
      provider: r.provider ?? null,
      confidence: Math.min(1, Math.max(0, Number(r.confidence) || 0)),
      rationale: String(r.rationale ?? ""),
    }));
  } catch {
    return events.map(() => ({
      isAgent: false,
      provider: null,
      confidence: 0,
      rationale: "Failed to parse LLM classification response",
    }));
  }
}
