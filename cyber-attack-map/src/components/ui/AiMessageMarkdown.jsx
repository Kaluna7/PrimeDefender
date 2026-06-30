/**
 * @param {string} text
 * @param {string} [keyPrefix]
 * @returns {import('react').ReactNode[]}
 */
function parseInlineMarkdown(text, keyPrefix = 'i') {
  const parts = [];
  const re = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_)/g;
  let last = 0;
  let match;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(
        <strong key={`${keyPrefix}-b-${key++}`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <em key={`${keyPrefix}-e-${key++}`} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length ? parts : [text];
}

/** @param {string} line */
function isBoldSectionHeading(line) {
  const t = line.trim();
  return /^\*\*.+\*\*$/.test(t) && t.length < 120;
}

/** @param {string} line */
function stripBoldSectionHeading(line) {
  return line.trim().replace(/^\*\*(.+)\*\*$/, '$1');
}

/** @param {number} level */
function headingClass(level) {
  switch (level) {
    case 1:
      return 'mt-3 text-[15px] font-bold leading-snug text-inherit first:mt-0';
    case 2:
      return 'mt-3 text-[14px] font-bold leading-snug text-inherit first:mt-0';
    case 3:
      return 'mt-2.5 text-[13px] font-semibold leading-snug text-inherit first:mt-0';
    default:
      return 'mt-2 text-xs font-semibold uppercase tracking-wide text-inherit first:mt-0';
  }
}

/**
 * Lightweight markdown for AI chat replies (headings, bold, italic, lists, paragraphs).
 * @param {{ content: string; className?: string }} props
 */
export function AiMessageMarkdown({ content, className = '' }) {
  if (!content?.trim()) return null;

  const lines = content.split('\n');
  /** @type {import('react').ReactNode[]} */
  const nodes = [];
  /** @type {string[]} */
  let listItems = [];
  /** @type {'ol' | 'ul' | null} */
  let listType = null;
  let key = 0;

  const flushList = () => {
    if (!listItems.length || !listType) return;
    const ListTag = listType === 'ol' ? 'ol' : 'ul';
    nodes.push(
      <ListTag
        key={`list-${key++}`}
        className={`my-2 space-y-1 pl-5 ${listType === 'ol' ? 'list-decimal' : 'list-disc'}`}
      >
        {listItems.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {parseInlineMarkdown(item, `li-${i}`)}
          </li>
        ))}
      </ListTag>,
    );
    listItems = [];
    listType = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      nodes.push(
        <p key={`h-${key++}`} className={headingClass(level)} role="heading" aria-level={level + 1}>
          {parseInlineMarkdown(headingMatch[2], `h-${key}`)}
        </p>,
      );
      continue;
    }

    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);

    if (olMatch) {
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(olMatch[1]);
      continue;
    }

    if (ulMatch) {
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(ulMatch[1]);
      continue;
    }

    flushList();

    if (isBoldSectionHeading(trimmed)) {
      nodes.push(
        <p key={`bh-${key++}`} className="mt-3 text-[14px] font-bold leading-snug first:mt-0">
          {parseInlineMarkdown(stripBoldSectionHeading(trimmed), `bh-${key}`)}
        </p>,
      );
      continue;
    }

    nodes.push(
      <p key={`p-${key++}`} className="leading-relaxed">
        {parseInlineMarkdown(trimmed, `p-${key}`)}
      </p>,
    );
  }

  flushList();

  return <div className={`space-y-1 ${className}`.trim()}>{nodes}</div>;
}
