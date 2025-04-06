import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Create RPC function to query the mailing list data directly
    const { data: createMailingListData, error: createMailingListError } = await supabase.rpc('create_function_if_not_exists', {
      function_name: 'query_mailing_list_data',
      function_definition: `
        CREATE OR REPLACE FUNCTION query_mailing_list_data()
        RETURNS SETOF json AS $$
        BEGIN
          RETURN QUERY SELECT row_to_json(ml) 
            FROM (
              SELECT id, created_at, name, email 
              FROM mailing_list 
              ORDER BY created_at DESC
            ) ml;
        EXCEPTION
          WHEN undefined_table THEN
            RETURN QUERY SELECT row_to_json(ml) 
              FROM (
                SELECT id, created_at, name, email 
                FROM "Mailing_List" 
                ORDER BY created_at DESC
              ) ml;
          WHEN OTHERS THEN
            RAISE;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });
    
    if (createMailingListError) {
      console.error('Error creating query_mailing_list_data function:', createMailingListError);
    }

    // Create a helper function to create other functions if they don't exist yet
    const { data: helperFunctionData, error: helperFunctionError } = await supabase.rpc('create_function_if_not_exists', {
      function_name: 'create_function_if_not_exists',
      function_definition: `
        CREATE OR REPLACE FUNCTION create_function_if_not_exists(
          function_name text,
          function_definition text
        ) RETURNS void AS $$
        DECLARE
          function_exists boolean;
        BEGIN
          SELECT EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = function_name
          ) INTO function_exists;
          
          IF NOT function_exists THEN
            EXECUTE function_definition;
          END IF;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });
    
    if (helperFunctionError) {
      console.error('Error creating the helper function:', helperFunctionError);
    }

    return NextResponse.json({ 
      message: 'RPC functions creation attempted',
      results: {
        createMailingListQuery: {
          data: createMailingListData,
          error: createMailingListError ? createMailingListError.message : null
        },
        createHelperFunction: {
          data: helperFunctionData,
          error: helperFunctionError ? helperFunctionError.message : null
        }
      }
    });
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
} 