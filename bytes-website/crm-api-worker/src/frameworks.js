// Framework campaigns: what the business saved as true ("Proof and offers") and the copy built
// from it. Saved text is put into emails and proposals word for word by code; it never goes into
// an AI prompt. An empty setting means that part is skipped. Nothing here is invented.

// ─── "Proof and offers" settings ─────────────────────────────────────────────
export const OFFER_FIELDS = ['proof', 'howWeWork', 'commitments', 'freeStep', 'actNow'];

const HTTPS_RE = /^https:\/\/[^\s"'<>]{4,300}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TEXT_LIMITS = { howWeWork: 600, commitments: 400, freeStep: 200 };
const text = (v, n) => String(v ?? '').trim().slice(0, n);
const validDate = (d) => DATE_RE.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);

// Writes the cleaned fields present in src into out. Returns an error message, or null.
export function cleanOffers(src, out) {
    if (src.proof !== undefined) {
        const items = [];
        for (const it of Array.isArray(src.proof) ? src.proof : []) {
            const t = text(it?.text, 300), url = String(it?.url ?? '').trim();
            if (!t && !url) continue;
            if (url && !HTTPS_RE.test(url)) return 'A proof link must be a full https:// address.';
            items.push({ text: t, url });
            if (items.length === 5) break;
        }
        out.proof = items;
    }
    for (const [k, n] of Object.entries(TEXT_LIMITS)) if (src[k] !== undefined) out[k] = text(src[k], n);
    if (src.actNow !== undefined) {
        const t = text(src.actNow?.text, 200), until = String(src.actNow?.until ?? '').trim();
        if (!t) out.actNow = null;
        else if (!validDate(until)) return 'A reason to act now needs an end date.';
        else out.actNow = { text: t, until };
    }
    return null;
}

// The saved settings, normalised: missing or malformed fields come back empty.
export function offersOf(cfg) {
    const c = cfg || {};
    const proof = (Array.isArray(c.proof) ? c.proof : [])
        .map(it => ({ text: text(it?.text, 300), url: HTTPS_RE.test(String(it?.url ?? '')) ? String(it.url) : '' }))
        .filter(it => it.text || it.url).slice(0, 5);
    const a = c.actNow;
    const actNow = a && text(a.text, 200) && validDate(String(a.until ?? '')) ? { text: text(a.text, 200), until: String(a.until) } : null;
    return { proof, howWeWork: text(c.howWeWork, 600), commitments: text(c.commitments, 400), freeStep: text(c.freeStep, 200), actNow };
}

// A reason to act now is used up to the end of its end date (UTC), never after.
export function actNowLive(offers, now) {
    const a = offers?.actNow;
    return !!(a && a.text && a.until) && now <= Date.parse(`${a.until}T23:59:59.999Z`);
}

export function proofLine(item) {
    return [item?.text, item?.url].filter(Boolean).join(' ');
}

// ─── Campaign emails: the problem, before and after, how we'd do it ──────────
// Days after the campaign starts that emails 1, 2 and 3 go out
export const CAMPAIGN_DAYS = [1, 3, 6];

// The saved fact a campaign email ends with: proof under email 2, the free first step under email 3
export function campaignPS(offers, emailNumber) {
    if (emailNumber === 2 && offers?.proof?.length) return `\n\nP.S. Some of our work: ${proofLine(offers.proof[0])}`;
    if (emailNumber === 3 && offers?.freeStep) return `\n\nP.S. ${offers.freeStep}`;
    return '';
}

// The built-in campaign. Bodies keep the {name} placeholder for the lead's first name.
export function ruleCampaignSteps({ service, company, bookingUrl }, offers) {
    const about = service ? ` about ${service}` : '';
    const team = company ? `The ${company} team` : 'The team';
    const next = bookingUrl ? `Pick a time that suits you: ${bookingUrl}` : 'Reply with a couple of times that suit you for a quick call.';
    return [
        { email_number: 1, subject: `Your enquiry${about}`, body: `Hi {name},\n\nThanks for getting in touch${about}. Things like this tend to slip down the list, and while they wait they can cost you time or customers.\n\nReply with a line or two about what you need, and we'll come back with how we'd solve it.\n\nBest,\n${team}` },
        { email_number: 2, subject: "What it looks like once it's done", body: `Hi {name},\n\nRight now this is still on your list. Once it's done, it works for you instead of waiting for you. The step in between is a short conversation about what you need.\n\n${next}\n\nBest,\n${team}` + campaignPS(offers, 2) },
        { email_number: 3, subject: "How we'd handle it", body: `Hi {name},\n\nHere's how it works with us: you tell us what you need, we send you a written proposal with the price, and you decide with everything in front of you.\n\nAre you still looking for help${about}? A quick reply is all it takes.\n\nBest,\n${team}` + campaignPS(offers, 3) },
    ];
}

// ─── Proposals: the saved blocks, inserted before "Next step" ────────────────
export function proposalExtras(offers) {
    const o = offers || {};
    const blocks = [];
    if (o.howWeWork) blocks.push(`How we work\n${o.howWeWork}`);
    if (o.proof?.length) blocks.push(`Work you can see\n${o.proof.slice(0, 2).map(p => `- ${proofLine(p)}`).join('\n')}`);
    if (o.commitments) blocks.push(`What you can count on\n${o.commitments}`);
    return blocks.join('\n\n');
}

// Puts the blocks just before the "Next step" heading, or at the end when there is none
export function withExtras(body, extras) {
    if (!extras) return body;
    const m = /^[ \t*#_]*next steps?\b/im.exec(body);
    return m ? `${body.slice(0, m.index)}${extras}\n\n${body.slice(m.index)}` : `${body}\n\n${extras}`;
}

// ─── Follow-ups after a sent proposal ────────────────────────────────────────
// Task kind → days after the proposal is sent. Any reply, Won, Lost or unsubscribe cancels them.
export const NUDGE_DAYS = { proposal_nudge: 3, proposal_nudge_2: 7, proposal_nudge_3: 12 };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

// The follow-up's text, or null when there is nothing true to say (follow-up 2 without a running offer)
export function nudgeBody(kind, { first, company, offers, now }) {
    const o = offers || {};
    const sign = `Best,\nThe ${company ? `${company} team` : 'team'}`;
    if (kind === 'proposal_nudge') {
        return `Hi ${first},\n\nJust checking you received the proposal below. If it looks right, reply YES and we'll get started. If you'd like anything changed, reply with what you'd like adjusted.`
            + (o.proof?.length ? `\n\nSome of our work, in case it helps: ${proofLine(o.proof[0])}` : '') + `\n\n${sign}`;
    }
    if (kind === 'proposal_nudge_2') {
        if (!actNowLive(o, now)) return null;
        return `Hi ${first},\n\nA quick note in case timing matters: ${o.actNow.text.replace(/[\s.!]+$/, '')}. This runs until ${longDate(o.actNow.until)}.\n\nTo go ahead, reply YES. If you have a question first, just ask.\n\n${sign}`;
    }
    if (kind === 'proposal_nudge_3') {
        return `Hi ${first},\n\nThis is our last email about the proposal, so we won't keep filling your inbox. If you'd like to go ahead, now or later, reply YES and we'll pick it up from there.`
            + (o.commitments ? `\n\nSo you know what you can count on: ${o.commitments}` : '') + `\n\n${sign}`;
    }
    return null;
}
