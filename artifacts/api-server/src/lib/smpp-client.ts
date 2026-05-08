import { createRequire } from "module";

const require = createRequire(import.meta.url);
const smpp = require("smpp") as any;

type SmppCredentials = {
  host: string;
  port: number;
  systemId: string;
  password: string;
  appId?: string | null;
};

type SubmitMessageInput = {
  recipient: string;
  content: string;
  senderId: string;
};

type QueryMessageInput = {
  messageId: string;
  senderId: string;
};

type SubmitMessageResult = {
  recipient: string;
  status: "submitted" | "failed";
  messageId: string;
  error?: string;
};

export type QueryMessageResult = {
  messageId: string;
  sendResult: "submitted" | "delivered" | "failed";
  deliveredAt: Date | null;
  failReason: string | null;
  messageState: number | null;
};

const SMPP_TIMEOUT_MS = 15_000;

function runWithTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), SMPP_TIMEOUT_MS);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

function connect(credentials: SmppCredentials): Promise<any> {
  return runWithTimeout(
    new Promise((resolve, reject) => {
      const session = smpp.connect(
        {
          url: `smpp://${credentials.host}:${credentials.port}`,
          auto_enquire_link_period: 10_000,
        },
        () => resolve(session),
      );

      session.on("error", reject);
      session.on("close", () => {
        session.removeAllListeners("error");
      });
    }),
    "Timed out connecting to SMPP host",
  );
}

function bindTransceiver(session: any, credentials: SmppCredentials): Promise<void> {
  return runWithTimeout(
    new Promise((resolve, reject) => {
      session.bind_transceiver(
        {
          system_id: credentials.systemId,
          password: credentials.password,
          system_type: credentials.appId ?? "",
        },
        (pdu: any) => {
          if (pdu.command_status === 0) {
            resolve();
            return;
          }

          reject(
            new Error(
              `SMPP bind failed with status ${pdu.command_status ?? "unknown"}`,
            ),
          );
        },
      );
    }),
    "Timed out binding to SMPP host",
  );
}

function submitSm(
  session: any,
  input: SubmitMessageInput,
): Promise<SubmitMessageResult> {
  return runWithTimeout(
    new Promise((resolve) => {
      session.submit_sm(
        {
          source_addr: input.senderId,
          source_addr_ton: input.senderId ? 5 : 0,
          source_addr_npi: input.senderId ? 0 : 0,
          destination_addr: input.recipient,
          dest_addr_ton: input.recipient.startsWith("63") ? 1 : 0,
          dest_addr_npi: 1,
          registered_delivery: 1,
          short_message: input.content,
        },
        (pdu: any) => {
          const messageId =
            pdu.message_id || pdu.messageId || `smpp-${Date.now()}`;

          if (pdu.command_status === 0) {
            resolve({
              recipient: input.recipient,
              status: "submitted",
              messageId,
            });
            return;
          }

          resolve({
            recipient: input.recipient,
            status: "failed",
            messageId,
            error: `SMPP submit failed with status ${pdu.command_status ?? "unknown"}`,
          });
        },
      );
    }),
    "Timed out submitting SMPP message",
  );
}

function mapMessageState(messageState: number | undefined): QueryMessageResult["sendResult"] | null {
  switch (messageState) {
    case smpp.MESSAGE_STATE?.DELIVERED:
    case 2:
      return "delivered";
    case smpp.MESSAGE_STATE?.EXPIRED:
    case smpp.MESSAGE_STATE?.DELETED:
    case smpp.MESSAGE_STATE?.UNDELIVERABLE:
    case smpp.MESSAGE_STATE?.REJECTED:
    case 3:
    case 4:
    case 5:
    case 8:
      return "failed";
    case smpp.MESSAGE_STATE?.ENROUTE:
    case smpp.MESSAGE_STATE?.ACCEPTED:
    case 1:
    case 6:
      return "submitted";
    default:
      return null;
  }
}

function querySm(
  session: any,
  input: QueryMessageInput,
): Promise<QueryMessageResult | null> {
  return runWithTimeout(
    new Promise((resolve) => {
      session.query_sm(
        {
          message_id: input.messageId,
          source_addr_ton: input.senderId ? 5 : 0,
          source_addr_npi: input.senderId ? 0 : 0,
          source_addr: input.senderId,
        },
        (pdu: any) => {
          if (pdu.command_status !== 0) {
            resolve(null);
            return;
          }

          const sendResult = mapMessageState(pdu.message_state);
          if (!sendResult) {
            resolve(null);
            return;
          }

          resolve({
            messageId: pdu.message_id || input.messageId,
            sendResult,
            deliveredAt:
              sendResult === "delivered" && pdu.final_date
                ? new Date(pdu.final_date)
                : sendResult === "delivered"
                  ? new Date()
                  : null,
            failReason: sendResult === "failed" ? `SMPP message state ${pdu.message_state}` : null,
            messageState: typeof pdu.message_state === "number" ? pdu.message_state : null,
          });
        },
      );
    }),
    "Timed out querying SMPP message",
  );
}

export async function sendMessagesOverSmpp(
  credentials: SmppCredentials,
  messages: SubmitMessageInput[],
): Promise<SubmitMessageResult[]> {
  const session = await connect(credentials);

  try {
    await bindTransceiver(session, credentials);
    const results: SubmitMessageResult[] = [];

    for (const message of messages) {
      try {
        results.push(await submitSm(session, message));
      } catch (error) {
        results.push({
          recipient: message.recipient,
          status: "failed",
          messageId: `smpp-error-${Date.now()}`,
          error: error instanceof Error ? error.message : "SMPP submit failed",
        });
      }
    }

    return results;
  } finally {
    session.close();
  }
}

export async function queryMessagesOverSmpp(
  credentials: SmppCredentials,
  messages: QueryMessageInput[],
): Promise<Map<string, QueryMessageResult>> {
  const session = await connect(credentials);

  try {
    await bindTransceiver(session, credentials);
    const reports = new Map<string, QueryMessageResult>();

    for (const message of messages) {
      try {
        const report = await querySm(session, message);
        if (report) {
          reports.set(message.messageId, report);
        }
      } catch {
        // Keep the local status unchanged when a provider query times out.
      }
    }

    return reports;
  } finally {
    session.close();
  }
}
