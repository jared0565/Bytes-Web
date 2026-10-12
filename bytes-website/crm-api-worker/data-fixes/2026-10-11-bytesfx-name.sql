-- One-off fix for the live database: email text stored before the brand name changed.
-- A deploy does not run this. Run it once by hand (see HANDOVER, "Brand name"). It is safe to run again.
-- Emails already sent are left alone, and so are the subjects of threads in progress.

-- The stored follow-up template the Bytes site uses when a campaign is not AI-written
UPDATE email_templates
   SET steps_json = REPLACE(steps_json, 'BytesAI', 'BytesFX')
 WHERE client_id IN ('default', 'agency_demo')
   AND steps_json LIKE '%BytesAI%';

-- Bytes follow-up emails written but not sent yet
UPDATE email_sequences
   SET subject = REPLACE(subject, 'BytesAI', 'BytesFX'),
       body = REPLACE(body, 'BytesAI', 'BytesFX')
 WHERE client_id IN ('default', 'agency_demo')
   AND status IN ('draft', 'approved')
   AND (subject LIKE '%BytesAI%' OR body LIKE '%BytesAI%');

-- Bytes proposals drafted but not sent yet
UPDATE leads
   SET proposal = REPLACE(proposal, 'BytesAI', 'BytesFX')
 WHERE client_id IN ('default', 'agency_demo')
   AND proposal LIKE '%"status":"draft"%'
   AND proposal LIKE '%BytesAI%';
