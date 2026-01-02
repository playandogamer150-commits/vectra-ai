import { log } from "./logger";

interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

/**
 * Sends a transactional email.
 * Currently supports a mock implementation that logs to console.
 * Future: Integrate Resend, SendGrid, or SMTP.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
    const { to, subject } = options;

    // TODO: Add real email provider integration here
    // Example: if (process.env.RESEND_API_KEY) { ... }

    // Fallback / Dev mode: Log the email
    log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`, "email", "info");

    if (process.env.NODE_ENV === "development") {
        console.log("--- EMAIL CONTENT ---");
        console.log(options.text || options.html);
        console.log("---------------------");
    }

    return true;
}

export async function sendWelcomeEmail(email: string, position: number) {
    return sendEmail({
        to: email,
        subject: "Welcome to VECTRA AI Waitlist",
        text: `You have joined the waitlist! Your current position is #${position}. We will notify you when we launch.`
    });
}
