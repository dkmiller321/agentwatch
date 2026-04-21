export const PLAN_LIMITS = {
  free: {
    maxDataSources: 2,
    maxScansPerMonth: 100,
    retentionDays: 30,
    hasComplianceExport: false,
    hasSlackAlerts: false,
  },
  pro: {
    maxDataSources: 20,
    maxScansPerMonth: 5000,
    retentionDays: 90,
    hasComplianceExport: true,
    hasSlackAlerts: true,
  },
  enterprise: {
    maxDataSources: Infinity,
    maxScansPerMonth: Infinity,
    retentionDays: 365,
    hasComplianceExport: true,
    hasSlackAlerts: true,
  },
} as const

export type PlanType = keyof typeof PLAN_LIMITS
