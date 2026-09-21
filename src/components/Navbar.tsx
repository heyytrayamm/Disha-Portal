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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
        setNotificationsOpen(false);
        setMobileMenuOpen(false);
      }
    };
    if (userMenuOpen || notificationsOpen || mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userMenuOpen, notificationsOpen, mobileMenuOpen]);

  const navItems: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Overview', icon: 'dashboard' },
    { id: 'scan', label: 'Live Scan', icon: 'photo_camera' },
    { id: 'repository', label: 'Audit', icon: 'history_edu' },
    { id: 'rules', label: 'Rules', icon: 'gavel' },
    { id: 'resources', label: 'Resources', icon: 'library_books' },
  ];

  if (user?.role === 'SYSTEM_ADMIN') {
    navItems.push({ id: 'users', label: 'Officials', icon: 'group' });
  }

  return (
    <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E2DFD8]">
      <div className="disha-workspace flex items-center justify-between h-16">
        
        {/* LEFT: Branding */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xs bg-[#141413] text-[#FFFFFF] flex items-center justify-center font-bold text-xs">
              <span className="text-[11px] font-mono tracking-tighter">DI</span>
            </div>
            <div>
              <span className="font-bold tracking-tight text-[#141413] text-sm group-hover:text-[#D4381D] transition-colors block">
                DISHA
              </span>
              <p className="text-[10px] text-[#6E6D67] tracking-normal -mt-0.5 hidden sm:block">
                Digital Inspection & Standards Hub
              </p>
            </div>
          </button>

          {/* CENTER: Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-[#E2DFD8]">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`nav-tab-link ${isActive ? 'nav-tab-link-active' : ''}`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* RIGHT: Actions, Notifications, & Profile */}
        <div className="flex items-center gap-2.5">
          {/* Quick Scan Button */}
          <button
            onClick={onOpenScanner}
            className="btn-primary text-xs !py-1.5 !px-3"
            title="Open camera or upload image for inspection"
          >
            <span className="material-symbols-outlined text-[16px]">photo_camera</span>
            <span className="hidden sm:inline">Scan Label</span>
          </button>

          {/* Notification Icon */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setUserMenuOpen(false);
              }}
              className="p-1.5 text-[#5A5955] hover:text-[#141413] hover:bg-[#F4F2EB] rounded-xs transition-colors cursor-pointer relative"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#D4381D] rounded-full" />
            </button>

            {/* Notifications Popover */}
            {notificationsOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setNotificationsOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-[#FFFFFF] border border-[#E2DFD8] rounded-xs shadow-md p-4 z-50 animate-slide-down">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2DFD8] mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[#D4381D] text-[16px]">notifications</span>
                      <h4 className="text-xs font-bold text-[#141413] uppercase tracking-wider">Statutory Notifications</h4>
                    </div>
                    <span className="text-[10px] font-mono text-[#6E6D67] bg-[#F4F2EB] px-1.5 py-0.5 rounded-xs">
                      0 Pending
                    </span>
                  </div>
                  <div className="py-6 text-center text-[#8F8E87]">
                    <span className="material-symbols-outlined text-[24px] text-[#A8A59C]">inbox</span>
                    <p className="text-xs font-medium text-[#141413] mt-1">No new inspection alerts</p>
                    <p className="text-[11px] text-[#6E6D67] mt-0.5">All verification queues are up to date.</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Profile / Auth Area */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 p-1.5 pl-2 rounded-xs border border-[#E2DFD8] hover:bg-[#F4F2EB] transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-xs bg-[#141413] text-[#FFFFFF] font-bold flex items-center justify-center text-[10px] font-mono">
                  {user.full_name.charAt(0)}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-semibold text-[#141413] leading-none">
                    {user.full_name}
                  </p>
                  <p className="text-[10px] text-[#8F8E87] leading-tight mt-0.5">
                    {user.role === 'SYSTEM_ADMIN' ? 'Administrator' : 'Inspector'}
                  </p>
                </div>
                <span className="material-symbols-outlined text-[16px] text-[#8F8E87]">
                  expand_more
                </span>
              </button>

              {/* User Dropdown */}
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-[#FFFFFF] border border-[#E2DFD8] rounded-xs shadow-md py-2 z-50 text-xs animate-slide-down">
                    <div className="px-4 py-2 border-b border-[#E2DFD8]">
                      <p className="font-semibold text-[#141413] truncate">{user.full_name}</p>
                      <p className="text-[11px] text-[#6E6D67] truncate">{user.email}</p>
                      <span className="inline-block mt-1.5 text-[10px] font-mono uppercase tracking-wider text-[#141413] bg-[#F2F0E8] border border-[#E2DFD8] px-1.5 py-0.5 rounded-xs">
                        {user.role === 'SYSTEM_ADMIN' ? 'System Administrator' : 'Legal Metrology Officer'}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-[#FDE8E6] text-[#C5281B] font-medium flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="btn-secondary text-xs !py-1.5 !px-3"
            >
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span>Officer Sign In</span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-[#5A5955] hover:text-[#141413] rounded-xs"
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined text-[22px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>

      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E2DFD8] bg-[#FAF9F6] px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xs text-xs font-medium ${
                  isActive
                    ? 'bg-[#FFFFFF] text-[#D4381D] font-semibold border border-[#E2DFD8]'
                    : 'text-[#6E6D67] hover:bg-[#EFECE6]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

export default Navbar;
