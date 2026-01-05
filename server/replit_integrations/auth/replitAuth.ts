import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as LocalStrategy } from "passport-local";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";
import { hashPassword, comparePassword } from "../../lib/crypto";
import { db } from "../../db";
import { appUsers } from "../../../shared/schema";
import { eq } from "drizzle-orm";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  const IS_PRODUCTION = process.env.NODE_ENV === "production" ||
    process.env.RAILWAY_ENVIRONMENT === "production" ||
    process.env.REPLIT_DEPLOYMENT === "1";

  return session({
    secret: process.env.SESSION_SECRET || "vectra-secret-key-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: "__Host-sid", // Secure cookie name prefix
    cookie: {
      httpOnly: true,     // CRÍTICO: Previne XSS de ler cookies
      secure: IS_PRODUCTION, // HTTPS only em produção
      sameSite: "lax", // CSRF protection (Lax is better for usability)
      maxAge: sessionTtl,
      path: "/",
    },
  });
}

function updateUserSession(
  user: any,
  tokens: any
) {
  // Map GitHub structure to our session structure if needed
  // For now, we rely on the object returned by the strategy verify callback
}

async function upsertUser(claims: any) {
  // This function handled the generic "upsert" for Replit.
  // We now handle it explicitly in the GitHub strategy callback.
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

      // SECURITY: Anti-enumeration - use generic message
      if (!user || !user.password) {
        // Log for monitoring but don't reveal if user exists
        console.log(`[auth] Login attempt failed for username: ${username.substring(0, 3)}***`);
        return done(null, false, { message: 'Invalid credentials' });
      }

      // Verify password
      const isValid = await comparePassword(user.password, password);
      if (!isValid) {
        console.log(`[auth] Invalid password for user: ${user.id}`);
        return done(null, false, { message: 'Invalid credentials' });
      }

      // Create session user object
      const sessionUser = {
        id: user.id,
        username: user.username,
        claims: {
          sub: user.id,
          email: user.username,
          first_name: user.displayName || "User",
          last_name: "",
          profile_image_url: user.avatarUrl,
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
        },
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
      };

      return done(null, sessionUser);
    } catch (err) {
      return done(err);
    }
  }));

  // 2. GitHub Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.App_URL
        ? `${process.env.App_URL.replace(/\/$/, "")}/api/auth/github/callback` // Explicitly use App_URL if set (Production in Railway)
        : "/api/auth/github/callback", // Fallback to relative path (might not work with strict strategy)
      scope: ['user:email']
    },
      async function (accessToken: string, refreshToken: string, profile: any, done: Function) {
        try {
          // Extract primary email
          const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : `${profile.username}@github.com`;

          // Check if user exists
          const users = await db.select().from(appUsers).where(eq(appUsers.username, email)).limit(1);
          let user = users[0];

          if (!user) {
            // Create new user using GitHub info
            const [newUser] = await db.insert(appUsers).values({
              username: email,
              // No password for OAuth users
              displayName: profile.displayName || profile.username,
              avatarUrl: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : undefined,
              isAdmin: 0
            }).returning();
            user = newUser;
          } else {
            // Optional: Update avatar or display name on login?
            // For now, let's just log them in. 
          }

          const sessionUser = {
            id: user.id,
            username: user.username,
            claims: {
              sub: user.id,
              email: user.username,
              first_name: user.displayName || "User",
              last_name: "",
              profile_image_url: user.avatarUrl,
              exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
            },
            expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
          };

          return done(null, sessionUser);
        } catch (err) {
          return done(err);
        }
      }));
  } else {
    console.warn("[auth] GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET missing. GitHub auth disabled.");
  }


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
        // SECURITY: Anti-enumeration - don't reveal that user exists
        // Add slight delay to prevent timing attacks
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
        return res.status(400).json({ message: "Registration could not be completed" });
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


  // GitHub Auth Routes
  app.get("/api/auth/github",
    (req, res, next) => {
      if (!process.env.GITHUB_CLIENT_ID) {
        return res.status(503).send("GitHub authentication is not configured.");
      }
      next();
    },
    passport.authenticate('github', { scope: ['user:email'] })
  );

  app.get("/api/auth/github/callback",
    passport.authenticate('github', { failureRedirect: '/api/login' }),
    function (req, res) {
      // Successful authentication, redirect to app.
      res.redirect('/image-studio');
    }
  );


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
      if (req.path === "/api/login" || req.path === "/api/logout" || req.path === "/api/register" || req.path.startsWith("/api/auth/github")) {
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
        // await upsertUser(mockClaims); 
        req.logIn(mockUser, (err: any) => next());
      } else {
        next();
      }
    });

    return; // Stop here for dev mode
  }

  // Production / GitHub Auth Logout
  app.get("/api/logout", (req: any, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
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
