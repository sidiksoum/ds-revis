import { useState, useEffect, useRef } from 'react'
import logoDs from '../assets/logods.png'

interface LandingPageProps {
  onNavigate: (path: string) => void
}

// Composant utilitaire pour animer les éléments au défilement avec choix de direction
function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up'
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right'
}) {
  const [isVisible, setIsVisible] = useState(false)
  const domRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    const current = domRef.current
    if (current) {
      observer.observe(current)
    }

    return () => {
      if (current) observer.unobserve(current)
    }
  }, [])

  const getTranslationClass = () => {
    if (isVisible) return 'opacity-100 translate-x-0 translate-y-0 scale-100'
    switch (direction) {
      case 'left':
        return 'opacity-0 translate-x-16 scale-98' // Entre depuis la droite vers la gauche
      case 'right':
        return 'opacity-0 -translate-x-16 scale-98' // Entre depuis la gauche vers la droite
      case 'down':
        return 'opacity-0 -translate-y-12 scale-98'
      case 'up':
      default:
        return 'opacity-0 translate-y-16 scale-98' // Entre depuis le bas vers le haut
    }
  }

  return (
    <div
      ref={domRef}
      className={`transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) transform ${getTranslationClass()} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  const handleDownloadApk = () => {
    setIsDownloading(true)
    setDownloadSuccess(false)
    setTimeout(() => {
      setIsDownloading(false)
      setDownloadSuccess(true)

      // Déclenchement du téléchargement réel du fichier APK statique
      const link = document.createElement('a')
      link.href = '/dsrevis.apk'
      link.download = 'dsrevis.apk'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-blue-500 selection:text-white overflow-x-hidden relative">

      {/* Styles CSS pour les effets de flottement et micro-animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(0.5deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out forwards;
        }
        .text-gradient {
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* Header / Navigation */}
      <header className="relative z-50 mx-auto max-w-7xl px-6 py-5 flex items-center justify-between border-b border-slate-100 bg-white/90 backdrop-blur-md sticky top-0 transition duration-350">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 p-1 border border-slate-100 shadow-sm transform hover:scale-105 transition duration-300">
            <img src={logoDs} alt="DS REVIS" className="h-full w-full object-contain rounded-lg" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-slate-900">DS REVIS</span>
            <span className="ml-2 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-100">Mobile</span>
          </div>
        </div>

        {/* Liens de navigation pour grands écrans */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition duration-300">Fonctionnalités</a>
          <a href="#filiere" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition duration-300">Filières</a>
          <a href="#download" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition duration-300">Télécharger</a>
          <button
            onClick={() => onNavigate('/politique-confidentialite')}
            className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition duration-300 cursor-pointer bg-transparent border-none p-0"
          >
            Confidentialité
          </button>
        </nav>

        {/* Bouton Hamburger pour mobiles */}
        <button
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          className="flex md:hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition duration-300 cursor-pointer"
          aria-label="Menu de navigation"
        >
          {isMobileNavOpen ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
          )}
        </button>

        {/* Menu déroulant mobile */}
        {isMobileNavOpen && (
          <div className="absolute top-full left-0 right-0 border-b border-slate-100 bg-white/95 backdrop-blur-md px-6 py-4 shadow-xl flex flex-col gap-4 md:hidden z-45 transition-all duration-300 animate-fadeIn">
            <a
              href="#features"
              onClick={() => setIsMobileNavOpen(false)}
              className="text-sm font-bold text-slate-700 hover:text-blue-600 py-2 border-b border-slate-50"
            >
              Fonctionnalités
            </a>
            <a
              href="#filiere"
              onClick={() => setIsMobileNavOpen(false)}
              className="text-sm font-bold text-slate-700 hover:text-blue-600 py-2 border-b border-slate-50"
            >
              Filières
            </a>
            <a
              href="#download"
              onClick={() => setIsMobileNavOpen(false)}
              className="text-sm font-bold text-slate-700 hover:text-blue-600 py-2 border-b border-slate-50"
            >
              Télécharger
            </a>
            <button
              onClick={() => {
                setIsMobileNavOpen(false)
                onNavigate('/politique-confidentialite')
              }}
              className="text-sm font-bold text-left text-slate-700 hover:text-blue-600 py-2 cursor-pointer bg-transparent border-none p-0"
            >
              Politique de Confidentialité
            </button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-20 lg:pt-24 lg:pb-28 grid gap-12 lg:grid-cols-12 items-center">

        {/* Texte du Hero - Glisse depuis la gauche */}
        <ScrollReveal direction="right" className="space-y-8 lg:col-span-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50/80 px-4 py-1.5 text-xs font-bold text-blue-600 border border-blue-100/50 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Connecté en temps réel aux données académiques
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-tight">
            Vos révisions médicales dans la poche avec <span className="text-gradient font-black">DS REVIS</span>
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed">
            Spécialement développée pour accompagner les étudiants en santé (INFAS, IDE, SF, AS), l'application regroupe vos fiches de cours, vos évaluations corrigées (QCM & QCD) et suit votre progression académique, même sans connexion Internet.
          </p>

          {/* Boutons d'Action (Vert dominant pour le bouton principal) */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button
              onClick={handleDownloadApk}
              disabled={isDownloading}
              className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-green-600 hover:bg-green-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-green-600/10 hover:shadow-green-600/20 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Génération de l'APK...
                </>
              ) : downloadSuccess ? (
                <>
                  <svg viewBox="0 0 24 24" className="h-5.5 w-5.5 text-white animate-bounce" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  Fichier APK Prêt !
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-5.5 w-5.5 transition-transform group-hover:translate-y-0.5 duration-300" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  Installer la version stable (APK)
                </>
              )}
            </button>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-8 py-4 text-base font-bold text-slate-700 transition-all duration-300"
            >
              Découvrir les fonctionnalités
            </a>
          </div>

          {/* Statistiques clés */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-100">
            <div>
              <div className="text-2xl font-black text-blue-600">100%</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">Conforme INFAS</div>
            </div>
            <div>
              <div className="text-2xl font-black text-blue-600">1200+</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">Questions de Quiz</div>
            </div>
            <div>
              <div className="text-2xl font-black text-blue-600">Hors-ligne</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">Accès permanent</div>
            </div>
          </div>
        </ScrollReveal>

        {/* Visuel du Hero - Glisse depuis la droite */}
        <ScrollReveal direction="left" className="lg:col-span-6 relative flex items-center justify-center w-full">
          {/* Cadre de l'image de l'étudiant */}
          <div className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border-4 border-white shadow-slate-200/80 bg-slate-100 aspect-[4/3] z-10 hover:scale-101 transition duration-500">
            <img
              src="/hero_medical_students.png"
              alt="Étudiants africains en médecine avec l'application DS REVIS"
              className="w-full h-full object-cover"
            />
            {/* Overlay transparent dégradé */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
          </div>

          {/* Téléphone CSS flottant chevauchant l'image */}
          <div className="animate-float absolute -bottom-10 -right-6 lg:-right-8 w-[180px] h-[360px] rounded-[30px] border-[6px] border-slate-800 bg-slate-950 shadow-2xl overflow-hidden flex flex-col z-20 ring-1 ring-white/10 hidden sm:flex">
            <div className="h-6 pt-2 px-4 flex justify-between items-center text-[7px] font-bold text-slate-400 select-none z-30 shrink-0">
              <span>09:41</span>
              <span className="w-2.5 h-1.5 bg-slate-400 rounded-xs inline-block" />
            </div>
            <div className="flex-1 p-2.5 bg-slate-900 text-slate-100 overflow-hidden flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[7px] font-bold text-sky-400">Pharmacologie</span>
                  <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[6px] font-bold text-green-400">L2</span>
                </div>
                <div className="rounded-lg bg-slate-800 p-2 border border-slate-700/30">
                  <p className="text-[8px] font-bold text-white leading-tight">Quel muscle est utilisé pour l'injection IM chez le nourrisson ?</p>
                  <div className="mt-2 space-y-1">
                    <div className="rounded-md border border-slate-700 bg-slate-850 p-1 text-[7px] text-slate-350">A. Grand fessier</div>
                    <div className="rounded-md border border-green-500/30 bg-green-500/10 p-1 text-[7px] text-green-400 flex items-center justify-between">
                      <span>B. Vaste externe</span>
                      <span className="text-[6px]">✔️</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-6 rounded-lg bg-green-600 flex items-center justify-center text-[8px] font-bold text-white shadow-md">
                Quiz Réussi !
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Section Description & Fonctionnalités Clés */}
      <section id="features" className="relative z-10 bg-slate-50/70 py-24 border-y border-slate-100">
        <div className="mx-auto max-w-7xl px-6 grid gap-12 lg:grid-cols-12 items-center">

          {/* Image illustrative gauche - Glisse depuis la gauche */}
          <ScrollReveal direction="right" className="lg:col-span-5 flex justify-center w-full">
            <div className="relative w-full max-w-xl rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-slate-100 aspect-[3/4] hover:scale-101 transition duration-500">
              <img
                src="/student_quiz_features.png"
                alt="Étudiant révisant ses quiz de médecine sur mobile"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent" />
            </div>
          </ScrollReveal>

          {/* Caractéristiques de l'application - Glissent depuis la droite */}
          <ScrollReveal direction="left" className="space-y-8 lg:col-span-7">
            <div className="space-y-3">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Une méthode de révision ciblée</span>
              <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl tracking-tight">
                Étudiez efficacement avec nos outils intégrés
              </h2>
              <p className="text-slate-650 max-w-2xl leading-relaxed">
                Notre plateforme permet de centraliser et d'organiser les apprentissages pour que chaque session de révision soit synonyme de progression.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {[
                {
                  title: "Fiches de Cours",
                  desc: "Accédez à des fiches de cours synthétiques et validées, téléchargeables au format PDF pour une lecture hors-ligne.",
                  icon: (
                    <svg className="h-5.5 w-5.5 text-blue-650" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                  )
                },
                {
                  title: "Quiz QCM & QCD",
                  desc: "Testez vos connaissances en conditions réelles d'examen avec des questionnaires à choix multiples ou choix doubles (Vrai/Faux).",
                  icon: (
                    <svg className="h-5.5 w-5.5 text-blue-650" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                    </svg>
                  )
                },
                {
                  title: "Progression Analytique",
                  desc: "Visualisez en direct vos taux de réussite par matière et suivez votre assiduité pour combler vos lacunes.",
                  icon: (
                    <svg className="h-5.5 w-5.5 text-blue-650" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                  )
                },
                {
                  title: "Sauvegarde & Synchronisation",
                  desc: "Grâce à notre intégration Firebase, vos scores sont sauvegardés et synchronisés automatiquement dès que vous retrouvez du réseau.",
                  icon: (
                    <svg className="h-5.5 w-5.5 text-blue-650" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 11 2 2 4-4" />
                    </svg>
                  )
                }
              ].map((feat, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-5 flex items-start gap-4 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-100/50 transition duration-300">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 shrink-0">
                    {feat.icon}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900">{feat.title}</h3>
                    <p className="text-xs text-slate-550 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Section Filières - Glissent vers le haut */}
      <section id="filiere" className="relative z-10 py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6 space-y-16">

          <ScrollReveal direction="up" className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Des parcours d'études spécialisés</span>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl tracking-tight">
              Un contenu sur-mesure pour chaque filière médicale
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Les cours et les quiz de la plateforme sont conçus par des formateurs académiques afin de correspondre fidèlement aux programmes officiels de chaque spécialité d'études.
            </p>
          </ScrollReveal>

          {/* Grille des spécialités avec mockups mobiles réalistes */}
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                label: "IDE (Infirmier Diplômé d'État)",
                desc: "Sciences infirmières, pharmacologie, calcul de doses, déontologie et éthique clinique.",
                img: "/filiere_ide_mockup.png",
                badgeColor: "bg-blue-50 text-blue-600 border-blue-100",
                delay: 0
              },
              {
                label: "SF (Sage-Femme)",
                desc: "Soins obstétricaux, gynécologie, consultations prénatales, planification familiale et PMI.",
                img: "/filiere_sf_mockup.png",
                badgeColor: "bg-indigo-50 text-indigo-600 border-indigo-100",
                delay: 100
              },
              {
                label: "AS (Auxiliaire de Santé)",
                desc: "Soins d'hygiène et de confort de base, accueil et installation des patients, suivi de PMI.",
                img: "/filiere_as_mockup.png",
                badgeColor: "bg-emerald-50 text-emerald-600 border-emerald-100",
                delay: 200
              }
            ].map((fil, idx) => (
              <ScrollReveal
                key={idx}
                delay={fil.delay}
                direction="up"
                className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black border ${fil.badgeColor}`}>
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900">{fil.label}</h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed min-h-[48px]">{fil.desc}</p>
                </div>

                {/* Mockup Mobile Réaliste */}
                <div className="mt-6 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 aspect-13/10 shadow-inner">
                  <img
                    src={fil.img}
                    alt={`Mockup mobile ${fil.label}`}
                    className="w-full h-full object-cover transform hover:scale-103 transition duration-500"
                  />
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Nouvelle grande section dédiée à la couverture des programmes */}
      <section id="progression" className="relative z-10 py-24 bg-slate-50/70 border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-6 space-y-16">

          <ScrollReveal direction="up" className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Suivi et Fiabilité</span>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl tracking-tight">
              Couverture des Programmes d'Études
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Progression globale du contenu pédagogique révisable et disponible sur l'application mobile en temps réel.
            </p>
          </ScrollReveal>

          {/* Cartes statistiques grand format */}
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                level: "Licence 1 & AS L1",
                percent: 100,
                status: "Disponible",
                statusColor: "bg-green-50 text-green-700 border-green-200",
                barColor: "from-blue-600 to-sky-400",
                statsColor: "text-blue-600",
                details: [
                  "12 modules fondamentaux complets",
                  "450+ questions de quiz interactifs",
                  "Fiches d'anatomie et d'hygiène de base",
                  "Supports PDF 100% disponibles hors-ligne"
                ],
                delay: 0
              },
              {
                level: "Licence 2 & AS L2",
                percent: 100,
                status: "Disponible",
                statusColor: "bg-green-50 text-green-700 border-green-200",
                barColor: "from-blue-600 to-sky-400",
                statsColor: "text-blue-600",
                details: [
                  "15 modules d'enseignement clinique",
                  "500+ questions de QCM & QCD corrigés",
                  "Pharmacologie, pédiatrie et obstétrique",
                  "Cas pratiques et fiches de soins avancés"
                ],
                delay: 100
              },
              {
                level: "Licence 3",
                percent: 85,
                status: "Finalisation",
                statusColor: "bg-amber-50 text-amber-700 border-amber-200",
                barColor: "from-blue-500 to-indigo-400",
                statsColor: "text-indigo-650",
                details: [
                  "8 modules de gestion et de spécialités",
                  "250+ questions de validation théorique",
                  "Management des services et déontologie",
                  "15% restants en cours d'intégration"
                ],
                delay: 200
              }
            ].map((stat, idx) => (
              <ScrollReveal
                key={idx}
                delay={stat.delay}
                direction="up"
                className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-8"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800">{stat.level}</h3>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${stat.statusColor}`}>
                      {stat.status}
                    </span>
                  </div>

                  {/* Grand chiffre de statistiques */}
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-6xl font-black tracking-tight ${stat.statsColor}`}>
                        {stat.percent}
                      </span>
                      <span className={`text-2xl font-bold ${stat.statsColor}`}>%</span>
                    </div>

                    {/* Jauge épaisse animée */}
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`bg-gradient-to-r ${stat.barColor} h-full rounded-full transition-all duration-1000 ease-out`} style={{ width: `${stat.percent}%` }} />
                    </div>
                  </div>

                  {/* Détail du contenu */}
                  <div className="border-t border-slate-50 pt-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Contenu Inclus</h4>
                    <ul className="space-y-3">
                      {stat.details.map((detail, dIdx) => (
                        <li key={dIdx} className="flex items-start gap-2.5 text-xs text-slate-600">
                          <svg className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Section Témoignages - Ce qu'ils disent de notre application */}
      <section id="testimonials" className="relative z-10 py-24 bg-white border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-6 space-y-16">
          <ScrollReveal direction="up" className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Retours d'expérience</span>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl tracking-tight">
              Ce qu'ils disent de notre application
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Découvrez les témoignages d'étudiants en médecine, soins infirmiers et maïeutique qui révisent au quotidien avec DS REVIS.
            </p>
          </ScrollReveal>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                quote: "DS REVIS a complètement changé ma méthode de travail. Les QCM en pharmacologie correspondent exactement aux épreuves de l'INFAS. J'ai obtenu ma Licence 2 sans rattrapage !",
                author: "Koffi Yao Laurent",
                specialty: "IDE (Infirmier) - Licence 2",
                rating: 5,
                delay: 0
              },
              {
                quote: "Le mode hors-ligne est un vrai plus. Je télécharge mes fiches de cours à l'école et je révise chez moi le soir sans avoir besoin de connexion Internet. Les corrections sont très détaillées.",
                author: "Mariama Diallo",
                specialty: "SF (Sage-Femme) - Licence 1",
                rating: 5,
                delay: 100
              },
              {
                quote: "Une application indispensable pour les auxiliaires de santé. Les cas cliniques et les questions de PMI m'aident énormément à valider mes compétences pratiques lors de mes stages.",
                author: "Amadou Touré",
                specialty: "AS (Auxiliaire de Santé) - Licence 2",
                rating: 5,
                delay: 200
              }
            ].map((testi, idx) => (
              <ScrollReveal
                key={idx}
                delay={testi.delay}
                direction="up"
                className="rounded-3xl border border-slate-100 bg-slate-50/40 p-8 shadow-xs hover:shadow-lg hover:border-blue-200 transition-all duration-300 flex flex-col justify-between space-y-6"
              >
                {/* Étoiles d'évaluation */}
                <div className="flex gap-1">
                  {[...Array(testi.rating)].map((_, i) => (
                    <svg key={i} className="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Citation */}
                <p className="text-sm text-slate-600 italic leading-relaxed flex-1">
                  “ {testi.quote} ”
                </p>

                {/* Profil */}
                <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-extrabold text-sm border border-blue-100">
                    {testi.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{testi.author}</h4>
                    <span className="text-[10px] font-semibold text-slate-500">{testi.specialty}</span>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action APK (Couleur verte pour le bouton) */}
      <section id="download" className="relative z-10 bg-slate-50 py-20 border-t border-slate-100">
        <div className="mx-auto max-w-4xl px-6 text-center space-y-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-1.5 shadow-md border border-slate-100">
            <img src={logoDs} alt="Logo" className="h-full w-full object-contain rounded-xl" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            Prêt à accélérer votre réussite ?
          </h2>
          <p className="text-base text-slate-650 max-w-xl mx-auto">
            Rejoignez des centaines d'étudiants en santé et commencez à réviser avec des questionnaires ciblés et des cours à jour.
          </p>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleDownloadApk}
              disabled={isDownloading}
              className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-green-600 hover:bg-green-500 px-10 py-5 text-base font-bold text-white shadow-xl shadow-green-600/10 hover:shadow-green-600/20 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Préparation du package...
                </>
              ) : downloadSuccess ? (
                <>
                  <svg viewBox="0 0 24 24" className="h-5.5 w-5.5 text-white animate-scaleIn" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  Téléchargement de l'APK lancé
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-5.5 w-5.5 transition-transform group-hover:translate-y-0.5 duration-300" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  Installer la version stable (v0.1.0)
                </>
              )}
            </button>
            <p className="text-xs text-slate-500">Téléchargement direct et gratuit. Compatible Android 8.0 et supérieur.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-100 bg-slate-50 py-12 text-slate-500 text-sm">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white p-0.5 border border-slate-200">
              <img src={logoDs} alt="DS REVIS Logo" className="h-full w-full object-contain rounded-md" />
            </div>
            <span className="font-extrabold text-slate-900">DS REVIS</span>
          </div>

          <div className="flex gap-6">
            <button
              onClick={() => onNavigate('/politique-confidentialite')}
              className="hover:text-blue-600 transition duration-300 cursor-pointer bg-transparent border-none p-0 text-slate-500 font-semibold"
            >
              Politique de Confidentialité
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => onNavigate('/guide-usage')}
              className="hover:text-blue-600 transition duration-300 cursor-pointer bg-transparent border-none p-0 text-slate-500 font-semibold"
            >
              Guide d'usage
            </button>
            <span className="text-slate-300">|</span>
            <span>Support: contact@dsrevis.com</span>
          </div>

          <p>© {new Date().getFullYear()} DS REVIS. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  )
}
