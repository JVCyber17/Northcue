const REQUIRED_SUPABASE_ENV = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
];

function getSupabaseConfig() {
  const config = {
    url: process.env.SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  };

  const missing = REQUIRED_SUPABASE_ENV.filter((key) => !process.env[key]);
  return {
    ...config,
    missing,
    isConfigured: missing.length === 0
  };
}

function warnIfSupabaseConfigMissing() {
  const config = getSupabaseConfig();
  if (config.isConfigured) return config;

  console.warn(
    [
      "[ClearSteps] Supabase is not configured yet.",
      `Missing environment variable(s): ${config.missing.join(", ")}.`,
      "The current upload, OCR, and cue-card flow will continue to work without Supabase."
    ].join(" ")
  );

  return config;
}

module.exports = {
  getSupabaseConfig,
  warnIfSupabaseConfigMissing
};
