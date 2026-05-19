import { createClient } from '@supabase/supabase-js'


const supabaseUrl = 'https://xuyvzghezvahebutwtaq.supabase.co'
const supabaseKey = 'sb_publishable_RixvHNv1OEgW-0-fmvK0rw_k-TWdfDk'


export const supabase = createClient(supabaseUrl, supabaseKey)
