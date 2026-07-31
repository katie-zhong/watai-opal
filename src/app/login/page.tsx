import { LoginButton } from "./login-button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-sm p-8">
        <p className="eyebrow">WAT.ai</p>
        <h1 className="mt-1 text-2xl font-semibold">Ops platform</h1>
        <p className="mt-2 text-sm text-muted">
          Partnerships, tasks, and the 3-day SLA clock — in one place. Sign in
          with your team Google account.
        </p>
        <div className="mt-6">
          <LoginButton />
        </div>
      </div>
    </main>
  );
}
