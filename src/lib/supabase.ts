import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://thcjrzluhsbgtbirdoxl.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoY2pyemx1aHNiZ3RiaXJkb3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNTM1MjcsImV4cCI6MjA4ODkyOTUyN30.DdhrLvq1G0b0MrPkMBr4jP0pkzzM1JVsUBnR9V7s8dU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const SUPABASE_ANON_KEY = supabaseAnonKey
