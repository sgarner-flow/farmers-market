-- Add 'Reviewed' status to vendor_applications table
ALTER TABLE vendor_applications 
DROP CONSTRAINT IF EXISTS vendor_applications_status_check;

-- Recreate the constraint with the new status
ALTER TABLE vendor_applications
ADD CONSTRAINT vendor_applications_status_check
CHECK (status IN ('pending', 'approved', 'rejected', 'removed', 'invited', 'Reviewed'));

-- Optional: Add an index to improve query performance on the status field
CREATE INDEX IF NOT EXISTS idx_vendor_applications_status 
ON vendor_applications(status);

-- Log the migration
INSERT INTO migration_log (migration_name, executed_at, details)
VALUES (
  'add_reviewed_status', 
  NOW(), 
  'Added Reviewed status to vendor_applications table'
)
ON CONFLICT (migration_name) DO NOTHING; 