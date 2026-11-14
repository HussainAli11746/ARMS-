import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/arms/auth";

export async function GET(request: Request) {
  try {
    const user = getSessionUser(request);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }
    return NextResponse.json({ authenticated: true, user });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Session verification failed";
    return NextResponse.json(
      { authenticated: false, user: null, error: msg },
      { status: 500 }
    );
  }
}
