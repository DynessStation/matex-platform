import express = require("express");
import { Response } from "express";

import db = require("../../db");
import { getAdminScope } from "../../helper/admin-scope.helper";
import { sendError, sendSuccess } from "../../helper/api-response.helper";
import { AuthRequest, verifyToken } from "../middleware/authJwt";

const app = express();
const { pool } = db;

type AssistMode = "translate" | "generate";

const protectedFieldPattern =
  /(^|_)(title|name|question|label|heading|headline|slug|key)(_|$)/i;

const cleanRecord = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length || entries.length > 80) return null;
  const result: Record<string, string> = {};
  let totalLength = 0;
  for (const [rawKey, rawValue] of entries) {
    const key = String(rawKey).trim().slice(0, 80);
    if (!key || typeof rawValue !== "string") return null;
    const text = rawValue.slice(0, 100000);
    totalLength += text.length;
    if (totalLength > 180000) return null;
    result[key] = text;
  }
  return result;
};

const extractOutputText = (response: any) => {
  if (typeof response?.output_text === "string") return response.output_text;
  for (const item of Array.isArray(response?.output) ? response.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (content?.type === "output_text" && typeof content.text === "string")
        return content.text;
    }
  }
  return "";
};

app.post(
  "/api/v1/content-assistant",
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success)
      return sendError(res, scope.status, scope.code, scope.message);

    const mode = String(req.body?.mode ?? "") as AssistMode;
    const fields = cleanRecord(req.body?.fields);
    const sourceLocale = String(req.body?.source_locale ?? "id-ID").slice(
      0,
      12,
    );
    const targetLocale = String(req.body?.target_locale ?? "en-US").slice(
      0,
      12,
    );
    const contentType = String(req.body?.content_type ?? "content").slice(
      0,
      80,
    );
    const context = String(req.body?.context ?? "").slice(0, 12000);

    if (!fields || !["translate", "generate"].includes(mode))
      return sendError(
        res,
        400,
        "CONTENT_ASSISTANT_PAYLOAD_INVALID",
        "Content assistant request is invalid",
      );

    const protectedFields = Object.keys(fields).filter((key) =>
      protectedFieldPattern.test(key),
    );
    if (protectedFields.length)
      return sendError(
        res,
        400,
        "CONTENT_ASSISTANT_FIELD_PROTECTED",
        "Titles, names, labels, questions, slugs, and keys must be written by the user",
      );

    const apiKey = String(process.env.OPENAI_API_KEY ?? "").trim();
    if (!apiKey)
      return sendError(
        res,
        503,
        "CONTENT_ASSISTANT_NOT_CONFIGURED",
        "AI content assistant is not configured",
      );

    const fieldNames = Object.keys(fields);
    const task =
      mode === "translate"
        ? `Translate every field from ${sourceLocale} to ${targetLocale}. Preserve HTML structure, URLs, product codes, measurements, and brand names. Do not add claims or facts.`
        : `Write or improve every requested ${targetLocale} field for a ${contentType}. Use only the supplied context and current field values. Keep factual claims conservative. HTML fields must use clean semantic HTML with paragraphs and headings when useful.`;

    try {
      const providerResponse = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(45_000),
          body: JSON.stringify({
            model:
              process.env.OPENAI_CONTENT_MODEL ||
              process.env.OPENAI_MODEL ||
              "gpt-4o-mini",
            store: false,
            max_output_tokens: 5000,
            input: [
              {
                role: "developer",
                content:
                  "You help edit MATEX natural-latex business content. Return only the requested fields. Preserve meaning and formatting. Never invent certifications, prices, stock, medical benefits, warranties, or technical specifications.",
              },
              {
                role: "user",
                content: JSON.stringify({
                  task,
                  content_type: contentType,
                  context,
                  fields,
                }),
              },
            ],
            text: {
              format: {
                type: "json_schema",
                name: "content_assistant_fields",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    fields: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          key: { type: "string", enum: fieldNames },
                          value: { type: "string" },
                        },
                        required: ["key", "value"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["fields"],
                  additionalProperties: false,
                },
              },
            },
          }),
        },
      );

      const providerBody = await providerResponse.json().catch(() => null);
      if (!providerResponse.ok) {
        console.error("[ContentAssistant] provider error", {
          status: providerResponse.status,
          code: providerBody?.error?.code,
          type: providerBody?.error?.type,
        });
        return sendError(
          res,
          502,
          "CONTENT_ASSISTANT_PROVIDER_FAILED",
          "AI content assistant could not complete the request",
        );
      }

      const outputText = extractOutputText(providerBody);
      const parsed = JSON.parse(outputText || "{}");
      const result: Record<string, string> = {};
      for (const item of Array.isArray(parsed?.fields) ? parsed.fields : []) {
        if (fieldNames.includes(item?.key) && typeof item?.value === "string")
          result[item.key] = item.value;
      }
      if (!fieldNames.every((key) => typeof result[key] === "string"))
        throw new Error("Provider returned incomplete fields");

      return sendSuccess(
        res,
        200,
        "CONTENT_ASSISTANT_COMPLETED",
        "Content assistant completed",
        { fields: result },
      );
    } catch (error) {
      console.error("[ContentAssistant] request failed", error);
      return sendError(
        res,
        502,
        "CONTENT_ASSISTANT_PROVIDER_FAILED",
        "AI content assistant could not complete the request",
      );
    }
  },
);

export default app;
