/**
 * Warme Kontakte sammeln: TikTok-Follower, TikTok- und Instagram-Kommentierer
 * von @kolacdigital (ScrapeCreators, ca. 110 Credits je Lauf). Instagram-Follower
 * und Likes gibt keine Schnittstelle her.
 *
 *   node scripts/outreach/warm-sammeln.mjs   → outreach/warm-roh/*.json (gitignored)
 *
 * Danach von Hand bzw. mit Claude Code: Firmen herausfiltern (keine Privatleute,
 * keine Mitbewerber, keine Kunden), als Leads mit warm, warmScore, tiktok anlegen.
 */
import fs from 'node:fs';
const OUT = new URL('../../outreach/warm-roh', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
if (!process.env.SCRAPECREATORS_API_KEY) for (const line of fs.readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split('\n')) if (line.startsWith('SCRAPECREATORS_API_KEY=')) process.env.SCRAPECREATORS_API_KEY = line.slice(23).trim().replace(/^["']|["']$/g, '');
const KEY = process.env.SCRAPECREATORS_API_KEY;
const B = 'https://api.scrapecreators.com';
let credits = 0;
async function get(path) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(B + path, { headers: { 'x-api-key': KEY } });
    if (r.ok) { const j = await r.json(); credits += j.credits_charged ?? 1; return j; }
    console.error('HTTP', r.status, path.slice(0, 80));
    if (r.status === 402) throw new Error('402');
    await new Promise(r => setTimeout(r, 1500));
  }
  return null;
}
const save = (n, d) => fs.writeFileSync(`${OUT}/${n}.json`, JSON.stringify(d, null, 1));

// 1) TikTok-Follower
const followers = []; let min = null;
for (let p = 0; p < 40; p++) {
  const d = await get(`/v1/tiktok/user/followers?handle=kolacdigital${min ? `&min_time=${min}` : ''}`);
  if (!d?.followers?.length) break;
  for (const u of d.followers) followers.push({ handle: u.unique_id, name: u.nickname, bio: u.signature, followers: u.follower_count, link: u.bio_url || u.bio_link?.link || null, isBiz: u.is_business ?? null, category: u.category ?? u.biz_category ?? null, region: u.region || u.account_region || null });
  if (!d.has_more) break; min = d.min_time;
}
save('tt-followers', followers); console.error('TT-Follower', followers.length);

// 2) TikTok-Videos + Kommentare
const vids = []; let cursor = null;
for (let p = 0; p < 15; p++) {
  const d = await get(`/v3/tiktok/profile/videos?handle=kolacdigital${cursor ? `&max_cursor=${cursor}` : ''}`);
  const items = d?.aweme_list || d?.items || [];
  if (!items.length) break;
  for (const v of items) vids.push({ id: v.aweme_id, url: v.share_url || `https://www.tiktok.com/@kolacdigital/video/${v.aweme_id}`, desc: v.desc, comments: v.statistics?.comment_count ?? 0, likes: v.statistics?.digg_count ?? 0 });
  if (!d.has_more) break; cursor = d.max_cursor;
}
save('tt-videos', vids); console.error('TT-Videos', vids.length);
const ttc = [];
for (const v of vids.filter(v => v.comments > 0)) {
  let c = null;
  for (let p = 0; p < 5; p++) {
    const d = await get(`/v1/tiktok/video/comments?url=${encodeURIComponent(`https://www.tiktok.com/@kolacdigital/video/${v.id}`)}${c ? `&cursor=${c}` : ''}`);
    const cs = d?.comments || [];
    for (const x of cs) if (x.user?.unique_id !== 'kolacdigital') ttc.push({ handle: x.user?.unique_id, name: x.user?.nickname, bio: x.user?.signature, text: x.text, video: v.desc?.slice(0, 60), videoId: v.id });
    if (!d?.has_more || !cs.length) break; c = d.cursor;
  }
}
save('tt-comments', ttc); console.error('TT-Kommentare', ttc.length);

// 3) Instagram-Beiträge + Kommentare
const posts = []; let mx = null;
for (let p = 0; p < 12; p++) {
  const d = await get(`/v2/instagram/user/posts?handle=kolacdigital${mx ? `&next_max_id=${mx}` : ''}`);
  const it = d?.items || [];
  for (const i of it) posts.push({ code: i.code, comments: i.comment_count ?? 0, likes: i.like_count ?? 0, caption: i.caption?.text?.slice(0, 60) });
  if (!d?.more_available || !it.length) break; mx = d.next_max_id;
}
save('ig-posts', posts); console.error('IG-Beitraege', posts.length);
const igc = [];
for (const p of posts.filter(p => p.comments > 0)) {
  const d = await get(`/v2/instagram/post/comments?url=${encodeURIComponent(`https://www.instagram.com/p/${p.code}/`)}`);
  for (const x of d?.comments || []) { const u = x.user || x.owner || {}; if (u.username !== 'kolacdigital') igc.push({ handle: u.username, name: u.full_name, text: x.text, post: p.caption, code: p.code }); }
}
save('ig-comments', igc); console.error('IG-Kommentare', igc.length, 'Credits', credits);
