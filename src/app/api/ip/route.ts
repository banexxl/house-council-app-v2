import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
     const forwardedFor = req.headers.get("x-forwarded-for");
     const ip =
          forwardedFor?.split(",")[0]?.trim() || // real client IP (if proxy adds header)
          req.headers.get("x-real-ip") ||         // some proxies use this
          "unknown";
     return NextResponse.json({ ip });
}
