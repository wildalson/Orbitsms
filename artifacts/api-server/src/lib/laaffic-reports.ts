import crypto from "crypto";

type LaafficCredentials = {
  appId: string | null;
  apiKey: string | null;
  apiSecret: string | null;
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
  sendResult: "delivered" | "failed";
  deliveredAt: Date | null;
  failReason: string | null;
};

function mapReportStatus(status: string | number | undefined): NormalizedReport["sendResult"] {
  const value = String(status ?? "").trim();
  if (value === "0") return "delivered";
  return "failed";
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
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sign = crypto
      .createHash("md5")
      .update(`${credentials.apiKey}${credentials.apiSecret}${timestamp}`)
      .digest("hex");

    const url = new URL("https://api.laaffic.com/v3/getReport");
    url.searchParams.set("appId", credentials.appId);
    url.searchParams.set("msgIds", batch.join(","));

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Api-Key": credentials.apiKey,
        Timestamp: timestamp,
        Sign: sign,
      },
    });

    if (!response.ok) continue;

    const data = (await response.json()) as LaafficReportResponse;
    const returnedIds = new Set<string>();

    for (const report of data.array ?? []) {
      if (!report.msgId) continue;
      returnedIds.add(report.msgId);
      const sendResult = mapReportStatus(report.status);
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
