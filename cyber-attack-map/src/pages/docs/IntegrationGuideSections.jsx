import { useState } from 'react';
import { CodeBlock } from '../../components/ui/CodeBlock.jsx';
import {
  CODE_SAMPLES,
  formatGuideLine,
  formatGuideParagraphHtml,
  getGuideSections,
  guideCodeBlockId,
  INTEGRATION_STACKS,
  integrationGuide,
  splitBold,
} from './integrationGuide.js';

/** @typedef {'page' | 'modal'} IntegrationGuideVariant */

/**
 * @param {object} props
 * @param {IntegrationGuideVariant} [props.variant]
 * @param {import('./integrationGuide.js').IntegrationStack} [props.stack]
 * @param {(stack: import('./integrationGuide.js').IntegrationStack) => void} [props.onStackChange]
 * @param {'en' | 'id'} props.locale
 * @param {boolean} [props.theme]
 * @param {string} [props.className]
 */
export function IntegrationGuideSections({
  variant = 'page',
  stack: controlledStack,
  onStackChange,
  locale,
  theme = false,
  hideStackPicker = false,
  className = '',
}) {
  const doc = integrationGuide[locale] ?? integrationGuide.en;
  const [internalStack, setInternalStack] = useState(
    /** @type {import('./integrationGuide.js').IntegrationStack} */ ('python'),
  );
  const stack = controlledStack ?? internalStack;

  const setStack = (next) => {
    if (onStackChange) onStackChange(next);
    else setInternalStack(next);
  };

  const sections = getGuideSections(doc, stack);
  const isModal = variant === 'modal';

  return (
    <div className={className}>
      {!hideStackPicker ? (
      <div className={isModal ? 'mb-4 sm:mb-5' : 'mb-8'}>
        <p
          className={
            isModal
              ? `text-xs font-semibold uppercase tracking-wider sm:text-xs ${
                  theme ? 'text-[var(--hero-muted)]' : 'text-slark-muted'
                }`
              : 'text-xs font-semibold uppercase tracking-wider text-slark-muted'
          }
        >
          {doc.stackPickerLabel}
        </p>
        <div
          className={`mt-2 inline-flex w-full rounded-xl border p-1 sm:w-auto ${
            theme
              ? 'border-[var(--hero-border)] bg-[var(--hero-card)]'
              : 'border-slark-border bg-slark-card dark:bg-slark-dark/40'
          }`}
          role="tablist"
          aria-label={doc.stackPickerLabel}
        >
          {INTEGRATION_STACKS.map((key) => {
            const active = stack === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStack(key)}
                className={`flex-1 rounded-lg px-3 py-2.5 text-[15px] font-semibold transition sm:min-w-[7.5rem] sm:px-4 sm:py-2 sm:text-sm ${
                  active
                    ? theme
                      ? 'bg-[var(--hero-primary)] text-white shadow-sm'
                      : 'bg-slark-primary text-white shadow-sm'
                    : theme
                      ? 'text-[var(--hero-muted)] hover:text-[var(--hero-text)]'
                      : 'text-slark-muted hover:text-slark-text dark:hover:text-white'
                }`}
              >
                {doc.stacks[key].label}
              </button>
            );
          })}
        </div>
      </div>
      ) : null}

      <div className={isModal ? undefined : 'space-y-10'}>
      {sections.map((section) => (
        <section
          key={`${stack}-${section.id}`}
          id={section.id}
          className={`scroll-mt-24 ${isModal ? 'mb-6 last:mb-0 sm:mb-7' : undefined}`}
        >
          {isModal ? (
            <>
              <h3
                className={`text-[17px] font-bold leading-snug sm:text-base ${
                  theme ? 'text-[var(--hero-text)]' : 'text-slark-text dark:text-white'
                }`}
              >
                {section.h}
              </h3>
              <ul
                className={`mt-2 space-y-2 text-[15px] leading-[1.65] sm:space-y-1.5 sm:text-sm sm:leading-relaxed ${
                  theme ? 'text-[var(--hero-muted)]' : 'text-slark-muted'
                }`}
              >
                {section.p.map((line, i) => (
                  <GuideListItem key={i} line={line} theme={theme} isModal />
                ))}
              </ul>
            </>
          ) : (
            <>
              <h2 className="font-cyber text-base font-bold leading-snug text-slark-text dark:text-white sm:text-base md:text-lg">
                {section.h}
              </h2>
              <div className="mt-2 space-y-2 text-[15px] leading-[1.65] text-slark-muted sm:mt-3 sm:space-y-2 sm:text-sm sm:leading-relaxed">
                {section.p.map((para, i) => (
                  <p
                    key={i}
                    className="[&_code]:rounded [&_code]:bg-slark-card [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-slark-primary sm:[&_code]:text-xs dark:[&_code]:bg-slark-dark/60"
                    dangerouslySetInnerHTML={{ __html: formatGuideParagraphHtml(para) }}
                  />
                ))}
              </div>
            </>
          )}

          {section.codeBlocks?.length ? (
            <div className={`space-y-3 ${isModal ? 'mt-3' : 'mt-4'}`}>
              {section.codeBlocks.map((block) =>
                CODE_SAMPLES[block.codeKey] ? (
                  <div
                    key={block.codeKey}
                    id={guideCodeBlockId(section.id, block.title)}
                    className="scroll-mt-24"
                  >
                    <CodeBlock
                      title={block.title}
                      code={CODE_SAMPLES[block.codeKey]}
                      className={
                        isModal
                          ? '[&_pre]:max-h-[min(34vh,13rem)] [&_pre]:px-3 [&_pre]:pb-3 [&_pre]:pt-9 [&_pre]:text-[13px] [&_pre]:leading-[1.55] sm:[&_pre]:max-h-[min(40vh,16rem)] sm:[&_pre]:text-[11px] [&>div:first-child]:text-xs [&>div:first-child]:py-2.5 [&_button]:text-[11px] sm:[&_button]:text-[10px]'
                          : '[&_pre]:text-[13px] [&_pre]:leading-[1.55] sm:[&_pre]:text-[11px] [&>div:first-child]:text-xs [&_button]:text-[11px] sm:[&_button]:text-[10px]'
                      }
                    />
                  </div>
                ) : null,
              )}
            </div>
          ) : null}
        </section>
      ))}
      </div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {string} props.line
 * @param {boolean} [props.theme]
 * @param {boolean} [props.isModal]
 */
function GuideListItem({ line, theme, isModal = false }) {
  const segments = formatGuideLine(line);
  const codeClass = theme
    ? `rounded px-1 py-0.5 font-mono text-[var(--hero-primary)] bg-[color-mix(in_srgb,var(--hero-card)_80%,transparent)] ${isModal ? 'text-[13px] sm:text-xs' : 'text-xs'}`
    : `rounded px-1 py-0.5 font-mono text-slark-primary bg-slark-card/80 ${isModal ? 'text-[13px] sm:text-xs' : 'text-xs'}`;

  return (
    <li className="list-none">
      {segments.map((seg, i) => {
        if (seg.type === 'code') {
          return (
            <code key={`c-${i}`} className={codeClass}>
              {seg.value}
            </code>
          );
        }
        return splitBold(seg.value).map((part, j) =>
          part.bold ? (
            <strong key={`${i}-${j}`} className="font-semibold">
              {part.text}
            </strong>
          ) : (
            <span key={`${i}-${j}`}>{part.text}</span>
          ),
        );
      })}
    </li>
  );
}
