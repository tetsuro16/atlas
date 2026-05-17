/**
 * Atlas — Server-side Supabase client (service_role)
 * Uses service_role key to bypass RLS for server-only operations.
 * NEVER expose this client or SERVICE_ROLE_KEY to the browser.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ─── Shared Plan types (mirrors atlas-app/lib/supabase.ts) ────────────────────

export type TripActivity = {
  time: string;
  name: string;
  duration: string;
  transport?: string;
  tips?: string;
  imageKeyword?: string;
  // note is intentionally omitted from snapshots
};

export type TripDayPlan = {
  day: number;
  activities: TripActivity[];
  lunch?: string;
  dinner?: string;
  outfit?: string;
  dayTips?: string[];
};

export type TripPlanSnapshot = {
  name: string;
  tagline: string;
  match?: number;
  highlights?: string[];
  imageKeyword?: string;
  days: TripDayPlan[];
};

export type SharedPlanRow = {
  id: string;
  share_token: string;
  user_id: string;
  plan_data: TripPlanSnapshot;
  destination: string;
  month: number;
  is_active: boolean;
  revoked_at: string | null;
  expires_at: string | null;
  created_at: string;
};
