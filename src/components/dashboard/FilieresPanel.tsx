import { useState, useEffect } from 'react'
import { 
  getFilieresFromFirestore, 
  addFiliere, 
  updateFiliere, 
  deleteFiliere,
  getYearsFromFirestore,
  type AcademicYear
} from '../../services/firebaseService'

interface FiliereItem {
  id: string
  name: string
  years?: string[]
}

export function FilieresPanel() {
  const [filieres, setFilieres] = useState<FiliereItem[]>([])
  const [yearsList, setYearsList] = useState<AcademicYear[]>([])
  const [selectedYears, setSelectedYears] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [showForm, setShowForm] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const [modalState, setModalState] = useState<{ type: 'edit' | 'delete'; item: FiliereItem | null }>({ 
    type: 'edit', 
    item: null 
  })

  const triggerFlash = (text: string, type: 'success' | 'error' = 'success') => {
    setFlashMessage({ text, type })
    setTimeout(() => {
      setFlashMessage(null)
    }, 3000)
  }

  const loadFilieres = async () => {
    try {
      setLoading(true)
      const data = await getFilieresFromFirestore()
      setFilieres(data)
    } catch (error) {
      console.error("Erreur lors de la récupération des filières :", error)
      triggerFlash("Impossible de charger les filièes.", "error")
    } finally {
      setLoading(false)
    }
  }

  const loadYears = async () => {
    try {
      const data = await getYearsFromFirestore()
      setYearsList(data)
    } catch (error) {
      console.error("Erreur lors de la récupération des classes :", error)
    }
  }

  useEffect(() => {
    loadFilieres()
    loadYears()
  }, [])

  const openEdit = (item: FiliereItem) => {
    setDraft(item.name)
    setSelectedYears(item.years || [])
    setModalState({ type: 'edit', item })
  }

  const openDelete = (item: FiliereItem) => {
    setDraft(item.name)
    setModalState({ type: 'delete', item })
  }

  const closeModal = () => {
    setModalState({ type: 'edit', item: null })
    setDraft('')
    setSelectedYears([])
  }

  const toggleYear = (yearName: string) => {
    setSelectedYears((prev) => 
      prev.includes(yearName) 
        ? prev.filter((y) => y !== yearName) 
        : [...prev, yearName]
    )
  }

  const saveFiliere = async () => {
    if (!draft.trim() || !modalState.item) return

    try {
      await updateFiliere(modalState.item.id, draft.trim(), selectedYears)
      await loadFilieres()
      triggerFlash(`La filière "${draft.trim()}" a été modifiée avec succès.`)
      closeModal()
    } catch (error) {
      console.error("Erreur lors de la modification :", error)
      triggerFlash("Erreur lors de la modification de la filière.", "error")
    }
  }

  const handleDelete = async () => {
    if (!modalState.item) return
    const deletedName = modalState.item.name
    try {
      await deleteFiliere(modalState.item.id)
      await loadFilieres()
      triggerFlash(`La filière "${deletedName}" a été supprimée.`)
      closeModal()
    } catch (error) {
      console.error("Erreur lors de la suppression :", error)
      triggerFlash("Erreur lors de la suppression de la filière.", "error")
    }
  }

  const handleCreateFormSubmit = async () => {
    if (!draft.trim()) return
    try {
      await addFiliere(draft.trim(), selectedYears)
      const addedName = draft.trim()
      setDraft('')
      setSelectedYears([])
      setShowForm(false)
      await loadFilieres()
      triggerFlash(`La filière "${addedName}" a été ajoutée avec succès.`)
    } catch (error) {
      console.error("Erreur lors de la création :", error)
      triggerFlash("Erreur lors de la création de la filière.", "error")
    }
  }

  const filteredFilieres = filieres.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
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

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-500">Gestion</p>
          <h2 className="text-2xl font-semibold text-slate-900">Filières</h2>
        </div>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" /></svg>
            </span>
            <input
              type="text"
              placeholder="Rechercher une filière..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
            />
          </div>

          <button onClick={() => { setDraft(''); setSelectedYears([]); setModalState({ type: 'edit', item: null }); setShowForm((v) => !v) }} className="inline-flex items-center justify-center rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:-translate-y-0.5 hover:bg-violet-500 whitespace-nowrap cursor-pointer">
            <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            Ajouter une filière
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Nom de la filière</label>
            <input 
              value={draft || ''} 
              onChange={(e) => setDraft(e.target.value)} 
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-400" 
              placeholder="IDE" 
            />
          </div>

          {/* Sélection des classes */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-500">Classes associées</label>
            <div className="flex flex-wrap gap-2">
              {yearsList.map((y) => {
                const isChecked = selectedYears.includes(y.name);
                return (
                  <button
                    key={y.id}
                    type="button"
                    onClick={() => toggleYear(y.name)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      isChecked
                        ? 'border-violet-600 bg-violet-50 text-violet-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isChecked ? (
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    )}
                    {y.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button onClick={() => setShowForm(false)} className="rounded-2xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 cursor-pointer">Annuler</button>
            <button onClick={handleCreateFormSubmit} className="rounded-2xl bg-violet-600 px-4 py-2 font-semibold text-white cursor-pointer">Enregistrer</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-500 font-medium">Chargement des filières depuis Firebase...</div>
      ) : filteredFilieres.length === 0 ? (
        <div className="text-center py-10 text-slate-500 font-medium">
          {searchTerm ? "Aucune filière ne correspond à votre recherche." : "Aucune filière trouvée."}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {filteredFilieres.map((item, index) => (
            <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-slate-900">{item.name}</span>
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">Index {index + 1}</span>
                </div>
                
                {/* Affichage des classes associées */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {(item.years && item.years.length > 0) ? (
                    item.years.map((y) => (
                      <span key={y} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {y}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] italic text-slate-400">Toutes les classes</span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2 border-t border-slate-50 pt-3">
                <button onClick={() => openEdit(item)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:border-violet-300 hover:text-violet-600 cursor-pointer" aria-label="Modifier la filière">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5Z"/></svg>
                </button>
                <button onClick={() => openDelete(item)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:border-rose-300 hover:text-rose-600 cursor-pointer" aria-label="Supprimer la filière">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalState.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 overflow-y-auto" onClick={closeModal}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {modalState.type === 'delete' ? (
              <>
                <h3 className="text-xl font-semibold text-slate-900">Supprimer la filière</h3>
                <p className="mt-3 text-sm text-slate-500">Voulez-vous vraiment supprimer <span className="font-semibold text-slate-800">{modalState.item.name}</span> ?</p>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={closeModal} className="rounded-2xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 cursor-pointer">Annuler</button>
                  <button onClick={handleDelete} className="rounded-2xl bg-rose-600 px-4 py-2 font-semibold text-white cursor-pointer">Supprimer</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-slate-900 border-b border-slate-100 pb-3">Modifier la filière</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Nom de la filière</label>
                    <input 
                      value={draft || ''} 
                      onChange={(e) => setDraft(e.target.value)} 
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3" 
                    />
                  </div>

                  {/* Sélection des classes dans modification */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-500">Classes associées</label>
                    <div className="flex flex-wrap gap-2">
                      {yearsList.map((y) => {
                        const isChecked = selectedYears.includes(y.name);
                        return (
                          <button
                            key={y.id}
                            type="button"
                            onClick={() => toggleYear(y.name)}
                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                              isChecked
                                ? 'border-violet-600 bg-violet-50 text-violet-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {isChecked ? (
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                            ) : (
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                            )}
                            {y.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button onClick={closeModal} className="rounded-2xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 cursor-pointer">Annuler</button>
                  <button onClick={saveFiliere} className="rounded-2xl bg-violet-600 px-4 py-2 font-semibold text-white cursor-pointer">Enregistrer</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
