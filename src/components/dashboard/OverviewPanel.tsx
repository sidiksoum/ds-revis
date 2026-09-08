import { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { 
  clearPedeagoficalDataOnly, 
  getDashboardStatistics, 
  getYearsFromFirestore,
  getFilieresFromFirestore,
  getCoursesFromFirestore,
  getQuizQuestionsFromFirestore,
  importPedagogicalData,
  type DashboardStats,
} from '../../services/firebaseService'

export function OverviewPanel() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isResetting, setIsResetting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  // Filtre de période pour la courbe d'évolution journalière
  const [timeRange, setTimeRange] = useState<'7' | '14' | '30' | 'all'>('30')
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null)

  async function loadStats() {
    try {
      setLoading(true)
      const data = await getDashboardStatistics()
      setStats(data)
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques :", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleResetPedagogicalData = async () => {
    const confirmation = window.confirm(
      "ATTENTION : Voulez-vous vraiment supprimer TOUS les cours, quiz, classes et filières ?\n\nCette action est irréversible. Les utilisateurs ne seront pas supprimés."
    )
    if (!confirmation) return

    try {
      setIsResetting(true)
      await clearPedeagoficalDataOnly()
      alert("Données pédagogiques réinitialisées avec succès !")
      await loadStats()
    } catch (error) {
      console.error("Erreur lors de la purge :", error)
      alert("Une erreur est survenue lors de la suppression.")
    } finally {
      setIsResetting(false)
    }
  }

  const handleExportExcel = async () => {
    try {
      setIsExporting(true)
      
      const [years, filieres, courses, quizzes] = await Promise.all([
        getYearsFromFirestore(),
        getFilieresFromFirestore(),
        getCoursesFromFirestore(),
        getQuizQuestionsFromFirestore()
      ])

      const wb = XLSX.utils.book_new()

      // 1. Classes
      const yearsData = years.map(y => ({ name: y.name }))
      const wsYears = XLSX.utils.json_to_sheet(yearsData)
      XLSX.utils.book_append_sheet(wb, wsYears, 'Classes')

      // 2. Filières
      const filieresData = filieres.map(f => ({
        name: f.name,
        years: (f.years || []).join(', ')
      }))
      const wsFilieres = XLSX.utils.json_to_sheet(filieresData)
      XLSX.utils.book_append_sheet(wb, wsFilieres, 'Filières')

      // 3. Cours
      const coursesData = courses.map(c => ({
        title: c.title,
        category: c.category,
        filiere: c.filiere,
        summary: c.summary,
        driveLink: c.driveLink,
        premiumOnly: c.premiumOnly
      }))
      const wsCourses = XLSX.utils.json_to_sheet(coursesData)
      XLSX.utils.book_append_sheet(wb, wsCourses, 'Cours')

      // 4. Quiz
      const quizData = quizzes.map(q => ({
        courseTitle: q.courseTitle,
        subjectLevel: q.subjectLevel,
        subjectTitle: q.subjectTitle,
        prompt: q.prompt,
        type: q.type,
        option1: q.options[0] || '',
        option2: q.options[1] || '',
        option3: q.options[2] || '',
        option4: q.options[3] || '',
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      }))
      const wsQuiz = XLSX.utils.json_to_sheet(quizData)
      XLSX.utils.book_append_sheet(wb, wsQuiz, 'Quiz')

      XLSX.writeFile(wb, 'dsrevis_backup.xlsx')
      alert("Données exportées avec succès (dsrevis_backup.xlsx) !")
    } catch (e) {
      console.error(e)
      alert("Erreur lors de l'exportation des données.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const confirmation = window.confirm(
      "Êtes-vous sûr de vouloir importer ce fichier Excel ?\n\nLes données présentes dans le classeur (Classes, Filières, Cours, Quiz) seront fusionnées et enregistrées dans Firestore."
    )
    if (!confirmation) {
      e.target.value = ''
      return
    }

    try {
      setIsImporting(true)
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)

      // 1. Lecture Classes
      const wsYears = wb.Sheets['Classes']
      const rawYears: { name: string }[] = wsYears ? XLSX.utils.sheet_to_json(wsYears) : []
      const years = rawYears.filter(y => y.name && y.name.trim() !== '')

      // 2. Lecture Filières
      const wsFilieres = wb.Sheets['Filières'] || wb.Sheets['Filieres']
      const rawFilieres: { name: string; years?: string }[] = wsFilieres ? XLSX.utils.sheet_to_json(wsFilieres) : []
      const filieres = rawFilieres
        .filter(f => f.name && f.name.trim() !== '')
        .map(f => ({
          name: f.name.trim(),
          years: f.years ? f.years.split(',').map(y => y.trim()).filter(Boolean) : []
        }))

      // 3. Lecture Cours
      const wsCourses = wb.Sheets['Cours']
      const rawCourses: {
        title: string
        category?: string
        filiere?: string
        summary?: string
        driveLink?: string
        premiumOnly?: boolean | string
      }[] = wsCourses ? XLSX.utils.sheet_to_json(wsCourses) : []
      const courses = rawCourses
        .filter(c => c.title && c.title.trim() !== '')
        .map(c => ({
          title: c.title.trim(),
          category: (c.category || 'Licence 1').trim(),
          filiere: (c.filiere || 'Tronc Commun').trim(),
          summary: (c.summary || '').trim(),
          driveLink: (c.driveLink || '').trim(),
          premiumOnly: c.premiumOnly === true || String(c.premiumOnly).toLowerCase() === 'true'
        }))

      // 4. Lecture Quiz
      const wsQuiz = wb.Sheets['Quiz']
      const rawQuiz: {
        courseTitle: string
        subjectLevel?: string
        subjectTitle?: string
        prompt: string
        type?: 'QCM' | 'QCD'
        option1?: string
        option2?: string
        option3?: string
        option4?: string
        correctAnswer: string
        explanation?: string
      }[] = wsQuiz ? XLSX.utils.sheet_to_json(wsQuiz) : []
      const quizzes = rawQuiz
        .filter(q => q.courseTitle && q.prompt && q.correctAnswer)
        .map(q => {
          const opts: string[] = []
          if (q.option1) opts.push(String(q.option1).trim())
          if (q.option2) opts.push(String(q.option2).trim())
          if (q.option3) opts.push(String(q.option3).trim())
          if (q.option4) opts.push(String(q.option4).trim())
          return {
            courseTitle: q.courseTitle.trim(),
            subjectLevel: (q.subjectLevel || 'Licence 1').trim(),
            subjectTitle: (q.subjectTitle || 'Généralités').trim(),
            prompt: q.prompt.trim(),
            type: (q.type === 'QCD' ? 'QCD' : 'QCM') as 'QCM' | 'QCD',
            options: opts,
            correctAnswer: String(q.correctAnswer).trim(),
            explanation: (q.explanation || '').trim()
          }
        })

      await importPedagogicalData(years, filieres, courses, quizzes)
      alert("Données importées avec succès dans Firestore !")
      await loadStats()
    } catch (err) {
      console.error(err)
      alert("Erreur lors de l'importation du fichier Excel.")
    } finally {
      setIsImporting(false)
      e.target.value = ''
    }
  }

  // Filtrage des données de la courbe selon la période
  const filteredDailyStats = useMemo(() => {
    if (!stats?.dailyRegistrations) return []
    const all = stats.dailyRegistrations
    if (timeRange === '7') return all.slice(-7)
    if (timeRange === '14') return all.slice(-14)
    if (timeRange === '30') return all.slice(-30)
    return all
  }, [stats, timeRange])

  // Statistiques calculées pour la courbe
  const dailyCurveMetrics = useMemo(() => {
    if (!filteredDailyStats.length) {
      return { total: 0, premium: 0, peak: 0, avg: 0, peakDate: '-' }
    }
    let total = 0
    let premium = 0
    let peak = 0
    let peakDate = '-'
    filteredDailyStats.forEach((item) => {
      total += item.total
      premium += item.premium
      if (item.total > peak) {
        peak = item.total
        peakDate = item.fullDate
      }
    })
    const avg = Number((total / filteredDailyStats.length).toFixed(1))
    return { total, premium, peak, avg, peakDate }
  }, [filteredDailyStats])

  // Rendu de la courbe d'évolution SVG interactive
  const renderDailyRegistrationCurve = () => {
    const data = filteredDailyStats
    if (!data.length) {
      return (
        <div className="flex h-64 items-center justify-center text-slate-400 text-sm">
          Aucune donnée journalière disponible
        </div>
      )
    }

    const width = 1000
    const height = 300
    const padLeft = 50
    const padRight = 30
    const padTop = 30
    const padBottom = 50

    const plotWidth = width - padLeft - padRight
    const plotHeight = height - padTop - padBottom

    const maxVal = Math.max(...data.map((d) => d.total), 5)

    // Calcul des coordonnées
    const points = data.map((d, i) => {
      const x = padLeft + (i / Math.max(data.length - 1, 1)) * plotWidth
      const y = padTop + plotHeight - (d.total / maxVal) * plotHeight
      return { x, y, data: d, index: i }
    })

    // Construction du chemin Bézier lisse
    let curvePath = ''
    if (points.length === 1) {
      curvePath = `M ${points[0].x} ${points[0].y}`
    } else {
      curvePath = `M ${points[0].x} ${points[0].y}`
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i]
        const p1 = points[i + 1]
        const cpX = (p0.x + p1.x) / 2
        curvePath += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`
      }
    }

    // Chemin d'aire sous la courbe (fermé vers le bas)
    const bottomY = padTop + plotHeight
    const areaPath = `${curvePath} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`

    // Repères horizontaux pour l'axe Y
    const yTicks = [0, Math.ceil(maxVal * 0.25), Math.ceil(maxVal * 0.5), Math.ceil(maxVal * 0.75), maxVal]
    const uniqueYTicks = Array.from(new Set(yTicks)).sort((a, b) => a - b)

    // Repères pour l'axe X (espacés)
    const step = Math.max(1, Math.floor(data.length / 8))

    const activePoint = hoveredPointIndex !== null ? points[hoveredPointIndex] : null

    return (
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        {/* En-tête de la section Courbe */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-white shadow-md shadow-sky-500/20">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Courbe d'Évolution des Inscriptions Journalières</h3>
                <p className="text-xs font-semibold text-slate-500">Dynamique et rythme des nouvelles inscriptions sur la plateforme</p>
              </div>
            </div>
          </div>

          {/* Sélecteur de période */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1.5 self-start lg:self-center">
            {(['7', '14', '30', 'all'] as const).map((r) => {
              const label = r === '7' ? '7 derniers jours' : r === '14' ? '14 jours' : r === '30' ? '30 jours' : 'Tout'
              const isActive = timeRange === r
              return (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-white text-sky-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Indicateurs clés (KPI) de la période */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 my-6">
          <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
            <span className="text-xs font-semibold text-sky-600 uppercase tracking-wider">Inscrits (Période)</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{dailyCurveMetrics.total}</span>
              <span className="text-xs font-bold text-sky-700">étudiants</span>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Comptes Premium</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{dailyCurveMetrics.premium}</span>
              <span className="text-xs font-bold text-amber-700">
                ({dailyCurveMetrics.total > 0 ? Math.round((dailyCurveMetrics.premium / dailyCurveMetrics.total) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Pic Journalier</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{dailyCurveMetrics.peak}</span>
              <span className="text-xs font-bold text-indigo-700">max / jour</span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Moyenne Quotidienne</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{dailyCurveMetrics.avg}</span>
              <span className="text-xs font-bold text-emerald-700">inscrits / j</span>
            </div>
          </div>
        </div>

        {/* Graphique SVG Interactif */}
        <div className="relative w-full overflow-hidden pt-4">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible cursor-crosshair select-none"
            onMouseLeave={() => setHoveredPointIndex(null)}
          >
            <defs>
              <linearGradient id="curveAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.35" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
              </linearGradient>

              <linearGradient id="curveLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="60%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>

              <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0284c7" floodOpacity="0.25" />
              </filter>
            </defs>

            {/* Lignes horizontales de repère Y */}
            {uniqueYTicks.map((val) => {
              const y = padTop + plotHeight - (val / maxVal) * plotHeight
              return (
                <g key={val}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeWidth="1"
                    strokeDasharray={val === 0 ? '0' : '4 4'}
                  />
                  <text
                    x={padLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[11px] font-bold fill-slate-400"
                  >
                    {val}
                  </text>
                </g>
              )
            })}

            {/* Zone ombrée sous la courbe */}
            <path d={areaPath} fill="url(#curveAreaGrad)" />

            {/* Tracé de la courbe principale */}
            <path
              d={curvePath}
              fill="none"
              stroke="url(#curveLineGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glowEffect)"
            />

            {/* Ligne verticale de survol */}
            {activePoint && (
              <g>
                <line
                  x1={activePoint.x}
                  y1={padTop}
                  x2={activePoint.x}
                  y2={bottomY}
                  stroke="#0284c7"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              </g>
            )}

            {/* Points de données et zones de détection */}
            {points.map((p, idx) => {
              const isHovered = hoveredPointIndex === idx
              return (
                <g key={idx}>
                  {/* Point visuel */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 6.5 : (data.length <= 15 ? 4.5 : 3.5)}
                    fill={isHovered ? "#0284c7" : "#ffffff"}
                    stroke="#0284c7"
                    strokeWidth={isHovered ? 3 : 2}
                    className="transition-all duration-150"
                  />
                  {/* Zone cliquable/survolable invisible plus large */}
                  <rect
                    x={p.x - (plotWidth / data.length) / 2}
                    y={padTop}
                    width={plotWidth / data.length}
                    height={plotHeight}
                    fill="transparent"
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                  />
                </g>
              )
            })}

            {/* Étiquettes sur l'axe X */}
            {points.map((p, idx) => {
              const shouldShowLabel = idx % step === 0 || idx === points.length - 1
              if (!shouldShowLabel) return null
              return (
                <text
                  key={idx}
                  x={p.x}
                  y={height - 18}
                  textAnchor="middle"
                  className="text-[11px] font-semibold fill-slate-500"
                >
                  {p.data.date}
                </text>
              )
            })}
          </svg>

          {/* Tooltip flottant au survol */}
          {activePoint && (
            <div
              className="pointer-events-none absolute z-20 rounded-2xl border border-slate-700 bg-slate-900/95 p-3.5 text-white shadow-xl backdrop-blur-md transition-all duration-75 text-xs"
              style={{
                left: `${(activePoint.x / width) * 100}%`,
                top: `${(activePoint.y / height) * 100}%`,
                transform: `translate(-50%, -120%)`
              }}
            >
              <div className="font-bold text-sky-400 mb-1 border-b border-slate-700/60 pb-1">
                📅 {activePoint.data.fullDate}
              </div>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className="text-slate-300">Inscriptions :</span>
                <span className="font-black text-white text-sm">{activePoint.data.total}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-0.5">
                <span className="text-amber-400">Comptes Premium :</span>
                <span className="font-bold text-amber-400">{activePoint.data.premium}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-[11px] font-medium text-slate-400 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-sky-500"></span>
              <span>Courbe des inscriptions journalières</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-amber-500"></span>
              <span>Comptes activés Premium</span>
            </div>
          </div>
          <div>Unité : Nombre d'étudiants par jour</div>
        </div>
      </div>
    )
  }

  // Rendu des diagrammes à barres horizontales / verticales (une section par ligne)
  const renderDoubleVerticalChart = (
    title: string,
    subtitle: string,
    dataMap: { [key: string]: { total: number; premium: number } },
    unitLabel: string,
    badgeLabel: string = 'Répartition'
  ) => {
    const entries = Object.entries(dataMap).sort((a, b) => b[1].total - a[1].total)
    const maxValue = Math.max(...entries.map(([, v]) => v.total), 1)

    return (
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        {/* En-tête de la section */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-600 border border-sky-100">
                {badgeLabel}
              </span>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h3>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p>
          </div>
          <div className="flex items-center gap-5 text-xs font-bold">
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 rounded-md bg-sky-500 shadow-sm shadow-sky-500/30" />
              <span className="text-slate-700">Total Inscrits</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 rounded-md bg-amber-500 shadow-sm shadow-amber-500/30" />
              <span className="text-slate-700">Inscrits Premium</span>
            </div>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-slate-400 text-sm">
            Aucune donnée disponible pour le moment
          </div>
        ) : (
          <div className="w-full overflow-x-auto pb-4">
            <div className="flex items-end gap-6 sm:gap-8 h-80 pt-8 px-4 border-b border-slate-200 min-w-max">
              {entries.map(([key, data]) => {
                const totalHeight = Math.max((data.total / maxValue) * 100, 8)
                const premiumHeight = Math.max((data.premium / maxValue) * 100, 4)

                return (
                  <div key={key} className="flex flex-col items-center flex-1 min-w-[130px] sm:min-w-[160px] h-full justify-end group">
                    {/* Badge d'indication au survol */}
                    <div className="opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl mb-2 transition-all duration-200 shadow-lg text-center whitespace-nowrap">
                      {data.total} {unitLabel} ({data.premium} premium)
                    </div>

                    {/* Barres verticales */}
                    <div className="flex items-end gap-2 w-full justify-center h-full">
                      {/* Barre Total */}
                      <div className="flex flex-col items-center h-full justify-end">
                        <span className="text-[11px] font-bold text-sky-600 mb-1">{data.total}</span>
                        <div
                          className="w-7 sm:w-8 rounded-t-xl transition-all duration-700 bg-gradient-to-t from-sky-600 to-sky-400 shadow-sm group-hover:brightness-110"
                          style={{ height: `${totalHeight}%` }}
                        />
                      </div>

                      {/* Barre Premium */}
                      <div className="flex flex-col items-center h-full justify-end">
                        <span className="text-[11px] font-bold text-amber-600 mb-1">{data.premium}</span>
                        <div
                          className="w-7 sm:w-8 rounded-t-xl transition-all duration-700 bg-gradient-to-t from-amber-600 to-amber-400 shadow-sm group-hover:brightness-110"
                          style={{ height: `${premiumHeight}%` }}
                        />
                      </div>
                    </div>

                    {/* Intitulé complet bien lisible */}
                    <div className="text-xs font-bold text-slate-700 text-center pt-3 max-w-[180px] break-words line-clamp-2">
                      {key}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-slate-400">
          <span>{entries.length} catégories enregistrées</span>
          <span>Unité : Nombre de {unitLabel}</span>
        </div>
      </div>
    )
  }

  // Rendu de diagramme à barre simple (une section par ligne)
  const renderVerticalChart = (
    title: string,
    subtitle: string,
    dataMap: { [key: string]: number },
    unitLabel: string,
    gradientTone: string,
    badgeLabel: string = 'Statistique'
  ) => {
    const entries = Object.entries(dataMap).sort((a, b) => b[1] - a[1])
    const maxValue = Math.max(...entries.map(([, v]) => v), 1)

    return (
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        {/* En-tête */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                {badgeLabel}
              </span>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h3>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-slate-400 text-sm">
            Aucune donnée disponible pour le moment
          </div>
        ) : (
          <div className="w-full overflow-x-auto pb-4">
            <div className="flex items-end gap-6 sm:gap-8 h-72 pt-8 px-4 border-b border-slate-200 min-w-max">
              {entries.map(([key, value]) => {
                const heightPercentage = Math.max((value / maxValue) * 100, 8)

                return (
                  <div key={key} className="flex flex-col items-center flex-1 min-w-[130px] sm:min-w-[160px] h-full justify-end group">
                    <div className="opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl mb-2 transition-all duration-200 shadow-lg text-center whitespace-nowrap">
                      {value} {unitLabel}
                    </div>

                    <div className="flex flex-col items-center h-full justify-end w-full">
                      <span className="text-xs font-black text-slate-700 mb-1.5">{value}</span>
                      <div
                        className={`w-12 sm:w-14 rounded-t-2xl transition-all duration-700 bg-gradient-to-t ${gradientTone} shadow-md group-hover:brightness-110`}
                        style={{ height: `${heightPercentage}%` }}
                      />
                    </div>

                    <div className="text-xs font-bold text-slate-700 text-center pt-3 max-w-[180px] break-words line-clamp-2">
                      {key}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-slate-400">
          <span>{entries.length} catégories répertoriées</span>
          <span>Unité : Nombre de {unitLabel}</span>
        </div>
      </div>
    )
  }

  if (loading || !stats) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-slate-500 font-medium gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
        <span>Calcul et consolidation des statistiques en cours...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* En-tête principal avec boutons d'action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-sky-600">Tableau de bord administrateur</p>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">Aperçu général & Statistiques</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportExcel}
            disabled={isExporting || isImporting || isResetting}
            className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60 cursor-pointer shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            {isExporting ? "Exportation..." : "Exporter les données (Excel)"}
          </button>

          <label
            className={`inline-flex items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 cursor-pointer shadow-sm ${(isExporting || isImporting || isResetting) ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
            {isImporting ? "Importation..." : "Importer les données (Excel)"}
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleImportExcel}
              className="hidden"
              disabled={isExporting || isImporting || isResetting}
            />
          </label>

          <button
            onClick={handleResetPedagogicalData}
            disabled={isExporting || isImporting || isResetting}
            className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077H4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
            {isResetting ? "Réinitialisation..." : "Réinitialiser les cours & quiz"}
          </button>
        </div>
      </div>

      {/* Cartes KPI synthétiques */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Utilisateurs globaux', value: stats.totalUsers, subtitle: `${stats.premiumUsers} comptes Premium`, tone: 'from-sky-500 to-cyan-400' },
          { label: 'Classes & Promotions', value: stats.totalYears, subtitle: 'Niveaux académiques', tone: 'from-indigo-500 to-violet-400' },
          { label: 'Fiches de cours', value: stats.totalCourses, subtitle: 'Supports de révision', tone: 'from-emerald-500 to-teal-400' },
          { label: 'Questions de Quiz', value: stats.totalQuizzes, subtitle: 'QCM & QCD actifs', tone: 'from-amber-500 to-orange-400' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className={`mb-4 h-2 rounded-full bg-gradient-to-r ${stat.tone}`} />
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.label}</div>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-4xl font-black text-slate-900 tracking-tight">{stat.value}</span>
              <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5">{stat.subtitle}</span>
            </div>
          </div>
        ))}
      </div>

      {/* SECTION 1 : Courbe d'évolution journalière (Plein écran / 1 section par ligne) */}
      {renderDailyRegistrationCurve()}

      {/* SECTION 2 : Inscriptions par Pays (1 section par ligne) */}
      {renderDoubleVerticalChart(
        "Inscriptions par Pays",
        "Répartition géographique internationale des étudiants inscrits et abonnés",
        stats.usersByCountry,
        "étudiants",
        "Géographie"
      )}

      {/* SECTION 3 : Inscriptions par Antenne / Ville (1 section par ligne) */}
      {renderDoubleVerticalChart(
        "Inscriptions par Antenne locale / Ville",
        "Répartition géographique par centre de formation et campus",
        stats.usersByAntenne,
        "étudiants",
        "Campus & Villes"
      )}

      {/* SECTION 4 : Utilisateurs par Année Académique (1 section par ligne) */}
      {renderVerticalChart(
        "Utilisateurs inscrits par Année Académique (Classes)",
        "Répartition démographique des effectifs étudiants par promotion",
        stats.usersByYear,
        "étudiants",
        "from-indigo-600 to-violet-400",
        "Promotions"
      )}

      {/* SECTION 5 : Utilisateurs par Filière d'étude (1 section par ligne) */}
      {renderVerticalChart(
        "Utilisateurs inscrits par Filière d'étude",
        "Répartition des étudiants selon leur spécialité médicale",
        stats.usersByFiliere,
        "étudiants",
        "from-sky-600 to-cyan-400",
        "Filières"
      )}

      {/* SECTION 6 : Volume de cours par Année Académique (1 section par ligne) */}
      {renderVerticalChart(
        "Volume de fiches de cours par Année Académique",
        "Disponibilité des ressources pédagogiques par niveau d'études",
        stats.coursesByYear,
        "supports de cours",
        "from-emerald-600 to-teal-400",
        "Ressources Cours"
      )}

      {/* SECTION 7 : Volume de cours par Filière d'étude (1 section par ligne) */}
      {renderVerticalChart(
        "Volume de fiches de cours par Filière d'étude",
        "Couverture pédagogique par domaine de formation",
        stats.coursesByFiliere,
        "supports de cours",
        "from-amber-600 to-orange-400",
        "Ressources Filières"
      )}
    </div>
  )
}
