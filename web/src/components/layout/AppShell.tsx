import { Outlet } from 'react-router-dom';
import { NavBar } from './NavBar';
import { DemoModeBanner } from './DemoModeBanner';
import { ColdStartBanner } from './ColdStartBanner';
import { Footer } from './Footer';

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <NavBar />
      <DemoModeBanner />
      <ColdStartBanner />
      <Outlet />
      <Footer />
    </div>
  );
}
