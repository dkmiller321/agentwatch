import { Shield, Lock, Database, FileCheck, AlertTriangle } from "lucide-react"

export const metadata = {
  title: "Security | AgentWatch",
}

const sections = [
  {
    icon: Database,
    title: "Data Handling",
    content:
      "Your log data is processed in isolated, single-tenant environments. We extract only the metadata needed for agent detection. Raw log data is never stored beyond the analysis window you configure.",
  },
  {
    icon: Lock,
    title: "Encryption",
    content:
      "All data is encrypted in transit using TLS 1.3 and at rest using AES-256. Database connections use SSL. API keys and credentials are stored in encrypted vaults with automatic rotation.",
  },
  {
    icon: Shield,
    title: "Row-Level Security",
    content:
      "Every database query is scoped to your organization through PostgreSQL Row-Level Security (RLS) policies. There is no cross-tenant data access, even at the database level.",
  },
  {
    icon: FileCheck,
    title: "SOC 2 Compliance",
    content:
      "AgentWatch is currently undergoing SOC 2 Type II certification. Our infrastructure and processes are designed to meet the Trust Services Criteria for security, availability, and confidentiality.",
  },
  {
    icon: AlertTriangle,
    title: "Responsible Disclosure",
    content:
      "If you discover a security vulnerability, please report it to security@agentwatch.ai. We follow a coordinated disclosure process and aim to respond within 24 hours. We do not pursue legal action against good-faith reporters.",
  },
]

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Security at AgentWatch
      </h1>
      <p className="mt-4 text-muted-foreground leading-relaxed">
        We take the security of your data seriously. AgentWatch is built with
        security-first principles from the ground up.
      </p>

      <div className="mt-12 flex flex-col gap-10">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <div key={section.title} className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="size-5 text-primary" />
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-medium">{section.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {section.content}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
