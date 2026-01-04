// Script temporário para criar usuário admin
// Execute com: npx tsx --env-file=.env scripts/create-admin.ts

import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import pg from "pg";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString('hex')}.${salt}`;
}

async function createAdmin() {
    const { Pool } = pg;

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error("DATABASE_URL not found");
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes("supabase.com") ? { rejectUnauthorized: false } : false,
    });

    // Admin credentials
    const email = "admin@vectra.ai";
    const password = "VectraAdmin2026!";

    console.log("Hashing password...");
    const hashedPassword = await hashPassword(password);

    console.log("Connecting to database...");
    const client = await pool.connect();

    try {
        // Check if user exists
        const checkResult = await client.query(
            'SELECT id FROM app_users WHERE username = $1',
            [email]
        );

        if (checkResult.rows.length > 0) {
            // Update existing user to admin
            console.log("User exists, updating to admin...");
            await client.query(`
                UPDATE app_users 
                SET password = $1, 
                    is_admin = 1, 
                    plan = 'enterprise',
                    display_name = 'Admin'
                WHERE username = $2
            `, [hashedPassword, email]);
            console.log("User updated to admin!");
        } else {
            // Create new admin user
            console.log("Creating new admin user...");
            await client.query(`
                INSERT INTO app_users (username, password, is_admin, plan, display_name)
                VALUES ($1, $2, 1, 'enterprise', 'Admin')
            `, [email, hashedPassword]);
            console.log("Admin user created!");
        }

        console.log("\n✅ Admin account ready!");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("Email:    " + email);
        console.log("Password: " + password);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    } catch (error) {
        console.error("Error:", error);
    } finally {
        client.release();
        await pool.end();
    }
}

createAdmin();
