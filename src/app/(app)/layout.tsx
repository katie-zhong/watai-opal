import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/partners", label: "Partners" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/tasks", label: "Tasks" },
  { href: "/members", label: "Members" }
];

export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("members")
    .select("id, name, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!member) redirect("/not-allowed");

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl">
      <aside className="flex w-48 shrink-0 flex-col border-r border-line px-4 py-6">
        <Link href="/" className="mb-8">
          <span className="eyebrow">WAT.ai</span>
          <span className="block text-lg font-semibold leading-tight">Ops</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-1.5 text-sm hover:bg-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-6 text-xs text-muted">
          <p className="font-medium text-ink">{member.name}</p>
          <p className="capitalize">{member.role}</p>
          <form action={signOut}>
            <button className="mt-2 underline hover:text-ink">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
