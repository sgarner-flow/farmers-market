# Database Migrations

This directory contains database migration scripts for the Farmers Market application.

## Running Migrations

Migrations should be run against your Supabase database. You can run them using the Supabase CLI or directly in the SQL Editor in the Supabase dashboard.

### Using Supabase Dashboard

1. Log in to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste the content of the migration script
5. Run the query

### Using Supabase CLI

1. Install the Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```
2. Log in to your Supabase account:
   ```bash
   supabase login
   ```
3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
4. Run the migration:
   ```bash
   supabase db execute --file scripts/add-reviewed-status.sql
   ```

## Migration History

- `add-reviewed-status.sql` - Adds the 'Reviewed' status to the vendor_applications table to support the vendor invitation workflow 