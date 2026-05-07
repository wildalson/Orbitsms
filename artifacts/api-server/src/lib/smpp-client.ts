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

type SubmitMessageResult = {
  recipient: string;
  status: "submitted" | "failed";
  messageId: string;
  error?: string;
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
