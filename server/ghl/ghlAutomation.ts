import { ghlFetch } from "./ghlApi";

const GHL_V2_BASE_URL = "https://services.leadconnectorhq.com";

// Map your HireOS actions → workflow IDs
export const workflowMap: Record<string, string> = {
  assessment: "bb80d0bd-2475-4260-832c-48eacfad539f", // Send assessment on application form
  interview: "9c6fe3a0-e12b-4a6f-b0dd-e87dc6e7f179", // Send Interview Invite
  offer: "30ebd770-2419-4ddb-a444-a62a97336b56", // Send Offer Email
  reject: "02fb8c33-2358-4777-8599-5ac1e0e081df", // Send Rejection Email
};

function formatDateWithOffset(date: Date): string {
  const tzOffset = -date.getTimezoneOffset();
  const sign = tzOffset >= 0 ? "+" : "-";
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  const hours = pad(tzOffset / 60);
  const minutes = pad(tzOffset % 60);
  return date.toISOString().slice(0, 19) + sign + hours + ":" + minutes;
}

/**
 * Add a contact to a workflow in GoHighLevel.
 * @param contactId - GHL Contact ID
 * @param action - one of: assessment | interview | offer | reject | application
 * @param eventStartTime - optional ISO date for scheduling (default = now)
 */
export async function addContactToWorkflow(
  contactId: string,
  action: keyof typeof workflowMap,
  eventStartTime?: string,
): Promise<any> {
  const workflowId = workflowMap[action];
  if (!workflowId) {
    throw new Error(`❌ No workflow mapped for action "${action}"`);
  }

  const url = `${GHL_V2_BASE_URL}/contacts/${contactId}/workflow/${workflowId}`;

  const body = JSON.stringify({
    eventStartTime: eventStartTime || formatDateWithOffset(new Date()),
  });

  const res = await ghlFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Version: "2021-07-28",
    },
    body,
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(
      `❌ Failed to add contact to workflow: ${res.status} ${raw}`,
    );
  }

  console.log(
    `✅ Added contact ${contactId} to ${action} workflow (${workflowId})`,
  );
  return JSON.parse(raw);
}
