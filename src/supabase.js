import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Replace these two values with your Supabase Project URL and Publishable key.
// The publishable/anon key is designed for client apps. NEVER put a service_role/secret key here.
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";
const SUPABASE_PUBLISHABLE_KEY = "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: PlatformIsWeb(),
  },
});

function PlatformIsWeb() {
  return typeof document !== "undefined";
}
