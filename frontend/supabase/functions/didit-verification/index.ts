import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DIDIT_BASE_URL = "https://verification.didit.me";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const DIDIT_API_KEY = Deno.env.get("DIDIT_CLIENT_SECRET"); // The secret API key from Didit dashboard
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const DIDIT_WORKFLOW_ID = Deno.env.get("DIDIT_CLIENT_ID"); // Workflow ID from Didit dashboard

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  // ── Webhook callback from Didit ──
  if (path === "webhook" && req.method === "POST") {
    return handleWebhook(req, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }

  // ── Create session (authenticated) ──
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub as string;

  if (!DIDIT_API_KEY || !DIDIT_WORKFLOW_ID) {
    console.log("Didit credentials not configured, returning mock response");
    return new Response(
      JSON.stringify({
        verification_url: "mock://didit-not-configured",
        session_id: "mock-session",
        message: "Didit is not configured. Add DIDIT_CLIENT_ID (workflow ID) and DIDIT_CLIENT_SECRET (API key) secrets.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { callback_url } = await req.json();
    const webhookUrl = `${SUPABASE_URL}/functions/v1/didit-verification/webhook`;

    // Create verification session using Didit v3 API
    const sessionResp = await fetch(`${DIDIT_BASE_URL}/v3/session/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": DIDIT_API_KEY,
      },
      body: JSON.stringify({
        workflow_id: DIDIT_WORKFLOW_ID,
        callback: callback_url || `${url.origin}/dashboard?didit=callback`,
        webhook: webhookUrl,
        vendor_data: userId,
      }),
    });

    if (!sessionResp.ok) {
      const errText = await sessionResp.text();
      throw new Error(`Didit session error [${sessionResp.status}]: ${errText}`);
    }

    const session = await sessionResp.json();

    return new Response(
      JSON.stringify({
        verification_url: session.url,
        session_id: session.session_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Didit create-session error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleWebhook(
  req: Request,
  supabaseUrl: string,
  serviceRoleKey: string
) {
  try {
    const payload = await req.json();
    console.log("Didit webhook received:", JSON.stringify(payload));

    const userId = payload.vendor_data;
    const status = payload.status; // "Approved", "Declined"

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing vendor_data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (status === "Approved") {
      await supabase
        .from("nanny_profiles")
        .update({
          identity_verified: true,
          identity_verification_status: "approved",
          identity_verified_at: new Date().toISOString(),
        } as any)
        .eq("user_id", userId);

      console.log(`Identity verified for user ${userId}`);
    } else {
      await supabase
        .from("nanny_profiles")
        .update({
          identity_verification_status: "declined",
        } as any)
        .eq("user_id", userId);

      console.log(`Identity verification declined for user ${userId}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Didit webhook error:", err);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
