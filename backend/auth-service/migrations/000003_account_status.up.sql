BEGIN;

-- ACTIVE: account and profile are ready; sessions may be issued and validated.
-- PROVISIONING: profile provisioning is not confirmed; no session is valid.
-- DELETING: account deletion has begun; no session is valid or issued.
-- Existing accounts already hold sessions, so they start ACTIVE.
ALTER TABLE users
    ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE'
    CONSTRAINT users_status_valid CHECK (status IN ('ACTIVE', 'PROVISIONING', 'DELETING'));

COMMIT;
