import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PatchSchema = z.object({
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  watchedAt: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = await prisma.watchHistory.findUnique({
    where: { id },
    include: { title: true, ratings: true },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ entry });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const entry = await prisma.watchHistory.update({
      where: { id },
      data: {
        ...(parsed.data.tags !== undefined && { tags: parsed.data.tags }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
        ...(parsed.data.watchedAt && { watchedAt: new Date(parsed.data.watchedAt) }),
      },
      include: { title: true, ratings: true },
    });
    return NextResponse.json({ entry });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Detach ratings from this history entry (don't delete — they're the taste model)
    await prisma.rating.updateMany({
      where: { watchHistoryId: id },
      data: { watchHistoryId: null },
    });
    await prisma.watchHistory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
