import Link from 'next/link';
import type { ReferenceLink } from '../../lib/course/types';
import { ThemeToggle } from './ThemeToggle';

export function SiteHeader({ title, reference }: { title: string; reference: ReferenceLink }) {
  return (
    <header className="site-header">
      <Link className="site-title" href="/">{title}</Link>
      <nav className="site-nav" aria-label="Site">
        <Link href="/">Course map</Link>
        <Link href={reference.path}>{reference.label}</Link>
      </nav>
      <ThemeToggle />
    </header>
  );
}
