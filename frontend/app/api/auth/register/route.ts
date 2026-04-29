import { AUTH_COOKIE_OPTIONS } from "@/lib/auth";
import type { AuthResponse } from "@/types";
import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (
    !body?.email ||
    !body?.password ||
    !body?.username ||
    !body?.displayName
  ) {
    return NextResponse.json(
      { message: "Tous les champs sont requis." },
      { status: 400 },
    );
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        username: body.username,
        displayName: body.displayName,
      }),
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
      .catch(() => ({ message: "Erreur lors de l'inscription." }));
    return NextResponse.json(
      { message: err.message ?? "Erreur lors de l'inscription." },
      { status: backendRes.status },
    );
  }

  const data = (await backendRes.json()) as AuthResponse;

  const response = NextResponse.json({ ok: true, user: data.user });

  response.cookies.set("access_token", data.accessToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: 15 * 60,
  });
  response.cookies.set("refresh_token", data.refreshToken, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60,
  });
  response.cookies.set("user_info", JSON.stringify(data.user), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });

  return response;
}
