export interface Broadcast {
  id: number;
  subject: string;
  content: string | null;
  description: string | null;
  preview_text: string | null;
  public: boolean;
  published_at: string | null;
  send_at: string | null;
  thumbnail_url: string | null;
  thumbnail_alt: string | null;
  public_url: string | null;
}

const KIT_API_KEY = process.env.KIT_API_KEY || "";
const BASE_URL = "https://api.kit.com/v4";

async function kitFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "X-Kit-Api-Key": KIT_API_KEY,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return res;
}

export async function getBroadcasts(): Promise<Broadcast[]> {
  if (!KIT_API_KEY) return [];

  try {
    const res = await kitFetch("/broadcasts", {
      next: { revalidate: 300 }, // cache for 5 minutes
    });

    if (!res.ok) return [];

    const data = await res.json();
    const broadcasts: Broadcast[] = data.broadcasts || [];

    return broadcasts
      .filter((b) => b.public && b.published_at)
      .sort(
        (a, b) =>
          new Date(b.published_at!).getTime() -
          new Date(a.published_at!).getTime()
      );
  } catch {
    return [];
  }
}

export async function createSubscriber(
  email: string,
  firstName?: string
): Promise<{ success: boolean; error?: string }> {
  if (!KIT_API_KEY) {
    return { success: false, error: "API not configured" };
  }

  try {
    const body: Record<string, unknown> = { email_address: email };
    if (firstName) body.first_name = firstName;

    const res = await kitFetch("/subscribers", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (res.ok || res.status === 200 || res.status === 201) {
      return { success: true };
    }

    const data = await res.json().catch(() => null);
    return {
      success: false,
      error: data?.message || "Failed to subscribe",
    };
  } catch {
    return { success: false, error: "Network error" };
  }
}
