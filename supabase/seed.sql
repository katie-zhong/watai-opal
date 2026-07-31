-- Seed: WAT.ai default lanes + demo data so the UI has something to show.
-- IMPORTANT: replace you@uwaterloo.ca with your real Google login email before running.

insert into lanes (slug, name) values
  ('projects', 'Projects'),
  ('sponsorships', 'Sponsorships'),
  ('events', 'Events & Marketing'),
  ('finance', 'Finance');

insert into members (name, email, role, lane_id, discord_username)
values ('Admin', 'you@uwaterloo.ca', 'admin',
        (select id from lanes where slug = 'sponsorships'), 'your_discord');

-- Demo partners
insert into partner_orgs (name, relationship_type, industry, source, benefits_sought, warmth, owner_member_id, notes)
values
  ('Northline AI', 'sponsor', 'AI infrastructure', 'event', '{hiring_talent,sponsored_events}', 'warm',
    (select id from members limit 1), 'Met at demo day. Interested in resume book + a fall event.'),
  ('Maple Robotics Club', 'event_partner', 'Student org', 'referral', '{}', 'warm',
    (select id from members limit 1), 'Co-run one hardware event per term. Low-touch.'),
  ('Harbourview Capital', 'sponsor', 'Fintech', 'cold', '{org_funding}', 'cold',
    (select id from members limit 1), null);

insert into touchpoints (org_id, kind, occurred_at, summary, next_action, awaiting_reply_from)
values
  ((select id from partner_orgs where name = 'Northline AI'), 'call', now() - interval '4 days',
   'Intro call. They asked about the drone RL project and fall recruiting timeline.',
   'Send tier PDF + FlockRL one-pager', 'us'),
  ((select id from partner_orgs where name = 'Harbourview Capital'), 'email', now() - interval '1 day',
   'Cold outreach sent to partnerships inbox.', null, 'them'),
  ((select id from partner_orgs where name = 'Maple Robotics Club'), 'event', now() - interval '20 days',
   'Ran joint soldering workshop, ~40 attendees.', null, 'none');

insert into deals (org_id, name, amount_cents, currency, stage, round, stage_entered_at)
values
  ((select id from partner_orgs where name = 'Northline AI'), 'Fall 2026 sponsorship', 500000, 'CAD',
   'call_booked', '2026-fall', now() - interval '4 days'),
  ((select id from partner_orgs where name = 'Harbourview Capital'), 'Fall 2026 sponsorship', 300000, 'CAD',
   'contacted', '2026-fall', now() - interval '1 day');

insert into tasks (title, lane_id, assignee_member_id, entity_type, entity_id, due_at, labels)
values
  ('Send tier PDF to Northline AI',
   (select id from lanes where slug = 'sponsorships'),
   (select id from members limit 1),
   'partner_org', (select id from partner_orgs where name = 'Northline AI'),
   now() + interval '1 day', '{follow_up}'),
  ('Draft fall round target list',
   (select id from lanes where slug = 'sponsorships'),
   (select id from members limit 1),
   null, null, now() + interval '5 days', '{outreach}');
