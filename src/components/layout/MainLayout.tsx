import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn, timeAgo } from '@/lib/utils';
import {
  LayoutDashboard,
  Factory,
  Smartphone,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  ChevronRight,
  User,
  Zap,
} from 'lucide-react';

export function MainLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const roleLabel = profile?.role === 'super_admin' ? t('roles.super_admin') : profile?.role === 'manager' ? t('roles.manager') : t('roles.operator');

  const navItems = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, roles: ['super_admin', 'manager', 'operator'] },
    { to: '/workspaces', label: t('nav.workspaces'), icon: Factory, roles: ['super_admin', 'manager'] },
    { to: '/terminal', label: t('nav.terminal'), icon: Smartphone, roles: ['super_admin', 'manager', 'operator'] },
    { to: '/settings', label: t('nav.settings'), icon: Settings, roles: ['super_admin'] },
  ];

  const filteredNav = navItems.filter((item) =>
    profile ? item.roles.includes(profile.role) : true
  );

  return (
    <div className="flex h-screen overflow-hidden bg-flux-cream">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-flux-sand bg-white/80 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-flux-sand/50 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-flux-charcoal">
            <Zap className="h-5 w-5 text-flux-accent" />
          </div>
          <span className="text-lg font-semibold text-flux-charcoal tracking-tight">FluxCore</span>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5 text-flux-charcoal/60" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-flux-warm text-flux-charcoal shadow-sm'
                    : 'text-flux-charcoal/60 hover:bg-flux-warm/50 hover:text-flux-charcoal'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
                {isActive && <ChevronRight className="ml-auto h-4 w-4 text-flux-accent" />}
              </NavLink>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="border-t border-flux-sand/50 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-flux-warm/50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-flux-earth/20 text-flux-charcoal">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-flux-charcoal">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-flux-charcoal/50">{roleLabel}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="rounded-lg p-2 text-flux-charcoal/40 hover:bg-red-50 hover:text-red-500 transition-colors"
              title={t('common.signOut')}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-flux-sand/50 bg-white/60 backdrop-blur-xl px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6 text-flux-charcoal/60" />
            </button>
            <h1 className="text-lg font-semibold text-flux-charcoal hidden sm:block">
              {filteredNav.find((n) => location.pathname.startsWith(n.to))?.label || 'FluxCore'}
            </h1>
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative rounded-xl p-2.5 text-flux-charcoal/60 hover:bg-flux-warm/50 hover:text-flux-charcoal transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-40 w-80 rounded-2xl border border-flux-sand bg-white shadow-xl animate-fade-in">
                  <div className="flex items-center justify-between border-b border-flux-sand/50 px-4 py-3">
                    <h3 className="text-sm font-semibold text-flux-charcoal">{t('notifications.title')}</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-xs text-flux-accent hover:underline">
                        {t('notifications.markAllRead')}
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto scrollbar-thin">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-sm text-flux-charcoal/40">{t('notifications.noNotifications')}</div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={cn(
                            'w-full px-4 py-3 text-left transition-colors hover:bg-flux-warm/30 border-b border-flux-sand/20',
                            !n.read && 'bg-flux-warm/20'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'mt-0.5 h-2 w-2 rounded-full flex-shrink-0',
                                n.type === 'critical' && 'bg-red-500',
                                n.type === 'warning' && 'bg-amber-500',
                                n.type === 'info' && 'bg-blue-500'
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-flux-charcoal truncate">{n.title}</p>
                              <p className="text-xs text-flux-charcoal/50 truncate">{n.body}</p>
                              <p className="mt-0.5 text-[10px] text-flux-charcoal/30">{timeAgo(n.created_at)}</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}