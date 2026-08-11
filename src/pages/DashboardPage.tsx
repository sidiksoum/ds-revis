import { useState, type ReactNode } from 'react'
import { OverviewPanel } from '../components/dashboard/OverviewPanel'
import { UsersPanel } from '../components/dashboard/UsersPanel'
import { ClassesPanel } from '../components/dashboard/ClassesPanel'
import { FilieresPanel } from '../components/dashboard/FilieresPanel'
import { CoursesPanel } from '../components/dashboard/CoursesPanel'
import { QuizPanel } from '../components/dashboard/QuizPanel'
import { SettingsPanel } from '../components/dashboard/SettingsPanel'
import type { MenuKey } from '../types'
import logoDs from '../assets/logods.png'

const iconMap: Record<string, ReactNode> = {
  overview: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5.5v-5h-5v5H4a1 1 0 0 1-1-1z"/></svg>,
  users: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  classes: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 10h18"/></svg>,
  filieres: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>,
  courses: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>,
  quiz: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12h6"/><path d="M9 16h6"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2Z"/><path d="M9 8h.01"/></svg>,
  settings: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
}

interface DashboardPageProps {
  onLogout: () => void
}

export function DashboardPage({ onLogout }: DashboardPageProps) {
  const [activeMenu, setActiveMenu] = useState<MenuKey>('overview')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const menuItems: { key: MenuKey; label: string }[] = [
    { key: 'overview', label: 'Aperçu' },
    { key: 'users', label: 'Utilisateurs' },
    { key: 'classes', label: 'Années' },
    { key: 'filieres', label: 'Filières' },
    { key: 'courses', label: 'Cours' },
    { key: 'quiz', label: 'Quiz' },
    { key: 'settings', label: 'Configuration' },
  ]

  const renderContent = () => {
    switch (activeMenu) {
      case 'users':
        return <UsersPanel />
      case 'classes':
        return <ClassesPanel />
      case 'filieres':
        return <FilieresPanel />
      case 'courses':
        return <CoursesPanel />
      case 'quiz':
        return <QuizPanel />
      case 'settings':
        return <SettingsPanel />
      default:
        return <OverviewPanel />
    }
  }

  return (
    <div className="h-screen w-screen p-4 lg:p-6 overflow-hidden bg-slate-100/50 relative">
      
      {/* Styles injectés pour l'animation du menu tiroir sur mobile */}
      <style>{`
        @keyframes slideRight {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-slideRight {
          animation: slideRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Menu Mobile (Drawer) */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay flou d'arrière-plan */}
          <div 
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Menu Drawer */}
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 px-5 py-6 flex flex-col h-full overflow-hidden shadow-2xl animate-slideRight lg:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1 shadow-md">
                  <img src={logoDs} alt="DS REVIS" className="h-full w-full object-contain rounded-lg" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">DS REVIS</div>
                  <div className="text-xs text-slate-400">Admin Panel</div>
                </div>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <nav className="mt-8 space-y-2 overflow-y-auto pr-1">
              {menuItems.map((item) => {
                const active = activeMenu === item.key
                return (
                  <button 
                    key={item.key} 
                    onClick={() => {
                      setActiveMenu(item.key)
                      setIsMobileMenuOpen(false)
                    }} 
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition cursor-pointer ${
                      active 
                        ? 'bg-white text-slate-900 shadow-lg' 
                        : 'text-slate-305 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className={`h-5 w-5 ${active ? 'text-sky-600' : 'text-slate-450'}`}>{iconMap[item.key]}</span>
                    {item.label}
                  </button>
                )
              })}
            </nav>

            <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">AD</div>
                <div>
                  <div className="text-sm font-semibold text-white">Admin DS</div>
                  <div className="text-xs text-slate-400">Super admin</div>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Conteneur Principal */}
      <div className="mx-auto flex h-full max-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_25px_80px_-50px_rgba(15,23,42,0.6)]">
        
        {/* Barre latérale gauche fixe (bureau uniquement) */}
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-slate-950 px-5 py-6 lg:flex lg:flex-col h-full overflow-hidden">
           <div className="flex items-center gap-3 px-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-1 shadow-md">
                    <img src={logoDs} alt="DS REVIS" className="h-full w-full object-contain rounded-xl" />
                </div>
                <div>
                    <div className="text-sm font-semibold text-white">DS REVIS</div>
                    <div className="text-xs text-slate-400">Admin Panel</div>
                </div>
           </div>

          <nav className="mt-8 space-y-2 overflow-y-auto pr-1">
            {menuItems.map((item) => {
              const active = activeMenu === item.key
              return (
                <button key={item.key} onClick={() => setActiveMenu(item.key)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition cursor-pointer ${active ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                  <span className={`h-5 w-5 ${active ? 'text-sky-600' : 'text-slate-400'}`}>{iconMap[item.key]}</span>
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">AD</div>
              <div>
                <div className="text-sm font-semibold text-white">Admin DS</div>
                <div className="text-xs text-slate-400">Super admin</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Conteneur de droite */}
        <main className="flex-1 flex flex-col h-full bg-slate-50/70 overflow-hidden">
          
          {/* En-tête fixe en haut à droite */}
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 lg:hidden cursor-pointer hover:bg-slate-50 transition"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
                </button>
                <div>
                  <div className="text-sm text-slate-500">Bonjour</div>
                  <h2 className="text-xl font-semibold text-slate-900">Admin DS REVIS</h2>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 6 3 7 3 7H3s3-1 3-7"/><path d="M10 21a2 2 0 0 0 4 0"/></svg></button>
                <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 cursor-pointer transition hover:bg-slate-50">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
                  Déconnexion
                </button>
              </div>
            </div>
          </div>

          {/* Zone interne de défilement dédiée aux composants */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            {renderContent()}
          </div>
        </main>

      </div>
    </div>
  )
}