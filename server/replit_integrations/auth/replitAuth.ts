import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

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

  const isLocal = !process.env.REPL_ID;

  if (isLocal) {
    console.log("[auth] Local development detected, bypassing OIDC discovery for development");

    passport.serializeUser((user: any, cb) => cb(null, user));
    passport.deserializeUser((user: any, cb) => cb(null, user));

    // Track logged out state per session
    const loggedOutSessions = new Set<string>();

    // Login route for local dev - clears logout flag and redirects to main app
    app.get("/api/login", (req: any, res) => {
      // Clear the logged out flag for this session
      if (req.sessionID) {
        loggedOutSessions.delete(req.sessionID);
      }

      // Auto-login the mock user
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

    // Logout route for local dev - destroys session and redirects to landing page
    app.get("/api/logout", (req: any, res) => {
      // Mark this session as logged out BEFORE destroying
      const oldSessionId = req.sessionID;

      req.logout((err: any) => {
        if (oldSessionId) {
          loggedOutSessions.add(oldSessionId);
        }

        // Regenerate session to get new ID
        req.session?.regenerate((regenErr: any) => {
          if (req.sessionID) {
            loggedOutSessions.add(req.sessionID);
          }
          res.redirect("/");
        });
      });
    });

    // Auto-login mock user for local dev (only for /api/* routes that require auth)
    // Skip if user explicitly logged out
    app.use(async (req: any, res, next) => {
      // Skip auto-login for auth routes
      if (req.path === "/api/login" || req.path === "/api/logout") {
        return next();
      }

      // Check if this session was logged out
      const isLoggedOut = req.sessionID && loggedOutSessions.has(req.sessionID);

      // Only auto-login for /api/* routes that need auth, and user hasn't logged out
      if (req.path.startsWith('/api') && !req.isAuthenticated() && !isLoggedOut) {
        const mockClaims = {
          sub: "local_dev_user",
          email: "admin@vectra.ai",
          first_name: "Admin",
          last_name: "Local",
          exp: Math.floor(Date.now() / 1000) + 3600 * 24
        };

        await upsertUser(mockClaims);

        const mockUser = {
          id: "local_dev_user",
          claims: mockClaims,
          expires_at: mockClaims.exp
        };

        req.logIn(mockUser, (err: any) => next());
      } else {
        next();
      }
    });

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

  passport.serializeUser((user: any, cb) => cb(null, user));
  passport.deserializeUser((user: any, cb) => cb(null, user));

  app.get("/api/login", (req: any, res, next) => {
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
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!process.env.REPL_ID) return next(); // Bypass session check in local dev

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
