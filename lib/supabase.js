import { createClient } from '@supabase/supabase-js';

// Soporta tanto Vite en navegador (import.meta.env) como Node.js (process.env)
const supabaseUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_URL || import.meta.env.EXPO_PUBLIC_SUPABASE_URL)) ||
  (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL)) ||
  'https://wdwarpifmcjogrcgmfzo.supabase.co';

const supabaseAnonKey = 
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)) ||
  (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indkd2FycGlmbWNqb2dyY2dtZnpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MDY1MDMsImV4cCI6MjEwMzk4MjUwM30.fNNj-o1ADODmTVLkujLM2h3jIWXh1Ndi7hxZ0nzjkoM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
