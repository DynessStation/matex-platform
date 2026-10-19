import express = require("express");
import { Response } from "express";

import db = require("../../db");
import { getAdminScope } from "../../helper/admin-scope.helper";
import { sendError, sendSuccess } from "../../helper/api-response.helper";
import { AuthRequest, verifyToken } from "../../middleware/auth-jwt.middleware";
import { requirePermission } from "../../middleware/auth-permission.middleware";

const app = express();
const { pool } = db;

type AssistMode = "translate" | "generate";
type FieldType =
  | "plain_text"
  | "multiline_text"
  | "rich_text_html"
  | "seo_description"
  | "keyword_list"
  | "short_value";

const fieldTypes = new Set<FieldType>([
  "plain_text",
  "multiline_text",
  "rich_text_html",
  "seo_description",
  "keyword_list",
  "short_value",
]);

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

const cleanFieldTypes = (
  value: unknown,
  keys: string[],
): Record<string, FieldType> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const result: Record<string, FieldType> = {};
  for (const key of keys) {
    const type = input[key];
    if (typeof type !== "string" || !fieldTypes.has(type as FieldType))
      return null;
    result[key] = type as FieldType;
  }
  return result;
};

const decodeEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) =>
      String.fromCodePoint(Number(code) || 32),
    );

const stripMarkup = (value: string, preserveLines: boolean) => {
  let text = String(value ?? "")
    .replace(/^```(?:html|markdown|text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  if (preserveLines) {
    text = text
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/p\s*>/gi, "\n\n")
      .replace(/<\/li\s*>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "- ")
      .replace(/<\/(?:h[1-6]|div|blockquote)\s*>/gi, "\n\n");
  }
  text = decodeEntities(text.replace(/<[^>]+>/g, ""));
  return preserveLines
    ? text
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    : text.replace(/\s+/g, " ").trim();
};

const normalizeFieldValue = (value: string, type: FieldType) => {
  if (type === "rich_text_html") {
    const html = String(value ?? "")
      .replace(/^```(?:html)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/\son\w+\s*=\s*(["'])[^"']*\1/gi, "")
      .replace(/javascript\s*:/gi, "")
      .trim();
    if (!html) return "";
    return /<\/?[a-z][\s\S]*>/i.test(html)
      ? html
      : html
          .split(/\n{2,}/)
          .map((paragraph) => `<p>${paragraph.trim()}</p>`)
          .join("");
  }
  if (type === "multiline_text") return stripMarkup(value, true);
  if (type === "keyword_list")
    return stripMarkup(value, false)
      .split(/[,;\n]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");
  return stripMarkup(value, false);
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
  requirePermission("content_assistant.use"),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success)
      return sendError(res, scope.status, scope.code, scope.message);

    const mode = String(req.body?.mode ?? "") as AssistMode;
    const fields = cleanRecord(req.body?.fields);
    const requestedFieldTypes = fields
      ? cleanFieldTypes(req.body?.field_types, Object.keys(fields))
      : null;
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

    if (
      !fields ||
      !requestedFieldTypes ||
      !["translate", "generate"].includes(mode)
    )
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
    const formatRules = Object.entries(requestedFieldTypes).map(
      ([key, type]) => `${key}: ${type}`,
    );
    const task =
      mode === "translate"
        ? `Translate every field from ${sourceLocale} to ${targetLocale}. Preserve URLs, product codes, measurements, and brand names. Follow each field format exactly. Do not add claims or facts.`
        : `Write or improve every requested ${targetLocale} field for a ${contentType}. Use only the supplied context and current field values. Keep factual claims conservative. Follow each field format exactly.`;

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
                  "You help edit MATEX natural-latex business content. Return only the requested fields. Field formats: plain_text and short_value are one line without HTML or Markdown; multiline_text is plain text with optional line breaks and never HTML or Markdown; rich_text_html is semantic HTML and never Markdown; seo_description is one concise plain-text paragraph without HTML; keyword_list is comma-separated plain text. Never invent certifications, prices, stock, medical benefits, warranties, or technical specifications.",
              },
              {
                role: "user",
                content: JSON.stringify({
                  task,
                  content_type: contentType,
                  context,
                  fields,
                  field_formats: formatRules,
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
          result[item.key] = normalizeFieldValue(
            item.value,
            requestedFieldTypes[item.key],
          );
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
