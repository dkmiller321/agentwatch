-- AgentWatch seed data: demo organization with sample agents, events, and alerts
-- Run with: supabase db reset (applies migrations then seed)

-- Demo organization
insert into organizations (id, name, plan)
values ('d0d0d0d0-0000-4000-a000-000000000001', 'Acme Corp (Demo)', 'pro');

-- Demo user membership (assumes a demo user exists in auth.users with this ID)
-- In local dev, create a user via the Supabase dashboard; this seed assumes that ID.
-- If running headless, comment out or replace the user_id.
insert into memberships (id, organization_id, user_id, role)
values (
  'd0d0d0d0-0000-4000-a000-100000000001',
  'd0d0d0d0-0000-4000-a000-000000000001',
  '00000000-0000-0000-0000-000000000000', -- placeholder; replace with real auth.users id
  'admin'
);

-- Data source
insert into data_sources (id, organization_id, type, name, status, last_synced_at)
values (
  'd0d0d0d0-0000-4000-a000-200000000001',
  'd0d0d0d0-0000-4000-a000-000000000001',
  'aws_cloudtrail',
  'Production AWS CloudTrail',
  'active',
  now() - interval '2 hours'
);

-- 5 sample agents
insert into agents (id, organization_id, name, provider, first_seen_at, last_seen_at, event_count_7d, associated_identity, destinations, risk_score, risk_factors, status, detection_rationale) values
  ('a0000000-0000-4000-a000-000000000001', 'd0d0d0d0-0000-4000-a000-000000000001',
   'github-copilot-agent', 'GitHub', now() - interval '30 days', now() - interval '1 hour',
   342, 'dev-team@acme.com', array['api.github.com','copilot-proxy.githubusercontent.com'],
   25, '{"high_volume": false, "external_destinations": true}', 'sanctioned',
   'Identified via User-Agent header pattern: GitHub-Copilot/*'),

  ('a0000000-0000-4000-a000-000000000002', 'd0d0d0d0-0000-4000-a000-000000000001',
   'langchain-retrieval-agent', 'LangChain', now() - interval '14 days', now() - interval '3 hours',
   187, 'ml-pipeline-sa@acme.iam', array['pinecone.io','api.openai.com','s3.amazonaws.com'],
   62, '{"high_volume": true, "external_destinations": true, "credential_access": true}', 'reviewed',
   'Detected chained API calls with LangChain tracing headers across multiple destinations'),

  ('a0000000-0000-4000-a000-000000000003', 'd0d0d0d0-0000-4000-a000-000000000001',
   'unknown-scraper-bot', 'Unknown', now() - interval '2 days', now() - interval '30 minutes',
   58, null, array['internal-wiki.acme.com','confluence.acme.com','jira.acme.com'],
   89, '{"high_volume": true, "no_identity": true, "internal_scanning": true}', 'new',
   'Automated sequential crawling of internal documentation endpoints from single IP'),

  ('a0000000-0000-4000-a000-000000000004', 'd0d0d0d0-0000-4000-a000-000000000001',
   'slack-workflow-bot', 'Slack', now() - interval '60 days', now() - interval '6 hours',
   94, 'slack-integrations@acme.com', array['hooks.slack.com','api.slack.com'],
   12, '{"high_volume": false, "external_destinations": false}', 'sanctioned',
   'Slack Bot token usage pattern in Authorization headers'),

  ('a0000000-0000-4000-a000-000000000005', 'd0d0d0d0-0000-4000-a000-000000000001',
   'anthropic-claude-agent', 'Anthropic', now() - interval '5 days', now() - interval '15 minutes',
   215, 'eng-team@acme.com', array['api.anthropic.com','vault.acme.com','postgres.internal.acme.com'],
   74, '{"high_volume": true, "credential_access": true, "database_access": true}', 'new',
   'Claude Agent SDK tool-use pattern with credential vault and database access');

