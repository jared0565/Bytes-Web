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
