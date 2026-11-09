import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon.jsx';

// Only controls the presentation of the existing navigation, never its tab state.
export default function NavigationToggle() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    const shell = toggleRef.current?.closest('.ui-employee-shell, .app-shell');
    if (!shell) return undefined;
    shell.classList.toggle('ui-menu-open', open);
    if (open) closeRef.current?.focus();
    const close = event => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const closeAfterNavigation = event => {
      if (event.target.closest('nav button:not(:disabled), nav a')) setOpen(false);
    };
    document.addEventListener('keydown', close);
    shell.addEventListener('click', closeAfterNavigation);
    return () => {
      shell.classList.remove('ui-menu-open');
      document.removeEventListener('keydown', close);
      shell.removeEventListener('click', closeAfterNavigation);
    };
  }, [open]);

  return (
    <>
      <button ref={toggleRef} className="ui-btn ui-btn--secondary ui-navigation-toggle" type="button" aria-expanded={open} aria-label={open ? 'Menu đang mở' : 'Mở menu'} onClick={() => setOpen(value => !value)}>
        <Icon name="list" /><span>Menu</span>
      </button>
      {open && createPortal(<>
        <button ref={closeRef} className="ui-btn ui-btn--secondary ui-navigation-close" type="button" aria-label="Đóng menu" onClick={() => { setOpen(false); toggleRef.current?.focus(); }}>×</button>
        <button className="ui-navigation-backdrop" type="button" aria-label="Đóng menu khi nhấn bên ngoài" onClick={() => { setOpen(false); toggleRef.current?.focus(); }} />
      </>, document.body)}
    </>
  );
}
