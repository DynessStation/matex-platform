import { CookieOptions } from "express";

const readBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

const isProduction = process.env.NODE_ENV === "production";

export const accessTokenCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: readBoolean(process.env.COOKIE_SECURE, isProduction),
  sameSite: "lax",
  path: "/",
});
