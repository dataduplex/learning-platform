import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="site-title" href="/">The mathematics of language models</Link>
      <nav className="site-nav" aria-label="Site">
        <Link href="/">Course map</Link>
        <Link href="/notation">Notation</Link>
      </nav>
      <ThemeToggle />
    </header>
  );
}
