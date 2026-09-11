import React, { useState, useEffect } from 'react';
import type { ActiveTab } from '../types/metrology';
import type { User } from '../types/auth';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenScanner: () => void;
  user: User | null;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenScanner,
  user,
  onOpenLogin,
  onLogout
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
        setNotificationsOpen(false);
      }
    };
    if (userMenuOpen || notificationsOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userMenuOpen, notificationsOpen]);

  return (
    <>
      {/* SideNavBar (Desktop Fixed Left Navigation matching Stitch) */}
      <nav className="hidden md:flex h-screen w-64 fixed left-0 top-0 bg-surface-container-low border-r border-border-subtle flex-col py-lg px-md z-20 font-body-md text-text-main">
        {/* Brand Header */}
        <div className="flex items-center gap-sm mb-lg px-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-bold text-lg shadow-sm">
            <span className="material-symbols-outlined text-[24px]">verified</span>
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary font-bold">Disha</h1>
            <p className="font-label-md text-label-md text-text-muted">Government Portal</p>
          </div>
        </div>

        {/* Menu Items List */}
        <ul className="flex flex-col gap-xs flex-1">
          <li>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-sm px-md py-sm rounded-lg font-semibold transition-all duration-200 ease-in-out cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-secondary hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'dashboard' ? "'FILL' 1" : "'FILL' 0" }}>
                dashboard
              </span>
              <span className="font-body-md text-body-md">Overview</span>
            </button>
          </li>

          <li>
            <button
              onClick={() => setActiveTab('scan')}
              className={`w-full flex items-center gap-sm px-md py-sm rounded-lg font-semibold transition-all duration-200 ease-in-out cursor-pointer ${
                activeTab === 'scan'
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-secondary hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'scan' ? "'FILL' 1" : "'FILL' 0" }}>
                document_scanner
              </span>
              <span className="font-body-md text-body-md">Live Scan</span>
            </button>
          </li>

          <li>
            <button
              onClick={() => setActiveTab('repository')}
              className={`w-full flex items-center gap-sm px-md py-sm rounded-lg font-semibold transition-all duration-200 ease-in-out cursor-pointer ${
                activeTab === 'repository'
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-secondary hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'repository' ? "'FILL' 1" : "'FILL' 0" }}>
                history
              </span>
              <span className="font-body-md text-body-md">Audit Logs</span>
            </button>
          </li>

          <li>
            <button
              onClick={() => setActiveTab('rules')}
              className={`w-full flex items-center gap-sm px-md py-sm rounded-lg font-semibold transition-all duration-200 ease-in-out cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-secondary hover:bg-surface-container-highest'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'rules' ? "'FILL' 1" : "'FILL' 0" }}>
                gavel
              </span>
              <span className="font-body-md text-body-md">Rules</span>
            </button>
          </li>

          {user?.role === 'SYSTEM_ADMIN' && (
            <li>
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center gap-sm px-md py-sm rounded-lg font-semibold transition-all duration-200 ease-in-out cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-secondary hover:bg-surface-container-highest'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'users' ? "'FILL' 1" : "'FILL' 0" }}>
                  group
                </span>
                <span className="font-body-md text-body-md">User Admin</span>
              </button>
            </li>
          )}
        </ul>

        {/* Quick Scan Action in SideNav */}
        <div className="pt-md border-t border-border-subtle">
          <button
            onClick={onOpenScanner}
            className="w-full bg-primary-container text-on-primary hover:bg-primary py-sm px-md rounded-lg font-body-md text-body-md font-semibold flex items-center justify-center gap-xs shadow-sm transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">photo_camera</span>
            <span>Scan Product Label</span>
          </button>
        </div>
      </nav>

      {/* TopNavBar Header (Desktop & Mobile Header) */}
      <header className="bg-surface border-b border-border-subtle flex justify-between items-center w-full px-gutter h-16 sticky top-0 z-10 font-body-md md:pl-72">
        <div className="flex items-center gap-md">
          {/* Mobile Logo Brand */}
          <div className="flex md:hidden items-center gap-xs cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <span className="material-symbols-outlined text-primary text-[24px]">verified</span>
            <span className="font-headline-md text-headline-md font-bold text-primary">Disha</span>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="font-headline-md text-headline-md font-bold text-primary">Disha Portal</span>
          </div>
        </div>

        {/* Right Section: Notifications & Inspector Profile */}
        <div className="flex items-center gap-md">
          <button 
            onClick={onOpenScanner}
            className="flex sm:hidden items-center gap-1 bg-primary-container text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">photo_camera</span>
            <span>Scan</span>
          </button>

          {/* Notification Bell Dropdown */}
          <div className="relative">
            <button 
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                if (userMenuOpen) setUserMenuOpen(false);
              }}
              className="text-primary cursor-pointer active:opacity-80 p-2 rounded-full hover:bg-surface-container-highest transition-colors relative"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
            </button>

            {notificationsOpen && (
              <>
                {/* Backdrop to dismiss when clicking outside */}
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setNotificationsOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest border border-border-subtle rounded-xl shadow-xl p-4 z-40 text-text-main animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-border-subtle mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">notifications</span>
                      <h4 className="font-headline-md text-sm font-bold text-primary">Notifications</h4>
                    </div>
                    <span className="text-[11px] font-label-sm text-text-muted bg-surface-container-high px-2 py-0.5 rounded-full font-medium">
                      0 new
                    </span>
                  </div>

                  {/* Empty State */}
                  <div className="py-6 text-center flex flex-col items-center justify-center text-text-muted">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center mb-2 text-text-muted">
                      <span className="material-symbols-outlined text-[20px]">notifications_off</span>
                    </div>
                    <p className="font-body-md text-xs font-semibold text-text-main">No new notifications</p>
                    <p className="text-[11px] text-text-muted mt-0.5">You're all caught up with compliance alerts.</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            {user ? (
              <div>
                <button
                  onClick={() => {
                    setUserMenuOpen(!userMenuOpen);
                    if (notificationsOpen) setNotificationsOpen(false);
                  }}
                  className="flex items-center gap-sm cursor-pointer p-1 rounded-lg hover:bg-surface-container-highest transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary font-bold flex items-center justify-center text-xs">
                    {user.full_name.charAt(0)}
                  </div>
                  <span className="font-body-md text-body-md font-semibold text-text-main hidden lg:inline">
                    {user.role === 'ENFORCEMENT_OFFICER' ? `${user.full_name} (Zone 4)` : user.full_name}
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-text-muted">arrow_drop_down</span>
                </button>

                {userMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setUserMenuOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-surface-container-lowest border border-border-subtle rounded-lg shadow-lg py-2 z-40 text-body-md text-text-main animate-in fade-in duration-150">
                      <div className="px-4 py-2 border-b border-border-subtle">
                        <p className="font-bold text-primary truncate">
                          {user.role === 'ENFORCEMENT_OFFICER' ? `${user.full_name} (Zone 4)` : user.full_name}
                        </p>
                        <p className="font-label-sm text-label-sm text-text-muted truncate">{user.email}</p>
                        <span className="inline-block mt-1 bg-primary/10 text-primary px-2 py-0.5 rounded font-label-sm text-label-sm font-bold">
                          {user.role === 'SYSTEM_ADMIN' ? 'System Administrator' : 'Enforcement / Inspection Officer'}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-surface-container-low text-status-fail font-semibold flex items-center gap-2 transition cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="bg-primary-container text-on-primary px-md py-sm rounded-lg font-label-md text-label-md hover:bg-primary transition-colors flex items-center gap-xs shadow-xs font-semibold cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">account_circle</span>
                <span>Sign In</span>
              </button>
            )}
          </div>

        </div>
      </header>
    </>
  );
};
