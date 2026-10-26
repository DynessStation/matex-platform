// Stateless helpers of the admin help (U-4 tip, U-5 drawer).
//
// Guides are markdown files in public/assets/help/<key>.md, one per admin page,
// converted from the admin manual. The format is a small markdown subset:
//
//   # Page title
//   > **Untuk apa:** ...            summary box; the first quote line is the page tip
//   ## Section                      a drawer section with a # anchor (slug of the title)
//   ### Item                        a card, field, or button inside the section, with its
//                                   own anchor "<section>--<item>" (slugs of both titles)
//   paragraphs, "- " and "1. " lists (two spaces per level), | tables |,
//   **bold**, `code`, [text](https://...) and bare https:// links.
//
// The first paragraph of a section or item is its tip text, so write it as a short,
// complete explanation; details follow in the next paragraphs.

//==================================================
//==== GUIDE LIST
//==================================================

export interface HelpGuideEntry {
  key: string; // file name in assets/help without .md
  title: string; // i18n key (the sidebar menu titles)
  path?: string; // admin route the guide explains; the longest match wins
}

export const HELP_GUIDES: HelpGuideEntry[] = [
  { key: 'umum', title: 'help_general' },
  { key: 'dashboard', title: 'dashboard', path: '/dashboard' },
  {
    key: 'public-analytics',
    title: 'public_analytics',
    path: '/public-analytics',
  },
  { key: 'seo-console', title: 'seo_search_console', path: '/seo-console' },
  { key: 'admin-account', title: 'admin_accounts', path: '/admin-account' },
  { key: 'admin-access', title: 'access_profiles', path: '/admin-access' },
  {
    key: 'admin-permission',
    title: 'admin_permissions',
    path: '/admin-permission',
  },
  { key: 'activity-log', title: 'activity_log', path: '/activity-log' },
  { key: 'chair', title: 'positions', path: '/chair' },
  { key: 'office', title: 'offices', path: '/office' },
  { key: 'menu', title: 'website_navigation', path: '/menu' },
  { key: 'website-home', title: 'website_home', path: '/website-page/home' },
  {
    key: 'website-about',
    title: 'website_about',
    path: '/website-page/about',
  },
  { key: 'blog', title: 'blog', path: '/blog' },
  { key: 'public-contact', title: 'contact_settings', path: '/public-contact' },
  { key: 'faq', title: 'faq_management', path: '/faq' },
  {
    key: 'website-terms',
    title: 'terms_conditions',
    path: '/website-page/terms',
  },
  {
    key: 'website-career',
    title: 'career_soon',
    path: '/website-page/career',
  },
  { key: 'category', title: 'product_categories', path: '/category' },
  { key: 'product', title: 'products', path: '/product' },
  { key: 'media', title: 'media', path: '/media' },
  { key: 'account', title: 'my_account', path: '/account' },
];

