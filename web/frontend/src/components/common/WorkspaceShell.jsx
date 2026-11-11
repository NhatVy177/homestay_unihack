import React from 'react';
import { Link } from 'react-router-dom';
import NavigationToggle from './NavigationToggle.jsx';
import BranchChip from './BranchChip.jsx';
import { Icon } from './Icon.jsx';
import '../../pages/khamPhaPhong/khamPhaPhong.css';
import '../../pages/nhanVienKeToan/nhanVienKeToanPortal.css';

function initial(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return (parts[parts.length - 1] || '?').charAt(0).toUpperCase();
}

/**
 * Shared frame for every signed-in role (D-037 B0). Presentation only: the page keeps its own
 * tab state, permissions and handlers and passes them in.
 * items: [{ id, label, icon, locked? }]
 */
export default function WorkspaceShell({
  className = '', roleLabel, eyebrow, title, items, activeTab, onSelect,
  isItemDisabled = () => false, user, showBranch = true, onAccount, onLogout,
  footer, mainClassName = '', children,
}) {
  const accountContent = <>
    <span className="kp-avatar">{initial(user?.hoTen || roleLabel)}</span>
    <span><strong>{user?.hoTen || roleLabel}</strong><small>{roleLabel}</small></span>
  </>;
  return (
    <div className={`kp-page kh-page ui-employee-shell ui-workspace ${className}`}>
      <aside className="kp-sidebar">
        <div className="kp-sidebar-brand">
          <Link className="ui-workspace-brand" to="/"><Icon name="home" /><span>Homestay<span>Dorm</span></span></Link>
          <span className="ui-role-label">{roleLabel}</span>
        </div>
        <nav className="ktp-sidebar-nav" aria-label={`Menu ${roleLabel}`}>
          {items.map(item => (
            <button
              className={`ktp-side-item ${activeTab === item.id ? 'is-active' : ''} ${item.locked ? 'is-locked' : ''}`}
              type="button"
              key={item.id}
              disabled={isItemDisabled(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
              onClick={() => onSelect(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.locked && <Icon name="lock" className="ui-workspace-lock" />}
            </button>
          ))}
        </nav>
        {footer === undefined
          ? <div className="ui-workspace-footer"><span className="ui-workspace-mark"><Icon name="verified_user" /></span><p>Không gian làm việc<br /><strong>{roleLabel}</strong></p></div>
          : footer}
      </aside>
      <div className="kp-app">
        <header className="kp-topbar ui-workspace-topbar">
          <NavigationToggle />
          <div>
            {eyebrow && <p className="ui-workspace-eyebrow">{eyebrow}</p>}
            <h1>{title}</h1>
          </div>
          <div className="kp-top-actions">
            {showBranch && <BranchChip user={user} />}
            {onAccount
              ? <button className="ui-workspace-account" type="button" onClick={onAccount}>{accountContent}</button>
              : <div className="ui-workspace-account">{accountContent}</div>}
            <button className="ui-btn ui-btn--ghost" type="button" onClick={onLogout} aria-label="Đăng xuất" title="Đăng xuất"><Icon name="logout" /></button>
          </div>
        </header>
        <main className={`kp-main ${mainClassName}`}>{children}</main>
      </div>
    </div>
  );
}
