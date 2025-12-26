import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/* Config                                                             */
/* ------------------------------------------------------------------ */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
     auth: { persistSession: false },
});

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const ALLOWED_CATEGORIES = new Set([
     "plumbing",
     "electrical",
     "heating",
     "cooling",
     "structural",
     "interior",
     "common_area",
     "security",
     "pests",
     "waste",
     "parking",
     "it",
     "administrative",
     "noise",
     "cleaning",
     "outdoorsafety",
]);

function safeCategory(input?: string) {
     if (!input) return "other";
     const v = input.toLowerCase();
     return ALLOWED_CATEGORIES.has(v) ? v : "other";
}

/* ------------------------------------------------------------------ */
/* Route                                                              */
/* ------------------------------------------------------------------ */

export async function POST(req: Request) {
     try {
          /* -------------------- Auth (Bearer from mobile) -------------------- */

          const auth = req.headers.get("authorization") ?? "";
          const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

          if (!token) {
               return NextResponse.json({ error: "Missing token" }, { status: 401 });
          }

          const sbUser = createClient(SUPABASE_URL, SUPABASE_ANON, {
               global: { headers: { Authorization: `Bearer ${token}` } },
               auth: { persistSession: false },
          });

          const { incidentId, imageId } = await req.json();

          /* -------------------- Permission check via RLS -------------------- */

          const { data: incident, error: permErr } = await sbUser
               .from("tblIncidentReports")
               .select(`
        id,
        images:tblIncidentReportImages(
          id,
          storage_bucket,
          storage_path,
          is_primary
        )
      `)
               .eq("id", incidentId)
               .single();

          if (permErr || !incident) {
               return NextResponse.json({ error: "Not allowed or not found" }, { status: 403 });
          }

          const images = incident.images ?? [];
          const chosen =
               (imageId && images.find((i: any) => i.id === imageId)) ||
               images.find((i: any) => i.is_primary) ||
               images[0];

          if (!chosen) {
               return NextResponse.json({ error: "No image to analyze" }, { status: 400 });
          }

          /* -------------------- Mark analyzing -------------------- */

          await sbAdmin
               .from("tblIncidentReports")
               .update({ ai_status: "analyzing", ai_error: null })
               .eq("id", incidentId);

          /* -------------------- Signed image URL -------------------- */

          const { data: signed, error: signErr } = await sbAdmin.storage
               .from(chosen.storage_bucket)
               .createSignedUrl(chosen.storage_path, 600);

          if (signErr || !signed?.signedUrl) {
               throw new Error(signErr?.message ?? "Failed to sign image URL");
          }

          /* -------------------- OpenAI Vision Call -------------------- */

          const response = await openai.responses.create({
               model: "gpt-5-mini-2025-08-07",
               input: [
                    {
                         role: "user",
                         content: [
                              {
                                   type: "input_text",
                                   text: `
You are analyzing a photo of a building-related problem reported by a tenant.

Return ONLY valid JSON with this exact shape:
{
  "title": string,
  "description": string,
  "category": string,
  "confidence": number
}

Rules:
- category must be one of: plumbing, electrical, noise, cleaning, common_area, heating, cooling, structural, interior, outdoorsafety, security, pests, administrative, parking, it, waste
- confidence must be between 0 and 1
- be concise and factual
              `.trim(),
                              },
                              {
                                   type: "input_image",
                                   image_url: signed.signedUrl,
                                   detail: "auto"
                              },
                         ],
                    },
               ],
          });

          const text = response.output_text;
          if (!text) throw new Error("AI returned no output");

          let ai;
          try {
               ai = JSON.parse(text);
          } catch {
               throw new Error("AI output was not valid JSON");
          }

          /* -------------------- Normalize & Save -------------------- */

          const category = safeCategory(ai.category);

          const { data: updated, error: updErr } = await sbAdmin
               .from("tblIncidentReports")
               .update({
                    title: ai.title ?? "Detected issue",
                    description: ai.description ?? "",
                    category,
                    ai_status: "done",
                    ai_confidence: Number(ai.confidence) || null,
                    ai_provider: "openai",
                    ai_model: "gpt-image-1-mini",
                    ai_error: null,
                    ai_analyzed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
               })
               .eq("id", incidentId)
               .select("*")
               .single();

          if (updErr) throw new Error(updErr.message);

          return NextResponse.json({ incident: updated });
     } catch (e: any) {
          console.error("AI analyze failed:", e);

          // best-effort failure update
          try {
               const { incidentId } = await req.json();
               if (incidentId) {
                    await sbAdmin
                         .from("tblIncidentReports")
                         .update({
                              ai_status: "failed",
                              ai_error: e?.message ?? "AI analysis failed",
                         })
                         .eq("id", incidentId);
               }
          } catch { }

          return NextResponse.json(
               { error: e?.message ?? "AI analysis failed" },
               { status: 500 }
          );
     }
}
