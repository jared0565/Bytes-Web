-- Add free tier plan + 7-day trial tracking to crm_settings
ALTER TABLE crm_settings ADD COLUMN plan TEXT DEFAULT 'free';
ALTER TABLE crm_settings ADD COLUMN trial_started_at INTEGER DEFAULT 0;
ALTER TABLE crm_settings ADD COLUMN trial_ends_at INTEGER DEFAULT 0;
