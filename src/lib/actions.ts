"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DealStage } from "@/lib/types";

async function logActivity(
  verb: string,
  entityType: string,
  entityId: string | null,
  meta: Record<string, unknown> = {}
) {
  const supabase = createClient();
  const { data: member } = await supabase.rpc("current_member_id");
  await supabase.from("activity_log").insert({
    member_id: member ?? null,
    verb,
    entity_type: entityType,
    entity_id: entityId,
    meta
  });
}

export async function createPartner(formData: FormData) {
  const supabase = createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const { data, error } = await supabase
    .from("partner_orgs")
    .insert({
      name,
      relationship_type: String(formData.get("relationship_type") ?? "sponsor"),
      industry: String(formData.get("industry") ?? "") || null,
      source: String(formData.get("source") ?? "") || null,
      warmth: String(formData.get("warmth") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null
    })
    .select("id")
    .single();
  if (error || !data) return;
  await logActivity("created", "partner_org", data.id, { name });
  revalidatePath("/partners");
  redirect(`/partners/${data.id}`);
}

export async function addTouchpoint(formData: FormData) {
  const supabase = createClient();
  const orgId = String(formData.get("org_id"));
  const summary = String(formData.get("summary") ?? "").trim();
  if (!orgId || !summary) return;
  const { data: member } = await supabase.rpc("current_member_id");
  const { error } = await supabase.from("touchpoints").insert({
    org_id: orgId,
    member_id: member ?? null,
    kind: String(formData.get("kind") ?? "email"),
    summary,
    next_action: String(formData.get("next_action") ?? "") || null,
    awaiting_reply_from: String(formData.get("awaiting_reply_from") ?? "none")
  });
  if (error) return;
  await logActivity("logged_touchpoint", "partner_org", orgId);
  revalidatePath(`/partners/${orgId}`);
  revalidatePath("/");
}

export async function addContact(formData: FormData) {
  const supabase = createClient();
  const orgId = String(formData.get("org_id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!orgId || !name) return;
  await supabase.from("contacts").insert({
    org_id: orgId,
    name,
    email: String(formData.get("email") ?? "") || null,
    role_title: String(formData.get("role_title") ?? "") || null
  });
  await logActivity("added_contact", "partner_org", orgId, { name });
  revalidatePath(`/partners/${orgId}`);
}

export async function createDeal(formData: FormData) {
  const supabase = createClient();
  const orgId = String(formData.get("org_id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!orgId || !name) return;
  const amount = formData.get("amount");
  const { data, error } = await supabase
    .from("deals")
    .insert({
      org_id: orgId,
      name,
      amount_cents: amount ? Math.round(Number(amount) * 100) : null,
      currency: String(formData.get("currency") ?? "CAD"),
      round: String(formData.get("round") ?? "") || null
    })
    .select("id")
    .single();
  if (error || !data) return;
  await logActivity("created", "deal", data.id, { name });
  revalidatePath(`/partners/${orgId}`);
  revalidatePath("/pipeline");
}

export async function setDealStage(dealId: string, stage: DealStage) {
  const supabase = createClient();
  const { error } = await supabase
    .from("deals")
    .update({ stage, stage_entered_at: new Date().toISOString() })
    .eq("id", dealId);
  if (error) return;
  await logActivity("stage_changed", "deal", dealId, { stage });
  revalidatePath("/pipeline");
  revalidatePath("/");
}

export async function createTask(formData: FormData) {
  const supabase = createClient();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const { data: member } = await supabase.rpc("current_member_id");
  const dueAt = String(formData.get("due_at") ?? "");
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      details: String(formData.get("details") ?? "") || null,
      lane_id: String(formData.get("lane_id") ?? "") || null,
      assignee_member_id: String(formData.get("assignee_member_id") ?? "") || member || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      created_by: member ?? null
    })
    .select("id")
    .single();
  if (error || !data) return;
  await logActivity("created", "task", data.id, { title });
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function completeTask(taskId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) return;
  await logActivity("completed", "task", taskId);
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function createMember(formData: FormData) {
  const supabase = createClient();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!name || !email) return;
  const { data, error } = await supabase
    .from("members")
    .insert({
      name,
      email,
      role: String(formData.get("role") ?? "tpm"),
      lane_id: String(formData.get("lane_id") ?? "") || null,
      discord_username: String(formData.get("discord_username") ?? "") || null
    })
    .select("id")
    .single();
  if (error || !data) return;
  await logActivity("created", "member", data.id, { name });
  revalidatePath("/members");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
