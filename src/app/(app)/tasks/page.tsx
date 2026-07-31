import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/sla";
import { completeTask, createTask } from "@/lib/actions";
import type { Lane, Member, Task } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = createClient();
  const [{ data: tasks }, { data: lanes }, { data: members }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("status", "open")
        .order("due_at", { ascending: true, nullsFirst: false }),
      supabase.from("lanes").select("*").order("name"),
      supabase.from("members").select("id, name").order("name")
    ]);

  const laneName = new Map((lanes ?? []).map((l) => [l.id, l.name]));
  const memberName = new Map((members ?? []).map((m) => [m.id, m.name]));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <p className="mt-1 text-sm text-muted">
          Anything with a deadline gets a Discord reminder by default.
        </p>
      </header>

      <form action={createTask} className="card flex flex-wrap gap-2 p-4">
        <input
          name="title"
          required
          placeholder="New task"
          className="field min-w-56 flex-1"
        />
        <select name="lane_id" className="field w-44">
          <option value="">No lane</option>
          {(lanes ?? []).map((l: Lane) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select name="assignee_member_id" className="field w-40">
          <option value="">Me</option>
          {(members ?? []).map((m: Pick<Member, "id" | "name">) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input name="due_at" type="date" className="field w-40" />
        <button type="submit" className="btn-primary">Add task</button>
      </form>

      <ul className="card divide-y divide-line">
        {((tasks ?? []) as Task[]).map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-4 py-3">
            <form action={completeTask.bind(null, t.id)}>
              <button
                className="h-4 w-4 rounded border border-line hover:border-accent"
                aria-label={`Mark done: ${t.title}`}
              />
            </form>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{t.title}</p>
              <p className="text-xs text-muted">
                {t.lane_id ? laneName.get(t.lane_id) : "No lane"}
                {t.assignee_member_id
                  ? ` · ${memberName.get(t.assignee_member_id)}`
                  : ""}
              </p>
            </div>
            <span className="font-mono text-xs text-muted">
              {formatDate(t.due_at)}
            </span>
          </li>
        ))}
        {(tasks ?? []).length === 0 && (
          <li className="p-4 text-sm text-muted">
            Task list is clear. Add the next follow-up above.
          </li>
        )}
      </ul>
    </div>
  );
}
