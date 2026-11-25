import { NextResponse } from "next/server";
import { signSession, clearSessionCookie, getSession } from "@/lib/session";
import { getUserByUsername } from "@/lib/sheets";
import { verifyPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    user: {
      userId: session.userId,
      username: session.username,
      nama: session.nama,
      role: session.role,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, username, password } = body;

    if (action === "logout") {
      const response = NextResponse.json({
        success: true,
        message: "Berhasil logout.",
      });
      clearSessionCookie(response.headers);
      return response;
    }

    const targetUsername = (username || "admin").trim().toLowerCase();
    if (!password) {
      return NextResponse.json(
        { error: "Password wajib diisi." },
        { status: 400 }
      );
    }

    const user = await getUserByUsername(targetUsername);
    if (!user) {
      return NextResponse.json(
        { error: "Username atau password salah. Silakan coba lagi." },
        { status: 401 }
      );
    }

    if (!user.aktif) {
      return NextResponse.json(
        { error: "Akun Anda sedang dinonaktifkan oleh Admin." },
        { status: 403 }
      );
    }

    const isPasswordMatch =
      verifyPassword(password, user.password_hash) ||
      (user.id === "admin" &&
        !!process.env.ADMIN_PASSWORD &&
        password === process.env.ADMIN_PASSWORD);

    if (!isPasswordMatch) {
      return NextResponse.json(
        { error: "Username atau password salah. Silakan coba lagi." },
        { status: 401 }
      );
    }

    const token = await signSession({
      userId: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
      authenticated: true,
    });

    const response = NextResponse.json({
      success: true,
      message: `Login berhasil. Selamat datang, ${user.nama}!`,
      user: {
        userId: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role,
      },
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
