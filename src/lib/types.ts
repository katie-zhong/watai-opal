export type MemberRole = "admin" | "exec" | "director" | "tpm";
export type DealStage =
  | "prospect"
  | "contacted"
  | "call_booked"
  | "proposal_sent"
  | "committed"
  | "paid"
  | "renewal";

export const DEAL_STAGES: DealStage[] = [
  "prospect",
  "contacted",
  "call_booked",
  "proposal_sent",
  "committed",
  "paid",
  "renewal"
];

export const STAGE_LABELS: Record<DealStage, string> = {
  prospect: "Prospect",
  contacted: "Contacted",
  call_booked: "Call booked",
  proposal_sent: "Proposal sent",
  committed: "Committed",
  paid: "Paid",
  renewal: "Renewal"
};

export interface Member {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  lane_id: string | null;
  discord_username: string | null;
  discord_user_id: string | null;
  notes: string | null;
}

export interface Lane {
  id: string;
  slug: string;
  name: string;
}

export interface PartnerOrg {
  id: string;
  name: string;
  relationship_type: "sponsor" | "event_partner" | "social_partner";
  tier: string | null;
  industry: string | null;
  warmth: string | null;
  source: string | null;
  benefits_sought: string[];
  owner_member_id: string | null;
  renewal_date: string | null;
  drive_folder_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface Touchpoint {
  id: string;
  org_id: string;
  contact_id: string | null;
  member_id: string | null;
  kind: "email" | "call" | "event" | "discord" | "other";
  occurred_at: string;
  summary: string;
  next_action: string | null;
  awaiting_reply_from: "us" | "them" | "none";
}

export interface Deal {
  id: string;
  org_id: string;
  name: string;
  amount_cents: number | null;
  currency: string;
  stage: DealStage;
  stage_entered_at: string;
  round: string | null;
  priority: boolean;
  lead_member_id: string | null;
}

export interface Task {
  id: string;
  title: string;
  details: string | null;
  lane_id: string | null;
  assignee_member_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  labels: string[];
  due_at: string | null;
  remind: boolean;
  status: "open" | "done" | "dropped";
}

export interface Contact {
  id: string;
  org_id: string;
  name: string;
  email: string | null;
  role_title: string | null;
  lifecycle_stage: string;
}