/** The guide for an admin URL ("/product/edit/5?x=1" -> "product"); "umum" when none. */
export function helpKeyForUrl(url: string): string {
  const path = url.split(/[?#]/)[0];

  const match = HELP_GUIDES.filter(
    (guide) =>
      guide.path && (path === guide.path || path.startsWith(guide.path + '/')),
  ).sort((a, b) => b.path!.length - a.path!.length)[0];

  return match?.key ?? 'umum';
}

//==================================================
//==== PARSED GUIDE
//==================================================

export interface HelpSection {
  id: string; // anchor, slug of the title
  title: string;
  html: string; // escaped, safe for [innerHTML]
  tip: string; // first paragraph as plain text
}

export interface HelpItem {
  id: string; // "<section id>--<item slug>"
  title: string;
  tip: string; // first paragraph as plain text
}

export interface HelpGuide {
  title: string;
  summaryHtml: string; // the "> " box
  tip: string; // first summary line as plain text
  introHtml: string; // text between the summary and the first section
  sections: HelpSection[];
  items: HelpItem[]; // the ### headings of all sections
}

/** The tip of a section or item anchor; '' when the guide has no such anchor. */
export function helpTipFor(guide: HelpGuide, anchor: string): string {
  return (
    guide.items.find((item) => item.id === anchor)?.tip ??
    guide.sections.find((section) => section.id === anchor)?.tip ??
    ''
  );
}

/** Whether the guide has this section or item anchor. */
export function helpHasAnchor(guide: HelpGuide, anchor: string): boolean {
  return (
    guide.sections.some((section) => section.id === anchor) ||
    guide.items.some((item) => item.id === anchor)
  );
}

/** Anchor of a section title: "Akuisisi — Sumber Trafik" -> "akuisisi-sumber-trafik". */
export function helpSlug(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseHelpGuide(markdown: string): HelpGuide {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');

  const guide: HelpGuide = {
    title: '',
    summaryHtml: '',
    tip: '',
    introHtml: '',
    sections: [],
    items: [],
  };

  const summary: string[] = [];

  const intro: string[] = [];

  let current: { title: string; lines: string[] } | null = null;

  const used = new Set<string>();

  const closeSection = () => {
    if (!current) {
      return;
    }

    let id = helpSlug(current.title) || 'bagian';

    for (let n = 2; used.has(id); n++) {
      id = `${helpSlug(current.title)}-${n}`;
    }

    used.add(id);

    guide.sections.push({
      id,
      title: current.title,
      html: renderHelpBlocks(current.lines, id),
      tip: firstParagraph(current.lines),
    });

    current.lines.forEach((line, index) => {
      if (!line.startsWith('### ')) {
        return;
      }

      const title = line.slice(4).trim();

      const next = current!.lines.findIndex(
        (other, at) => at > index && /^#{2,3} /.test(other),
      );

      guide.items.push({
        id: `${id}--${helpSlug(title)}`,
        title,
        tip: firstParagraph(
          current!.lines.slice(index + 1, next < 0 ? undefined : next),
        ),
      });
    });
  };

  for (const line of lines) {
    if (line.startsWith('# ') && !guide.title) {
      guide.title = line.slice(2).trim();
    } else if (line.startsWith('## ')) {
      closeSection();

      current = { title: line.slice(3).trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else if (line.startsWith('> ')) {
      summary.push(line.slice(2).trim());
    } else {
      intro.push(line);
    }
  }

  closeSection();

  guide.summaryHtml = summary
    .map((line) => `<p>${renderInline(line)}</p>`)
    .join('');

  guide.tip = summary.length
    ? withoutLabel(plainText(summary[0]))
    : firstParagraph(intro);

  guide.introHtml = renderHelpBlocks(intro);

  return guide;
}

//==================================================
//==== MARKDOWN SUBSET
//==================================================

const LIST_ITEM = /^(\s*)(-|\d+\.) (.*)$/;

function firstParagraph(lines: string[]): string {
  const start = lines.findIndex(
    (line) => line.trim() && !/^(#|\||>|\s*(-|\d+\.) )/.test(line),
  );

  if (start < 0) {
    return '';
  }

  const end = lines.findIndex((line, i) => i > start && !line.trim());

  return plainText(lines.slice(start, end < 0 ? undefined : end).join(' '));
}

// "Untuk apa: mengelola katalog" -> "Mengelola katalog".
function withoutLabel(text: string): string {
  const rest = text.replace(/^[^:]{1,30}:\s*/, '');

  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

function plainText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1')
    .trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Inline markdown on escaped text; only http(s) links are produced. */
export function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<]+[^\s<.,;:)])/g,
      (_match, label: string, href: string, bare: string) => {
        const url = href ?? bare;

        return `<a href="${url}" target="_blank" rel="noopener">${label ?? bare}</a>`;
      },
    );
}

/**
 * Block markdown (headings, paragraphs, lists, tables) to escaped HTML. Item headings get
 * the id "help-<section>--<item>" when the section id is given.
 */
export function renderHelpBlocks(lines: string[], sectionId = ''): string {
  const html: string[] = [];

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
    } else if (line.startsWith('### ')) {
      const title = line.slice(4).trim();

      const id = sectionId ? ` id="help-${sectionId}--${helpSlug(title)}"` : '';

      html.push(`<h4${id}>${renderInline(title)}</h4>`);

      i++;
    } else if (line.startsWith('|')) {
      const rows: string[] = [];

      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i]);

        i++;
      }

      html.push(renderTable(rows));
    } else if (LIST_ITEM.test(line)) {
      const items: string[] = [];

      while (i < lines.length && LIST_ITEM.test(lines[i])) {
        items.push(lines[i]);

        i++;
      }

      html.push(renderList(items));
    } else {
      const paragraph: string[] = [];

      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^(###|\|)/.test(lines[i]) &&
        !LIST_ITEM.test(lines[i])
      ) {
        paragraph.push(lines[i].trim());

        i++;
      }

      html.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
    }
  }

  return html.join('');
}

function renderTable(rows: string[]): string {
  const cells = (row: string) =>
    row
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((cell) => cell.trim());

  const [head, , ...body] = rows;

  return (
    '<div class="help-table"><table><thead><tr>' +
    cells(head)
      .map((cell) => `<th>${renderInline(cell)}</th>`)
      .join('') +
    '</tr></thead><tbody>' +
    body
      .map(
        (row) =>
          '<tr>' +
          cells(row)
            .map((cell) => `<td>${renderInline(cell)}</td>`)
            .join('') +
          '</tr>',
      )
      .join('') +
    '</tbody></table></div>'
  );
}

// Nested lists by indent (two spaces per level); an ordered list keeps its first number.
function renderList(items: string[]): string {
  let html = '';

  const open: { tag: string; depth: number }[] = [];

  for (const item of items) {
    const [, indent, marker, text] = item.match(LIST_ITEM)!;

    const depth = Math.floor(indent.length / 2);

    const tag = marker === '-' ? 'ul' : 'ol';

    while (open.length && open[open.length - 1].depth > depth) {
      html += `</li></${open.pop()!.tag}>`;
    }

    const top = open[open.length - 1];

    if (!top || top.depth < depth) {
      const start =
        tag === 'ol' && marker !== '1.'
          ? ` start="${parseInt(marker, 10)}"`
          : '';

      html += `<${tag}${start}><li>`;

      open.push({ tag, depth });
    } else {
      html += '</li><li>';
    }

    html += renderInline(text);
  }

  while (open.length) {
    html += `</li></${open.pop()!.tag}>`;
  }

  return html;
}
