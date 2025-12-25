import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sbAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
     auth: { persistSession: false },
});

export async function POST(req: Request) {
     try {
          const auth = req.headers.get("authorization") ?? "";
          const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
          if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

          // user-scoped client for permission check
          const sbUser = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
               global: { headers: { Authorization: `Bearer ${token}` } },
               auth: { persistSession: false },
          });

          const { incidentId, imageId } = await req.json();

          // 1) Permission check using RLS (best): select incident as user
          const { data: incident, error: permErr } = await sbUser
               .from("tblIncidentReports")
               .select(
                    `id, building_id, reported_by,
         images:tblIncidentReportImages(id, storage_bucket, storage_path, is_primary)`
               )
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

          if (!chosen) return NextResponse.json({ error: "No image to analyze" }, { status: 400 });

          // 2) set analyzing
          await sbAdmin.from("tblIncidentReports").update({ ai_status: "analyzing", ai_error: null }).eq("id", incidentId);

          // 3) signed url
          const { data: signed, error: signErr } = await sbAdmin.storage
               .from(chosen.storage_bucket)
               .createSignedUrl(chosen.storage_path, 600);

          if (signErr || !signed?.signedUrl) throw new Error(signErr?.message ?? "Sign URL failed");

          // 4) call AI (stub for now)
          const ai = {
               title: "Detected issue",
               description: "Replace with real AI vision result.",
               category: "other",
               confidence: 0.2,
          };

          // 5) shops (stub)
          const shops: any[] = [];

          // 6) overwrite incident fields
          const { data: updated, error: updErr } = await sbAdmin
               .from("tblIncidentReports")
               .update({
                    title: ai.title,
                    description: ai.description,
                    category: ai.category,
                    ai_status: "done",
                    ai_confidence: ai.confidence,
                    ai_shops: shops,
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
          return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
     }
}
