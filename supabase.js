// ============================================================
// supabase.js — RideGuard Supabase Client & Helper Functions
// Replace SUPABASE_URL and SUPABASE_ANON_KEY with your own!
// ============================================================

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// Initialize Supabase client (loaded via CDN in HTML)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── AUTH ────────────────────────────────────────────────────

async function signUp(email, password, name, role) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  // Insert into users table
  if (data.user) {
    const { error: profileError } = await supabase.from('users').insert([{
      id: data.user.id,
      name,
      role,
      email,
      created_at: new Date().toISOString()
    }]);
    if (profileError) console.error('Profile insert error:', profileError);
  }
  return data;
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

async function updateUserProfile(userId, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);
  if (error) throw error;
  return data;
}

// ─── ALERTS ─────────────────────────────────────────────────

async function insertAlert(userId, status = 'CONFIRMED') {
  const { data, error } = await supabase
    .from('alerts')
    .insert([{
      user_id: userId,
      status,
      created_at: new Date().toISOString()
    }])
    .select();
  if (error) throw error;
  return data;
}

async function getAlertHistory(userId, limit = 10) {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

async function getAllRidersStatus() {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id, name, role,
      alerts (
        status, created_at
      )
    `)
    .eq('role', 'rider');
  if (error) throw error;
  return data;
}

// ─── REALTIME ────────────────────────────────────────────────

function subscribeToAlerts(callback) {
  return supabase
    .channel('alerts-channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'alerts' },
      (payload) => callback(payload.new)
    )
    .subscribe();
}

// ─── SQL SETUP (run once in Supabase SQL Editor) ─────────────
/*
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'rider' CHECK (role IN ('rider', 'family')),
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  custom_message TEXT DEFAULT 'I may need help. Please check on me.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'CONFIRMED',
  latitude FLOAT,
  longitude FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own data
CREATE POLICY "Users can manage own profile"
  ON public.users FOR ALL USING (auth.uid() = id);

-- Anyone authenticated can read all riders (for family portal)
CREATE POLICY "Authenticated can read users"
  ON public.users FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert their own alerts
CREATE POLICY "Users can insert own alerts"
  ON public.alerts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Authenticated can read all alerts
CREATE POLICY "Authenticated can read alerts"
  ON public.alerts FOR SELECT USING (auth.role() = 'authenticated');

-- Enable realtime on alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
*/
