export type PanchangamResponse = {
  provider: string;
  date: string;
  location: { latitude: number; longitude: number; timezone: number };
  data: {
    tithi?: { name?: string; paksha?: string; [key: string]: unknown };
    nakshatra?: { name?: string; pada?: number; [key: string]: unknown };
    yoga?: { name?: string; [key: string]: unknown };
    karana?: { name?: string; [key: string]: unknown };
    weekday?: { name?: string; [key: string]: unknown };
    [key: string]: unknown;
  };
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export async function fetchPanchangam(date = new Date()): Promise<PanchangamResponse> {
  if (!API_BASE_URL) {
    throw new Error("Backend URL is not configured. Set EXPO_PUBLIC_API_BASE_URL in the app environment.");
  }

  const dateString = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

  // Initial preview defaults to Hyderabad. Replace these with the user's saved location
  // once location onboarding/profile storage is implemented.
  const params = new URLSearchParams({
    day: dateString,
    latitude: "17.385",
    longitude: "78.4867",
    timezone: "5.5",
    hours: "12",
    minutes: "0",
  });

  const response = await fetch(`${API_BASE_URL}/api/panchang?${params.toString()}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail || `Panchangam request failed (${response.status}).`);
  }
  return response.json() as Promise<PanchangamResponse>;
}
