import crypto from "crypto";

type LaafficCredentials = {
  appId: string | null;
  apiKey: string | null;
  apiSecret: string | null;
};

type SendMessageInput = {
  recipient: string;
  content: string;
};

export type LaafficSendResult = {
  recipient: string;
  status: "submitted" | "failed";
  messageId: string;
  error?: string;
};

type LaafficSendResponseItem = {
  number?: string;
  msgId?: string;
  orderId?: string;
};

type LaafficSendResponse = {
  status?: string;
  reason?: string;
  success?: string;
  fail?: string;
  array?: LaafficSendResponseItem[];
};

type LaafficReport = {
  msgId?: string;
  status?: string | number;
  receiveTime?: string;
};

type LaafficReportResponse = {
  status?: string;
  reason?: string;
  array?: LaafficReport[];
};

export type NormalizedReport = {
  messageId: string;
  sendResult: "submitted" | "delivered" | "failed";
  deliveredAt: Date | null;
  failReason: string | null;
};

function createAuthHeaders(credentials: LaafficCredentials) {
  if (!credentials.apiKey || !credentials.apiSecret) return null;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sign = crypto
    .createHash("md5")
    .update(`${credentials.apiKey}${credentials.apiSecret}${timestamp}`)
    .digest("hex");

  return {
    "Content-Type": "application/json;charset=UTF-8",
    "Api-Key": credentials.apiKey,
    Timestamp: timestamp,
    Sign: sign,
  };
}

function mapReportStatus(status: string | number | undefined): NormalizedReport["sendResult"] | null {
  const value = String(status ?? "").trim();
  if (value === "0") return "delivered";
  if (value === "-1") return "submitted";
  if (value === "") return null;
  return "failed";
}

export async function sendMessagesOverLaafficHttp(
  credentials: LaafficCredentials,
  messages: SendMessageInput[],
): Promise<LaafficSendResult[]> {
  if (!credentials.appId || !credentials.apiKey || !credentials.apiSecret) {
    return messages.map((message) => ({
      recipient: message.recipient,
      status: "failed",
      messageId: `laaffic-missing-credentials-${Date.now()}`,
      error: "Missing Laaffic HTTP credentials",
    }));
  }

  const results: LaafficSendResult[] = [];

  for (let start = 0; start < messages.length; start += 1_000) {
    const batch = messages.slice(start, start + 1_000);
    const headers = createAuthHeaders(credentials);
    if (!headers) continue;

    const response = await fetch("https://api.laaffic.com/v3/sendSms", {
      method: "POST",
      headers,
      body: JSON.stringify({
        appId: credentials.appId,
        numbers: batch.map((m) => m.recipient).join(","),
        content: batch[0]?.content ?? "",
      }),
    });

    if (!response.ok) {
      for (const message of batch) {
        results.push({
          recipient: message.recipient,
          status: "failed",
          messageId: `laaffic-http-${Date.now()}`,
          error: `Laaffic HTTP send failed with status ${response.status}`,
        });
      }
      continue;
    }

    const data = (await response.json()) as LaafficSendResponse;
    if (data.status !== "0") {
      for (const message of batch) {
        results.push({
          recipient: message.recipient,
          status: "failed",
          messageId: `laaffic-http-${Date.now()}`,
          error: data.reason || "Laaffic HTTP send failed",
        });
      }
      continue;
    }

    const byNumber = new Map(
      (data.array ?? [])
        .filter((item) => item.number && item.msgId)
        .map((item) => [item.number!, item.msgId!]),
    );

    for (const message of batch) {
      const messageId = byNumber.get(message.recipient);
      results.push({
        recipient: message.recipient,
        status: messageId ? "submitted" : "failed",
        messageId: messageId ?? `laaffic-missing-msgid-${Date.now()}`,
        error: messageId ? undefined : "Laaffic did not return a message ID",
      });
    }
  }

  return results;
}

export async function fetchLaafficReports(
  credentials: LaafficCredentials,
  messageIds: string[],
): Promise<Map<string, NormalizedReport>> {
  const uniqueMessageIds = Array.from(new Set(messageIds.filter(Boolean)));
  const reports = new Map<string, NormalizedReport>();

  if (
    uniqueMessageIds.length === 0 ||
    !credentials.appId ||
    !credentials.apiKey ||
    !credentials.apiSecret
  ) {
    return reports;
  }

  for (let start = 0; start < uniqueMessageIds.length; start += 200) {
    const batch = uniqueMessageIds.slice(start, start + 200);
    const headers = createAuthHeaders(credentials);
    if (!headers) continue;

    const url = new URL("https://api.laaffic.com/v3/getReport");
    url.searchParams.set("appId", credentials.appId);
    url.searchParams.set("msgIds", batch.join(","));

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) continue;

    const data = (await response.json()) as LaafficReportResponse;
    const returnedIds = new Set<string>();

    for (const report of data.array ?? []) {
      if (!report.msgId) continue;
      returnedIds.add(report.msgId);
      const sendResult = mapReportStatus(report.status);
      if (!sendResult) continue;
      reports.set(report.msgId, {
        messageId: report.msgId,
        sendResult,
        deliveredAt:
          sendResult === "delivered" && report.receiveTime
            ? new Date(report.receiveTime)
            : null,
        failReason: sendResult === "failed" ? "Laaffic delivery report failed" : null,
      });
    }

    void returnedIds;
  }

  return reports;
}
