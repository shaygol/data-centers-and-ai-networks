// Fill these two values from Supabase: Project Settings -> API.
// This is the publishable (anon) key: it is meant to live in the browser. Never put the database password or a service/secret key here.
window.MH_CONFIG = {
  SUPABASE_URL: "https://fmptnttyvksgowkhpewh.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_WL7uhe8PTEOXSxhUGA-vLw_Of0XvhvO",
  REFRESH_SECONDS: 5,
  // Submit closes at this time (Israel time, UTC+2 in November). The same time is checked in supabase/*.sql.
  DEADLINE: "2026-11-15T13:00:00+02:00",
  // From this time the page shows each student their own results (the "Your results" part and the real effect of their drains).
  // Before it the page gives no hint about what is right. Leave it at the deadline, or move it later (for example to after the class).
  REVEAL_AT: "2026-11-15T13:00:00+02:00"
};
