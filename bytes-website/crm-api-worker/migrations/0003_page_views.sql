-- Cookieless website visit statistics (Bytes website). The worker also creates this
-- table on first use (ensurePageViews), so running this file is optional.
CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site TEXT NOT NULL,          -- client id of the site ('default' = Bytes website)
    ts INTEGER NOT NULL,         -- ms since epoch
    day TEXT NOT NULL,           -- UTC day the visitor hash belongs to
    visitor TEXT NOT NULL,       -- daily-rotating salted hash of IP + user agent (no IP stored)
    path TEXT,
    entry INTEGER DEFAULT 0,     -- 1 = first page of a visit (source/campaign recorded)
    source TEXT,
    campaign TEXT,
    country TEXT,
    device TEXT,
    browser TEXT
);
CREATE INDEX IF NOT EXISTS idx_page_views_site_ts ON page_views (site, ts);
