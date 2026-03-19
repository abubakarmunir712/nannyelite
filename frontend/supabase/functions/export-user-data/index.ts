import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    const [
      profileResult,
      nannyProfileResult,
      familyProfileResult,
      childrenResult,
      messagesResult,
      bookingsResult,
      documentsResult,
      photosResult,
      referencesGivenResult,
      referencesReceivedResult,
      favoritesResult,
      jobsResult,
      applicationsResult,
      notificationsResult,
      activityLogResult,
      availabilitySlotsResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("nanny_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("family_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("children").select("*").eq("family_user_id", userId),
      supabase.from("messages").select("*").eq("sender_id", userId),
      supabase.from("bookings").select("*").or(`family_user_id.eq.${userId},nanny_user_id.eq.${userId}`),
      supabase.from("nanny_documents").select("document_type, document_name, status, created_at").eq("user_id", userId),
      supabase.from("nanny_photos").select("photo_url, is_primary, display_order, created_at").eq("user_id", userId),
      supabase.from("nanny_references").select("*").eq("family_user_id", userId),
      supabase.from("nanny_references").select("*").eq("nanny_user_id", userId),
      supabase.from("favorite_nannies").select("*").eq("family_user_id", userId),
      supabase.from("jobs").select("*").eq("family_user_id", userId),
      supabase.from("job_applications").select("*").eq("nanny_user_id", userId),
      supabase.from("notifications").select("*").eq("user_id", userId),
      supabase.from("activity_log").select("*").eq("user_id", userId),
      supabase.from("availability_slots").select("*").eq("user_id", userId),
    ]);

    const exportData = {
      export_info: {
        exported_at: new Date().toISOString(),
        user_id: userId,
        email: user.email,
        platform: "NannyElite",
        data_retention_info: "You can request data deletion by contacting support@nannyelite.ch",
      },
      account: {
        profile: profileResult.data,
        nanny_profile: nannyProfileResult.data,
        family_profile: familyProfileResult.data,
      },
      family_data: {
        children: childrenResult.data || [],
        jobs_posted: jobsResult.data || [],
        favorites: favoritesResult.data || [],
        reviews_given: referencesGivenResult.data || [],
      },
      nanny_data: {
        documents: documentsResult.data || [],
        photos: photosResult.data || [],
        availability: availabilitySlotsResult.data || [],
        job_applications: applicationsResult.data || [],
        reviews_received: referencesReceivedResult.data || [],
      },
      activity: {
        messages_sent: messagesResult.data || [],
        bookings: bookingsResult.data || [],
        notifications: notificationsResult.data || [],
        activity_log: activityLogResult.data || [],
      },
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="nannyelite-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new Response(JSON.stringify({ error: "Export failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
