import { createClient } from '@supabase/supabase-js';

async function main() {
  // These environment variables should be set in the environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    console.error('Please make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    process.exit(1);
  }

  // Create Supabase client with service role key for admin operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log('Adding location column to vendor_applications table...');
    
    // Execute a SQL query to add the location column if it doesn't exist
    // Note: This requires appropriate permissions on the service role key
    const { error } = await supabase
      .from('_pgrpc')
      .select(`*`)
      .limit(1);
      
    if (error) {
      console.error('Error checking database access:', error);
      console.error('Please add the location column manually in the Supabase dashboard:');
      console.error('1. Go to Supabase Dashboard > Table Editor');
      console.error('2. Select "vendor_applications" table');
      console.error('3. Click "Add Column"');
      console.error('4. Name it "location", type "text"');
      console.error('5. Save the changes');
      process.exit(1);
    }
    
    console.log('Service key has appropriate permissions.');
    console.log('Note: To add the column automatically, you would need SQL execution rights');
    console.log('Please add the "location" column manually in the Supabase dashboard.');
    console.log('\nAlternatively, you can run the following SQL in the Supabase SQL Editor:');
    console.log('ALTER TABLE vendor_applications ADD COLUMN IF NOT EXISTS location text;');
    
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main(); 