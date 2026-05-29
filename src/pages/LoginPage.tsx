import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, Eye, EyeOff, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success(t('auth.welcomeBack'));
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('auth.loginFailed');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-flux-cream px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-flux-charcoal shadow-lg">
            <Zap className="h-8 w-8 text-flux-accent" />
          </div>
          <h1 className="text-2xl font-bold text-flux-charcoal tracking-tight">{t('app.name')}</h1>
          <p className="mt-1 text-sm text-flux-charcoal/40">{t('app.tagline')}</p>
        </div>

        <div className="rounded-2xl border border-flux-sand bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-flux-charcoal">{t('auth.signIn')}</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-flux-charcoal/70 mb-1.5">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl border border-flux-sand bg-flux-cream/50 px-4 py-2.5 text-sm text-flux-charcoal placeholder:text-flux-charcoal/30 focus:border-flux-accent focus:outline-none focus:ring-2 focus:ring-flux-accent/20 transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-flux-charcoal/70 mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-flux-sand bg-flux-cream/50 px-4 py-2.5 pr-10 text-sm text-flux-charcoal placeholder:text-flux-charcoal/30 focus:border-flux-accent focus:outline-none focus:ring-2 focus:ring-flux-accent/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-flux-charcoal/30 hover:text-flux-charcoal/60"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-flux-charcoal py-2.5 text-sm font-semibold text-white hover:bg-flux-charcoal/90 disabled:opacity-50 transition-all"
            >
              <LogIn className="h-4 w-4" />
              {loading ? t('auth.signingIn') : t('auth.signInBtn')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-flux-charcoal/40">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="font-medium text-flux-accent hover:underline">
              {t('auth.createOne')}
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-flux-charcoal/25">{t('auth.demoHint')}</p>
      </div>
    </div>
  );
}