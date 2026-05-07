import { createHash } from "crypto";
import { db, pool, usersTable } from "@workspace/db";

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "sms_gateway_salt").digest("hex");
}

const users = [
  {
    username: "admin",
    password: hashPassword("admin123"),
    email: "admin@orbitsms.com",
    companyName: "OrbitSMS",
    role: "admin" as const,
    status: "active" as const,
    balance: "0",
    smsRate: "0.250000",
    emailVerified: true,
    phoneVerified: false,
    permissions: '{"sendSms":true,"sendBulkSms":true,"uploadContacts":true,"viewDeliveryReports":true,"accessApiCredentials":true,"useSenderId":true,"exportReports":true}',
  },
  ...Array.from({ length: 5 }, (_, i) => ({
    username: `demo${i + 1}`,
    password: hashPassword("123456"),
    email: `demo${i + 1}@orbitsms.com`,
    companyName: `Demo Company ${i + 1}`,
    role: "client" as const,
    status: "active" as const,
    balance: "100.0000",
    smsRate: "0.250000",
    emailVerified: false,
    phoneVerified: false,
    permissions: '{"sendSms":true,"sendBulkSms":true,"uploadContacts":false,"viewDeliveryReports":true,"accessApiCredentials":false,"useSenderId":true,"exportReports":true}',
  })),
];

await db.insert(usersTable).values(users).onConflictDoUpdate({
  target: usersTable.username,
  set: { password: usersTable.password },
});
console.log("Seeded: admin + demo1–demo5");
await pool.end();
