import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const SUPABASE_URL = "https://sqcffnpizlqrnpvbbszq.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable__5NMyzrh68Vyp-WzA53YZw_CDPSGLbj";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
