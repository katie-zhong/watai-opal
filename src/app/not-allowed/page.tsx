export default function NotAllowed() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold">Not on the roster yet</h1>
        <p className="mt-2 text-sm text-muted">
          Your Google account signed in, but no member record matches this
          email. Ask an exec to add you on the Members page, then sign in again.
        </p>
      </div>
    </main>
  );
}
