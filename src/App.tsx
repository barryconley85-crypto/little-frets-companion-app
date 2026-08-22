import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import AuthScreen from './components/AuthScreen';
import AppShell from './components/AppShell';
import TeacherDashboard from './views/TeacherDashboard';
import StudentDashboard from './views/StudentDashboard';

export default function App() {
  const { session, profile, loading } = useAuth();
  const [view, setView] = useState('home');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <div className="text-ink-400 animate-pulse">Loading…</div>
      </div>
    );
  }

  if (!session || !profile) {
    return <AuthScreen />;
  }

  if (profile.role === 'teacher') {
    const nav = [
      { id: 'students', label: 'Studio', icon: <UsersIcon /> },
    ];
    const active = nav.some((n) => n.id === view) ? view : 'students';
    return (
      <AppShell active={active} onNavigate={setView} nav={nav}>
        <TeacherDashboard />
      </AppShell>
    );
  }

  const nav = [
    { id: 'task', label: 'Next move', icon: <HomeIcon /> },
    { id: 'library', label: 'Passport', icon: <LibraryIcon /> },
  ];
  const active = nav.some((n) => n.id === view) ? view : 'task';
  return (
    <AppShell active={active} onNavigate={setView} nav={nav}>
      <StudentDashboard view={active} onNavigate={setView} />
    </AppShell>
  );
}

const UsersIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const HomeIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
const LibraryIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 6 4 18 2 14l2-2L16 6z" /><path d="m22 6-6 6" /><path d="m16 18 6-6-6-6" /></svg>;
