import { useState, useEffect } from 'react'
import { 
  getQuizQuestionsFromFirestore, 
  addQuizQuestion, 
  updateQuizQuestion, 
  deleteQuizQuestion,
  getCoursesFromFirestore,
  type FirestoreQuizQuestion,
  type FirestoreCourseItem
} from '../../services/firebaseService'

// Structure d'un bloc de question individuel dans le formulaire de création
interface QuestionBlock {
  prompt: string
  type: 'QCM' | 'QCD'
  options: string[]
  correctAnswer: string
  explanation: string
}

export function QuizPanel() {
  // Liste des états pour les données Firestore
  const [quizzes, setQuizzes] = useState<FirestoreQuizQuestion[]>([])
  const [courses, setCourses] = useState<FirestoreCourseItem[]>([])
  
  // États de chargement, d'affichage et de filtrage
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Modèle pour générer une structure de question vide
  const createEmptyQuestionBlock = (type: 'QCM' | 'QCD' = 'QCM'): QuestionBlock => ({
    prompt: '',
    type,
    options: type === 'QCD' ? ['Vrai', 'Faux'] : ['', '', '', ''],
    correctAnswer: type === 'QCD' ? 'Vrai' : '',
    explanation: ''
  })

  // États du formulaire de création groupée
  const [selectedCourseTitle, setSelectedCourseTitle] = useState('')
  const [courseFiliereFilter, setCourseFiliereFilter] = useState('all')
  const [courseYearFilter, setCourseYearFilter] = useState('all')
  const [questionBlocks, setQuestionBlocks] = useState<QuestionBlock[]>([createEmptyQuestionBlock()])
  
  const availableFilieres = Array.from(new Set(courses.map((course) => course.filiere).filter(Boolean))).sort()
  const availableYears = Array.from(new Set(courses.map((course) => course.category).filter(Boolean))).sort()
  const filteredCourses = courses.filter((course) => {
    return (
      (courseFiliereFilter === 'all' || course.filiere === courseFiliereFilter) &&
      (courseYearFilter === 'all' || course.category === courseYearFilter)
    )
  })

  useEffect(() => {
    if (filteredCourses.length === 0) {
      setSelectedCourseTitle('')
      return
    }

    if (!filteredCourses.some((course) => course.title === selectedCourseTitle)) {
      setSelectedCourseTitle(filteredCourses[0].title)
    }
  }, [filteredCourses, selectedCourseTitle])

  // États de gestion des fenêtres modales (Modification unique / Suppression)
  const [modalState, setModalState] = useState<{ type: 'edit' | 'delete'; item: FirestoreQuizQuestion | null }>({ 
    type: 'edit', 
    item: null 
  })
  const [editDraft, setEditDraft] = useState<FirestoreQuizQuestion | null>(null)

  // Notification flash automatique (3 secondes)
  const triggerFlash = (text: string, type: 'success' | 'error' = 'success') => {
    setFlashMessage({ text, type })
    setTimeout(() => setFlashMessage(null), 3000)
  }

  // Chargement global synchrone depuis Firebase
  const loadAllData = async () => {
    try {
      setLoading(true)
      const [fetchedQuizzes, fetchedCourses] = await Promise.all([
        getQuizQuestionsFromFirestore(),
        getCoursesFromFirestore()
      ])

      setQuizzes(fetchedQuizzes)
      setCourses(fetchedCourses)

      if (fetchedCourses.length > 0) {
        setSelectedCourseTitle(fetchedCourses[0].title)
      }
    } catch (error) {
      console.error("Erreur d'initialisation de la base Quiz :", error)
      triggerFlash("Erreur lors de la récupération des quiz depuis Firebase.", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  // Fonctions de gestion du formulaire dynamique groupé
  const addAnotherQuestionBlock = () => {
    setQuestionBlocks((prev) => [...prev, createEmptyQuestionBlock()])
  };

  const removeQuestionBlock = (index: number) => {
    if (questionBlocks.length === 1) {
      triggerFlash("Vous devez conserver au moins une question.", "error")
      return
    }
    setQuestionBlocks((prev) => prev.filter((_, i) => i !== index))
  };

  const updateQuestionBlockField = (index: number, field: keyof QuestionBlock, value: any) => {
    setQuestionBlocks((prev) => prev.map((block, i) => {
      if (i !== index) return block
      
      if (field === 'type') {
        const nextType = value as 'QCM' | 'QCD'
        return {
          ...block,
          type: nextType,
          options: nextType === 'QCD' ? ['Vrai', 'Faux'] : ['', '', '', ''],
          correctAnswer: nextType === 'QCD' ? 'Vrai' : ''
        }
      }
      return { ...block, [field]: value }
    }))
  };

  const updateQuestionBlockOption = (blockIndex: number, optionIndex: number, value: string) => {
    setQuestionBlocks((prev) => prev.map((block, i) => {
      if (i !== blockIndex) return block
      const nextOptions = [...block.options]
      nextOptions[optionIndex] = value
      return { ...block, options: nextOptions }
    }))
  };

  // Envoi Groupé vers Firestore (Create batch simulation)
  const handleCreateGroupedQuizzes = async () => {
    if (!selectedCourseTitle) {
      triggerFlash("Veuillez associer un cours valide.", "error")
      return
    }

    // Validation de sécurité sur chaque bloc de question
    for (let i = 0; i < questionBlocks.length; i++) {
      const q = questionBlocks[i]
      if (!q.prompt.trim() || !q.correctAnswer.trim()) {
        triggerFlash(`Veuillez remplir l'énoncé et la réponse attendue pour la question N°${i + 1}.`, "error")
        return
      }
    }

    try {
      // Transformation et envoi simultané de toutes les questions insérées
      const insertPromises = questionBlocks.map((q) => {
        const payload = {
          courseTitle: selectedCourseTitle,
          prompt: q.prompt.trim(),
          type: q.type,
          options: q.options.map(opt => opt.trim()).filter(Boolean),
          correctAnswer: q.correctAnswer.trim(),
          explanation: q.explanation.trim()
        }
        return addQuizQuestion(payload)
      })

      await Promise.all(insertPromises)
      triggerFlash(`${questionBlocks.length} question(s) ajoutée(s) avec succès au cours !`)
      
      // Réinitialisation complète
      setQuestionBlocks([createEmptyQuestionBlock()])
      setShowForm(false)
      await loadAllData()
    } catch (error) {
      console.error("Erreur lors du dépôt des quiz groupés :", error)
      triggerFlash("Impossible d'enregistrer la série de questions.", "error")
    }
  };

  // Fonctions d'édition uniques classiques
  const openEdit = (quiz: FirestoreQuizQuestion) => {
    setEditDraft({ ...quiz })
    setModalState({ type: 'edit', item: quiz })
  }

  const openDelete = (quiz: FirestoreQuizQuestion) => {
    setModalState({ type: 'delete', item: quiz })
  }

  const closeModal = () => {
    setModalState({ type: 'edit', item: null })
    setEditDraft(null)
  }

  const handleSaveEdit = async () => {
    if (!editDraft || !modalState.item) return
    try {
      const updates = {
        courseTitle: editDraft.courseTitle,
        prompt: editDraft.prompt.trim(),
        type: editDraft.type,
        options: editDraft.options.map(opt => opt.trim()).filter(Boolean),
        correctAnswer: editDraft.correctAnswer.trim(),
        explanation: editDraft.explanation.trim()
      }
      await updateQuizQuestion(modalState.item.id, updates)
      triggerFlash("Le quiz a été modifié avec succès.")
      closeModal()
      await loadAllData()
    } catch (error) {
      console.error(error)
      triggerFlash("Erreur lors de la modification.", "error")
    }
  }

  const handleDeleteQuiz = async () => {
    if (!modalState.item) return
    try {
      await deleteQuizQuestion(modalState.item.id)
      triggerFlash("La question de quiz a été supprimée.")
      closeModal()
      await loadAllData()
    } catch (error) {
      console.error(error)
      triggerFlash("Erreur lors de la suppression.", "error")
    }
  }

  const filteredQuizzes = quizzes.filter((quiz) => {
    const search = searchTerm.toLowerCase()
    return (
      quiz.prompt.toLowerCase().includes(search) ||
      quiz.courseTitle.toLowerCase().includes(search) ||
      quiz.type.toLowerCase().includes(search)
    )
  })

  return (
    <div className="space-y-6">
      {/* Alertes Flash */}
      {flashMessage && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-semibold text-white shadow-2xl transition-all duration-300 ${
          flashMessage.type === 'success' ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-rose-600 shadow-rose-600/20'
        }`}>
          {flashMessage.type === 'success' ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
          )}
          {flashMessage.text}
        </div>
      )}

      {/* Barre d'action supérieure */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-500">Gestion</p>
          <h2 className="text-2xl font-semibold text-slate-900">Quiz</h2>
        </div>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full md:w-auto">
          <div className="relative flex-1 sm:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" /></svg>
            </span>
            <input
              type="text"
              placeholder="Filtrer par question, cours, type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center justify-center rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 hover:bg-amber-400 whitespace-nowrap">
            <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            Nouveau quiz
          </button>
        </div>
      </div>

      {/* Formulaire d'Ajout de Série de Questions */}
      {showForm && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 md:col-span-1">
              <label className="mb-2 block text-sm font-semibold text-slate-800">Filière</label>
              <select value={courseFiliereFilter} onChange={(e) => setCourseFiliereFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 font-medium">
                <option value="all">Toutes les filières</option>
                {availableFilieres.map((filiere) => (
                  <option key={filiere} value={filiere}>{filiere}</option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 md:col-span-1">
              <label className="mb-2 block text-sm font-semibold text-slate-800">Année</label>
              <select value={courseYearFilter} onChange={(e) => setCourseYearFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 font-medium">
                <option value="all">Toutes les années</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 md:col-span-1">
              <label className="mb-2 block text-sm font-semibold text-slate-800">Cours associé à cette série de questions</label>
              <select value={selectedCourseTitle} onChange={(e) => setSelectedCourseTitle(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 font-medium">
                {filteredCourses.length === 0 ? (
                  <option value="">Aucun cours disponible</option>
                ) : (
                  filteredCourses.map((course) => (
                    <option key={course.id} value={course.title}>{course.title}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Liste dynamique des blocs de questions */}
          <div className="space-y-6">
            {questionBlocks.map((block, qIndex) => (
              <div key={qIndex} className="relative rounded-2xl border-2 border-dashed border-slate-200 p-5 space-y-4 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-sm font-bold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                    Question N°{qIndex + 1}
                  </span>
                  {questionBlocks.length > 1 && (
                    <button type="button" onClick={() => removeQuestionBlock(qIndex)} className="text-xs font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1 transition">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                      Retirer cette question
                    </button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Énoncé de la question</label>
                    <textarea value={block.prompt} onChange={(e) => updateQuestionBlockField(qIndex, 'prompt', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-amber-400 text-sm" rows={2} placeholder="Saisissez la question..." />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Type</label>
                    <select value={block.type} onChange={(e) => updateQuestionBlockField(qIndex, 'type', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-amber-400 text-sm">
                      <option value="QCM">QCM (Choix Multiples)</option>
                      <option value="QCD">QCD (Vrai / Faux)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Réponse attendue (exacte)</label>
                    <input value={block.correctAnswer} onChange={(e) => updateQuestionBlockField(qIndex, 'correctAnswer', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-amber-400 text-sm" placeholder="Ex: Vrai, ou intitulé de la bonne proposition" />
                  </div>

                  {block.options.map((option, optIndex) => (
                    <div key={optIndex} className="md:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-slate-500">Option alternative {optIndex + 1}</label>
                      <input value={option} disabled={block.type === 'QCD'} onChange={(e) => updateQuestionBlockOption(qIndex, optIndex, e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-amber-400 disabled:bg-slate-100 disabled:cursor-not-allowed" placeholder={`Option alternative ${optIndex + 1}`} />
                    </div>
                  ))}

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">Explication pédagogique</label>
                    <textarea value={block.explanation} onChange={(e) => updateQuestionBlockField(qIndex, 'explanation', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-amber-400" rows={2} placeholder="Explication de la réponse..." />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Boutons d'action du bas du formulaire */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={addAnotherQuestionBlock} className="inline-flex items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition w-full sm:w-auto">
              <svg viewBox="0 0 24 24" className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              ➕ Ajouter une autre question pour ce cours
            </button>
            <div className="flex gap-3 w-full sm:w-auto justify-end">
              <button onClick={() => { setShowForm(false); setQuestionBlocks([createEmptyQuestionBlock()]) }} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 w-full sm:w-auto">Annuler</button>
              <button onClick={handleCreateGroupedQuizzes} className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-amber-400 w-full sm:w-auto">Enregistrer la série ({questionBlocks.length})</button>
            </div>
          </div>
        </div>
      )}

      {/* Grid Liste des Quiz existants */}
      {loading ? (
        <div className="text-center py-10 text-slate-500 font-medium">Chargement des modules de Quiz...</div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="text-center py-10 text-slate-500 font-medium">
          {searchTerm ? "Aucun quiz ne correspond aux critères saisis." : "Aucun questionnaire configuré pour le moment."}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {filteredQuizzes.map((quiz) => (
            <div key={quiz.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{quiz.type}</span>
                  <span className="text-xs font-medium text-slate-400">{quiz.options.length} propositions</span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900 line-clamp-3">{quiz.prompt}</h3>
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <p><span className="font-medium text-slate-700">Cours :</span> {quiz.courseTitle}</p>
                  <p><span className="font-medium text-slate-700">Réponse :</span> <span className="text-emerald-600 font-semibold">{quiz.correctAnswer}</span></p>
                  {quiz.explanation && <p className="italic text-slate-400 line-clamp-2 mt-1">"{quiz.explanation}"</p>}
                </div>
              </div>
              
              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button onClick={() => openEdit(quiz)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:border-amber-300 hover:text-amber-600" aria-label="Modifier le quiz">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5Z"/></svg>
                </button>
                <button onClick={() => openDelete(quiz)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:border-rose-300 hover:text-rose-600" aria-label="Supprimer le quiz">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal unique d'Édition / Révocation Individuelle */}
      {modalState.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 overflow-y-auto" onClick={closeModal}>
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {modalState.type === 'delete' ? (
              <>
                <h3 className="text-xl font-semibold text-slate-900">Supprimer le quiz</h3>
                <p className="mt-3 text-sm text-slate-500">Confirmez-vous la suppression définitive de cette question ? Les scores et statistiques liés des étudiants seront affectés.</p>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={closeModal} className="rounded-2xl border border-slate-200 px-4 py-2 font-semibold text-slate-600">Annuler</button>
                  <button onClick={handleDeleteQuiz} className="rounded-2xl bg-rose-600 px-4 py-2 font-semibold text-white">Supprimer le quiz</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-slate-900">Modifier le quiz</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Cours associé</label>
                    <select value={editDraft?.courseTitle ?? ''} onChange={(e) => setEditDraft((prev) => prev ? { ...prev, courseTitle: e.target.value } : prev)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none">
                      {courses.map((course) => <option key={course.id} value={course.title}>{course.title}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Question</label>
                    <textarea value={editDraft?.prompt ?? ''} onChange={(e) => setEditDraft((prev) => prev ? { ...prev, prompt: e.target.value } : prev)} rows={3} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Type</label>
                    <select value={editDraft?.type ?? 'QCM'} onChange={(e) => {
                      const nextType = e.target.value as 'QCM' | 'QCD'
                      setEditDraft((prev) => prev ? { ...prev, type: nextType, options: nextType === 'QCD' ? ['Vrai', 'Faux'] : ['', '', '', ''], correctAnswer: nextType === 'QCD' ? 'Vrai' : '' } : prev)
                    }} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none">
                      <option value="QCM">QCM</option>
                      <option value="QCD">QCD</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Réponse correcte</label>
                    <input value={editDraft?.correctAnswer ?? ''} onChange={(e) => setEditDraft((prev) => prev ? { ...prev, correctAnswer: e.target.value } : prev)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none" />
                  </div>
                  
                  {(editDraft?.options ?? []).map((option, index) => (
                    <div key={`${editDraft?.id ?? 'quiz'}-${index}`} className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-slate-700">Option {index + 1}</label>
                      <input value={option} disabled={editDraft?.type === 'QCD'} onChange={(e) => {
                        const next = [...(editDraft?.options ?? [])]
                        next[index] = e.target.value
                        setEditDraft((prev) => prev ? { ...prev, options: next } : prev)
                      }} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed" />
                    </div>
                  ))}
                  
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">Explication</label>
                    <textarea value={editDraft?.explanation ?? ''} onChange={(e) => setEditDraft((prev) => prev ? { ...prev, explanation: e.target.value } : prev)} rows={3} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none" />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={closeModal} className="rounded-2xl border border-slate-200 px-4 py-2 font-semibold text-slate-600">Annuler</button>
                  <button onClick={handleSaveEdit} className="rounded-2xl bg-amber-500 px-4 py-2 font-semibold text-white">Sauvegarder les modifications</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}