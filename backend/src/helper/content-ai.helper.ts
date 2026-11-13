// The call to the AI provider behind the content assistant: field checks, the request, and the
// clean-up of each answer by field format. Used by ctrl/admin/content-assistant.ts (one button
// per field) and ctrl/admin/content-english.ts (English filled on save).
// OPENAI_BASE_URL points the call elsewhere (the e2e stack uses a stand-in, never the real
// provider).

export type FieldType =
  | 'plain_text'
  | 'multiline_text'
  | 'rich_text_html'
  | 'seo_description'
  | 'keyword_list'
  | 'short_value';

export const FIELD_TYPES = new Set<FieldType>([
  'plain_text',
  'multiline_text',
  'rich_text_html',
  'seo_description',
  'keyword_list',
  'short_value',
]);

export class ContentAiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Text fields of a request, or null when the shape or size is not acceptable. */
export const cleanRecord = (value: unknown, maxEntries = 80) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length || entries.length > maxEntries) return null;
  const result: Record<string, string> = {};
  let totalLength = 0;
  for (const [rawKey, rawValue] of entries) {
    const key = String(rawKey).trim().slice(0, 80);
    if (!key || typeof rawValue !== 'string') return null;
    const text = rawValue.slice(0, 100000);
    totalLength += text.length;
    if (totalLength > 180000) return null;
    result[key] = text;
  }
  return result;
};

export const cleanFieldTypes = (
  value: unknown,
  keys: string[],
): Record<string, FieldType> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const result: Record<string, FieldType> = {};
  for (const key of keys) {
    const type = input[key];
    if (typeof type !== 'string' || !FIELD_TYPES.has(type as FieldType)) return null;
    result[key] = type as FieldType;
  }
  return result;
};

const decodeEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code) || 32));

const stripMarkup = (value: string, preserveLines: boolean) => {
  let text = String(value ?? '')
    .replace(/^```(?:html|markdown|text)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  if (preserveLines) {
    text = text
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/p\s*>/gi, '\n\n')
      .replace(/<\/li\s*>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '- ')
      .replace(/<\/(?:h[1-6]|div|blockquote)\s*>/gi, '\n\n');
  }
  text = decodeEntities(text.replace(/<[^>]+>/g, ''));
  return preserveLines
    ? text
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : text.replace(/\s+/g, ' ').trim();
};

export const normalizeFieldValue = (value: string, type: FieldType) => {
  if (type === 'rich_text_html') {
    const html = String(value ?? '')
      .replace(/^```(?:html)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/\son\w+\s*=\s*(["'])[^"']*\1/gi, '')
      .replace(/javascript\s*:/gi, '')
      .trim();
    if (!html) return '';
    return /<\/?[a-z][\s\S]*>/i.test(html)
      ? html
      : html
          .split(/\n{2,}/)
          .map((paragraph) => `<p>${paragraph.trim()}</p>`)
          .join('');
  }
  if (type === 'multiline_text') return stripMarkup(value, true);
  if (type === 'keyword_list')
    return stripMarkup(value, false)
      .split(/[,;\n]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .join(', ');
  return stripMarkup(value, false);
};

/** The text of an OpenAI Responses API answer (`output_text`, or the output_text parts). */
type AssistantResponse = {
  output_text?: unknown;
  output?: Array<{ content?: Array<{ type?: string; text?: unknown }> }>;
};

const extractOutputText = (response: AssistantResponse | null | undefined): string => {
  if (typeof response?.output_text === 'string') return response.output_text;
  for (const item of Array.isArray(response?.output) ? response.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  return '';
};

const DEVELOPER_PROMPT =
  'You help edit MATEX natural-latex business content. Return only the requested fields. Field formats: plain_text and short_value are one line without HTML or Markdown; multiline_text is plain text with optional line breaks and never HTML or Markdown; rich_text_html is semantic HTML and never Markdown; seo_description is one concise plain-text paragraph without HTML; keyword_list is comma-separated plain text. Never invent certifications, prices, stock, medical benefits, warranties, or technical specifications.';

export const translateTask = (sourceLocale: string, targetLocale: string) =>
  `Translate every field from ${sourceLocale} to ${targetLocale}. Preserve URLs, product codes, measurements, and brand names. Follow each field format exactly. Do not add claims or facts.`;

/**
 * Asks the provider to fill every field. Throws ContentAiError: 503 when no key is set, 502
 * when the provider fails or answers incompletely.
 */
export const askContentAi = async (request: {
  task: string;
  contentType: string;
  context: string;
  fields: Record<string, string>;
  fieldTypes: Record<string, FieldType>;
}): Promise<Record<string, string>> => {
  const apiKey = String(process.env.OPENAI_API_KEY ?? '').trim();
  if (!apiKey) {
    throw new ContentAiError(
      503,
      'CONTENT_ASSISTANT_NOT_CONFIGURED',
      'AI content assistant is not configured',
    );
  }
  const baseUrl = String(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(
    /\/+$/,
    '',
  );
  const fieldNames = Object.keys(request.fields);
  const formatRules = Object.entries(request.fieldTypes).map(([key, type]) => `${key}: ${type}`);
  const failed = () =>
    new ContentAiError(
      502,
      'CONTENT_ASSISTANT_PROVIDER_FAILED',
      'AI content assistant could not complete the request',
    );
  try {
    const providerResponse = await fetch(`${baseUrl}/responses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        model: process.env.OPENAI_CONTENT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
        store: false,
        max_output_tokens: 16000,
        input: [
          { role: 'developer', content: DEVELOPER_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({
              task: request.task,
              content_type: request.contentType,
              context: request.context,
              fields: request.fields,
              field_formats: formatRules,
            }),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'content_assistant_fields',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                fields: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      key: { type: 'string', enum: fieldNames },
                      value: { type: 'string' },
                    },
                    required: ['key', 'value'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['fields'],
              additionalProperties: false,
            },
          },
        },
      }),
    });
    const providerBody = await providerResponse.json().catch(() => null);
    if (!providerResponse.ok) {
      console.error('[ContentAssistant] provider error', {
        status: providerResponse.status,
        code: providerBody?.error?.code,
        type: providerBody?.error?.type,
      });
      throw failed();
    }
    const parsed = JSON.parse(extractOutputText(providerBody) || '{}');
    const result: Record<string, string> = {};
    for (const item of Array.isArray(parsed?.fields) ? parsed.fields : []) {
      if (fieldNames.includes(item?.key) && typeof item?.value === 'string')
        result[item.key] = normalizeFieldValue(item.value, request.fieldTypes[item.key]);
    }
    if (!fieldNames.every((key) => typeof result[key] === 'string'))
      throw new Error('Provider returned incomplete fields');
    return result;
  } catch (error) {
    if (error instanceof ContentAiError) throw error;
    console.error('[ContentAssistant] request failed', error);
    throw failed();
  }
};
