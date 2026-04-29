import { AUTH_COOKIE_OPTIONS } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("refresh_token")?.value;
  const accessToken = req.cookies.get("access_token")?.value;

  // Notifie le backend pour invalider le refresh token dans Redis.
  if (refreshToken && accessToken) {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {
      // Erreur non-bloquante : on supprime les cookies quoi qu'il arrive.
    });
  }

  const response = NextResponse.json({ ok: true });
  const expiredOptions = { ...AUTH_COOKIE_OPTIONS, maxAge: 0 };

  response.cookies.set("access_token", "", expiredOptions);
  response.cookies.set("refresh_token", "", expiredOptions);
  response.cookies.set("user_info", "", { ...expiredOptions, httpOnly: false });

  return response;
}
