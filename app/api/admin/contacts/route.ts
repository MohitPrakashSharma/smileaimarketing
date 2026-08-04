import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, firstName, lastName, email, role } = body;

    if (!businessId || !firstName || !lastName || !email) {
      return NextResponse.json({ error: "Missing required contact fields" }, { status: 400 });
    }

    const contact = await prisma.contact.create({
      data: {
        businessId,
        firstName,
        lastName,
        email,
        role: role || "Principal Dentist",
      },
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    console.error("Admin contact POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
