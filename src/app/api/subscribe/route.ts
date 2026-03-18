import { createSubscriber } from "@/lib/kit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, firstName } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const result = await createSubscriber(email, firstName);

    if (result.success) {
      return NextResponse.json({ message: "Subscribed successfully" });
    }

    return NextResponse.json(
      { error: result.error },
      { status: 500 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
