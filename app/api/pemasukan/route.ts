import { NextResponse } from "next/server";
import {
  getPemasukanList,
  addPemasukan,
  updatePemasukan,
  deletePemasukan,
} from "@/lib/sheets";
import { getCurrentPeriodeJakarta } from "@/lib/format";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const periode = searchParams.get("periode") || undefined;
    const list = await getPemasukanList(periode, session.userId);
    return NextResponse.json({ data: list });
  } catch (error: any) {
    console.error("GET Pemasukan error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data pemasukan." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }
    const body = await request.json();
    const { tanggal, jumlah, keterangan, periode } = body;

    const numJumlah = Number(jumlah);
    if (isNaN(numJumlah) || numJumlah <= 0) {
      return NextResponse.json(
        { error: "Jumlah pemasukan harus lebih besar dari 0." },
        { status: 400 }
      );
    }

    const calculatedPeriode =
      periode || (tanggal ? tanggal.substring(0, 7) : getCurrentPeriodeJakarta());

    const result = await addPemasukan(
      {
        tanggal: tanggal || new Date().toISOString().split("T")[0],
        periode: calculatedPeriode,
        jumlah: numJumlah,
        keterangan: keterangan || "Gaji Masuk",
      },
      session.userId
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("POST Pemasukan error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan pemasukan, coba lagi." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }
    const body = await request.json();
    const { id, tanggal, jumlah, keterangan, periode } = body;

    if (!id) {
      return NextResponse.json({ error: "ID pemasukan dibutuhkan." }, { status: 400 });
    }

    const updateData: any = {};
    if (tanggal !== undefined) {
      updateData.tanggal = tanggal;
      updateData.periode = periode || tanggal.substring(0, 7);
    }
    if (jumlah !== undefined) {
      const numJumlah = Number(jumlah);
      if (isNaN(numJumlah) || numJumlah <= 0) {
        return NextResponse.json(
          { error: "Jumlah pemasukan harus lebih besar dari 0." },
          { status: 400 }
        );
      }
      updateData.jumlah = numJumlah;
    }
    if (keterangan !== undefined) updateData.keterangan = keterangan;

    const success = await updatePemasukan(id, updateData, session.userId);
    if (!success) {
      return NextResponse.json(
        { error: "Data pemasukan tidak ditemukan untuk diperbarui." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT Pemasukan error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data pemasukan." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID pemasukan dibutuhkan." }, { status: 400 });
    }

    const success = await deletePemasukan(id, session.userId);
    if (!success) {
      return NextResponse.json(
        { error: "Data pemasukan tidak ditemukan untuk dihapus." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Pemasukan error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus data pemasukan." },
      { status: 500 }
    );
  }
}
