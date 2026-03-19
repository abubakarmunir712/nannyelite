import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") || "unknown";
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
    });
  }

  try {
    const { narrative } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a professional profile writer for NannyElite, a premium childcare platform. 
Given a nanny's spoken narrative about themselves, extract structured information and generate a polished professional bio.

Return a JSON object with these fields (use null for anything not mentioned, false for unmentioned booleans):
{
  "bio": "A polished 2-3 paragraph professional bio written in third person",
  "years_of_experience": number or null,
  "age": number or null,
  "nationality": "string or null",
  "languages": ["array of languages mentioned"],
  "education": "string or null — degree, diploma, or educational background",
  "smoking_status": "non_smoker" or "smoker",
  "comfortable_with_pets": boolean,
  "has_drivers_license": boolean,
  "experience_infants": boolean,
  "experience_toddlers": boolean,
  "experience_preschool": boolean,
  "experience_school_age": boolean,
  "experience_teenagers": boolean,
  "experience_special_needs": boolean,
  "special_needs_details": "string or null",
  "has_first_aid": boolean,
  "has_cpr": boolean,
  "has_early_childhood_cert": boolean,
  "has_child_psychology": boolean,
  "has_nutrition_cert": boolean,
  "has_montessori_cert": boolean,
  "other_certifications": ["array of other certs mentioned"],
  "offers_date_night": boolean,
  "offers_overnight": boolean,
  "offers_after_school": boolean,
  "offers_weekend_holiday": boolean,
  "offers_full_time": boolean,
  "offers_part_time": boolean,
  "can_cook": boolean,
  "can_drive": boolean,
  "has_car": boolean,
  "can_help_homework": boolean,
  "can_do_light_housekeeping": boolean,
  "activities_offered": ["array of activities like swimming, arts & crafts, music, etc."],
  "suggested_babysitting_rate": number or null,
  "suggested_part_time_rate": number or null
}

IMPORTANT RULES:
- Only set boolean fields to true if EXPLICITLY mentioned or strongly implied in the narrative.
- Do NOT assume or infer services/skills that are not mentioned.
- Default all boolean fields to false unless there is clear evidence in the narrative.
- Default smoking_status to "non_smoker" unless explicitly mentioned.
- If education is mentioned extract it. Make the bio warm, professional, and trustworthy.
- Extract age if mentioned. Use null if not mentioned.
- Extract suggested_babysitting_rate if a rate/price is mentioned for babysitting or spot care. Use null if not mentioned.
- Extract suggested_part_time_rate if a rate/price is mentioned for regular/part-time care. Use null if not mentioned.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the nanny's narrative about themselves:\n\n"${narrative}"` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_nanny_profile",
              description: "Extract structured nanny profile data from narrative",
              parameters: {
                type: "object",
                properties: {
                  bio: { type: "string" },
                  years_of_experience: { type: ["number", "null"] },
                  age: { type: ["number", "null"] },
                  nationality: { type: ["string", "null"] },
                  languages: { type: "array", items: { type: "string" } },
                  education: { type: ["string", "null"] },
                  smoking_status: { type: "string", enum: ["non_smoker", "smoker"] },
                  comfortable_with_pets: { type: "boolean" },
                  has_drivers_license: { type: "boolean" },
                  experience_infants: { type: "boolean" },
                  experience_toddlers: { type: "boolean" },
                  experience_preschool: { type: "boolean" },
                  experience_school_age: { type: "boolean" },
                  experience_teenagers: { type: "boolean" },
                  experience_special_needs: { type: "boolean" },
                  special_needs_details: { type: ["string", "null"] },
                  has_first_aid: { type: "boolean" },
                  has_cpr: { type: "boolean" },
                  has_early_childhood_cert: { type: "boolean" },
                  has_child_psychology: { type: "boolean" },
                  has_nutrition_cert: { type: "boolean" },
                  has_montessori_cert: { type: "boolean" },
                  other_certifications: { type: "array", items: { type: "string" } },
                  offers_date_night: { type: "boolean" },
                  offers_overnight: { type: "boolean" },
                  offers_after_school: { type: "boolean" },
                  offers_weekend_holiday: { type: "boolean" },
                  offers_full_time: { type: "boolean" },
                  offers_part_time: { type: "boolean" },
                  can_cook: { type: "boolean" },
                  can_drive: { type: "boolean" },
                  has_car: { type: "boolean" },
                  can_help_homework: { type: "boolean" },
                  can_do_light_housekeeping: { type: "boolean" },
                  activities_offered: { type: "array", items: { type: "string" } },
                  suggested_babysitting_rate: { type: ["number", "null"] },
                  suggested_part_time_rate: { type: ["number", "null"] },
                },
                required: ["bio"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_nanny_profile" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI processing failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("Failed to extract profile data");
    }

    const profileData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(profileData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-nanny-profile error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
