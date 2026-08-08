import { env } from "./env.server";
import { getValidGoogleAccessToken } from "./googleOAuth";

export interface CreateMeetEventParams {
  appointmentId: string;
  summary: string;
  description: string;
  startTime: Date;
  durationMinutes?: number;
  attendeeEmail: string;
}

export interface CreateMeetEventResult {
  eventId?: string;
  meetUrl?: string;
  status: "CONFIRMED" | "PENDING_OAUTH";
}

export async function createGoogleMeetEvent(
  params: CreateMeetEventParams
): Promise<CreateMeetEventResult> {
  const accessToken = await getValidGoogleAccessToken();

  // Nobody has connected a Google account yet — be honest about that rather
  // than generate a URL that looks real but isn't. The booking still
  // succeeds; it just goes to the internal "requested" queue for an admin
  // to confirm a real link manually until this is connected.
  if (!accessToken) {
    return { status: "PENDING_OAUTH" };
  }

  const calendarId = env.GOOGLE_CALENDAR_ID;
  const endTime = new Date(params.startTime.getTime() + (params.durationMinutes || 15) * 60 * 1000);

  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`;
    const eventPayload = {
      summary: params.summary,
      description: params.description,
      start: { dateTime: params.startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
      attendees: [{ email: params.attendeeEmail }],
      conferenceData: {
        createRequest: {
          requestId: `req_${params.appointmentId}_${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventPayload),
    });

    if (res.ok) {
      const json = await res.json();
      const meetUrl = json.conferenceData?.entryPoints?.find(
        (ep: { entryPointType: string; uri: string }) => ep.entryPointType === "video"
      )?.uri;

      if (meetUrl) {
        return {
          eventId: json.id,
          meetUrl,
          status: "CONFIRMED",
        };
      }
    } else {
      console.error("[Google Calendar] API call failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[Google Calendar] API call threw:", err);
  }

  // The connected account's token was valid, but the API call itself failed
  // (permissions, quota, etc.) — still don't fabricate a link.
  return { status: "PENDING_OAUTH" };
}
