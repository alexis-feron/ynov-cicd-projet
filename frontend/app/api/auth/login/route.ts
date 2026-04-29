import { AUTH_COOKIE_OPTIONS } from "@/lib/auth";
import type { AuthResponse } from "@/types";
import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { message: "Email et mot de passe requis." },
      { status: 400 },
    );
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
  } catch {
    return NextResponse.json(
      { message: "Le backend est inaccessible. Réessayez plus tard." },
      { status: 503 },
    );
  }

  if (!backendRes.ok) {
    const err = await backendRes
      .json()
      .catch(() => ({ message: "Identifiants invalides." }));
    return NextResponse.json(
      { message: err.message ?? "Identifiants invalides." },
      { status: backendRes.status },
    );
  }

  const data = (await backendRes.json()) as AuthResponse;

  const response = NextResponse.json({ ok: true, user: data.user });

  response.cookies.set("access_token", data.accessToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: 15 * 60, // 15 minutes
  });
  response.cookies.set("refresh_token", data.refreshToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60, // 7 jours
  });
  // Cookie non-httpOnly pour lire les infos utilisateur côté server component.
  response.cookies.set("user_info", JSON.stringify(data.user), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });

  return response;
}
