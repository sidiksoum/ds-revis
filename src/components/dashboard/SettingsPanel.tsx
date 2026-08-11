import { useState, useEffect } from 'react'
import { getAppSettingsFromFirestore, updateAppSettings, type AppSettings } from '../../services/firebaseService'

export function SettingsPanel() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [whatsappNumberInput, setWhatsappNumberInput] = useState('')
  const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const triggerFlash = (text: string, type: 'success' | 'error' = 'success') => {
    setFlashMessage({ text, type })
    setTimeout(() => setFlashMessage(null), 3000)
  }

  const loadSettings = async () => {
    try {
      setLoading(true)
      const fetchedSettings = await getAppSettingsFromFirestore()
      setSettings(fetchedSettings)
      setWhatsappNumberInput(fetchedSettings.whatsappNumber)
    } catch (error) {
      console.error('Erreur lors du chargement des configurations :', error)
      triggerFlash('Impossible de charger les configurations.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!whatsappNumberInput.trim()) {
      triggerFlash('Le numéro WhatsApp ne peut pas être vide.', 'error')
      return
    }

    try {
      setSaving(true)
      const sanitizedNumber = whatsappNumberInput.replace(/\s+/g, '').replace(/[+]/g, '')
      await updateAppSettings({ whatsappNumber: sanitizedNumber })
      triggerFlash('Configurations enregistrées avec succès !')
      setSettings({ whatsappNumber: sanitizedNumber })
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des configurations :', error)
      triggerFlash('Erreur lors de la sauvegarde.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Notifications Flash */}
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

      {/* Titre */}
      <div>
        <p className="text-sm text-slate-500">Configuration générale</p>
        <h2 className="text-2xl font-semibold text-slate-900">Paramètres de l'application</h2>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500 font-medium">Chargement des configurations...</div>
      ) : (
        <div className="max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-slate-900 border-b border-slate-100 pb-3 mb-4">Support & Contact</h3>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Numéro WhatsApp de contact (Bouton Premium mobile)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 font-medium text-sm">
                    +
                  </span>
                  <input
                    type="text"
                    value={whatsappNumberInput}
                    onChange={(e) => setWhatsappNumberInput(e.target.value)}
                    placeholder="Ex: 2250798646697"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-8 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Saisissez le numéro sans symbole "+" ni espaces (ex: <span className="font-semibold">2250798646697</span> pour la Côte d'Ivoire). Ce numéro sera automatiquement synchronisé sur l'application mobile pour diriger les demandes premium vers ce contact WhatsApp.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className={`rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-sm text-white hover:bg-slate-800 transition cursor-pointer shadow-lg shadow-slate-950/10 ${
                  saving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
