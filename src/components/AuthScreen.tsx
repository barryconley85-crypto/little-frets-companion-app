import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../lib/types';
import { Music4, Sparkles, GraduationCap, User } from 'lucide-react';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('teacher');
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfirmationSent(null);
    setBusy(true);
    if (mode === 'signin') {
      const { error } = await signIn(email.trim(), password);
      if (error) setError(error);
    } else {
      if (name.trim().length < 1) {
        setError('Please enter your name.');
        setBusy(false);
        return;
      }
      const { error } = await signUp({ email: email.trim(), password, name: name.trim(), role });
      if (error) setError(formatAuthError(error));
      else setConfirmationSent(email.trim());
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left — brand panel */}
      <div className="lg:w-1/2 bg-gradient-to-br from-sage-600 via-sage-700 to-ink-800 text-white p-8 lg:p-12 flex flex-col justify-center relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-sand-300/10 blur-2xl" />
        <div className="absolute bottom-0 -left-16 w-72 h-72 rounded-full bg-sage-400/10 blur-2xl" />
        <div className="relative max-w-md mx-auto lg:mx-0">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Music4 className="w-7 h-7" strokeWidth={2} />
            </div>
            <span className="font-display text-2xl font-semibold tracking-tight">Little Frets</span>
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold leading-tight mb-4">
            Practice together,<br />progress with joy.
          </h1>
          <p className="text-sand-100/90 text-lg leading-relaxed mb-8">
            A calm, friendly companion for guitar lessons — weekly tasks, practice
            recordings, and gentle feedback, all in one place.
          </p>
          <div className="space-y-3 text-sand-100/80">
            <Feature icon={<Sparkles className="w-5 h-5" />} text="Weekly tasks with video from your teacher" />
            <Feature icon={<Music4 className="w-5 h-5" />} text="Record practice and get simple, kind feedback" />
            <Feature icon={<GraduationCap className="w-5 h-5" />} text="Keep a growing library of your progress" />
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="font-display text-2xl font-semibold text-ink-800 mb-1">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-ink-500">
              {mode === 'signin'
                ? 'Sign in to continue your practice journey.'
                : 'Set up your account to get started.'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label" htmlFor="name">Your name</label>
                <input
                  id="name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex or the Carter family"
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={6}
                required
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="label">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  <RoleCard
                    active={role === 'teacher'}
                    onClick={() => setRole('teacher')}
                    icon={<GraduationCap className="w-5 h-5" />}
                    title="Teacher"
                    desc="Assign tasks & review work"
                  />
                  <RoleCard
                    active={role === 'student'}
                    onClick={() => setRole('student')}
                    icon={<User className="w-5 h-5" />}
                    title="Student / Parent"
                    desc="Practice & track progress"
                  />
                </div>
                {role === 'student' && (
                  <p className="text-xs text-ink-400 mt-2 leading-relaxed">
                    After signing up, ask your teacher to add you by email so you're linked to their class.
                  </p>
                )}
              </div>
            )}

            {confirmationSent && (
              <div className="rounded-xl bg-sage-50 border border-sage-200 text-sage-800 text-sm px-4 py-3 leading-relaxed">
                <strong>Check your inbox.</strong> We’ve sent a confirmation link to {confirmationSent}. Open it, then return here to sign in. If you can’t see it, check Spam/Junk before trying again.
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-ink-500 text-sm mt-6">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              className="font-semibold text-sage-700 hover:text-sage-800 underline-offset-2 hover:underline"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setConfirmationSent(null); }}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function formatAuthError(error: string) {
  const normalized = error.toLowerCase();
  if (normalized.includes('rate limit')) return 'We’ve sent too many emails recently. Please wait a few minutes, then try again.';
  if (normalized.includes('email not confirmed')) return 'Please confirm your email first. Check your inbox and Spam/Junk folder for the Little Frets link.';
  return error;
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">{icon}</div>
      <span className="text-sm">{text}</span>
    </div>
  );
}

function RoleCard({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border-2 p-4 transition-all ${
        active ? 'border-sage-500 bg-sage-50 shadow-soft' : 'border-ink-200 bg-white hover:border-sage-300'
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${active ? 'bg-sage-600 text-white' : 'bg-sand-100 text-ink-500'}`}>
        {icon}
      </div>
      <div className="font-semibold text-ink-800 text-sm">{title}</div>
      <div className="text-xs text-ink-500 mt-0.5 leading-snug">{desc}</div>
    </button>
  );
}
