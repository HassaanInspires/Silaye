'use client';

import * as React from 'react';
import {
  Scissors,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Store,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  getSession,
} from '@/lib/supabase/client';

export default function LoginPage() {
  const [mode, setMode] = React.useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');
  const [shopName, setShopName] = React.useState<string>('');
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const isConfigured = isSupabaseConfigured();

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    async function checkExistingSession() {
      const session = await getSession();
      if (session) {
        window.location.href = '/dashboard';
      }
    }
    checkExistingSession();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (!isConfigured) {
      // Local / Offline developer bypass
      window.location.href = '/dashboard';
      return;
    }

    setIsLoading(true);
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Please enter email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (!isConfigured) {
      window.location.href = '/dashboard';
      return;
    }

    setIsLoading(true);
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            shop_name: shopName.trim() || 'Silaye Master Workshop',
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        window.location.href = '/dashboard';
      } else if (data.user) {
        setSuccessMsg(
          'Registration successful! Please check your email to confirm your account, or sign in.'
        );
        setIsLoading(false);
        setMode('signin');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ambient-dark text-foreground flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Decorative Ambient Halos */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gold/10 rounded-full blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-10 right-10 w-[300px] h-[300px] bg-primary/5 rounded-full blur-2xl"
        aria-hidden="true"
      />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold shadow-[0_0_25px_rgba(212,175,55,0.2)] mb-2">
            <Scissors className="h-7 w-7" />
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl font-medium tracking-tight text-white">
            Silaye
          </h1>
          <p className="font-urdu-serif text-sm text-gold/90 -mt-1" dir="rtl">
            سلائے ماسٹر — ورکشاپ لاگ ان
          </p>
          <p className="text-xs text-gray-400">
            Bespoke Tailoring & Workshop Management OS
          </p>
        </div>

        {/* Card Container */}
        <div className="premium-glass-card rounded-2xl border border-white/10 p-6 md:p-8 backdrop-blur-2xl shadow-2xl space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0B0C0E]/70 border border-white/5">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-gold text-[#0B0C0E] shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Sign In • لاگ ان
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-gold text-[#0B0C0E] shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Register • نیا اکاؤنٹ
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-300">
                  Workshop / Shop Name <span className="font-urdu-sans text-gray-400">(دکان کا نام)</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Master Fit Tailors Wah"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  leftIcon={<Store className="h-4 w-4 text-gray-400" />}
                  className="h-11 bg-[#0B0C0E]/50"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-300">
                Email Address <span className="font-urdu-sans text-gray-400">(ای میل)</span>
              </label>
              <Input
                type="email"
                placeholder="master@silaye.pk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
                className="h-11 bg-[#0B0C0E]/50"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-gray-300">
                  Password <span className="font-urdu-sans text-gray-400">(پاس ورڈ)</span>
                </label>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4 text-gray-400" />}
                  className="h-11 bg-[#0B0C0E]/50 pr-10"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gold text-[#0B0C0E] hover:bg-gold-hover font-semibold shadow-[0_0_20px_rgba(212,175,55,0.25)] flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : mode === 'signin' ? (
                <>
                  <span>Sign In to Workshop</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Create Workshop Account</span>
                  <Sparkles className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Unconfigured / Offline Mode Hint */}
          {!isConfigured && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center space-y-1.5">
              <div className="flex items-center justify-center gap-1.5 text-xs text-gold font-medium">
                <Zap className="h-3.5 w-3.5" />
                <span>Local Offline / Demo Mode Active</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Supabase credentials not detected in environment. You can explore the app offline with mock data.
              </p>
              <a
                href="/dashboard"
                className="inline-flex items-center gap-1 text-xs text-gold hover:underline font-medium pt-1"
              >
                Enter Offline Dashboard →
              </a>
            </div>
          )}
        </div>

        {/* Security & Multi-Tenant Isolation Badge */}
        <div className="flex items-center justify-center gap-2 text-center text-xs text-gray-500">
          <ShieldCheck className="h-4 w-4 text-emerald-400/80" />
          <span>Zero-Trust RLS & Tenant Isolation Protected</span>
        </div>
      </div>
    </div>
  );
}
