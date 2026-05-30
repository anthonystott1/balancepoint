// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fquiyroisixjiydgqrqr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxdWl5cm9pc2l4aml5ZGdxcnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjA2NDQsImV4cCI6MjA4Mzg5NjY0NH0.hmcYqM9-iWpNAvtmNyPPZq8RDp-7sfO-I6LGbInbVfs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// Helper function to get user's businesses
export const getUserBusinesses = async () => {
  const { data, error } = await supabase
    .from('user_business_access')
    .select(`
      *,
      business:businesses(*)
    `)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};
