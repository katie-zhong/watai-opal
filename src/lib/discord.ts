// Minimal Discord notifier. V0 posts everything to one webhook;
// per-lane channel routing (lanes.discord_channel_id) lands with the real bot.

export async function postToDiscord(content: string): Promise<boolean> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return false;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });
  return res.ok;
}