-- Sample agent events (a handful per agent)
insert into agent_events (id, organization_id, agent_id, timestamp, source_ip, destination_host, destination_path, http_method, user_agent, identity, raw_payload) values
  (gen_random_uuid(), 'd0d0d0d0-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000001',
   now() - interval '1 hour', '10.0.1.42', 'api.github.com', '/repos/acme/backend/pulls', 'POST',
   'GitHub-Copilot/1.0', 'dev-team@acme.com', '{"action": "create_pull_request"}'),

  (gen_random_uuid(), 'd0d0d0d0-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000002',
   now() - interval '3 hours', '10.0.2.15', 'api.openai.com', '/v1/embeddings', 'POST',
   'python-requests/2.31 langchain/0.1.0', 'ml-pipeline-sa@acme.iam', '{"model": "text-embedding-3-small", "token_count": 8192}'),

  (gen_random_uuid(), 'd0d0d0d0-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000002',
   now() - interval '3 hours 5 minutes', '10.0.2.15', 's3.amazonaws.com', '/acme-ml-data/vectors/latest.parquet', 'PUT',
   'python-requests/2.31 langchain/0.1.0', 'ml-pipeline-sa@acme.iam', '{"bucket": "acme-ml-data", "size_bytes": 4521984}'),

  (gen_random_uuid(), 'd0d0d0d0-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000003',
   now() - interval '30 minutes', '192.168.12.99', 'internal-wiki.acme.com', '/api/v2/pages?limit=100&offset=400', 'GET',
   'python-requests/2.31', null, '{"pages_fetched": 100, "total_pages": 1240}'),

  (gen_random_uuid(), 'd0d0d0d0-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000003',
   now() - interval '29 minutes', '192.168.12.99', 'confluence.acme.com', '/rest/api/content/search?cql=type=page', 'GET',
   'python-requests/2.31', null, '{"results_returned": 50}'),

  (gen_random_uuid(), 'd0d0d0d0-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000005',
   now() - interval '15 minutes', '10.0.3.88', 'vault.acme.com', '/v1/secret/data/prod/database', 'GET',
   'anthropic-claude-agent/1.0', 'eng-team@acme.com', '{"secret_path": "prod/database", "action": "read"}'),

  (gen_random_uuid(), 'd0d0d0d0-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000005',
   now() - interval '14 minutes', '10.0.3.88', 'postgres.internal.acme.com', '/query', 'POST',
   'anthropic-claude-agent/1.0', 'eng-team@acme.com', '{"query": "SELECT * FROM users LIMIT 100", "database": "production"}');

-- Alerts
insert into alerts (id, organization_id, agent_id, type, severity, message) values
  (gen_random_uuid(), 'd0d0d0d0-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000003',
   'new_agent', 'warning', 'New unidentified agent detected crawling internal documentation systems'),

  (gen_random_uuid(), 'd0d0d0d0-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000003',
   'high_risk', 'critical', 'Agent has no associated identity and is scanning internal resources at high volume'),

  (gen_random_uuid(), 'd0d0d0d0-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000005',
   'credential_sensitive', 'critical', 'Agent accessed production credential vault and subsequently queried production database'),

  (gen_random_uuid(), 'd0d0d0d0-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000005',
   'new_agent', 'info', 'New Anthropic Claude agent detected in engineering environment'),

  (gen_random_uuid(), 'd0d0d0d0-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000002',
   'behavior_change', 'warning', 'Agent added new destination s3.amazonaws.com not previously observed');

-- Audit log entries
insert into audit_log (organization_id, user_id, action, details) values
  ('d0d0d0d0-0000-4000-a000-000000000001', '00000000-0000-0000-0000-000000000000',
   'agent.status_changed', '{"agent_id": "a0000000-0000-4000-a000-000000000001", "from": "new", "to": "sanctioned"}'),
  ('d0d0d0d0-0000-4000-a000-000000000001', '00000000-0000-0000-0000-000000000000',
   'data_source.created', '{"data_source_id": "d0d0d0d0-0000-4000-a000-200000000001", "type": "aws_cloudtrail"}'),
  ('d0d0d0d0-0000-4000-a000-000000000001', '00000000-0000-0000-0000-000000000000',
   'agent.status_changed', '{"agent_id": "a0000000-0000-4000-a000-000000000004", "from": "new", "to": "sanctioned"}');
