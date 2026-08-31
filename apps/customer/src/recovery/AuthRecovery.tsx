import { supabase } from '../lib/supabase';

export async function recoverAuthSession(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.refreshSession();
    return Boolean(data.session);
  } catch {
    return false;
  }
}
