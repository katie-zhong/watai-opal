import { createPartner } from "@/lib/actions";

export default function NewPartnerPage() {
  return (
    <div className="max-w-lg space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Add partner</h1>
        <p className="mt-1 text-sm text-muted">
          Just the essentials — everything else lives on the partner page.
        </p>
      </header>
      <form action={createPartner} className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required className="field" placeholder="Northline AI" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="relationship_type">Type</label>
            <select id="relationship_type" name="relationship_type" className="field">
              <option value="sponsor">Sponsor</option>
              <option value="event_partner">Event partner</option>
              <option value="social_partner">Social partner</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="source">Source</label>
            <select id="source" name="source" className="field">
              <option value="">—</option>
              <option value="cold">Cold</option>
              <option value="event">Event</option>
              <option value="referral">Referral</option>
              <option value="inbound">Inbound</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="industry">Industry</label>
            <input id="industry" name="industry" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="warmth">Warmth</label>
            <select id="warmth" name="warmth" className="field">
              <option value="">—</option>
              <option value="cold">Cold</option>
              <option value="warm">Warm</option>
              <option value="hot">Hot</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={3} className="field" />
        </div>
        <button type="submit" className="btn-primary">Add partner</button>
      </form>
    </div>
  );
}
