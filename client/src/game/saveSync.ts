import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sanitizeCustomization } from './customization';
import { sanitizeName, type GameSave } from './progress';

interface SaveRow {
  player_name: string;
  unlocked_world: number;
  best_score: number;
  customization: unknown;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const cloudSaveConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabase: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (!cloudSaveConfigured) throw new Error('Cloud save is not configured.');
  supabase ??= createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  });
  return supabase;
}

async function getUserId(client: SupabaseClient): Promise<string> {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session) return sessionData.session.user.id;

  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw error;
  if (!data.user) throw new Error('Supabase did not return an anonymous player.');
  return data.user.id;
}

export async function loadCloudSave(): Promise<GameSave | null> {
  if (!cloudSaveConfigured) return null;
  const client = getClient();
  const userId = await getUserId(client);
  const { data, error } = await client
    .from('player_saves')
    .select('player_name, unlocked_world, best_score, customization')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as SaveRow;
  return {
    playerName: sanitizeName(row.player_name),
    unlockedWorld: Number.isInteger(row.unlocked_world) ? Math.min(4, Math.max(0, row.unlocked_world)) : 0,
    bestScore: Number.isSafeInteger(row.best_score) ? Math.min(1_000_000_000, Math.max(0, row.best_score)) : 0,
    customization: sanitizeCustomization(row.customization),
  };
}

export async function saveCloudSave(save: GameSave): Promise<void> {
  if (!cloudSaveConfigured) return;
  const client = getClient();
  const userId = await getUserId(client);
  const { error } = await client.from('player_saves').upsert({
    user_id: userId,
    player_name: sanitizeName(save.playerName),
    unlocked_world: Math.min(4, Math.max(0, save.unlockedWorld)),
    best_score: Math.min(1_000_000_000, Math.max(0, save.bestScore)),
    customization: sanitizeCustomization(save.customization),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
