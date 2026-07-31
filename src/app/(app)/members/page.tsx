import { createClient } from "@/lib/supabase/server";
import { createMember } from "@/lib/actions";
import type { Lane, Member } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const supabase = createClient();
  const [{ data: members }, { data: lanes }] = await Promise.all([
    supabase.from("members").select("*").order("name"),
    supabase.from("lanes").select("*").order("name")
  ]);
  const laneName = new Map((lanes ?? []).map((l) => [l.id, l.name]));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Members</h1>
        <p className="mt-1 text-sm text-muted">
          A member can sign in once their email is on this roster. Discord
          username powers reminder pings.
        </p>
      </header>

      <form action={createMember} className="card flex flex-wrap gap-2 p-4">
        <input name="name" required placeholder="Name" className="field min-w-40 flex-1" />
        <input
          name="email"
          required
          type="email"
          placeholder="Waterloo Google email"
          className="field min-w-56 flex-1"
        />
        <select name="role" className="field w-32">
          <option value="tpm">TPM</option>
          <option value="director">Director</option>
          <option value="exec">Exec</option>
          <option value="admin">Admin</option>
        </select>
        <select name="lane_id" className="field w-44">
          <option value="">No lane</option>
          {(lanes ?? []).map((l: Lane) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <input
          name="discord_username"
          placeholder="Discord username"
          className="field w-44"
        />
        <button type="submit" className="btn-primary">Add member</button>
      </form>

      <table className="card w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Role</th>
            <th className="px-4 py-2 font-medium">Lane</th>
            <th className="px-4 py-2 font-medium">Discord</th>
          </tr>
        </thead>
        <tbody>
          {((members ?? []) as Member[]).map((m) => (
            <tr key={m.id} className="border-b border-line last:border-0">
              <td className="px-4 py-2">
                <p className="font-medium">{m.name}</p>
                <p className="text-xs text-muted">{m.email}</p>
              </td>
              <td className="px-4 py-2 capitalize">{m.role}</td>
              <td className="px-4 py-2">
                {m.lane_id ? laneName.get(m.lane_id) : "—"}
              </td>
              <td className="px-4 py-2 font-mono text-xs">
                {m.discord_username ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
