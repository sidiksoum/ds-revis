import { useState, useEffect, useMemo } from 'react'
import { 
  getQuizQuestionsFromFirestore, 
  addQuizQuestion, 
  updateQuizQuestion, 
  deleteQuizQuestion,
  getCoursesFromFirestore,
  type FirestoreQuizQuestion,
  type FirestoreCourseItem
} from '../../services/firebaseService'

interface QuestionBlock {
  prompt: string
  type: 'QCM' | 'QCD'
  options: string[]
  correctAnswer: string
  explanation: string
}

interface QuizSubjectGroup {
  courseTitle: string
  subjectLevel: string
  subjectTitle: string
  questionCount: number
  category: string // Niveau académique
  filiere: string  // Filière d'étude
  questions: FirestoreQuizQuestion[]
}

const subjectLevelOptions = Array.from({ length: 10 }, (_, i) => `Sujet ${i + 1}`)

export function QuizPanel() {
  // Liste des états pour les données Firestore
  const [quizzes, setQuizzes] = useState<FirestoreQuizQuestion[]>([])
  const [courses, setCourses] = useState<FirestoreCourseItem[]>([])
  
  // États de chargement et d'affichage
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // État de sélection d'un sujet (pour afficher le détail des questions de ce sujet)
  const [selectedGroup, setSelectedGroup] = useState<QuizSubjectGroup | null>(null)

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
  const [formSubjectLevel, setFormSubjectLevel] = useState('Sujet 1')
  const [formSubjectTitle, setFormSubjectTitle] = useState('')
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

      if (fetchedCourses.length > 0 && !selectedCourseTitle) {
        setSelectedCourseTitle(fetchedCourses[0].title)
      }

      // Si un sujet est en cours d'inspection, mettre à jour ses questions à partir des données fraîches
      if (selectedGroup) {
        const updatedQuestions = fetchedQuizzes.filter(
          (q) => q.courseTitle === selectedGroup.courseTitle && q.subjectLevel === selectedGroup.subjectLevel
        )
        if (updatedQuestions.length === 0) {
          setSelectedGroup(null)
        } else {
          const course = fetchedCourses.find((c) => c.title === selectedGroup.courseTitle)
          setSelectedGroup({
            courseTitle: selectedGroup.courseTitle,
            subjectLevel: selectedGroup.subjectLevel,
            subjectTitle: updatedQuestions[0].subjectTitle || 'Généralités',
            questionCount: updatedQuestions.length,
            category: course?.category || 'Non spécifié',
            filiere: course?.filiere || 'Non spécifié',
            questions: updatedQuestions
          })
        }
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

  // Grouper les questions de quiz par Cours + Sujet
  const subjectGroups = useMemo(() => {
    const subjectsMap = new Map<string, QuizSubjectGroup>()

    quizzes.forEach((quiz) => {
      const key = `${quiz.courseTitle} - ${quiz.subjectLevel}`
      const course = courses.find((c) => c.title === quiz.courseTitle)
      
      if (subjectsMap.has(key)) {
        const group = subjectsMap.get(key)!
        group.questionCount++
        group.questions.push(quiz)
        if (quiz.subjectTitle && quiz.subjectTitle !== 'Généralités') {
          group.subjectTitle = quiz.subjectTitle
        }
      } else {
        subjectsMap.set(key, {
          courseTitle: quiz.courseTitle,
          subjectLevel: quiz.subjectLevel || 'Sujet 1',
          subjectTitle: quiz.subjectTitle || 'Généralités',
          questionCount: 1,
          category: course?.category || 'Non spécifié',
          filiere: course?.filiere || 'Non spécifié',
          questions: [quiz]
        })
      }
    })

    return Array.from(subjectsMap.values())
  }, [quizzes, courses])

  // Filtrage des groupes par recherche
  const filteredSubjectGroups = useMemo(() => {
    const search = searchTerm.toLowerCase().trim()
    if (!search) return subjectGroups

    return subjectGroups.filter((group) => {
      return (
        group.courseTitle.toLowerCase().includes(search) ||
        group.subjectLevel.toLowerCase().includes(search) ||
        group.subjectTitle.toLowerCase().includes(search) ||
        group.category.toLowerCase().includes(search) ||
        group.filiere.toLowerCase().includes(search)
      )
    })
  }, [subjectGroups, searchTerm])

  // Fonctions de gestion du formulaire dynamique groupé
  const addAnotherQuestionBlock = () => {
    setQuestionBlocks((prev) => [...prev, createEmptyQuestionBlock()])
  }

  const removeQuestionBlock = (index: number) => {
    if (questionBlocks.length === 1) {
      triggerFlash("Vous devez conserver au moins une question.", "error")
      return
    }
    setQuestionBlocks((prev) => prev.filter((_, i) => i !== index))
  }

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
  }

  const updateQuestionBlockOption = (blockIndex: number, optionIndex: number, value: string) => {
    setQuestionBlocks((prev) => prev.map((block, i) => {
      if (i !== blockIndex) return block
      const nextOptions = [...block.options]
      nextOptions[optionIndex] = value
      return { ...block, options: nextOptions }
    }))
  }

  // Envoi Groupé vers Firestore
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
          subjectLevel: formSubjectLevel,
          subjectTitle: formSubjectTitle.trim() || 'Généralités',
          prompt: q.prompt.trim(),
          type: q.type,
          options: q.options.map(opt => opt.trim()).filter(Boolean),
          correctAnswer: q.correctAnswer.trim(),
          explanation: q.explanation.trim()
        }
        return addQuizQuestion(payload)
      })

      await Promise.all(insertPromises)
      triggerFlash(`${questionBlocks.length} question(s) ajoutée(s) avec succès au sujet !`)
      
      // Réinitialisation complète
      setQuestionBlocks([createEmptyQuestionBlock()])
      setFormSubjectTitle('')
      setFormSubjectLevel('Sujet 1')
      setShowForm(false)
      await loadAllData()
    } catch (error) {
      console.error("Erreur lors du dépôt des quiz :", error)
      triggerFlash("Impossible d'enregistrer la série de questions.", "error")
    }
  }

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
        subjectLevel: editDraft.subjectLevel,
        subjectTitle: editDraft.subjectTitle.trim() || 'Généralités',
        prompt: editDraft.prompt.trim(),
        type: editDraft.type,
        options: editDraft.options.map(opt => opt.trim()).filter(Boolean),
        correctAnswer: editDraft.correctAnswer.trim(),
        explanation: editDraft.explanation.trim()
      }
      await updateQuizQuestion(modalState.item.id, updates)
      triggerFlash("La question a été modifiée avec succès.")
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
      triggerFlash("La question a été supprimée.")
      closeModal()
      await loadAllData()
    } catch (error) {
      console.error(error)
      triggerFlash("Erreur lors de la suppression.", "error")
    }
  }

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

      {/* Mode Détail : Questions associées à un Sujet sélectionné */}
      {selectedGroup ? (
        <div className="space-y-6">
          {/* Fil d'Ariane / Bouton Retour */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedGroup(null)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition shadow-xs"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
              Retour aux sujets
            </button>
          </div>

          {/* En-tête du Sujet */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">{selectedGroup.subjectLevel}</span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{selectedGroup.category}</span>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">{selectedGroup.filiere}</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider font-sans">Cours : {selectedGroup.courseTitle}</p>
              <h2 className="text-2xl font-black text-slate-900 mt-1">{selectedGroup.subjectTitle}</h2>
              <p className="text-sm text-slate-500 mt-2">Ce sujet comprend {selectedGroup.questionCount} question(s) d'entraînement.</p>
            </div>
          </div>

          {/* Liste des Questions */}
          <div className="space-y-4">
            {selectedGroup.questions.map((quiz, index) => (
              <div key={quiz.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                      {index + 1}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">{quiz.type}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{quiz.prompt}</h3>

                  {/* Propositions de réponses */}
                  <div className="grid gap-2 sm:grid-cols-2 pt-2">
                    {quiz.options.map((opt, oIndex) => {
                      const isCorrect = opt === quiz.correctAnswer
                      return (
                        <div 
                          key={oIndex} 
                          className={`rounded-xl border p-3 text-xs font-semibold flex items-center justify-between ${
                            isCorrect 
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                              : 'bg-slate-50 border-slate-100 text-slate-600'
                          }`}
                        >
                          <span>{opt}</span>
                          {isCorrect && <span className="text-emerald-600 font-bold">✔️ Réponse correcte</span>}
                        </div>
                      )
                    })}
                  </div>

                  {/* Explication Pédagogique */}
                  {quiz.explanation && (
                    <div className="rounded-2xl bg-amber-50/50 border border-amber-100 p-4 text-xs text-amber-900 italic leading-relaxed">
                      <span className="font-bold not-italic block mb-1">💡 Explication pédagogique :</span>
                      "{quiz.explanation}"
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-50">
                  <button onClick={() => openEdit(quiz)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-amber-300 hover:text-amber-600 transition cursor-pointer">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5Z"/></svg>
                    Modifier
                  </button>
                  <button onClick={() => openDelete(quiz)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-600 transition cursor-pointer">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Mode Liste : Affichage des sujets groupés */
        <div className="space-y-6">
          {/* Barre d'action supérieure */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-500">Gestion</p>
              <h2 className="text-2xl font-semibold text-slate-900">Quiz par Sujet</h2>
            </div>
            
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full md:w-auto">
              <div className="relative flex-1 sm:w-72">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" /></svg>
                </span>
                <input
                  type="text"
                  placeholder="Rechercher par cours, sujet, classe..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center justify-center rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 hover:bg-amber-400 whitespace-nowrap cursor-pointer">
                <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                Ajouter des questions
              </button>
            </div>
          </div>

          {/* Formulaire d'Ajout Groupé */}
          {showForm && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-900">Publier des questions sur un Sujet/Niveau</h3>

              {/* Filtres de sélection du cours */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <label className="mb-2 block text-sm font-semibold text-slate-800">Filière</label>
                  <select value={courseFiliereFilter} onChange={(e) => setCourseFiliereFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 font-medium">
                    <option value="all">Toutes les filières</option>
                    {availableFilieres.map((filiere) => (
                      <option key={filiere} value={filiere}>{filiere}</option>
                    ))}
                  </select>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <label className="mb-2 block text-sm font-semibold text-slate-800">Année (Classe)</label>
                  <select value={courseYearFilter} onChange={(e) => setCourseYearFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 font-medium">
                    <option value="all">Toutes les années</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <label className="mb-2 block text-sm font-semibold text-slate-800">Cours associé</label>
                  <select value={selectedCourseTitle} onChange={(e) => setSelectedCourseTitle(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 font-medium">
                    {filteredCourses.length === 0 ? (
                      <option value="">Aucun cours correspondant</option>
                    ) : (
                      filteredCourses.map((course) => (
                        <option key={course.id} value={course.title}>{course.title}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Paramétrage du Sujet (Dropdown 10 Sujets + Champ Texte Intitulé) */}
              <div className="grid gap-4 md:grid-cols-2 bg-amber-50/30 p-5 rounded-2xl border border-amber-100">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-800">Niveau / Sujet (Numéro)</label>
                  <select 
                    value={formSubjectLevel} 
                    onChange={(e) => setFormSubjectLevel(e.target.value)} 
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 font-medium"
                  >
                    {subjectLevelOptions.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-800">Intitulé personnalisé du sujet</label>
                  <input 
                    type="text" 
                    value={formSubjectTitle} 
                    onChange={(e) => setFormSubjectTitle(e.target.value)} 
                    placeholder="Ex: Pédiatrie-Nouveau née, Anatomie respiratoire..." 
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 font-medium text-slate-900"
                  />
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
                        <button type="button" onClick={() => removeQuestionBlock(qIndex)} className="text-xs font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1 transition cursor-pointer">
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
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">Type de quiz</label>
                        <select value={block.type} onChange={(e) => updateQuestionBlockField(qIndex, 'type', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-amber-400 text-sm">
                          <option value="QCM">QCM (Choix Multiples)</option>
                          <option value="QCD">QCD (Vrai / Faux)</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">Réponse attendue (exacte)</label>
                        <input value={block.correctAnswer} onChange={(e) => updateQuestionBlockField(qIndex, 'correctAnswer', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-amber-400 text-sm" placeholder="Ex: Vrai, ou libellé exact de la bonne option" />
                      </div>

                      {block.type === 'QCM' && block.options.map((option, optIndex) => (
                        <div key={optIndex} className="md:col-span-2">
                          <label className="mb-1 block text-xs font-medium text-slate-500 font-bold">Option {optIndex + 1}</label>
                          <input value={option} onChange={(e) => updateQuestionBlockOption(qIndex, optIndex, e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-amber-400" placeholder={`Saisir l'option ${optIndex + 1}`} />
                        </div>
                      ))}

                      <div className="md:col-span-2">
                        <label className="mb-1.5 block text-xs font-medium text-slate-600">Explication pédagogique (correction)</label>
                        <textarea value={block.explanation} onChange={(e) => updateQuestionBlockField(qIndex, 'explanation', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-amber-400" rows={2} placeholder="Explication pédagogique apportée aux étudiants..." />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions du formulaire */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={addAnotherQuestionBlock} className="inline-flex items-center justify-center rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 px-4 py-2.5 text-xs font-bold text-amber-700 transition w-full sm:w-auto cursor-pointer">
                  <svg viewBox="0 0 24 24" className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                  Ajouter une autre question
                </button>
                <div className="flex gap-3 w-full sm:w-auto justify-end">
                  <button onClick={() => { setShowForm(false); setQuestionBlocks([createEmptyQuestionBlock()]); setFormSubjectTitle('') }} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 w-full sm:w-auto cursor-pointer">Annuler</button>
                  <button onClick={handleCreateGroupedQuizzes} className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-amber-400 w-full sm:w-auto cursor-pointer">Enregistrer le sujet ({questionBlocks.length} questions)</button>
                </div>
              </div>
            </div>
          )}

          {/* Grille des Sujets de Quiz */}
          {loading ? (
            <div className="text-center py-10 text-slate-500 font-medium">Chargement des modules de quiz...</div>
          ) : filteredSubjectGroups.length === 0 ? (
            <div className="text-center py-10 text-slate-500 font-medium">
              {searchTerm ? "Aucun sujet ne correspond à votre recherche." : "Aucun sujet de quiz n'a encore été créé."}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredSubjectGroups.map((group) => {
                const uniqueKey = `${group.courseTitle}-${group.subjectLevel}`
                return (
                  <div 
                    key={uniqueKey} 
                    onClick={() => setSelectedGroup(group)}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between cursor-pointer hover:border-amber-300 hover:shadow-md transition duration-300 transform hover:-translate-y-0.5 group"
                  >
                    <div>
                      {/* En-tête : Année & Filière */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-3 mb-4">
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-100">{group.category}</span>
                        <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold text-violet-600 border border-violet-100">{group.filiere}</span>
                      </div>

                      {/* Niveau et Titre du cours */}
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{group.courseTitle}</p>
                      
                      {/* Sujet et Intitulé */}
                      <div className="mt-2 space-y-1">
                        <span className="inline-block rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">{group.subjectLevel}</span>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition leading-snug mt-1">{group.subjectTitle}</h3>
                      </div>
                    </div>

                    {/* Informations du bas */}
                    <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-3 text-xs text-slate-400 font-semibold">
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12h6"/><path d="M9 16h6"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2Z"/></svg>
                        {group.questionCount} question(s)
                      </span>
                      <span className="text-amber-500 group-hover:translate-x-1 transition-transform duration-300 flex items-center gap-1 font-bold">
                        Gérer
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal unique d'Édition / Révocation de Question */}
      {modalState.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 overflow-y-auto" onClick={closeModal}>
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {modalState.type === 'delete' ? (
              <>
                <h3 className="text-xl font-bold text-slate-900">Supprimer la question</h3>
                <p className="mt-3 text-sm text-slate-500">Voulez-vous vraiment supprimer définitivement cette question ? Cette action mettra à jour le sujet de quiz associé.</p>
                <div className="mt-6 flex justify-end gap-3 border-t border-slate-50 pt-4">
                  <button onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-600 cursor-pointer">Annuler</button>
                  <button onClick={handleDeleteQuiz} className="rounded-xl bg-rose-600 px-4 py-2.5 font-semibold text-white cursor-pointer">Supprimer la question</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">Modifier la question</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Cours associé</label>
                    <select value={editDraft?.courseTitle ?? ''} onChange={(e) => setEditDraft((prev) => prev ? { ...prev, courseTitle: e.target.value } : prev)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none font-medium">
                      {courses.map((course) => <option key={course.id} value={course.title}>{course.title}</option>)}
                    </select>
                  </div>

                  {/* Édition du Sujet/Niveau et Intitulé */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Sujet / Niveau (Numéro)</label>
                    <select 
                      value={editDraft?.subjectLevel ?? 'Sujet 1'} 
                      onChange={(e) => setEditDraft((prev) => prev ? { ...prev, subjectLevel: e.target.value } : prev)} 
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none font-medium"
                    >
                      {subjectLevelOptions.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Intitulé du sujet</label>
                    <input 
                      type="text" 
                      value={editDraft?.subjectTitle ?? ''} 
                      onChange={(e) => setEditDraft((prev) => prev ? { ...prev, subjectTitle: e.target.value } : prev)} 
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none font-medium text-slate-900"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Énoncé de la question</label>
                    <textarea value={editDraft?.prompt ?? ''} onChange={(e) => setEditDraft((prev) => prev ? { ...prev, prompt: e.target.value } : prev)} rows={2} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Type de quiz</label>
                    <select value={editDraft?.type ?? 'QCM'} onChange={(e) => {
                      const nextType = e.target.value as 'QCM' | 'QCD'
                      setEditDraft((prev) => prev ? { ...prev, type: nextType, options: nextType === 'QCD' ? ['Vrai', 'Faux'] : ['', '', '', ''], correctAnswer: nextType === 'QCD' ? 'Vrai' : '' } : prev)
                    }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none">
                      <option value="QCM">QCM</option>
                      <option value="QCD">QCD</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Réponse correcte</label>
                    <input value={editDraft?.correctAnswer ?? ''} onChange={(e) => setEditDraft((prev) => prev ? { ...prev, correctAnswer: e.target.value } : prev)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none" />
                  </div>
                  
                  {editDraft?.type === 'QCM' && (editDraft?.options ?? []).map((option, index) => (
                    <div key={`${editDraft?.id ?? 'edit'}-${index}`} className="md:col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Option {index + 1}</label>
                      <input value={option} onChange={(e) => {
                        const next = [...(editDraft?.options ?? [])]
                        next[index] = e.target.value
                        setEditDraft((prev) => prev ? { ...prev, options: next } : prev)
                      }} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none" />
                    </div>
                  ))}
                  
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Explication pédagogique (correction)</label>
                    <textarea value={editDraft?.explanation ?? ''} onChange={(e) => setEditDraft((prev) => prev ? { ...prev, explanation: e.target.value } : prev)} rows={2} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none" />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-650 cursor-pointer">Annuler</button>
                  <button onClick={handleSaveEdit} className="rounded-xl bg-amber-500 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-amber-400 cursor-pointer">Sauvegarder</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}