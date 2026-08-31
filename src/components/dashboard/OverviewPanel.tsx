import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { 
  clearPedeagoficalDataOnly, 
  getDashboardStatistics, 
  getYearsFromFirestore,
  getFilieresFromFirestore,
  getCoursesFromFirestore,
  getQuizQuestionsFromFirestore,
  importPedagogicalData,
  type DashboardStats 
} from '../../services/firebaseService'

export function OverviewPanel() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isResetting, setIsResetting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

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
    const files = e.target.files
    if (!files || files.length === 0) return
    const file = files[0]

    const confirmation = window.confirm(
      "ATTENTION : L'importation de ce fichier va PURGER l'ensemble des cours, quiz, classes et filières existants avant d'enregistrer les nouvelles données.\n\nSouhaitez-vous continuer ?"
    )
    if (!confirmation) {
      e.target.value = ''
      return
    }

    try {
      setIsImporting(true)
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })

      // 1. Classes
      const wsYears = wb.Sheets['Classes']
      const years: any[] = wsYears ? XLSX.utils.sheet_to_json(wsYears) : []

      // 2. Filières
      const wsFilieres = wb.Sheets['Filières'] || wb.Sheets['Filieres']
      const filieresRaw: any[] = wsFilieres ? XLSX.utils.sheet_to_json(wsFilieres) : []
      const filieres = filieresRaw.map(f => {
        const yearsStr = String(f.years || '')
        const yearsList = yearsStr.split(',').map((s: string) => s.trim()).filter(Boolean)
        return {
          name: String(f.name || '').trim(),
          years: yearsList
        }
      })

      // 3. Cours
      const wsCourses = wb.Sheets['Cours'] || wb.Sheets['Courses']
      const coursesRaw: any[] = wsCourses ? XLSX.utils.sheet_to_json(wsCourses) : []
      const courses = coursesRaw.map(c => ({
        title: String(c.title || '').trim(),
        category: String(c.category || '').trim(),
        filiere: String(c.filiere || '').trim(),
        summary: String(c.summary || '').trim(),
        driveLink: String(c.driveLink || '').trim(),
        premiumOnly: String(c.premiumOnly).toLowerCase() === 'true'
      }))

      // 4. Quiz
      const wsQuiz = wb.Sheets['Quiz'] || wb.Sheets['QuizQuestions']
      const quizRaw: any[] = wsQuiz ? XLSX.utils.sheet_to_json(wsQuiz) : []
      const quiz = quizRaw.map(q => {
        const type = String(q.type || 'QCM').trim().toUpperCase() === 'QCD' ? 'QCD' as const : 'QCM' as const
        const options = type === 'QCD'
          ? ['Vrai', 'Faux']
          : [q.option1, q.option2, q.option3, q.option4].map(o => String(o || '').trim()).filter(Boolean)
        
        return {
          courseTitle: String(q.courseTitle || '').trim(),
          subjectLevel: String(q.subjectLevel || '').trim(),
          subjectTitle: String(q.subjectTitle || '').trim(),
          prompt: String(q.prompt || '').trim(),
          type,
          options,
          correctAnswer: String(q.correctAnswer || '').trim(),
          explanation: String(q.explanation || '').trim()
        }
      })

      if (years.length === 0 && filieres.length === 0 && courses.length === 0 && quiz.length === 0) {
        alert("Le fichier Excel ne contient aucune donnée valide dans les feuilles requises.")
        return
      }

      await importPedagogicalData(years, filieres, courses, quiz)
      alert("Données importées avec succès !")
      await loadStats()
    } catch (err) {
      console.error(err)
      alert("Une erreur est survenue lors de l'importation. Veuillez vérifier la structure du fichier Excel.")
    } finally {
      setIsImporting(false)
      e.target.value = ''
    }
  }

  const renderVerticalChart = (
    title: string, 
    subtitle: string, 
    dataset: { [key: string]: number }, 
    unitLabel: string, 
    gradientTone: string
  ) => {
    const entries = Object.entries(dataset)
    const maxValue = Math.max(...entries.map(([_, val]) => val), 1)

    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6 w-full">
        <div>
          <p className="text-sm text-slate-500">{subtitle}</p>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400 italic">Aucune donnée disponible.</div>
        ) : (
          <div className="flex items-end justify-between gap-4 h-64 pt-6 px-4 border-b border-slate-200 w-full overflow-x-auto">
            {entries.map(([key, val]) => {
              const heightPercentage = Math.max((val / maxValue) * 100, 8)
              
              return (
                <div key={key} className="flex flex-col items-center flex-1 min-w-[60px] h-full justify-end group space-y-2">
                  <div className="opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-md mb-1 transition-opacity duration-200 shadow-md">
                    {val}
                  </div>

                  <div 
                    className={`w-full max-w-[48px] rounded-t-xl transition-all duration-1000 bg-gradient-to-t ${gradientTone}`}
                    style={{ height: `${heightPercentage}%` }}
                  />

                  <div className="text-xs font-semibold text-slate-600 truncate max-w-full text-center pt-2">
                    {key}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="text-[11px] text-slate-400 font-medium tracking-wide">
          Unité : Nombre total de {unitLabel}
        </div>
      </div>
    )
  }

  const renderDoubleVerticalChart = (
    title: string, 
    subtitle: string, 
    dataset: { [key: string]: { total: number; premium: number } }, 
    unitLabel: string
  ) => {
    const entries = Object.entries(dataset)
    const maxValue = Math.max(...entries.map(([_, data]) => data.total), 1)

    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">{subtitle}</p>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-sky-500" />
              <span className="text-slate-600">Total inscrits</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-amber-500" />
              <span className="text-slate-600">Premium</span>
            </div>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400 italic">Aucune donnée disponible.</div>
        ) : (
          <div className="flex items-end justify-between gap-6 h-64 pt-6 px-4 border-b border-slate-200 w-full overflow-x-auto">
            {entries.map(([key, data]) => {
              const totalHeight = Math.max((data.total / maxValue) * 100, 8)
              const premiumHeight = Math.max((data.premium / maxValue) * 100, 4)
              
              return (
                <div key={key} className="flex flex-col items-center flex-1 min-w-[100px] h-full justify-end group space-y-2">
                  <div className="opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md mb-1 transition-opacity duration-200 shadow-md text-center">
                    {data.total} inscrits / {data.premium} premium
                  </div>

                  <div className="flex items-end gap-1.5 w-full justify-center h-full">
                    <div 
                      className="w-5 rounded-t-md transition-all duration-1000 bg-sky-500"
                      style={{ height: `${totalHeight}%` }}
                    />
                    <div 
                      className="w-5 rounded-t-md transition-all duration-1000 bg-amber-500"
                      style={{ height: `${premiumHeight}%` }}
                    />
                  </div>

                  <div className="text-xs font-semibold text-slate-600 truncate max-w-full text-center pt-2">
                    {key}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="text-[11px] text-slate-400 font-medium tracking-wide">
          Unité : Nombre de {unitLabel}
        </div>
      </div>
    )
  }

  if (loading || !stats) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-500 font-medium">
        Calcul et consolidation des statistiques en cours...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Tableau de bord</p>
          <h2 className="text-2xl font-semibold text-slate-900">Aperçu général</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportExcel}
            disabled={isExporting || isImporting || isResetting}
            className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-60 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            {isExporting ? "Exportation..." : "Exporter les données (Excel)"}
          </button>

          <label
            className={`inline-flex items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-600 transition hover:bg-blue-100 cursor-pointer ${(isExporting || isImporting || isResetting) ? 'opacity-60 pointer-events-none' : ''}`}
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
            className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077H4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
            {isResetting ? "Réinitialisation..." : "Réinitialiser les données"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Utilisateurs globaux', value: stats.totalUsers, subtitle: `${stats.premiumUsers} comptes Premium`, tone: 'from-sky-500 to-cyan-400' },
          { label: 'Classes (Années)', value: stats.totalYears, subtitle: 'Niveaux académiques', tone: 'from-indigo-500 to-violet-400' },
          { label: 'Cours en ligne', value: stats.totalCourses, subtitle: 'Supports de cours réels', tone: 'from-emerald-500 to-teal-400' },
          { label: 'Questions de Quiz', value: stats.totalQuizzes, subtitle: 'Validations actives', tone: 'from-amber-500 to-orange-400' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className={`mb-4 h-2 rounded-full bg-gradient-to-r ${stat.tone}`} />
              <div className="text-sm font-medium text-slate-500">{stat.label}</div>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-4xl font-bold text-slate-900">{stat.value}</span>
              <span className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">{stat.subtitle}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Blocs de diagrammes verticaux autonomes */}
      <div className="grid gap-6 md:grid-cols-2">
        {renderDoubleVerticalChart(
          "Inscriptions par Pays",
          "Répartition géographique",
          stats.usersByCountry,
          "étudiants"
        )}

        {renderDoubleVerticalChart(
          "Inscriptions par Antenne locale / Ville",
          "Répartition par antenne",
          stats.usersByAntenne,
          "étudiants"
        )}

        {renderVerticalChart(
          "Utilisateurs inscrits par Année Académique",
          "Démographie étudiante",
          stats.usersByYear,
          "étudiants",
          "from-sky-500 to-cyan-400"
        )}

        {renderVerticalChart(
          "Utilisateurs inscrits par Filière d'étude",
          "Répartition par spécialité",
          stats.usersByFiliere,
          "étudiants",
          "from-indigo-500 to-violet-400"
        )}

        {renderVerticalChart(
          "Volume de cours par Année Académique",
          "Ressources pédagogiques",
          stats.coursesByYear,
          "supports de cours",
          "from-emerald-500 to-teal-400"
        )}

        {renderVerticalChart(
          "Volume de cours par Filière d'étude",
          "Ressources par spécialité",
          stats.coursesByFiliere,
          "supports de cours",
          "from-amber-500 to-orange-400"
        )}
      </div>
    </div>
  )
}
