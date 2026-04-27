-- ============================================
-- Remove unique constraint on email_uid
-- ============================================
-- IMAP UIDs are only unique per mailbox, not globally
-- We already check for duplicates using subject+from+date
-- This allows the same UID to exist in different mailboxes (INBOX, Junk, Spam)

-- Drop the unique constraint on email_uid if it exists
ALTER TABLE backoffice_emails
  DROP CONSTRAINT IF EXISTS emails_email_uid_key;

-- Add a comment explaining why email_uid is not unique
COMMENT ON COLUMN backoffice_emails.email_uid IS
  'IMAP UID - unique only within a single mailbox, not globally. Duplicates are prevented by subject+from+date check.';
