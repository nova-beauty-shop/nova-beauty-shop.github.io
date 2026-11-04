import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let i = 0; i < length; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

const BOOTSTRAP_ERROR_STATUS: Record<string, number> = {
  bootstrap_closed: 409,
  username_taken: 409,
  invalid_username: 400,
  not_authenticated: 401,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) {
      return json({ error: "not_authenticated" }, 401);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) {
      return json({ error: "not_authenticated" }, 401);
    }

    const expectedSecret = Deno.env.get("OWNER_BOOTSTRAP_SECRET") ?? "";
    if (!expectedSecret) {
      return json({ error: "bootstrap_not_configured" }, 503);
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const submittedSecret = typeof body?.secret === "string" ? body.secret : "";
    const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return json({ error: "invalid_username" }, 400);
    }

    if (!constantTimeEqual(submittedSecret, expectedSecret)) {
      return json({ error: "invalid_secret" }, 403);
    }

    const { error } = await admin.rpc("bootstrap_first_owner", {
      p_user_id: userData.user.id,
      p_username: username,
    });
    if (error) {
      const code = error.message.trim();
      const status = BOOTSTRAP_ERROR_STATUS[code];
      if (status) return json({ error: code }, status);
      return json({ error: "bootstrap_failed" }, 500);
    }

    return json({ ok: true }, 200);
  } catch {
    return json({ error: "bootstrap_failed" }, 500);
  }
});
