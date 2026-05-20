import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ titleId: string }> }
) {
  const { titleId } = await params;
  const { status } = await req.json();

  const entry = await prisma.watchlistEntry.findFirst({
    where: { titleId },
  });

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.watchlistEntry.update({
    where: { id: entry.id },
    data: { status },
  });

  return NextResponse.json({ entry: updated });
}
