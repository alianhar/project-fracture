import { Outlet } from 'react-router-dom';
import { NavBar } from './NavBar';
import { ColdStartBanner } from './ColdStartBanner';
import { Footer } from './Footer';

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <NavBar />
      <ColdStartBanner />
      <Outlet />
      <Footer />
    </div>
  );
}
