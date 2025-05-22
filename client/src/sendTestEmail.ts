import { db } from "server/db.ts";
import { notificationQueue } from "@shared/schema";
import { eq, and, lte } from "drizzle-orm";
import nodemailer from "nodemailer";

// Real email sender
async function sendEmail(to: string, subject: string, body: string) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "earyljames.capitle18@gmail.com",
      pass: "fkjl gklg tamh vugj"
    }
  });

  const mailOptions = {
    from: '"FirmOS Hiring" <earyljames.capitle18@gmail.com>',
    to,
    subject,
    html: body  // ✅ change from `text:` to `html:`
  };
  
  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ Email sent to ${to}: ${info.messageId}`);
}

async function main() {
  console.log("🔍 Fetching latest pending notification...");

  const [notification] = await db
    .select()
    .from(notificationQueue)
    .where(
      and(
        eq(notificationQueue.status, "pending"),
        lte(notificationQueue.processAfter, new Date())
      )
    )
    .orderBy(notificationQueue.processAfter)
    .limit(1);

  if (!notification) {
    console.error("❌ No pending notification found.");
    return;
  }

  const payload = notification.payload as {
    recipientEmail: string;
    subject: string;
    context?: { body?: string };
  };

  const to = payload.recipientEmail;
  const subject = payload.subject;
  const body = payload.context?.body || "[No message body]";

  try {
    await sendEmail(to, subject, body);

    await db.update(notificationQueue)
      .set({
        status: "sent",
        processAttempts: (notification.processAttempts || 0) + 1,
        lastAttemptAt: new Date()
      })
      .where(eq(notificationQueue.id, notification.id));  // ✅ fixed

    console.log("✅ Email sent and notification marked as sent.");
  } catch (error) {
    if (error instanceof Error) {
      console.error("❌ Error sending email:", error.message);

      await db.update(notificationQueue)
        .set({
          status: "error",
          error: error.message,
          lastAttemptAt: new Date(),
          processAttempts: (notification.processAttempts || 0) + 1
        })
        .where(eq(notificationQueue.id, notification.id));  // ✅ fixed
    } else {
      console.error("❌ Unknown error:", error);
    }
  }
}

main();
