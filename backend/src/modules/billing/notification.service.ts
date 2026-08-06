import { prisma } from "@/lib/prisma";
import type { NotificationChannel } from "@prisma/client";

/**
 * Mock SMS/WhatsApp invoice gateway. In production this would call Twilio,
 * MSG91, Gupshup, or the WhatsApp Business API. Here it logs to the console
 * (simulating the outbound API call) and persists a Notification row so the
 * UI can show a success toast + the app has an auditable delivery record.
 */
export async function sendInvoiceNotification(params: {
  orderId: string;
  customerId?: string | null;
  phone: string;
  invoiceNumber: string;
  netTotal: number;
  channel?: NotificationChannel;
}) {
  const { orderId, customerId, phone, invoiceNumber, netTotal, channel = "SMS" } = params;
  const invoiceUrl = `https://pharmacy.example.com/invoices/${invoiceNumber}`;
  const message = `Thank you for your purchase! Invoice ${invoiceNumber} for ₹${netTotal.toFixed(2)} is ready. View & download: ${invoiceUrl}`;

  // --- Mock gateway call -------------------------------------------------
  console.log(`📲 [MOCK ${channel} GATEWAY] Sending to ${phone}: "${message}"`);
  // -------------------------------------------------------------------------

  return prisma.notification.create({
    data: { orderId, customerId, channel, recipient: phone, message, invoiceUrl, status: "SENT" },
  });
}
