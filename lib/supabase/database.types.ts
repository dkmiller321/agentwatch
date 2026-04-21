// Hand-written TypeScript types matching the AgentWatch database schema.
// Regenerate from the live database with: supabase gen types typescript

// ---------------------------------------------------------------------------
// Enum types
// ---------------------------------------------------------------------------

export type PlanType = "free" | "pro" | "enterprise"
export type MemberRole = "admin" | "analyst" | "viewer"
export type DataSourceType = "file_upload" | "splunk" | "datadog" | "aws_cloudtrail"
export type JobStatus = "pending" | "running" | "completed" | "failed"
export type AgentStatus = "new" | "reviewed" | "sanctioned" | "blocked"
export type AlertType = "new_agent" | "behavior_change" | "high_risk" | "credential_sensitive"
export type AlertSeverity = "info" | "warning" | "critical"

// ---------------------------------------------------------------------------
// Row types (what you SELECT)
// ---------------------------------------------------------------------------

export interface OrganizationRow {
  id: string
  name: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: PlanType
  slack_webhook_url: string | null
  created_at: string
}

export interface MembershipRow {
  id: string
  organization_id: string
  user_id: string
  role: MemberRole
  created_at: string
}

export interface DataSourceRow {
  id: string
  organization_id: string
  type: DataSourceType
  name: string
  config: Record<string, unknown>
  status: string
  last_synced_at: string | null
  created_at: string
}

export interface IngestionJobRow {
  id: string
  organization_id: string
  data_source_id: string
  status: JobStatus
  file_path: string | null
  event_count: number
  started_at: string | null
  finished_at: string | null
  error_message: string | null
  created_at: string
}

export interface AgentRow {
  id: string
  organization_id: string
  name: string
  provider: string | null
  first_seen_at: string | null
  last_seen_at: string | null
  event_count_7d: number
  associated_identity: string | null
  destinations: string[]
  risk_score: number
  risk_factors: Record<string, unknown>
  owner: string | null
  status: AgentStatus
  notes: string | null
  detection_rationale: string | null
  created_at: string
}

export interface AgentEventRow {
  id: string
  organization_id: string
  agent_id: string
  timestamp: string
  source_ip: string | null
  destination_host: string | null
  destination_path: string | null
  http_method: string | null
  user_agent: string | null
  identity: string | null
  raw_payload: Record<string, unknown> | null
  created_at: string
}

export interface AlertRow {
  id: string
  organization_id: string
  agent_id: string
  type: AlertType
  severity: AlertSeverity
  message: string
  acknowledged_at: string | null
  created_at: string
}

