export type LogLevel = "info" | "warn" | "error" | "debug";

export function log(message: string, source = "app", level: LogLevel = "info") {
    const timestamp = new Date().toISOString();

    // Structured log entry
    const logEntry = {
        timestamp,
        level,
        source,
        message,
    };

    if (process.env.NODE_ENV === "production") {
        // Production: JSON output for log aggregators (Datadog, AWS CloudWatch, etc.)
        console.log(JSON.stringify(logEntry));
    } else {
        // Development: Colorized human-readable output
        const time = new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });

        let color = "\x1b[37m"; // White
        switch (level) {
            case "info": color = "\x1b[36m"; break; // Cyan
            case "warn": color = "\x1b[33m"; break; // Yellow
            case "error": color = "\x1b[31m"; break; // Red
            case "debug": color = "\x1b[90m"; break; // Gray
        }
        const reset = "\x1b[0m";

        console.log(`${color}[${time}] [${source.toUpperCase()}] ${message}${reset}`);
    }
}
