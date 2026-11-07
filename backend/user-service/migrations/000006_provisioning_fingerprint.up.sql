-- A provisioning retry is identical only if it carries the same payload. The
-- fingerprint is a SHA-256 hex digest of user_id, username and account
-- created_at, computed by the service. It lets a delayed retry be told apart
-- from a conflicting reuse of the same operation_id.
ALTER TABLE users.provisioning_operations ADD COLUMN payload_fingerprint TEXT;
UPDATE users.provisioning_operations SET payload_fingerprint = repeat('0', 64) WHERE payload_fingerprint IS NULL;
ALTER TABLE users.provisioning_operations ALTER COLUMN payload_fingerprint SET NOT NULL;
ALTER TABLE users.provisioning_operations
    ADD CONSTRAINT provisioning_fingerprint_hex CHECK (payload_fingerprint ~ '^[0-9a-f]{64}$');
