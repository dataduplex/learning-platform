export type AsideKind = 'intuition' | 'notation' | 'caution' | 'why';

const LABELS: Record<AsideKind, string> = {
  intuition: 'Intuition',
  notation: 'Notation',
  caution: 'Watch out',
  why: 'Why this matters',
};

/** A named digression. The kind sets the label and the accent, never the meaning. */
export function Aside({
  kind,
  title,
  children,
}: {
  kind: AsideKind;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="lesson-aside" data-kind={kind}>
      <p className="lesson-aside-label">{title ?? LABELS[kind]}</p>
      <div className="lesson-aside-body">{children}</div>
    </aside>
  );
}
