const { getSupabaseConfig } = require("../config/supabaseConfig");

let cachedAdminClient = null;

function getSupabaseAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("Supabase service-role access must only run on the backend.");
  }

  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return null;
  }

  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  let createClient;
  try {
    ({ createClient } = require("@supabase/supabase-js"));
  } catch (error) {
    throw new Error(
      "Supabase package is not installed. Run npm install before using Supabase locally."
    );
  }

  cachedAdminClient = createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return cachedAdminClient;
}

function isSupabaseConfigured() {
  return getSupabaseConfig().isConfigured;
}

module.exports = {
  getSupabaseAdminClient,
  isSupabaseConfigured
};
