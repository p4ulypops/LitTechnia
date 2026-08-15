/**
 * Small fixed-window rate limiter.
 *
 * In-process and per-instance on purpose: LitTechnia is a single-node app
 * behind one reverse proxy, and the goal is to blunt magic-link spam and
 * credential stuffing, not to be a distributed quota service. If the app is
 * ever scaled horizontally this needs to move to shared storage — noted in
 * docs/wordsmithery-security-notes.md.
 */
import type { Request, RequestHandler } from "express";
import { createHash } from "node:crypto";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of Array.from(buckets.entries())) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 60_000).unref?.();

export function hit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > max) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

/** Hashed so raw IPs and email addresses are not held in memory. */
export function subjectKey(req: Request, extra = "") {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  return createHash("sha256").update(`${ip}|${extra}`).digest("hex").slice(0, 32);
}

export function limit(options: {
  name: string;
  max: number;
  windowMs: number;
  by?: (req: Request) => string;
}): RequestHandler {
  return (req, res, next) => {
    const extra = options.by ? options.by(req) : "";
    const result = hit(`${options.name}:${subjectKey(req, extra)}`, options.max, options.windowMs);
    if (result.allowed) return next();
    res.setHeader("Retry-After", String(result.retryAfter));
    return res.status(429).json({
      error: "Too many attempts. Please wait a moment and try again.",
      retryAfter: result.retryAfter,
    });
  };
}

/** Test seam: clear all windows. */
export function resetLimits() {
  buckets.clear();
}
