import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jnfpulrlnrnuwnbtdbzt.supabase.co'
const supabaseAnonKey = 'sb_publishable_QRiO3x9yBk8N27J_mdErow_kWqyyOQO'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const SUPABASE_ANON_KEY = supabaseAnonKey
