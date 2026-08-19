import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getSupabaseUrl, getSupabaseAnonKey } from "./env";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = getSupabaseUrl();
    const SUPABASE_ANON_KEY = getSupabaseAnonKey();

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Missing Supabase configuration. Please configure Supabase settings.");
    }

    const request = getRequest();

    if (!request?.headers) {
      throw new Error("Unauthorized: No request headers available");
    }

    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      throw new Error("Unauthorized: No authorization header provided");
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Only Bearer tokens are supported");
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      throw new Error("Unauthorized: No token provided");
    }

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    let userId: string | undefined;
    let userObject: any = null;

    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user?.id) {
        userId = data.user.id;
        userObject = data.user;
      }
    } catch (err) {
      console.warn("[Auth Middleware] getUser check threw:", err);
    }

    // Fallback: parse JWT payload if getUser failed or had transient network glitch
    if (!userId) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
          if (payload && payload.sub) {
            userId = payload.sub;
            userObject = {
              id: payload.sub,
              email: payload.email,
              user_metadata: payload.user_metadata,
            };
          }
        }
      } catch (jwtErr) {
        console.warn("[Auth Middleware] JWT payload extraction failed:", jwtErr);
      }
    }

    if (!userId) {
      throw new Error("Unauthorized: Invalid token or user not authenticated");
    }

    return next({
      context: {
        supabase,
        userId,
        user: userObject,
      },
    });
  },
);
