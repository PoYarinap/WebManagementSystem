import { NextResponse } from "next/server";
import { signSession, clearSessionCookie, getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, role: session.role });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, password } = body;

    if (action === "logout") {
      const response = NextResponse.json({ success: true, message: "Berhasil logout." });
      clearSessionCookie(response.headers);
      return response;
    }

    // Default action is login
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { error: "ADMIN_PASSWORD belum dikonfigurasi di environment variable server." },
        { status: 500 }
      );
    }

    if (!password || password !== adminPassword) {
      return NextResponse.json(
        { error: "Password admin salah. Silakan coba lagi." },
        { status: 401 }
      );
    }

    const token = await signSession({ role: "admin", authenticated: true });
    const response = NextResponse.json({
      success: true,
      message: "Login berhasil. Selamat datang kembali!",
    });

    const isProd = process.env.NODE_ENV === "production";
    const maxAge = 30 * 24 * 60 * 60; // 30 days
    response.cookies.set("rencana_gaji_session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge,
      secure: isProd,
    });

    return response;
  } catch (error: any) {
    console.error("Auth API error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses otentikasi." },
      { status: 500 }
    );
  }
}
