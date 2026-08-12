import { NavLink } from 'react-router-dom';
import { ArrowsLeftRight, BookOpen, ChartBar, ClockCounterClockwise, Scan } from '@phosphor-icons/react';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS = [
  { to: ROUTES.analyze, label: 'Analyze', icon: Scan, end: true },
  { to: ROUTES.compare, label: 'Compare', icon: ArrowsLeftRight, end: false },
  { to: ROUTES.benchmark, label: 'Benchmark', icon: ChartBar, end: false },
  { to: ROUTES.methodology, label: 'Methodology', icon: BookOpen, end: false },
  { to: ROUTES.history, label: 'History', icon: ClockCounterClockwise, end: false },
];

export function NavBar() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-bold uppercase tracking-wider text-text">
            Fracture<span className="text-positive">.dx</span>
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-1.5 px-3 py-2 font-body text-sm text-text-muted transition-colors hover:text-text',
                  isActive &&
                    "text-text after:absolute after:inset-x-2 after:-bottom-px after:h-px after:bg-positive after:content-['']",
                )
              }
            >
              <Icon size={15} weight="regular" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <ThemeToggle />
      </div>
    </header>
  );
}
