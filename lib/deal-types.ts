import type { DealTypeKey } from "./tokens"

export interface FieldConfig {
  key: string
  label: string
  type: "text" | "textarea" | "agent" | "borough" | "stage" | "boolean" | "multi" | "date" | "number" | "address"
  required?: boolean
  placeholder?: string
}

export interface DealTypeConfig {
  name: string
  endpoint: string
  primaryField: string
  stages: string[]
  fields: FieldConfig[]
  tableColumns: string[]
}

export const LEAD_TYPES = [
  { value: "FSBO", label: "FSBO", color: "#7c3aed" },
  { value: "FRBO", label: "FRBO", color: "#0ea5e9" },
  { value: "Expired Listing", label: "Expired Listing", color: "#dc2626" },
  { value: "Cold Lead", label: "Cold Lead", color: "#888780" },
  { value: "Referral", label: "Referral", color: "#059669" },
  { value: "Other", label: "Other", color: "#f97316" },
]

export const LEAD_STAGES = [
  { name: "New Lead", color: "#3b82f6", textColor: "#ffffff" },
  { name: "Contacted", color: "#8b5cf6", textColor: "#ffffff" },
  { name: "Follow Up", color: "#f97316", textColor: "#ffffff" },
  { name: "Qualified", color: "#14b8a6", textColor: "#ffffff" },
  { name: "Nurturing", color: "#eab308", textColor: "#1a1a18" },
]

