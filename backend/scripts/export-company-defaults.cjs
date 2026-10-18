// Exports one company's public website content as the default content for new companies.
//
// Usage (from backend/, read-only against the database in .env):
//   node scripts/export-company-defaults.cjs --company-id 1 --out database/seeds/company-defaults
//
// Writes content.json plus the page images (media/*). Database ids, company ids, admin
// ids, timestamps and soft-deleted rows are left out, and so are contact-form recipient
// emails (internal addresses that must not be copied to staging or test databases).
// Restore with scripts/seed-company-defaults.cjs.

const fs = require("node:fs");
const path = require("node:path");

require("dotenv").config({ quiet: true });

const mysql = require("mysql2/promise");

const OMIT = new Set([
  "id_master_comp",
  "id_created_by",
  "id_updated_by",
  "created",
  "updated",
  "contact_inquiry_topic_recipient_email",
]);

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = /^--([a-z-]+)$/.exec(argv[index])?.[1];
    if (!key) throw new Error(`Unexpected argument: ${argv[index]}`);
    args[key] = argv[index + 1];
  }
  return args;
}

function requireEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

// Keep content columns only; `drop` lists the row's own id and parent-link columns.
function clean(row, drop = []) {
  return Object.fromEntries(
    Object.entries(row).filter(
      ([column]) => !OMIT.has(column) && !drop.includes(column),
    ),
  );
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const companyId = Number(
    args["company-id"] || process.env.PUBLIC_COMPANY_ID || 1,
  );
  const outDir = path.resolve(args.out || "database/seeds/company-defaults");
  const storageRoot = requireEnvironment("FILE_STORAGE_ROOT");

  const db = await mysql.createConnection({
    host: requireEnvironment("DB_HOST"),
    port: Number(process.env.DB_PORT) || 3306,
    user: requireEnvironment("DB_USER"),
    password: process.env.DB_PASS || "",
    database: requireEnvironment("DB_NAME"),
    charset: "utf8mb4",
    dateStrings: true,
  });
  const rows = async (sql, params = []) => (await db.query(sql, params))[0];

  try {
    fs.rmSync(path.join(outDir, "media"), { recursive: true, force: true });
    fs.mkdirSync(path.join(outDir, "media"), { recursive: true });

    const pages = [];
    for (const page of await rows(
      "SELECT * FROM website_page WHERE id_master_comp = ? ORDER BY website_page_key",
      [companyId],
    )) {
      const translations = (
        await rows(
          "SELECT * FROM website_page_i18n WHERE id_website_page = ? ORDER BY website_page_locale",
          [page.id_website_page],
        )
      ).map((row) => clean(row, ["id_website_page_i18n", "id_website_page"]));

      const media = [];
      for (const item of await rows(
        `SELECT wm.*, a.name AS file_label, a.original_name, a.mime_type, a.extension,
                a.width, a.height, a.storage_path
           FROM website_page_media wm
           JOIN attachment a ON a.id_attachment = wm.id_attachment
          WHERE wm.id_website_page = ?
          ORDER BY wm.website_page_media_slot, wm.website_page_media_sort_order`,
        [page.id_website_page],
      )) {
        const file = `media/${page.website_page_key}-${item.website_page_media_slot}-${item.website_page_media_sort_order}.${item.extension}`;
        fs.copyFileSync(
          path.join(storageRoot, item.storage_path),
          path.join(outDir, file),
        );
        const itemTranslations = (
          await rows(
            "SELECT * FROM website_page_media_i18n WHERE id_website_page_media = ? ORDER BY website_page_media_locale",
            [item.id_website_page_media],
          )
        ).map((row) =>
          clean(row, ["id_website_page_media_i18n", "id_website_page_media"]),
        );
        const {
          file_label,
          original_name,
          mime_type,
          extension,
          width,
          height,
          storage_path,
          ...link
        } = item;
        media.push({
          ...clean(link, [
            "id_website_page_media",
            "id_website_page",
            "id_attachment",
          ]),
          file: {
            path: file,
            name: file_label,
            original_name,
            mime_type,
            extension,
            width,
            height,
          },
          translations: itemTranslations,
        });
      }

      pages.push({
        ...clean(page, ["id_website_page"]),
        translations,
        media,
      });
    }

    const navigations = [];
    for (const navigation of await rows(
      "SELECT * FROM web_navigation WHERE id_master_comp = ? AND web_navigation_deleted_at IS NULL ORDER BY web_navigation_key",
      [companyId],
    )) {
      const items = [];
      for (const item of await rows(
        `SELECT * FROM web_navigation_item
          WHERE id_web_navigation = ? AND web_navigation_item_deleted_at IS NULL
          ORDER BY web_navigation_item_sort_order`,
        [navigation.id_web_navigation],
      )) {
        items.push({
          ...clean(item, ["id_web_navigation_item", "id_web_navigation"]),
          translations: (
            await rows(
              "SELECT * FROM web_navigation_item_i18n WHERE id_web_navigation_item = ? ORDER BY web_navigation_item_locale",
              [item.id_web_navigation_item],
            )
          ).map((row) =>
            clean(row, [
              "id_web_navigation_item_i18n",
              "id_web_navigation_item",
            ]),
          ),
        });
      }
      navigations.push({ ...clean(navigation, ["id_web_navigation"]), items });
    }

    const withTranslations = async (
      parentSql,
      childTable,
      parentId,
      childId,
      childOrder,
    ) => {
      const result = [];
      for (const row of await rows(parentSql, [companyId])) {
        result.push({
          ...clean(row, [parentId]),
          translations: (
            await rows(
              `SELECT * FROM ${childTable} WHERE ${parentId} = ? ORDER BY ${childOrder}`,
              [row[parentId]],
            )
          ).map((child) => clean(child, [childId, parentId])),
        });
      }
      return result;
    };

    const contactTopics = await withTranslations(
      "SELECT * FROM contact_inquiry_topic WHERE id_master_comp = ? ORDER BY contact_inquiry_topic_sort_order",
      "contact_inquiry_topic_i18n",
      "id_contact_inquiry_topic",
      "id_contact_inquiry_topic_i18n",
      "contact_inquiry_topic_locale",
    );
    const contactChannels = await withTranslations(
      "SELECT * FROM public_contact_channel WHERE id_master_comp = ? AND public_contact_channel_deleted_at IS NULL ORDER BY public_contact_channel_sort_order",
      "public_contact_channel_i18n",
      "id_public_contact_channel",
      "id_public_contact_channel_i18n",
      "public_contact_channel_locale",
    );

    const faqCategories = await rows(
      "SELECT COUNT(*) AS total FROM faq_category WHERE id_master_comp = ? AND faq_category_deleted_at IS NULL",
      [companyId],
    );
    if (Number(faqCategories[0].total) > 0) {
      throw new Error(
        "FAQ categories exist; extend this exporter to include them before exporting.",
      );
    }
    const faqs = (
      await withTranslations(
        "SELECT * FROM faq WHERE id_master_comp = ? AND faq_deleted_at IS NULL ORDER BY faq_sort_order",
        "faq_i18n",
        "id_faq",
        "id_faq_i18n",
        "faq_locale",
      )
    ).map(({ id_faq_category, ...faq }) => faq);

    const content = {
      format: 1,
      source: `company ${companyId} on ${requireEnvironment("DB_NAME")}`,
      exported_at: new Date().toISOString(),
      pages,
      navigations,
      contact_topics: contactTopics,
      contact_channels: contactChannels,
      faqs,
    };
    fs.writeFileSync(
      path.join(outDir, "content.json"),
      `${JSON.stringify(content, null, 2)}\n`,
    );

    console.log(
      `Exported ${pages.length} pages (${pages.reduce((sum, page) => sum + page.media.length, 0)} images), ` +
        `${navigations.length} navigation(s), ${contactTopics.length} contact topics, ` +
        `${contactChannels.length} contact channels, ${faqs.length} FAQs to ${outDir}.`,
    );
  } finally {
    await db.end();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
