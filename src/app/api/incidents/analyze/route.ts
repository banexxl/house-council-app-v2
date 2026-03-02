import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { getServerI18n, tokens as serverTokens } from "src/locales/i18n-server";

/* ------------------------------------------------------------------ */
/* Config                                                             */
/* ------------------------------------------------------------------ */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SB_CLIENT_KEY!;
const SUPABASE_SERVICE = process.env.SB_SERVICE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
     auth: { persistSession: false },
});

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const SUPPORTED_LOCALES = new Set(["en", "de", "es", "rs"]);

function firstLanguageTag(raw?: string | null): string | null {
     if (!raw) return null;
     const value = String(raw).trim();
     if (!value) return null;
     // Accept-Language header can be: "sr", "sr-RS,sr;q=0.9,en;q=0.8"
     return value.split(",")[0]?.split(";")[0]?.trim() || null;
}

function normalizeLocale(raw?: string | null): string {
     const tag = firstLanguageTag(raw);
     if (!tag) return "rs";

     const base = tag.toLowerCase().split("-")[0];
     const mapped = base === "sr" ? "rs" : base;

     return SUPPORTED_LOCALES.has(mapped) ? mapped : "rs";
}

function languageTagToName(tag?: string | null, locale?: string): string {
     const t = (tag || "").toLowerCase();
     if (t.startsWith("sr")) return "Serbian";
     if (t.startsWith("en")) return "English";
     if (t.startsWith("de")) return "German";
     if (t.startsWith("es")) return "Spanish";

     // fallback based on app locales
     switch ((locale || "").toLowerCase()) {
          case "en":
               return "English";
          case "de":
               return "German";
          case "es":
               return "Spanish";
          case "rs":
          default:
               return "Serbian";
     }
}

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
     if (!input) return "administrative"; // ✅ fallback must be allowed
     const v = String(input).toLowerCase().trim();
     return ALLOWED_CATEGORIES.has(v) ? v : "administrative";
}

/* ------------------------------------------------------------------ */
/* Route                                                              */
/* ------------------------------------------------------------------ */

export async function POST(req: Request) {
     // ✅ parse once, use later (including in catch)
     let incidentId: string | undefined;
     let imageId: string | undefined;
     let locale: string = normalizeLocale(req.headers.get("accept-language"));
     let t = await getServerI18n(locale);
     let requestedLanguageTag: string | null = firstLanguageTag(req.headers.get("accept-language"));

     try {
          /* -------------------- Auth (Bearer from mobile) -------------------- */

          const auth = req.headers.get("authorization") ?? "";
          const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

          if (!token) {
               return NextResponse.json(
                    { ok: false, message: t(serverTokens.incident.aiAnalyze.notSignedIn) },
                    { status: 401 }
               );
          }

          const body = await req.json();
          incidentId = body?.incidentId;
          imageId = body?.imageId;

          // allow overriding locale via request body
          locale = normalizeLocale(body?.language || req.headers.get("accept-language"));
          requestedLanguageTag = firstLanguageTag(body?.language) || requestedLanguageTag;
          t = await getServerI18n(locale);

          if (!incidentId) {
               return NextResponse.json(
                    { ok: false, message: t(serverTokens.incident.aiAnalyze.missingIncidentId) },
                    { status: 400 }
               );
          }

          const sbUser = createClient(SUPABASE_URL, SUPABASE_ANON, {
               global: { headers: { Authorization: `Bearer ${token}` } },
               auth: { persistSession: false },
          });

          /* -------------------- Permission check via RLS -------------------- */

          const { data: incident, error: permErr } = await sbUser
               .from("tblIncidentReports")
               .select(
                    `
        id,
        images:tblIncidentReportImages(
          id,
          storage_bucket,
          storage_path,
          is_primary
        )
      `
               )
               .eq("id", incidentId)
               .single();

          if (permErr || !incident) {
               return NextResponse.json(
                    { ok: false, message: t(serverTokens.incident.aiAnalyze.notAllowedOrNotFound) },
                    { status: 403 }
               );
          }

          const images = (incident as any).images ?? [];
          const chosen =
               (imageId && images.find((i: any) => i.id === imageId)) ||
               images.find((i: any) => i.is_primary) ||
               images[0];

          if (!chosen) {
               return NextResponse.json(
                    { ok: false, message: t(serverTokens.incident.aiAnalyze.noImageToAnalyze) },
                    { status: 200 }
               );
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

          const languageName = languageTagToName(requestedLanguageTag, locale);
          const languageHint = requestedLanguageTag ? `${languageName} (${requestedLanguageTag})` : languageName;

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
Do not analyze anything outside the image or make assumptions beyond what is visible.
Do not analyze people or unrelated objects.
Do not analyze anything that is not related to the categories provided.

Language:
- Write the JSON fields "title" and "description" in ${languageHint}.
- Do NOT translate the "category" value; it must be one of the allowed category ids listed below.

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
                                   detail: "auto",
                              },
                         ],
                    },
               ],
          });

          const text = response.output_text;
          if (!text) throw new Error("AI returned no output");

          let ai: any;
          try {
               ai = JSON.parse(text);
          } catch {
               throw new Error("AI output was not valid JSON");
          }

          /* -------------------- Normalize & Save -------------------- */

          const category = safeCategory(ai.category);
          const confidence =
               typeof ai.confidence === "number" ? ai.confidence : Number(ai.confidence);
          const aiConfidence =
               Number.isFinite(confidence) && confidence >= 0 && confidence <= 1
                    ? confidence
                    : null;

          const { data: updated, error: updErr } = await sbAdmin
               .from("tblIncidentReports")
               .update({
                    title: ai.title ?? t(serverTokens.incident.aiAnalyze.detectedIssueFallback),
                    description: ai.description ?? "",
                    category,
                    ai_status: "done",
                    ai_confidence: aiConfidence,
                    ai_provider: "openai",
                    ai_model: "gpt-5-mini-2025-08-07", // ✅ store the real model you used
                    ai_error: null,
                    ai_analyzed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
               })
               .eq("id", incidentId)
               .select("*")
               .single();

          if (updErr) throw new Error(updErr.message);

          return NextResponse.json({ ok: true, incident: updated }, { status: 200 });
     } catch (e: any) {
          // ✅ keep the real error internal
          console.error("AI analyze failed:", e);

          // best-effort failure update (store detailed message for you, not the user)
          if (incidentId) {
               try {
                    await sbAdmin
                         .from("tblIncidentReports")
                         .update({
                              ai_status: "failed",
                              ai_error: String(e?.message ?? "AI analysis failed"),
                         })
                         .eq("id", incidentId);
               } catch {
                    // ignore
               }
          }

          // ✅ user-safe response (no internal details)
          return NextResponse.json(
               {
                    ok: false,
                    code: "AI_ANALYSIS_FAILED",
                    message: t(serverTokens.incident.aiAnalyze.aiUnavailable),
               },
               { status: 200 }
          );
     }
}
