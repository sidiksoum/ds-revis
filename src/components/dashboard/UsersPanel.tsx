import { useState, useEffect } from 'react'
import { 
  getUsersFromFirestore, 
  updateUser, 
  deleteUser,
  getYearsFromFirestore,
  getFilieresFromFirestore,
  type FirestoreAppUser,
  type AcademicYear,
  type FiliereItem
} from '../../services/firebaseService'

export function UsersPanel() {
  // Liste des états pour les données Firestore
  const [users, setUsers] = useState<FirestoreAppUser[]>([])
  const [classes, setClasses] = useState<AcademicYear[]>([])
  const [filieres, setFilieres] = useState<FiliereItem[]>([])
  
  // États de chargement et d'affichage
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const [modalState, setModalState] = useState<{ type: 'edit' | 'delete'; item: FirestoreAppUser | null }>({ 
    type: 'edit', 
    item: null 
  })
  const [draft, setDraft] = useState<FirestoreAppUser | null>(null)
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Notification flash automatique (3 secondes)
  const triggerFlash = (text: string, type: 'success' | 'error' = 'success') => {
    setFlashMessage({ text, type })
    setTimeout(() => setFlashMessage(null), 3000)
  }

  // Chargement global synchrone depuis Firebase
  const loadAllData = async () => {
    try {
      setLoading(true)
      const [fetchedUsers, fetchedClasses, fetchedFilieres] = await Promise.all([
        getUsersFromFirestore(),
        getYearsFromFirestore(),
        getFilieresFromFirestore()
      ])

      setUsers(fetchedUsers)
      setClasses(fetchedClasses)
      setFilieres(fetchedFilieres)
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs :", error)
      triggerFlash("Erreur lors de la récupération des données utilisateurs.", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  const openEdit = (user: FirestoreAppUser) => {
    setDraft({ ...user })
    setPasswordInput('')
    setShowPassword(false)
    setModalState({ type: 'edit', item: user })
  }

  const openDelete = (user: FirestoreAppUser) => {
    setModalState({ type: 'delete', item: user })
  }

  const closeModal = () => {
    setModalState({ type: 'edit', item: null })
    setDraft(null)
    setPasswordInput('')
    setShowPassword(false)
  }

  // Enregistrer les modifications de la modal (Update)
  const saveUser = async () => {
    if (!draft || !modalState.item) return

    const trimmedPassword = passwordInput.trim()
    if (trimmedPassword.length > 0 && trimmedPassword.length < 6) {
      triggerFlash("Le mot de passe doit comporter au moins 6 caractères.", "error")
      return
    }

    try {
      const updates: Partial<FirestoreAppUser> & { password?: string; passwordUpdatedAt?: string } = {
        name: draft.name.trim(),
        email: draft.email.trim(),
        level: draft.level,
        filiere: draft.filiere,
        isActive: draft.isActive,
        premium: draft.premium
      }

      if (trimmedPassword.length >= 6) {
        updates.password = trimmedPassword
        updates.passwordUpdatedAt = new Date().toISOString()
      }

      await updateUser(modalState.item.id, updates)
      triggerFlash(
        trimmedPassword.length >= 6
          ? `Profil et mot de passe de "${updates.name}" mis à jour avec succès.`
          : `Le profil de "${updates.name}" a été mis à jour.`
      )
      closeModal()
      await loadAllData()
    } catch (error) {
      console.error("Erreur lors de la modification :", error)
      triggerFlash("Impossible de modifier le profil.", "error")
    }
  }

  // Supprimer un utilisateur de Firestore (Delete)
  const handleDeleteUser = async () => {
    if (!modalState.item) return
    const userName = modalState.item.name

    try {
      await deleteUser(modalState.item.id)
      triggerFlash(`L'utilisateur "${userName}" a été retiré de la base de données.`)
      closeModal()
      await loadAllData()
    } catch (error) {
      console.error("Erreur lors de la suppression :", error)
      triggerFlash("Erreur lors de la suppression de l'utilisateur.", "error")
    }
  }

  // Permuter rapidement le statut Actif/Suspendu en un clic sur le tableau
  const toggleUserStatus = async (user: FirestoreAppUser) => {
    try {
      const nextStatus = !user.isActive
      await updateUser(user.id, { isActive: nextStatus })
      triggerFlash(`Statut mis à jour : ${user.name} est maintenant ${nextStatus ? 'Actif' : 'Suspendu'}.`)
      await loadAllData()
    } catch (error) {
      console.error(error)
      triggerFlash("Erreur lors du changement de statut.", "error")
    }
  }

  // Permuter rapidement l'abonnement Premium/Standard en un clic sur le tableau
  const toggleUserPremium = async (user: FirestoreAppUser) => {
    try {
      const nextPremium = !user.premium
      await updateUser(user.id, { premium: nextPremium })
      triggerFlash(`Abonnement mis à jour : ${user.name} est désormais ${nextPremium ? 'Premium' : 'Standard'}.`)
      await loadAllData()
    } catch (error) {
      console.error(error)
      triggerFlash("Erreur lors de la mutation d'abonnement.", "error")
    }
  }

  // Filtrer les utilisateurs selon la recherche
  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase()
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.level && u.level.toLowerCase().includes(q)) ||
      (u.filiere && u.filiere.toLowerCase().includes(q)) ||
      (u.country && u.country.toLowerCase().includes(q)) ||
      (u.antenne && u.antenne.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      {/* Notification Toast Flash */}
      {flashMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl transition-all duration-300 ${
          flashMessage.type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'
        }`}>
          <div className={`h-2.5 w-2.5 rounded-full ${flashMessage.type === 'error' ? 'bg-rose-300' : 'bg-emerald-400'}`} />
          <span className="text-sm font-semibold">{flashMessage.text}</span>
        </div>
      )}

      {/* En-tête du panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Gestion des accès</p>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Utilisateurs enregistrés ({users.length})</h2>
        </div>
        
        {/* Recherche instantanée */}
        <div className="w-full sm:w-80">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher par nom, email, pays, antenne..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-sky-500 shadow-sm"
            />
            <svg viewBox="0 0 24 24" className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-500 font-medium">
          Chargement des utilisateurs en direct...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
          Aucun utilisateur ne correspond à votre recherche.
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4">Étudiant</th>
                  <th className="px-4 py-4">Origine / Antenne</th>
                  <th className="px-4 py-4">Niveau</th>
                  <th className="px-4 py-4">Filière</th>
                  <th className="px-4 py-4">Abonnement</th>
                  <th className="px-4 py-4">Statut</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{user.name}</div>
                      <div className="text-xs text-slate-400">{user.email}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      <div>{user.country || "Côte d'Ivoire"}</div>
                      <div className="text-xs text-slate-400">{user.antenne || 'Antenne Bouaké'}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{user.level || 'Non spécifié'}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{user.filiere || 'Non spécifié'}</td>
                    
                    {/* Toggle Premium direct */}
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleUserPremium(user)}
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                          user.premium ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {user.premium ? 'Premium' : 'Standard'}
                      </button>
                    </td>

                    {/* Toggle Statut direct */}
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleUserStatus(user)}
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                          user.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                        }`}
                      >
                        {user.isActive ? 'Actif' : 'Suspendu'}
                      </button>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(user)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:border-slate-400 hover:text-slate-900 transition" title="Modifier l'utilisateur & mot de passe" aria-label="Modifier utilisateur">
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5Z"/></svg>
                        </button>
                        <button onClick={() => openDelete(user)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:border-rose-300 hover:text-rose-600 transition" title="Supprimer l'utilisateur" aria-label="Supprimer utilisateur">
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal d'édition / suppression de compte */}
      {modalState.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 overflow-y-auto backdrop-blur-sm" onClick={closeModal}>
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {modalState.type === 'delete' ? (
              <>
                <h3 className="text-xl font-bold text-slate-900">Supprimer l'utilisateur</h3>
                <p className="mt-3 text-sm text-slate-500">Voulez-vous vraiment supprimer définitivement <span className="font-semibold text-slate-800">{modalState.item.name}</span> ? Ses données de synchronisation cloud seront effacées.</p>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={closeModal} className="rounded-2xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-50 transition">Annuler</button>
                  <button onClick={handleDeleteUser} className="rounded-2xl bg-rose-600 px-5 py-2.5 font-semibold text-white hover:bg-rose-700 transition">Supprimer le compte</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <h3 className="text-xl font-bold text-slate-900">Modifier l'utilisateur</h3>
                  <button onClick={closeModal} className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wider">Nom complet</label>
                    <input 
                      value={draft?.name ?? ''} 
                      onChange={(e) => setDraft((prev) => prev ? { ...prev, name: e.target.value } : prev)} 
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-500 transition" 
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wider">Adresse Email</label>
                    <input 
                      value={draft?.email ?? ''} 
                      onChange={(e) => setDraft((prev) => prev ? { ...prev, email: e.target.value } : prev)} 
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-500 transition" 
                    />
                  </div>

                  {/* NOUVEAU CHAMP : Mot de passe avec toggle visibilité */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Laisser vide pour ne pas modifier (min. 6 car.)"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 pr-12 text-sm outline-none focus:border-sky-500 transition placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-700 transition"
                        title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      >
                        {showPassword ? (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Saisissez un nouveau mot de passe si vous souhaitez le réinitialiser pour cet utilisateur.
                    </p>
                  </div>
                  
                  {/* Liaison dynamique de la classe */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wider">Classe (Niveau)</label>
                    <select 
                      value={draft?.level ?? ''} 
                      onChange={(e) => setDraft((prev) => prev ? { ...prev, level: e.target.value } : prev)} 
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none bg-white focus:border-sky-500 transition"
                    >
                      <option value="">Sélectionner un niveau</option>
                      {classes.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  
                  {/* Liaison dynamique de la filière */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wider">Filière</label>
                    <select 
                      value={draft?.filiere ?? ''} 
                      onChange={(e) => setDraft((prev) => prev ? { ...prev, filiere: e.target.value } : prev)} 
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none bg-white focus:border-sky-500 transition"
                    >
                      <option value="">Sélectionner une filière</option>
                      {filieres.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 bg-slate-50/50">
                    <div>
                      <span className="text-sm font-semibold text-slate-700 block">Accès réseau (Statut)</span>
                      <span className="text-xs text-slate-400">Autoriser ou suspendre la connexion</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setDraft((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev)} 
                      className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${draft?.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}
                    >
                      {draft?.isActive ? 'Compte Actif' : 'Compte Suspendu'}
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 bg-slate-50/50">
                    <div>
                      <span className="text-sm font-semibold text-slate-700 block">Privilèges d'abonnement</span>
                      <span className="text-xs text-slate-400">Activer l'accès illimité Premium</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setDraft((prev) => prev ? { ...prev, premium: !prev.premium } : prev)} 
                      className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${draft?.premium ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                    >
                      {draft?.premium ? 'Membre Premium' : 'Membre Standard'}
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button onClick={closeModal} className="rounded-2xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-50 transition">
                    Annuler
                  </button>
                  <button onClick={saveUser} className="rounded-2xl bg-slate-900 px-5 py-2.5 font-semibold text-white hover:bg-slate-800 transition shadow-sm">
                    Enregistrer le profil
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
