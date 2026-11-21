import { NextResponse } from "next/server";
import {
  getPengeluaranList,
  addPengeluaran,
  updatePengeluaran,
  deletePengeluaran,
} from "@/lib/sheets";
import { getCurrentPeriodeJakarta } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periode = searchParams.get("periode") || undefined;
    const list = await getPengeluaranList(periode);
    return NextResponse.json({ data: list });
  } catch (error: any) {
    console.error("GET Pengeluaran error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data pengeluaran." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tanggal, pos, keterangan, jumlah, periode } = body;

    const numJumlah = Number(jumlah);
    if (isNaN(numJumlah) || numJumlah <= 0) {
      return NextResponse.json(
        { error: "Jumlah pengeluaran harus lebih besar dari 0." },
        { status: 400 }
      );
    }

    if (!pos || !pos.trim()) {
      return NextResponse.json(
        { error: "Pos anggaran wajib dipilih." },
        { status: 400 }
      );
    }

    const calculatedPeriode =
      periode || (tanggal ? tanggal.substring(0, 7) : getCurrentPeriodeJakarta());

    const result = await addPengeluaran({
      tanggal: tanggal || new Date().toISOString().split("T")[0],
      periode: calculatedPeriode,
      pos: pos.trim(),
      keterangan: keterangan?.trim() || "Pengeluaran",
      jumlah: numJumlah,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("POST Pengeluaran error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan pengeluaran, coba lagi." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, tanggal, pos, keterangan, jumlah, periode } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID pengeluaran dibutuhkan." },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (tanggal !== undefined) {
      updateData.tanggal = tanggal;
      updateData.periode = periode || tanggal.substring(0, 7);
    }
    if (pos !== undefined) updateData.pos = pos.trim();
    if (keterangan !== undefined) updateData.keterangan = keterangan.trim();
    if (jumlah !== undefined) {
      const numJumlah = Number(jumlah);
      if (isNaN(numJumlah) || numJumlah <= 0) {
        return NextResponse.json(
          { error: "Jumlah pengeluaran harus lebih besar dari 0." },
          { status: 400 }
        );
      }
      updateData.jumlah = numJumlah;
    }

    const success = await updatePengeluaran(id, updateData);
    if (!success) {
      return NextResponse.json(
        { error: "Data pengeluaran tidak ditemukan untuk diperbarui." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT Pengeluaran error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data pengeluaran." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID pengeluaran dibutuhkan." },
        { status: 400 }
      );
    }

    const success = await deletePengeluaran(id);
    if (!success) {
      return NextResponse.json(
        { error: "Data pengeluaran tidak ditemukan untuk dihapus." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Pengeluaran error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus data pengeluaran." },
      { status: 500 }
    );
  }
}
