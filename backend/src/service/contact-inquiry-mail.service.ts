import nodemailer, { Transporter } from "nodemailer";

export type ContactInquiryMailStatus = "sent" | "skipped" | "failed";

export interface ContactInquiryMailInput {
  reference: string;
  recipient: string | null;
  topic: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  locale: string;
  sourcePath: string | null;
  createdAt: Date;
}

export interface ContactInquiryMailResult {
  status: ContactInquiryMailStatus;
  error?: string;
}

let transporter: Transporter | null | undefined;

const cleanEnv = (name: string): string =>
  String(process.env[name] ?? "").trim();

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );

const mailTransport = (): Transporter | null => {
  if (transporter !== undefined) return transporter;

  const host = cleanEnv("SMTP_HOST");
  const user = cleanEnv("SMTP_USER");
  const pass = cleanEnv("SMTP_PASS");
  const port = Math.max(1, Number(cleanEnv("SMTP_PORT")) || 587);
  if (!host || !user || !pass) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: cleanEnv("SMTP_SECURE").toLowerCase() === "true" || port === 465,
    auth: { user, pass },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000,
  });
  return transporter;
};

export const sendContactInquiryMail = async (
  input: ContactInquiryMailInput,
): Promise<ContactInquiryMailResult> => {
  if (!input.recipient) return { status: "skipped" };
  const transport = mailTransport();
  if (!transport) return { status: "skipped" };

  const fromEmail = cleanEnv("SMTP_FROM_EMAIL") || cleanEnv("SMTP_USER");
  const fromName = cleanEnv("SMTP_FROM_NAME") || "MATEX Website";
  const contact = [input.email, input.phone].filter(Boolean).join(" / ") || "-";
  const source = input.sourcePath || "-";
  const createdAt = input.createdAt.toISOString();
  const subject = `[${input.reference}] ${input.topic} - ${input.name}`;
  const text = [
    `Pesan baru dari website MATEX (${input.reference})`,
    `Topik: ${input.topic}`,
    `Nama: ${input.name}`,
    `Kontak: ${contact}`,
    `Bahasa: ${input.locale}`,
    `Halaman: ${source}`,
    `Waktu: ${createdAt}`,
    "",
    input.message,
  ].join("\n");
  const html = `
    <h2>Pesan baru dari website MATEX</h2>
    <p><strong>Referensi:</strong> ${escapeHtml(input.reference)}</p>
    <p><strong>Topik:</strong> ${escapeHtml(input.topic)}</p>
    <p><strong>Nama:</strong> ${escapeHtml(input.name)}</p>
    <p><strong>Kontak:</strong> ${escapeHtml(contact)}</p>
    <p><strong>Bahasa:</strong> ${escapeHtml(input.locale)}</p>
    <p><strong>Halaman:</strong> ${escapeHtml(source)}</p>
    <p><strong>Waktu:</strong> ${escapeHtml(createdAt)}</p>
    <hr>
    <p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>
  `;

  try {
    await transport.sendMail({
      from: { name: fromName, address: fromEmail },
      to: input.recipient,
      replyTo: input.email || undefined,
      subject,
      text,
      html,
    });
    return { status: "sent" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown mail delivery error";
    console.error(
      `[Contact Inquiry] Email delivery failed for ${input.reference}:`,
      message,
    );
    return { status: "failed", error: message.slice(0, 1000) };
  }
};
