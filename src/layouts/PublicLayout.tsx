import { Outlet } from 'react-router-dom';

import { Footer } from './Footer';

//import './PublicLayout.css';


/** Unauthenticated shell: landing, login, register, privacy, terms. No chat widget. */
export function PublicLayout() {
  return (
    <div className="layout layout--public">
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
