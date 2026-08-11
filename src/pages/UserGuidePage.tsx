import logoDs from '../assets/logods.png'

interface UserGuidePageProps {
  onNavigate: (path: string) => void
}

export function UserGuidePage({ onNavigate }: UserGuidePageProps) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-sky-500 selection:text-white">
      
      {/* Header */}
      <header className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1 shadow-md">
            <img src={logoDs} alt="DS REVIS" className="h-full w-full object-contain rounded-lg" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">DS REVIS</span>
          </div>
        </div>

        <button 
          onClick={() => onNavigate('/')} 
          className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition cursor-pointer"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
          Retour à l'accueil
        </button>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 py-16 space-y-12">
        <div className="space-y-4 text-center">
          <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">Aide & Tutoriel</span>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl tracking-tight">
            Guide d'Usage de l'Application
          </h1>
          <p className="text-sm text-slate-400">
            Découvrez le fonctionnement de DS REVIS et optimisez vos révisions.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-8 md:p-10 space-y-8 leading-relaxed text-slate-300">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 text-sm font-bold">1</span>
              Accès aux fiches de cours
            </h2>
            <p>
              L'application mobile filtre automatiquement les fiches de cours disponibles en fonction de la **filière** (ex: *IDE*, *Sage-Femme*, *Auxiliaire de Santé*) et de la **classe / année** que vous avez sélectionnée lors de votre inscription.
            </p>
            <p>
              Chaque cours propose une fiche explicative synthétique à lire en local, ainsi qu'un accès rapide à des documents complémentaires sécurisés.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 text-sm font-bold">2</span>
              Entraînements par Sujets (Quiz)
            </h2>
            <p>
              Pour chaque cours, les questions de quiz sont regroupées par **Sujets** (de 1 à 10) décrivant des thématiques spécifiques (ex: *Pédiatrie-Nouveau née*).
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Sélectionnez un cours pour afficher l'ensemble des sujets associés.</li>
              <li>Chaque sujet affiche son titre personnalisé et le nombre de questions qu'il contient.</li>
              <li>Cliquez sur un sujet pour démarrer le quiz. Les questions s'enchaînent avec un minuteur (45 secondes par question).</li>
              <li>Une fois le quiz terminé, accédez à vos statistiques de réussite et aux explications détaillées de chaque question.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 text-sm font-bold">3</span>
              Fonctionnement Hors-Ligne & Synchronisation
            </h2>
            <p>
              DS REVIS intègre une base de données locale **SQLite** permettant de réviser même en pleine campagne ou en l'absence de réseau internet.
            </p>
            <div className="rounded-2xl bg-slate-900 p-5 border border-slate-800 space-y-2">
              <p className="font-semibold text-sky-400 flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                Comment synchroniser vos fiches & quiz :
              </p>
              <p className="text-sm">
                Un voyant de mise à jour s'affiche dans votre espace d'accueil lorsque l'administration publie de nouvelles questions ou cours. 
                Pour synchroniser : connectez-vous à internet, rendez-vous sur le volet **Accueil**, puis **Double-cliquez** sur le bouton **"Synchroniser"** pour télécharger les dernières fiches et quiz sur votre mémoire locale.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 text-sm font-bold">4</span>
              Abonnement Premium (WhatsApp)
            </h2>
            <p>
              Certains cours et sujets avancés sont signalés par un badge **Premium**. Pour débloquer ces fiches :
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Cliquez sur le cadenas ou le bouton d'activation de votre profil.</li>
              <li>L'application va générer une demande WhatsApp pré-remplie contenant votre adresse e-mail de connexion.</li>
              <li>Envoyez le message aux administrateurs. Une fois l'abonnement validé, votre accès sera activé à chaud lors de la prochaine synchronisation !</li>
            </ul>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 text-slate-400 text-sm text-center">
        <p>© {new Date().getFullYear()} DS REVIS. Tous droits réservés.</p>
      </footer>

    </div>
  )
}
