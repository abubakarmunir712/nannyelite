import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://nannyelite.ch";

const STATIC_PAGES = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/search", changefreq: "daily", priority: "0.9" },
  { loc: "/about", changefreq: "monthly", priority: "0.7" },
  { loc: "/blog", changefreq: "weekly", priority: "0.7" },
  { loc: "/careers", changefreq: "monthly", priority: "0.5" },
  { loc: "/help", changefreq: "monthly", priority: "0.5" },
  { loc: "/privacy", changefreq: "yearly", priority: "0.3" },
  { loc: "/terms", changefreq: "yearly", priority: "0.3" },
  { loc: "/security", changefreq: "yearly", priority: "0.3" },
  { loc: "/login", changefreq: "monthly", priority: "0.4" },
  { loc: "/signup", changefreq: "monthly", priority: "0.6" },
  { loc: "/jobs", changefreq: "daily", priority: "0.8" },
  { loc: "/search/lausanne", changefreq: "daily", priority: "0.8" },
  { loc: "/search/geneva", changefreq: "daily", priority: "0.8" },
  { loc: "/search/zurich", changefreq: "daily", priority: "0.8" },
  { loc: "/search/bern", changefreq: "daily", priority: "0.8" },
  { loc: "/contact", changefreq: "monthly", priority: "0.5" },
];

Deno.serve(async (req) => {
  // Allow preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch approved, visible nanny profiles
    const { data: nannies } = await supabase
      .from("nanny_profiles")
      .select("user_id, updated_at")
      .eq("onboarding_completed", true)
      .eq("profile_visible", true)
      .eq("profile_status", "approved")
      .limit(1000);

    // Fetch open jobs
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, updated_at")
      .eq("status", "open")
      .limit(1000);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static pages
    for (const page of STATIC_PAGES) {
      xml += `  <url>\n    <loc>${SITE_URL}${page.loc}</loc>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;
    }

    // Nanny profile pages
    if (nannies) {
      for (const n of nannies) {
        const lastmod = n.updated_at ? n.updated_at.split("T")[0] : "";
        xml += `  <url>\n    <loc>${SITE_URL}/nanny/${n.user_id}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ""}  </url>\n`;
      }
    }

    // Job pages
    if (jobs) {
      for (const j of jobs) {
        const lastmod = j.updated_at ? j.updated_at.split("T")[0] : "";
        xml += `  <url>\n    <loc>${SITE_URL}/jobs/${j.id}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.6</priority>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ""}  </url>\n`;
      }
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return new Response("Error generating sitemap", { status: 500 });
  }
});