export interface AuditLogRow {
  id: string
  organization_id: string
  user_id: string | null
  action: string
  details: Record<string, unknown> | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Insert types (what you INSERT — optional fields have defaults in the DB)
// ---------------------------------------------------------------------------

export interface OrganizationInsert {
  id?: string
  name: string
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  plan?: PlanType
  slack_webhook_url?: string | null
  created_at?: string
}

export interface MembershipInsert {
  id?: string
  organization_id: string
  user_id: string
  role?: MemberRole
  created_at?: string
}

export interface DataSourceInsert {
  id?: string
  organization_id: string
  type: DataSourceType
  name: string
  config?: Record<string, unknown>
  status?: string
  last_synced_at?: string | null
  created_at?: string
}

export interface IngestionJobInsert {
  id?: string
  organization_id: string
  data_source_id: string
  status?: JobStatus
  file_path?: string | null
  event_count?: number
  started_at?: string | null
  finished_at?: string | null
  error_message?: string | null
  created_at?: string
}

export interface AgentInsert {
  id?: string
  organization_id: string
  name: string
  provider?: string | null
  first_seen_at?: string | null
  last_seen_at?: string | null
  event_count_7d?: number
  associated_identity?: string | null
  destinations?: string[]
  risk_score?: number
  risk_factors?: Record<string, unknown>
  owner?: string | null
  status?: AgentStatus
  notes?: string | null
  detection_rationale?: string | null
  created_at?: string
}

export interface AgentEventInsert {
  id?: string
  organization_id: string
  agent_id: string
  timestamp: string
  source_ip?: string | null
  destination_host?: string | null
  destination_path?: string | null
  http_method?: string | null
  user_agent?: string | null
  identity?: string | null
  raw_payload?: Record<string, unknown> | null
  created_at?: string
}

export interface AlertInsert {
  id?: string
  organization_id: string
  agent_id: string
  type: AlertType
  severity?: AlertSeverity
  message: string
  acknowledged_at?: string | null
  created_at?: string
}

export interface AuditLogInsert {
  id?: string
  organization_id: string
  user_id?: string | null
  action: string
  details?: Record<string, unknown> | null
  created_at?: string
}

// ---------------------------------------------------------------------------
// Update types (all fields optional)
// ---------------------------------------------------------------------------

export type OrganizationUpdate = Partial<OrganizationInsert>
export type MembershipUpdate = Partial<MembershipInsert>
export type DataSourceUpdate = Partial<DataSourceInsert>
export type IngestionJobUpdate = Partial<IngestionJobInsert>
export type AgentUpdate = Partial<AgentInsert>
export type AgentEventUpdate = Partial<AgentEventInsert>
export type AlertUpdate = Partial<AlertInsert>
export type AuditLogUpdate = Partial<AuditLogInsert>

// ---------------------------------------------------------------------------
// Database type (compatible with supabase-js generic parameter)
// ---------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: OrganizationRow
        Insert: OrganizationInsert
        Update: OrganizationUpdate
        Relationships: [
          {
            foreignKeyName: ""
            columns: []
            isOneToOne: false
            referencedRelation: ""
            referencedColumns: []
          }
        ]
      }
      memberships: {
        Row: MembershipRow
        Insert: MembershipInsert
        Update: MembershipUpdate
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      data_sources: {
        Row: DataSourceRow
        Insert: DataSourceInsert
        Update: DataSourceUpdate
        Relationships: [
          {
            foreignKeyName: "data_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      ingestion_jobs: {
        Row: IngestionJobRow
        Insert: IngestionJobInsert
        Update: IngestionJobUpdate
        Relationships: [
          {
            foreignKeyName: "ingestion_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_jobs_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          }
        ]
      }
      agents: {
        Row: AgentRow
        Insert: AgentInsert
        Update: AgentUpdate
        Relationships: [
          {
            foreignKeyName: "agents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      agent_events: {
        Row: AgentEventRow
        Insert: AgentEventInsert
        Update: AgentEventUpdate
        Relationships: [
          {
            foreignKeyName: "agent_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      alerts: {
        Row: AlertRow
        Insert: AlertInsert
        Update: AlertUpdate
        Relationships: [
          {
            foreignKeyName: "alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_log: {
        Row: AuditLogRow
        Insert: AuditLogInsert
        Update: AuditLogUpdate
        Relationships: [
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_organization_ids: {
        Args: Record<string, never>
        Returns: string[]
      }
    }
    Enums: {
      plan_type: PlanType
      member_role: MemberRole
      data_source_type: DataSourceType
      job_status: JobStatus
      agent_status: AgentStatus
      alert_type: AlertType
      alert_severity: AlertSeverity
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ---------------------------------------------------------------------------
// Convenience aliases
// ---------------------------------------------------------------------------

export type Tables = Database["public"]["Tables"]
export type Organizations = Tables["organizations"]
export type Memberships = Tables["memberships"]
export type DataSources = Tables["data_sources"]
export type IngestionJobs = Tables["ingestion_jobs"]
export type Agents = Tables["agents"]
export type AgentEvents = Tables["agent_events"]
export type Alerts = Tables["alerts"]
export type AuditLog = Tables["audit_log"]