export const dealTypes: Record<string, DealTypeConfig> = {
  "lead-pool": {
    name: "Lead Pool",
    endpoint: "/api/leads",
    primaryField: "contactName",
    stages: ["New Lead", "Contacted", "Follow Up", "Qualified", "Nurturing"],
    fields: [
      { key: "contactName", label: "Contact Name", type: "text", required: true },
      { key: "leadType", label: "Lead Type", type: "text" },
      { key: "agent1_id", label: "Agent", type: "agent" },
      { key: "phone", label: "Phone", type: "multi", placeholder: "555-0100, 555-0101" },
      { key: "email", label: "Email", type: "multi", placeholder: "email@example.com" },
      { key: "address", label: "Address", type: "address" },
      { key: "borough", label: "Borough", type: "borough" },
      { key: "source", label: "Source", type: "text" },
      { key: "stage", label: "Stage", type: "stage" },
      { key: "lastContact", label: "Last Contact", type: "date" },
      { key: "nextFollowup", label: "Next Follow-up", type: "date" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    tableColumns: ["contactName", "leadType", "agents", "phone", "email", "address", "borough", "stage", "nextFollowup"],
  },
  leads: {
    name: "Lead Pool",
    endpoint: "/api/leads",
    primaryField: "contactName",
    stages: ["New Lead", "Contacted", "Follow Up", "Qualified", "Nurturing"],
    fields: [
      { key: "contactName", label: "Contact Name", type: "text", required: true },
      { key: "leadType", label: "Lead Type", type: "text" },
      { key: "agent1_id", label: "Agent", type: "agent" },
      { key: "phone", label: "Phone", type: "multi", placeholder: "555-0100, 555-0101" },
      { key: "email", label: "Email", type: "multi", placeholder: "email@example.com" },
      { key: "address", label: "Address", type: "address" },
      { key: "borough", label: "Borough", type: "borough" },
      { key: "source", label: "Source", type: "text" },
      { key: "stage", label: "Stage", type: "stage" },
      { key: "lastContact", label: "Last Contact", type: "date" },
      { key: "nextFollowup", label: "Next Follow-up", type: "date" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    tableColumns: ["contactName", "leadType", "agents", "phone", "email", "address", "borough", "stage", "nextFollowup"],
  },
  rentals: {
    name: "Rentals",
    endpoint: "/api/rentals",
    primaryField: "address",
    stages: [
      "Not Started",
      "Schedule Photos",
      "Active",
      "Showing Scheduled",
      "Under Contract (Rental)",
      "Rented",
      "Create and Log Invoice",
      "Invoice Sent to Management",
    ],
    fields: [
      { key: "address", label: "Address", type: "address", required: true },
      { key: "unit", label: "Unit", type: "text" },
      { key: "agent1_id", label: "Showing Agent", type: "agent" },
      { key: "agent2_id", label: "Agent 2", type: "agent" },
      { key: "agent3_id", label: "Agent 3", type: "agent" },
      { key: "price", label: "Price", type: "text" },
      { key: "source", label: "Source", type: "text" },
      { key: "stage", label: "Stage", type: "stage" },
      { key: "app_link", label: "App Link", type: "boolean" },
      { key: "email", label: "Email", type: "multi", placeholder: "email@example.com, email2@example.com" },
      { key: "phone", label: "Phone", type: "multi", placeholder: "555-0100, 555-0101" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    tableColumns: ["address", "unit", "agent1_id", "agent2_id", "agent3_id", "neighborhood", "price", "stage", "app_link"],
  },
  sellers: {
    name: "Sellers",
    endpoint: "/api/sellers",
    primaryField: "address",
    stages: [
      "CMA/Draft Pitch",
      "Clients Actively Engaging",
      "Owners Interviewing Clients",
      "Value Add",
      "Schedule Photos",
      "Listing Live/Showing",
      "Offer Accepted",
      "Contract Signed",
    ],
    fields: [
      { key: "address", label: "Address", type: "address", required: true },
      { key: "unit", label: "Unit", type: "text" },
      { key: "agent1_id", label: "Agent 1", type: "agent" },
      { key: "agent2_id", label: "Agent 2", type: "agent" },
      { key: "agent3_id", label: "Agent 3", type: "agent" },
      { key: "price", label: "Price", type: "text" },
      { key: "source", label: "Source", type: "text" },
      { key: "stage", label: "Stage", type: "stage" },
      { key: "email", label: "Email", type: "multi", placeholder: "email@example.com, email2@example.com" },
      { key: "phone", label: "Phone", type: "multi", placeholder: "555-0100, 555-0101" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    tableColumns: ["address", "unit", "agent1_id", "agent2_id", "agent3_id", "neighborhood", "price", "stage"],
  },
  buyers: {
    name: "Buyers",
    endpoint: "/api/buyers",
    primaryField: "client",
    stages: [
      "Client Onboarding",
      "Pre Approval",
      "Showing Scheduled",
      "Second Followup",
      "Not Responsive",
      "Run Comps/Sending Offer",
      "Inspection Scheduled",
      "Under Contract/Docs",
      "Closed",
    ],
    fields: [
      { key: "client", label: "Client", type: "text", required: true },
      { key: "agent1_id", label: "Agent 1", type: "agent" },
      { key: "agent2_id", label: "Agent 2", type: "agent" },
      { key: "agent3_id", label: "Agent 3", type: "agent" },
      { key: "borough", label: "Borough", type: "borough" },
      { key: "budget", label: "Budget", type: "text" },
      { key: "source", label: "Source", type: "text" },
      { key: "stage", label: "Stage", type: "stage" },
      { key: "showsheet_url", label: "Showsheet URL", type: "text" },
      { key: "email", label: "Email", type: "multi", placeholder: "email@example.com, email2@example.com" },
      { key: "phone", label: "Phone", type: "multi", placeholder: "555-0100, 555-0101" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    tableColumns: ["client", "agent1_id", "agent2_id", "agent3_id", "borough", "budget", "stage"],
  },
  applications: {
    name: "Applications",
    endpoint: "/api/applications",
    primaryField: "applicant",
    stages: [
      "Clients Submitting Documentation",
      "Peer Review",
      "Pending Landlord Feedback",
      "Pending Lease Signing and Payments",
      "Lease Signed and Paid",
      "Welcome Email Sent",
      "Moved In/Closed",
      "Rental Backed Out",
      "Rental Rejected",
    ],
    fields: [
      { key: "applicant", label: "Applicant", type: "text", required: true },
      { key: "address", label: "Address", type: "address" },
      { key: "unit", label: "Unit", type: "text" },
      { key: "agent1_id", label: "Agent", type: "agent" },
      { key: "source", label: "Source", type: "text" },
      { key: "stage", label: "Stage", type: "stage" },
      { key: "email", label: "Email", type: "multi", placeholder: "email@example.com, email2@example.com" },
      { key: "phone", label: "Phone", type: "multi", placeholder: "555-0100, 555-0101" },
      { key: "move_in_date", label: "Move-in Date", type: "date" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    tableColumns: ["applicant", "address", "unit", "agent1_id", "neighborhood", "stage", "move_in_date", "phone"],
  },
  "tenant-rep": {
    name: "Tenant Rep",
    endpoint: "/api/tenant-rep",
    primaryField: "client",
    stages: ["Tenant Onboarding", "Scheduling Showings"],
    fields: [
      { key: "client", label: "Client", type: "text", required: true },
      { key: "agent1_id", label: "Agent 1", type: "agent" },
      { key: "agent2_id", label: "Agent 2", type: "agent" },
      { key: "agent3_id", label: "Agent 3", type: "agent" },
      { key: "borough", label: "Borough", type: "borough" },
      { key: "source", label: "Source", type: "text" },
      { key: "stage", label: "Stage", type: "stage" },
      { key: "email", label: "Email", type: "multi", placeholder: "email@example.com, email2@example.com" },
      { key: "phone", label: "Phone", type: "multi", placeholder: "555-0100, 555-0101" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    tableColumns: ["client", "agent1_id", "agent2_id", "agent3_id", "borough", "stage"],
  },
}

export function getDealTypeConfig(dealType: string): DealTypeConfig | null {
  return dealTypes[dealType] || null
}

export interface ArchiveReason {
  value: string
  label: string
  color: string
}

export const ARCHIVE_REASONS: Record<string, ArchiveReason[]> = {
  rentals: [
    { value: "Rented/Moved In", label: "Rented / Moved In", color: "#059669" },
    { value: "Tenant Backed Out", label: "Tenant Backed Out", color: "#dc2626" },
    { value: "Owner Backed Out", label: "Owner Backed Out", color: "#dc2626" },
    { value: "No Longer Available", label: "No Longer Available", color: "#888780" },
  ],
  sellers: [
    { value: "Sold/Closed", label: "Sold / Closed", color: "#059669" },
    { value: "Listing Withdrawn", label: "Listing Withdrawn", color: "#dc2626" },
    { value: "Listing Expired", label: "Listing Expired", color: "#888780" },
    { value: "Owner Backed Out", label: "Owner Backed Out", color: "#dc2626" },
  ],
  buyers: [
    { value: "Purchased/Closed", label: "Purchased / Closed", color: "#059669" },
    { value: "Buyer Backed Out", label: "Buyer Backed Out", color: "#dc2626" },
    { value: "Buyer Unresponsive", label: "Buyer Unresponsive", color: "#888780" },
    { value: "Budget Changed", label: "Budget Changed", color: "#888780" },
  ],
  applications: [
    { value: "Moved In/Closed", label: "Moved In / Closed", color: "#059669" },
    { value: "Rental Backed Out", label: "Rental Backed Out", color: "#dc2626" },
    { value: "Application Rejected", label: "Application Rejected", color: "#dc2626" },
    { value: "Applicant Withdrew", label: "Applicant Withdrew", color: "#888780" },
  ],
  "tenant-rep": [
    { value: "Deal Closed", label: "Deal Closed", color: "#059669" },
    { value: "Client Backed Out", label: "Client Backed Out", color: "#dc2626" },
    { value: "Client Unresponsive", label: "Client Unresponsive", color: "#888780" },
  ],
  lead_pool: [
    { value: "Converted", label: "Converted to Deal", color: "#059669" },
    { value: "Dead / Not Interested", label: "Dead / Not Interested", color: "#dc2626" },
    { value: "Duplicate", label: "Duplicate Contact", color: "#888780" },
    { value: "Unresponsive", label: "Unresponsive", color: "#888780" },
  ],
  leads: [
    { value: "Converted", label: "Converted to Deal", color: "#059669" },
    { value: "Dead / Not Interested", label: "Dead / Not Interested", color: "#dc2626" },
    { value: "Duplicate", label: "Duplicate Contact", color: "#888780" },
    { value: "Unresponsive", label: "Unresponsive", color: "#888780" },
  ],
}

export const WON_REASONS: Record<string, string> = {
  rentals: "Rented/Moved In",
  sellers: "Sold/Closed",
  buyers: "Purchased/Closed",
  applications: "Moved In/Closed",
  "tenant-rep": "Deal Closed",
  lead_pool: "Converted",
  leads: "Converted",
}

export const ALL_COLUMNS: Record<string, string[]> = {
  rentals: ["address", "agents", "borough", "price", "source", "stage", "pipeline_position", "activity", "days_on_market", "stale", "app_link", "applicant", "email", "phone", "notes", "last_edited_by", "actions"],
  sellers: ["address", "agents", "borough", "price", "source", "stage", "pipeline_position", "activity", "days_on_market", "stale", "email", "phone", "notes", "last_edited_by", "actions"],
  buyers: ["client", "agents", "borough", "budget", "source", "stage", "pipeline_position", "activity", "stale", "showsheet_url", "email", "phone", "notes", "last_edited_by", "actions"],
  applications: ["applicant", "address", "agents", "borough", "source", "stage", "pipeline_position", "activity", "stale", "email", "phone", "move_in_date", "notes", "last_edited_by", "actions"],
  "tenant-rep": ["client", "agents", "borough", "source", "stage", "pipeline_position", "activity", "stale", "email", "phone", "notes", "last_edited_by", "actions"],
  leads: ["contactName", "agents", "borough", "stage", "pipeline_position", "activity", "leadType", "source", "address", "email", "phone", "lastContact", "nextFollowup", "notes", "last_edited_by", "actions"],
}

export const DEFAULT_COLUMNS: Record<string, string[]> = {
  rentals: ["address", "agents", "borough", "price", "stage", "stale", "app_link", "applicant", "actions"],
  sellers: ["address", "agents", "borough", "price", "stage", "stale", "actions"],
  buyers: ["client", "agents", "borough", "budget", "stage", "stale", "actions"],
  applications: ["applicant", "address", "agents", "borough", "stage", "stale", "move_in_date", "phone", "actions"],
  "tenant-rep": ["client", "agents", "borough", "stage", "stale", "actions"],
  leads: ["contactName", "agents", "borough", "stage", "leadType", "source", "phone", "email", "actions"],
}

export const SPECIAL_LABELS: Record<string, string> = {
  pipeline_position: "Pipeline",
  activity: "Activity",
  agents: "Agents",
  app_link: "App Link",
  showsheet_url: "Showsheet",
  move_in_date: "Move-in Date",
  days_on_market: "Days on Market",
  stale: "Stale",
  last_edited_by: "Last Edited By",
  actions: "Actions",
  contactName: "Contact",
  leadType: "Type",
  lastContact: "Last Contact",
  nextFollowup: "Follow Up",
}

export function getFieldLabel(dealType: string, fieldKey: string): string {
  if (SPECIAL_LABELS[fieldKey]) return SPECIAL_LABELS[fieldKey]
  const config = getDealTypeConfig(dealType)
  if (!config) return fieldKey
  const field = config.fields.find((f) => f.key === fieldKey)
  return field ? field.label : fieldKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getColumnStorageKey(dealType: string): string {
  return `fmdashboard_v3_columns_${dealType}`
}

export interface ColumnConfig {
  key: string
  visible: boolean
}

export function getDefaultColumnConfig(dealType: string): ColumnConfig[] {
  const allCols = ALL_COLUMNS[dealType] || []
  const defaultVisible = DEFAULT_COLUMNS[dealType] || []
  return allCols.map((key) => ({
    key,
    visible: defaultVisible.includes(key),
  }))
}

export function formatPrice(value: string | number | null | undefined): string {
  if (!value) return ""
  const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.]/g, "")) : value
  if (isNaN(num)) return ""
  return "$" + num.toLocaleString("en-US")
}

export function parsePrice(value: string): string {
  return value.replace(/[^0-9.]/g, "")
}

export const EMAIL_TEMPLATES = [
  {
    id: "follow_up",
    label: "Follow Up",
    subject: "Following Up — {{address}}",
    body: "Hi {{name}},\n\nI wanted to follow up regarding {{address}}. Please let me know if you have any questions or need anything from us.\n\nBest,\n[Your Name]",
  },
  {
    id: "app_received",
    label: "Application Received",
    subject: "Application Received — {{address}}",
    body: "Hi {{name}},\n\nThank you — we've received your application for {{address}}. We'll be in touch shortly with next steps.\n\nBest,\n[Your Name]",
  },
  {
    id: "docs_needed",
    label: "Documents Needed",
    subject: "Documents Required — {{address}}",
    body: "Hi {{name}},\n\nTo move forward with your application for {{address}}, we still need the following documents:\n\n• Government-issued ID\n• Last 3 months bank statements\n• Last 2 pay stubs\n• Employment verification letter\n\nPlease send them at your earliest convenience.\n\nBest,\n[Your Name]",
  },
  {
    id: "approved",
    label: "Approved",
    subject: "Great News — Application Approved",
    body: "Hi {{name}},\n\nCongratulations! Your application has been approved. We'll be reaching out shortly to coordinate next steps for move-in.\n\nBest,\n[Your Name]",
  },
  {
    id: "showing",
    label: "Showing Confirmation",
    subject: "Showing Confirmed — {{address}}",
    body: "Hi {{name}},\n\nJust confirming your showing at {{address}}. Please let us know if you need to reschedule.\n\nLooking forward to meeting you!\n\nBest,\n[Your Name]",
  },
]
