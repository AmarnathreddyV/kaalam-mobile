export type UserLocation = {
  latitude: number;
  longitude: number;
  timezone: string;
};

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

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || "https://kaalam-mobile.onrender.com").replace(/\/$/, "");

function dateParam(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

// Convert the IANA timezone to the offset for the requested date.
// This handles daylight-saving changes for users born/live outside India.
function timezoneOffset(timezone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
    year: "numeric",
  }).formatToParts(date);
  const value = parts.find(part => part.type === "timeZoneName")?.value || "GMT+00:00";
  const match = value.match(/GMT([+-])(\\d{2}):(\\d{2})/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) + Number(match[3]) / 60);
}

function locationParams(location: UserLocation, date: Date) {
  if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) || !location.timezone) {
    throw new Error("Your current location is missing. Update your profile before loading Panchangam.");
  }
  return {
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    timezone: String(timezoneOffset(location.timezone, date)),
  };
}

async function readResponse<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = typeof body?.detail === "string" ? body.detail : JSON.stringify(body?.detail || body);
    throw new Error(detail || `${label} request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export async function fetchPanchangam(date: Date, location: UserLocation): Promise<PanchangamResponse> {
  const params = new URLSearchParams({
    day: dateParam(date),
    ...locationParams(location, date),
    hours: "12",
    minutes: "0",
  });
  return readResponse<PanchangamResponse>(
    await fetch(`${API_BASE_URL}/api/panchang?${params.toString()}`),
    "Panchangam",
  );
}

export type DailyTimePeriod = {
  name?: string;
  lord?: string;
  start?: string;
  end?: string;
};

export type DailyPanchangamResponse = {
  provider: string;
  tradition: string;
  date: string;
  location?: { latitude: number; longitude: number; timezone: number };
  data: {
    panchang?: PanchangamResponse["data"];
    sun_times?: { rise?: { local_datetime?: string }; set?: { local_datetime?: string } };
    inauspicious_periods?: {
      rahu_kaal?: DailyTimePeriod;
      gulika_kaal?: DailyTimePeriod;
      yamaganda?: DailyTimePeriod;
    };
    choghadiya?: { day?: DailyTimePeriod[]; night?: DailyTimePeriod[] };
    hora?: { day?: DailyTimePeriod[]; night?: DailyTimePeriod[] };
    abhijit_muhurat?: { interval?: { name?: string; period?: Array<{ start?: string; end?: string }> } };
  };
  unavailable?: Record<string, string>;
  data_complete?: boolean;
  recommendations_ready?: boolean;
};

export async function fetchDailyPanchangam(date: Date, location: UserLocation): Promise<DailyPanchangamResponse> {
  const params = new URLSearchParams({
    day: dateParam(date),
    ...locationParams(location, date),
  });
  return readResponse<DailyPanchangamResponse>(
    await fetch(`${API_BASE_URL}/api/panchang/daily?${params.toString()}`),
    "Daily Panchangam",
  );
}
