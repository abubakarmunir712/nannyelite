import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: nannyProfiles } = await supabase
      .from("nanny_profiles")
      .select("user_id")
      .eq("onboarding_completed", true);

    if (!nannyProfiles || nannyProfiles.length === 0) {
      return new Response(JSON.stringify({ updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nannyIds = nannyProfiles.map((n) => n.user_id);

    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, nanny_user_id, family_user_id, created_at")
      .in("nanny_user_id", nannyIds);

    if (!conversations || conversations.length === 0) {
      return new Response(JSON.stringify({ updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const convoIds = conversations.map((c) => c.id);

    const { data: messages } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, created_at")
      .in("conversation_id", convoIds)
      .order("created_at", { ascending: true })
      .limit(5000);

    if (!messages) {
      return new Response(JSON.stringify({ updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const msgsByConvo: Record<string, typeof messages> = {};
    for (const m of messages) {
      if (!msgsByConvo[m.conversation_id]) msgsByConvo[m.conversation_id] = [];
      msgsByConvo[m.conversation_id].push(m);
    }

    const nannyMetrics: Record<
      string,
      { totalConvos: number; repliedConvos: number; responseTimes: number[] }
    > = {};

    for (const convo of conversations) {
      const nannyId = convo.nanny_user_id;
      if (!nannyMetrics[nannyId]) {
        nannyMetrics[nannyId] = { totalConvos: 0, repliedConvos: 0, responseTimes: [] };
      }

      const convoMsgs = msgsByConvo[convo.id];
      if (!convoMsgs || convoMsgs.length === 0) {
        nannyMetrics[nannyId].totalConvos++;
        continue;
      }

      const firstFamilyMsg = convoMsgs.find((m) => m.sender_id === convo.family_user_id);
      if (!firstFamilyMsg) continue;

      nannyMetrics[nannyId].totalConvos++;

      const firstNannyReply = convoMsgs.find(
        (m) =>
          m.sender_id === nannyId &&
          new Date(m.created_at) > new Date(firstFamilyMsg.created_at)
      );

      if (firstNannyReply) {
        nannyMetrics[nannyId].repliedConvos++;
        const diffMs =
          new Date(firstNannyReply.created_at).getTime() -
          new Date(firstFamilyMsg.created_at).getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        nannyMetrics[nannyId].responseTimes.push(diffHours);
      }
    }

    let updated = 0;
    for (const [nannyId, metrics] of Object.entries(nannyMetrics)) {
      if (metrics.totalConvos === 0) continue;

      const responseRate = metrics.repliedConvos / metrics.totalConvos;
      const avgResponseTime =
        metrics.responseTimes.length > 0
          ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
          : null;

      const { error } = await supabase
        .from("nanny_profiles")
        .update({
          response_rate: Math.round(responseRate * 100),
          avg_response_time_hours: avgResponseTime !== null ? Math.round(avgResponseTime * 10) / 10 : null,
        })
        .eq("user_id", nannyId);

      if (!error) updated++;
    }

    return new Response(JSON.stringify({ updated, processed: Object.keys(nannyMetrics).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
