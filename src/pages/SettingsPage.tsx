import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Globe, Shield, Bell, Users, Save, Languages } from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'general' | 'security' | 'notifications' | 'team';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'zh-Hans', label: '简体中文' },
  { code: 'zh-Hant', label: '繁體中文' },
];

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [tenantName, setTenantName] = useState('FluxCore Demo Org');
  const [tenantSlug, setTenantSlug] = useState('fluxcore-demo');
  const [autoSync, setAutoSync] = useState(true);
  const [anomalyDetection, setAnomalyDetection] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [saved, setSaved] = useState(false);

  const tabs: { key: Tab; icon: React.ElementType }[] = [
    { key: 'general', icon: Globe },
    { key: 'security', icon: Shield },
    { key: 'notifications', icon: Bell },
    { key: 'team', icon: Users },
  ];

  const handleSave = () => {
    toast.success(t('settings.general.savedToast'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    toast.success(t('settings.general.savedToast'));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-flux-charcoal">{t('settings.title')}</h2>
        <p className="text-sm text-flux-charcoal/40">{t('settings.tenant')}: {profile?.tenant_id?.slice(0, 8)}...</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl bg-flux-warm/50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-white text-flux-charcoal shadow-sm'
                : 'text-flux-charcoal/40 hover:text-flux-charcoal/70'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {t(`settings.tabs.${tab.key}`)}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-6 rounded-2xl border border-flux-sand bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-flux-charcoal">
            <Globe className="h-4 w-4 text-flux-earth" /> {t('settings.general.title')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-flux-charcoal/70 mb-1.5">{t('settings.general.orgName')}</label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className="w-full max-w-md rounded-xl border border-flux-sand bg-flux-cream/50 px-4 py-2.5 text-sm text-flux-charcoal focus:border-flux-accent focus:outline-none focus:ring-2 focus:ring-flux-accent/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-flux-charcoal/70 mb-1.5">{t('settings.general.urlSlug')}</label>
              <input
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                className="w-full max-w-md rounded-xl border border-flux-sand bg-flux-cream/50 px-4 py-2.5 text-sm text-flux-charcoal focus:border-flux-accent focus:outline-none focus:ring-2 focus:ring-flux-accent/20 transition-all"
              />
              <p className="mt-1 text-xs text-flux-charcoal/30">fluxcore.app/t/{tenantSlug}</p>
            </div>

            {/* Language Selector */}
            <div>
              <label className="block text-sm font-medium text-flux-charcoal/70 mb-1.5">{t('settings.language')}</label>
              <div className="flex flex-wrap gap-2 max-w-md">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={cn(
                      'rounded-lg border px-4 py-2 text-sm font-medium transition-all',
                      i18n.language === lang.code
                        ? 'border-flux-accent bg-flux-warm text-flux-charcoal shadow-sm'
                        : 'border-flux-sand bg-white text-flux-charcoal/60 hover:border-flux-earth/30 hover:bg-flux-warm/30'
                    )}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-xl bg-flux-charcoal px-4 py-2.5 text-sm font-semibold text-white hover:bg-flux-charcoal/90 transition-colors"
              >
                <Save className="h-4 w-4" /> {t('settings.general.save')}
              </button>
              {saved && <span className="text-sm text-emerald-600">✓ {t('settings.general.saved')}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="space-y-4 rounded-2xl border border-flux-sand bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-flux-charcoal">
            <Shield className="h-4 w-4 text-flux-earth" /> {t('settings.security.title')}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between max-w-md py-2">
              <div>
                <p className="text-sm font-medium text-flux-charcoal">{t('settings.security.mfa')}</p>
                <p className="text-xs text-flux-charcoal/40">{t('settings.security.mfaDesc')}</p>
              </div>
              <div className="h-6 w-11 rounded-full bg-flux-sand cursor-not-allowed opacity-50" />
            </div>
            <div className="flex items-center justify-between max-w-md py-2">
              <div>
                <p className="text-sm font-medium text-flux-charcoal">{t('settings.security.sessionTimeout')}</p>
                <p className="text-xs text-flux-charcoal/40">{t('settings.security.sessionTimeoutDesc')}</p>
              </div>
              <select className="rounded-lg border border-flux-sand bg-flux-cream/50 px-3 py-1.5 text-xs text-flux-charcoal">
                <option>4 hours</option>
                <option>8 hours</option>
                <option>Never</option>
              </select>
            </div>
            <div className="flex items-center justify-between max-w-md py-2">
              <div>
                <p className="text-sm font-medium text-flux-charcoal">{t('settings.security.autoSync')}</p>
                <p className="text-xs text-flux-charcoal/40">{t('settings.security.autoSyncDesc')}</p>
              </div>
              <button
                onClick={() => setAutoSync(!autoSync)}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  autoSync ? 'bg-emerald-500' : 'bg-flux-sand'
                )}
              >
                <div className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  autoSync ? 'left-5' : 'left-0.5'
                )} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings */}
      {activeTab === 'notifications' && (
        <div className="space-y-4 rounded-2xl border border-flux-sand bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-flux-charcoal">
            <Bell className="h-4 w-4 text-flux-earth" /> {t('settings.notifications.title')}
          </h3>
          <div className="space-y-4">
            {[
              { key: 'email', state: notifyEmail, setter: setNotifyEmail },
              { key: 'push', state: notifyPush, setter: setNotifyPush },
              { key: 'inApp', state: notifyInApp, setter: setNotifyInApp },
              { key: 'anomaly', state: anomalyDetection, setter: setAnomalyDetection },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between max-w-md py-2">
                <div>
                  <p className="text-sm font-medium text-flux-charcoal">{t(`settings.notifications.${item.key}`)}</p>
                  <p className="text-xs text-flux-charcoal/40">{t(`settings.notifications.${item.key}Desc`)}</p>
                </div>
                <button
                  onClick={() => item.setter(!item.state)}
                  className={cn(
                    'relative h-6 w-11 rounded-full transition-colors',
                    item.state ? 'bg-emerald-500' : 'bg-flux-sand'
                  )}
                >
                  <div className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                    item.state ? 'left-5' : 'left-0.5'
                  )} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Settings */}
      {activeTab === 'team' && (
        <div className="rounded-2xl border border-flux-sand bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-flux-charcoal mb-4">
            <Users className="h-4 w-4 text-flux-earth" /> {t('settings.team.title')}
          </h3>
          <div className="space-y-2">
            {[
              { name: `Duy ${t('settings.team.you')}`, email: 'admin@fluxcore.app', role: t('roles.super_admin') },
              { name: 'Jane Smith', email: 'jane@fluxcore.app', role: t('roles.manager') },
              { name: 'Bob Worker', email: 'bob@fluxcore.app', role: t('roles.operator') },
            ].map((member, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-flux-cream/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-flux-earth/20 text-xs font-bold text-flux-charcoal">
                    {member.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-flux-charcoal">{member.name}</p>
                    <p className="text-xs text-flux-charcoal/40">{member.email}</p>
                  </div>
                </div>
                <span className="rounded-full bg-flux-warm px-2.5 py-0.5 text-[10px] font-medium text-flux-charcoal/60">
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}