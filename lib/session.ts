import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "rencana_gaji_session";

function getSecretKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ||
    "fallback-secret-key-change-in-env-production-minimum-32-chars!";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  role: "admin";
  authenticated: boolean;
  exp?: number;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const key = getSecretKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d") // 30 days session
    .sign(key);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function setSessionCookie(responseHeaders: Headers, token: string) {
  const maxAge = 30 * 24 * 60 * 60; // 30 days
  const isProd = process.env.NODE_ENV === "production";

  responseHeaders.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${
      isProd ? "; Secure" : ""
    }`
  );
}

export function clearSessionCookie(responseHeaders: Headers) {
  const isProd = process.env.NODE_ENV === "production";
  responseHeaders.append(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
      isProd ? "; Secure" : ""
    }`
  );
}

export { COOKIE_NAME };
