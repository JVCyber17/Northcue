// Preloaded into the daily-check child process by the monitoring fire drill.
// Replaces fetch with a stub that serves the synthetic document_sessions
// rows from DRILL_ROWS, so every alert can be proven to fire without a
// database and without touching production. Never loaded outside the drill.
"use strict";
const rows = JSON.parse(process.env.DRILL_ROWS || "[]");
global.fetch = async () => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify(rows)
});
