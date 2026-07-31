export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-mono text-xl font-semibold">{value}</p>
    </div>
  );
}
