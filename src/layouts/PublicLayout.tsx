import { Outlet } from 'react-router-dom';

import { Footer } from './Footer';
import { Header } from './Header';


//import './PublicLayout.css';


/** Unauthenticated shell: landing, login, register, privacy, terms. No chat widget. */
export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header variant="public" />
      
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
