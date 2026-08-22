import { useAuth } from '../context/AuthContext';
import { LogOut, ShieldCheck } from 'lucide-react';

interface ShellProps {
  active: string;
  onNavigate: (view: string) => void;
  nav: { id: string; label: string; icon: React.ReactNode }[];
  children: React.ReactNode;
}

export default function AppShell({ active, onNavigate, nav, children }: ShellProps) {
  const { profile, signOut } = useAuth();
  const isTeacher = profile?.role === 'teacher';
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 bg-sand-50/85 backdrop-blur border-b border-sand-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="https://i.postimg.cc/8CdzFx2V/little-frets-logo.jpg" alt="Little Frets" className="w-9 h-9 rounded-xl object-cover" />
            <div className="leading-tight">
              <div className="font-display font-semibold text-ink-800">Little Frets</div>
              <div className="text-[11px] text-ink-400 -mt-0.5">{profile?.role === 'teacher' ? 'Teaching studio' : 'Your growth loop'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-ink-500 truncate max-w-[12rem]">{profile?.name || profile?.email}</span>
            <button onClick={signOut} className="btn-ghost px-3 py-2" aria-label="Sign out">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Sign out</span>
            </button>
          </div>
        </div>
        {/* Desktop nav tabs */}
        <div className="hidden lg:block max-w-5xl mx-auto px-6 border-t border-sand-100">
          <div className="flex gap-1">
            {nav.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                  active === item.id ? 'border-sage-600 text-sage-700' : 'border-transparent text-ink-500 hover:text-ink-700'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 pb-28 lg:pb-10">
        <section className="mb-5 rounded-xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm text-sage-900" aria-label="Private practice boundary">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0 text-sage-700" aria-hidden="true" />
            <div>
              <p className="font-semibold">{isTeacher ? 'A safeguarded teaching space' : 'Your private practice space'}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-sage-800">{isTeacher ? 'You can set tasks and share lesson materials here. Learner recordings stay private to each learner and are not available for you to review.' : 'Your practice recordings are private to you. They are not sent to your teacher, and Little Frets does not include messages or requests to your teacher.'}</p>
            </div>
          </div>
        </section>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t border-sand-100 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-5xl mx-auto px-2 flex justify-around">
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-1 px-2 sm:px-3 py-2.5 text-[11px] sm:text-xs font-medium transition ${
                active === item.id ? 'text-sage-700' : 'text-ink-400'
              }`}
            >
              <span className={active === item.id ? 'scale-110 transition' : ''}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
