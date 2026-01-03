import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as LocalStrategy } from "passport-local";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";
import { hashPassword, comparePassword } from "../../lib/crypto";
import { db } from "../../db";
import { appUsers } from "../../../shared/schema";
import { eq } from "drizzle-orm";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "vectra-secret-key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: any
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await authStorage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"] || "Admin",
    lastName: claims["last_name"] || "Local",
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Define strategies ----------------------------------------------------------------

  // 1. Password Strategy (Local)
  passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  }, async (username, password, done) => {
    try {
      // Find user by username/email
      const users = await db.select().from(appUsers).where(eq(appUsers.username, username)).limit(1);
      const user = users[0];

      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }

      // If user exists but has no password (e.g. OAuth user), deny local login
      if (!user.password) {
        return done(null, false, { message: 'Use Replit/Google login for this account.' });
      }

      // Verify password
      const isValid = await comparePassword(user.password, password);
      if (!isValid) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      // Create session user object
      // Note: We structure it to match the OAuth structure for consistency elsewhere in the app
      const sessionUser = {
        id: user.id,
        username: user.username,
        // Mock claims to satisfy existing frontend expectations
        claims: {
          sub: user.id,
          email: user.username,
          first_name: user.displayName || "User",
          last_name: "",
          profile_image_url: user.avatarUrl,
          // Expires in 7 days
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
        },
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
      };

      return done(null, sessionUser);
    } catch (err) {
      return done(err);
    }
  }));

  // Serialization
  passport.serializeUser((user: any, cb) => cb(null, user));
  passport.deserializeUser((user: any, cb) => cb(null, user));


  // Routes ----------------------------------------------------------------

  // POST /api/login - Password Login
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.json({ message: "Login successful", user: req.user });
  });

  // POST /api/register - Registration
  app.post("/api/register", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Check if user exists
      const existingUser = await db.select().from(appUsers).where(eq(appUsers.username, username)).limit(1);
      if (existingUser.length > 0) {
        return res.status(409).json({ message: "User already exists" });
      }

      const hashedPassword = await hashPassword(password);

      // Create user
      const [newUser] = await db.insert(appUsers).values({
        username,
        password: hashedPassword,
        displayName: username.split('@')[0], // Default display name
        isAdmin: 0
      }).returning();

      // Log in automatically
      const sessionUser = {
        id: newUser.id,
        username: newUser.username,
        claims: {
          sub: newUser.id,
          email: newUser.username,
          first_name: newUser.displayName || "User",
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
        },
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
      };

      req.logIn(sessionUser, (err) => {
        if (err) throw err;
        res.json({ message: "Registration successful", user: sessionUser });
      });

    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });


  // Local Development Logic -------------------------------------------------------
  // CRITICAL: We strictly check NODE_ENV. This MUST NOT run in production.

  const isDevelopment = process.env.NODE_ENV !== "production" && !process.env.REPL_ID;

  if (isDevelopment) {
    console.log("[auth] Local development detected (NODE_ENV != production)");

    const loggedOutSessions = new Set<string>();

    // Mock Login Route
    app.get("/api/login", (req: any, res) => {
      // If accepts JSON (like from fetch), return 405 because they should POST
      if (req.accepts('json')) {
        return res.status(405).json({ message: "Method Not Allowed. Use POST for login." });
      }

      // Clear the logged out flag for this session
      if (req.sessionID) {
        loggedOutSessions.delete(req.sessionID);
      }

      const mockClaims = {
        sub: "local_dev_user",
        email: "admin@vectra.ai",
        first_name: "Admin",
        last_name: "Local",
        exp: Math.floor(Date.now() / 1000) + 3600 * 24
      };

      const mockUser = {
        id: "local_dev_user",
        claims: mockClaims,
        expires_at: mockClaims.exp
      };

      req.logIn(mockUser, (err: any) => {
        if (err) {
          console.error("[auth] Login error:", err);
          return res.redirect("/");
        }
        res.redirect("/image-studio");
      });
    });

    app.get("/api/logout", (req: any, res) => {
      const oldSessionId = req.sessionID;
      req.logout((err: any) => {
        if (oldSessionId) loggedOutSessions.add(oldSessionId);
        req.session?.regenerate((regenErr: any) => {
          if (req.sessionID) loggedOutSessions.add(req.sessionID);
          res.redirect("/");
        });
      });
    });

    // Auto-login "Backdoor" - DEVELOPMENT ONLY
    app.use(async (req: any, res, next) => {
      if (req.path === "/api/login" || req.path === "/api/logout" || req.path === "/api/register") {
        return next();
      }

      const isLoggedOut = req.sessionID && loggedOutSessions.has(req.sessionID);

      if (req.path.startsWith('/api') && !req.isAuthenticated() && !isLoggedOut) {
        // Auto-login logic for dev
        const mockClaims = {
          sub: "local_dev_user",
          email: "admin@vectra.ai",
          first_name: "Admin",
          last_name: "Local",
          exp: Math.floor(Date.now() / 1000) + 3600 * 24
        };
        const mockUser = {
          id: "local_dev_user",
          claims: mockClaims,
          expires_at: mockClaims.exp
        };
        // Upsert mock user to DB so ID checks work
        await upsertUser(mockClaims);
        req.logIn(mockUser, (err: any) => next());
      } else {
        next();
      }
    });

    return; // Stop here for dev mode (don't setup Replit Auth)
  }

  // Production / Replit Auth Logic ------------------------------------------------

  // If we are in production (or on Replit), set up OIDC
  try {
    // Check if we can/should even setup OIDC. If REPL_ID is missing, we are likely on Railway/other.
    // If issuer URL is missing, skip OIDC setup to avoid crashes if keys aren't there.
    if (!process.env.REPL_ID && !process.env.ISSUER_URL) {
      console.log("[auth] No REPL_ID or ISSUER_URL found. OIDC strategies skipped.");
      // We still have Password Auth setup above, so we're good.
      return;
    }

    const config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: any,
      verified: passport.AuthenticateCallback
    ) => {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };

    const registeredStrategies = new Set<string>();

    const ensureStrategy = (domain: string) => {
      const strategyName = `replitauth:${domain}`;
      if (!registeredStrategies.has(strategyName)) {
        const strategy = new Strategy(
          {
            name: strategyName,
            config,
            scope: "openid email profile offline_access",
            callbackURL: `https://${domain}/api/callback`,
          },
          verify
        );
        passport.use(strategy);
        registeredStrategies.add(strategyName);
      }
    };

    // Replit/OIDC Login Route (GET)
    app.get("/api/login", (req: any, res, next) => {
      // If query param ?method=replit or similar? No, standard GET /api/login initiates OIDC.
      // But we now support POST /api/login for password.
      // So we keep GET for OIDC initiation.

      ensureStrategy(req.hostname);
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });

    app.get("/api/callback", (req: any, res, next) => {
      ensureStrategy(req.hostname);
      passport.authenticate(`replitauth:${req.hostname}`, (err: any, user: any) => {
        if (err || !user) return res.redirect("/api/login");
        req.logIn(user, (loginErr: any) => {
          if (loginErr) return res.redirect("/api/login");
          return res.redirect("/");
        });
      })(req, res, next);
    });

    app.get("/api/logout", (req: any, res) => {
      req.logout(() => {
        res.redirect("/");
      });
    });

  } catch (e) {
    console.warn("[auth] OIDC setup failed (ignoring for non-Replit environment):", e);
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // If in dev mode, we might trust the mock user if it's there
  if (process.env.NODE_ENV !== "production" && !process.env.REPL_ID) {
    // Logic handled by the auto-login middleware, but double check
    // if (!req.isAuthenticated()) ...
  }

  const user = req.user as any;
  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  return res.status(401).json({ message: "Session expired" });
};
