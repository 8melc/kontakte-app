import { createClient } from '@supabase/supabase-js';

const SB_URL = 'https://wlpfukxcbzfpylkbnmvf.supabase.co';
const SB_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndscGZ1a3hjYnpmcHlsa2JubXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzOTE1NTIsImV4cCI6MjA5MDk2NzU1Mn0.-rVLD46EF2ICihoOLa5a5zQsjV_lxbNWTSb4jNBeQDs';

export const supabase = createClient(SB_URL, SB_KEY, {
  auth: { persistSession: false },
});
