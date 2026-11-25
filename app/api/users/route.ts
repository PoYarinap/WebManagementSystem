import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getUsersList,
  createUser,
  updateUser,
  deleteUser,
} from "@/lib/sheets";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 }) };
  }
  if (session.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Akses ditolak. Hanya Admin yang dapat mengelola akun." },
        { status: 403 }
      ),
    };
  }
  return { session };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const users = await getUsersList();
    const safeUsers = users.map(({ password_hash, ...rest }) => rest);
    return NextResponse.json({ data: safeUsers });
  } catch (error: any) {
    console.error("GET Users error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar akun." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const { username, nama, password, role } = body;

    if (!username || !password || String(password).length < 4) {
      return NextResponse.json(
        { error: "Username dan password (minimal 4 karakter) wajib diisi." },
        { status: 400 }
      );
    }

    const created = await createUser({
      username,
      nama: nama || username,
      password: String(password),
      role: role === "admin" ? "admin" : "user",
    });

    const { password_hash, ...safeUser } = created;
    return NextResponse.json({ success: true, data: safeUser });
  } catch (error: any) {
    console.error("POST Users error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal membuat akun baru." },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const { id, nama, password, aktif } = body;

    if (!id) {
      return NextResponse.json({ error: "ID user wajib diisi." }, { status: 400 });
    }
    if (password !== undefined && password !== "" && String(password).length < 4) {
      return NextResponse.json(
        { error: "Password baru minimal 4 karakter." },
        { status: 400 }
      );
    }

    const success = await updateUser(id, {
      nama,
      password: password || undefined,
      aktif,
    });

    if (!success) {
      return NextResponse.json(
        { error: "Akun tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT Users error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui akun." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const deleteData = searchParams.get("deleteData") !== "false";

    if (!id) {
      return NextResponse.json({ error: "ID user dibutuhkan." }, { status: 400 });
    }

    const success = await deleteUser(id, deleteData);
    if (!success) {
      return NextResponse.json(
        { error: "Akun tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Users error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal menghapus akun." },
      { status: 400 }
    );
  }
}
