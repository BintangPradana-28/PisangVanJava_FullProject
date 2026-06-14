'use client'
import { useMutation } from '@tanstack/react-query'
import { FetchError } from 'ofetch'
// components/admin/SettingsClient.tsx
import { useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '@/src/lib/api'

interface Setting {
  id: string
  key: string
  value: string
  label: string | null
  group: string
}
interface Props {
  settings: Setting[]
  adminName: string
}

const GROUP_ICONS: Record<string, string> = {
  general: '🏪',
  contact: '📞',
  social: '📱',
  content: '📝',
  about: '🌟',
  home: '🏠'
}
const GROUP_LABELS: Record<string, string> = {
  general: 'Informasi Toko',
  contact: 'Kontak & Alamat',
  social: 'Media Sosial',
  content: 'Konten Website',
  about: 'Tentang Kami',
  home: 'Beranda (Home)'
}

const cleanLabel = (label: string | null, key: string) => {
  if (!label) return key
  return label.replace(/\s*\(true\s*=.*?,?\s*false\s*=.*?\)/gi, '')
}

export default function SettingsClient({ settings, adminName }: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value]))
  )
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [activeTab, setActiveTab] = useState('general')

  const groups = [...new Set([...settings.map((s) => s.group), 'home', 'about', 'contact'])]

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (
        activeTab === 'about' ||
        activeTab === 'home' ||
        activeTab === 'contact' ||
        activeTab === 'store'
      ) {
        const payload = Object.fromEntries(
          Object.entries(values).filter(
            ([key]) =>
              key.startsWith(`${activeTab}_`) ||
              (activeTab === 'contact' &&
                ['nomor_wa', 'alamat', 'jam_operasional'].includes(key)) ||
              (activeTab === 'store' && key === 'store_delivery_fee')
          )
        )
        const res = await api<{ success: boolean; error?: string }>(
          '/api/admin/settings/bulk-update',
          {
            method: 'POST',
            body: { group: activeTab, payload }
          }
        )
        if (res.error) throw new Error(res.error)
        return { type: 'bulk', group: activeTab }
      } else {
        const res = await api<{ success: boolean; error?: string }>('/api/settings', {
          method: 'PUT',
          body: {
            settings: Object.entries(values)
              .filter(([key]) => settings.find((s) => s.key === key)?.group === activeTab)
              .map(([key, value]) => ({ key, value }))
          }
        })
        if (!res.success) throw new Error(res.error || 'Gagal menyimpan')
        return { type: 'single' }
      }
    },
    onSuccess: (data) => {
      if (data.type === 'bulk' && data.group)
        toast.success(`Data ${GROUP_LABELS[data.group] || data.group} berhasil disimpan!`)
      else toast.success('Pengaturan berhasil disimpan!')
    },
    onError: (error: FetchError | Error) => {
      const msg =
        error instanceof FetchError ? error.data?.error || 'Gagal menyimpan data' : error.message
      toast.error(msg)
    }
  })

  const handleSave = () => saveMutation.mutate()

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (!pwForm.current || !pwForm.newPw) throw new Error('Isi semua field password')
      if (pwForm.newPw !== pwForm.confirm) throw new Error('Konfirmasi password tidak cocok')
      if (pwForm.newPw.length < 6) throw new Error('Password minimal 6 karakter')

      const res = await api<{ success: boolean; error?: string }>('/api/settings/password', {
        method: 'POST',
        body: { currentPassword: pwForm.current, newPassword: pwForm.newPw }
      })
      if (!res.success) throw new Error(res.error || 'Gagal mengubah password')
      return res
    },
    onSuccess: () => {
      toast.success('Password berhasil diubah!')
      setPwForm({ current: '', newPw: '', confirm: '' })
    },
    onError: (error: FetchError | Error) => {
      const msg =
        error instanceof FetchError ? error.data?.error || 'Gagal mengubah password' : error.message
      toast.error(msg)
    }
  })

  const handlePasswordChange = () => passwordMutation.mutate()

  const groupSettings = settings.filter((s) => s.group === activeTab)

  return (
    <>
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="text-amber-brand text-xs font-semibold tracking-[0.2em] uppercase mb-1">
            Admin
          </div>
          <h1 className="font-serif text-2xl font-bold text-brown-700">⚙️ Pengaturan</h1>
          <p className="text-sm text-brown-400 mt-0.5">Kelola konfigurasi website dan akun admin</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="btn-brown disabled:opacity-60"
          title="Simpan Semua Pengaturan"
          aria-label="Simpan Semua Pengaturan"
        >
          {saveMutation.isPending ? 'Menyimpan...' : '💾 Simpan Semua'}
        </button>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        {/* Sidebar tabs */}
        <div className="space-y-1">
          {groups.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setActiveTab(g)}
              className={`w-full text-left px-4 py-3 rounded-[4px] text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === g ? 'bg-brown-700 text-white' : 'text-brown-600 hover:bg-cream-200'
              }`}
              title={GROUP_LABELS[g] || g}
              aria-label={GROUP_LABELS[g] || g}
            >
              <span>{GROUP_ICONS[g] || '⚙️'}</span>
              <span>{GROUP_LABELS[g] || g}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`w-full text-left px-4 py-3 rounded-[4px] text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'password'
                ? 'bg-brown-700 text-white'
                : 'text-brown-600 hover:bg-cream-200'
            }`}
            title="Ubah Password Admin"
            aria-label="Ubah Password Admin"
          >
            <span>🔐</span>
            <span>Ubah Password</span>
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-[4px] border border-cream-200 p-6 shadow-sm">
          {activeTab === 'password' ? (
            <>
              <h2 className="font-serif text-lg font-bold text-brown-700 mb-1">
                🔐 Ubah Password Admin
              </h2>
              <p className="text-xs text-brown-400 mb-5">
                Akun: <strong>{adminName}</strong>
              </p>
              <div className="space-y-4 max-w-sm">
                {[
                  { label: 'Password Lama', key: 'current', placeholder: '••••••••' },
                  { label: 'Password Baru', key: 'newPw', placeholder: 'Minimal 6 karakter' },
                  { label: 'Konfirmasi', key: 'confirm', placeholder: 'Ulangi password baru' }
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label
                      htmlFor={`pw_${key}`}
                      className="block text-xs font-semibold text-brown-400 uppercase tracking-wider mb-1.5"
                    >
                      {label}
                    </label>
                    <input
                      id={`pw_${key}`}
                      name={`pw_${key}`}
                      type="password"
                      title={label}
                      aria-label={label}
                      value={pwForm[key as keyof typeof pwForm]}
                      onChange={(e) => setPwForm((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="form-input text-brown-900 font-sans"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handlePasswordChange}
                  disabled={passwordMutation.isPending}
                  className="w-full py-3 bg-brown-700 text-white font-semibold rounded-[4px] hover:bg-brown-600 transition-colors disabled:opacity-60"
                  title="Ubah Password"
                  aria-label="Ubah Password"
                >
                  {passwordMutation.isPending ? 'Menyimpan...' : '🔐 Ubah Password'}
                </button>
              </div>
            </>
          ) : activeTab === 'about' ? (
            <div className="space-y-6">
              <h2 className="font-serif text-lg font-bold text-brown-700 mb-1">
                🌟 Pengaturan Tentang Kami
              </h2>
              <p className="text-sm text-brown-400 mb-6 border-b border-cream-200 pb-4">
                Atur narasi dan cerita di halaman Tentang Kami.
              </p>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="about_hero_title"
                    className="block text-sm font-semibold text-brown-700 mb-1"
                  >
                    Hero Title
                  </label>
                  <input
                    id="about_hero_title"
                    name="about_hero_title"
                    type="text"
                    title="Hero Title"
                    aria-label="Hero Title"
                    value={values.about_hero_title || ''}
                    onChange={(e) => setValues({ ...values, about_hero_title: e.target.value })}
                    className="w-full bg-cream-50 border border-cream-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-brand/50 transition-all text-brown-900"
                    placeholder="Contoh: Pisang Goreng"
                  />
                </div>
                <div>
                  <label
                    htmlFor="about_hero_subtitle"
                    className="block text-sm font-semibold text-brown-700 mb-1"
                  >
                    Hero Subtitle
                  </label>
                  <input
                    id="about_hero_subtitle"
                    name="about_hero_subtitle"
                    type="text"
                    title="Hero Subtitle"
                    aria-label="Hero Subtitle"
                    value={values.about_hero_subtitle || ''}
                    onChange={(e) => setValues({ ...values, about_hero_subtitle: e.target.value })}
                    className="w-full bg-cream-50 border border-cream-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-brand/50 transition-all text-brown-900"
                    placeholder="Contoh: Van Java"
                  />
                </div>
                <div>
                  <label
                    htmlFor="about_desc1"
                    className="block text-sm font-semibold text-brown-700 mb-1"
                  >
                    Deskripsi Utama 1
                  </label>
                  <textarea
                    id="about_desc1"
                    name="about_desc1"
                    title="Deskripsi Utama 1"
                    aria-label="Deskripsi Utama 1"
                    placeholder="Masukkan deskripsi utama 1..."
                    value={values.about_desc1 || ''}
                    onChange={(e) => setValues({ ...values, about_desc1: e.target.value })}
                    className="w-full bg-cream-50 border border-cream-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-brand/50 transition-all text-brown-900"
                    rows={3}
                  />
                </div>
                <div>
                  <label
                    htmlFor="about_desc2"
                    className="block text-sm font-semibold text-brown-700 mb-1"
                  >
                    Deskripsi Utama 2
                  </label>
                  <textarea
                    id="about_desc2"
                    name="about_desc2"
                    title="Deskripsi Utama 2"
                    aria-label="Deskripsi Utama 2"
                    placeholder="Masukkan deskripsi utama 2..."
                    value={values.about_desc2 || ''}
                    onChange={(e) => setValues({ ...values, about_desc2: e.target.value })}
                    className="w-full bg-cream-50 border border-cream-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-brand/50 transition-all text-brown-900"
                    rows={3}
                  />
                </div>
                <div>
                  <label
                    htmlFor="about_story_title"
                    className="block text-sm font-semibold text-brown-700 mb-1"
                  >
                    Story Title
                  </label>
                  <input
                    id="about_story_title"
                    name="about_story_title"
                    title="Story Title"
                    aria-label="Story Title"
                    placeholder="Masukkan judul cerita..."
                    type="text"
                    value={values.about_story_title || ''}
                    onChange={(e) => setValues({ ...values, about_story_title: e.target.value })}
                    className="w-full bg-cream-50 border border-cream-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-brand/50 transition-all text-brown-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="about_story_subtitle"
                    className="block text-sm font-semibold text-brown-700 mb-1"
                  >
                    Story Subtitle
                  </label>
                  <input
                    id="about_story_subtitle"
                    name="about_story_subtitle"
                    title="Story Subtitle"
                    aria-label="Story Subtitle"
                    placeholder="Masukkan sub-judul cerita..."
                    type="text"
                    value={values.about_story_subtitle || ''}
                    onChange={(e) => setValues({ ...values, about_story_subtitle: e.target.value })}
                    className="w-full bg-cream-50 border border-cream-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-brand/50 transition-all text-brown-900"
                  />
                </div>
              </div>
            </div>
          ) : activeTab === 'home' ? (
            <div className="space-y-6">
              <h2 className="font-serif text-lg font-bold text-brown-700 mb-1">
                🏠 Pengaturan Beranda (Home)
              </h2>
              <p className="text-sm text-brown-400 mb-6 border-b border-cream-200 pb-4">
                Atur narasi utama di halaman beranda.
              </p>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="home_hero_title"
                    className="block text-sm font-semibold text-brown-700 mb-1"
                  >
                    Hero Title
                  </label>
                  <input
                    id="home_hero_title"
                    name="home_hero_title"
                    title="Hero Title"
                    aria-label="Hero Title"
                    placeholder="Masukkan judul utama beranda..."
                    type="text"
                    value={values.home_hero_title || ''}
                    onChange={(e) => setValues({ ...values, home_hero_title: e.target.value })}
                    className="w-full bg-cream-50 border border-cream-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-brand/50 transition-all text-brown-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="home_hero_subtitle"
                    className="block text-sm font-semibold text-brown-700 mb-1"
                  >
                    Hero Subtitle
                  </label>
                  <input
                    id="home_hero_subtitle"
                    name="home_hero_subtitle"
                    title="Hero Subtitle"
                    aria-label="Hero Subtitle"
                    placeholder="Masukkan sub-judul beranda..."
                    type="text"
                    value={values.home_hero_subtitle || ''}
                    onChange={(e) => setValues({ ...values, home_hero_subtitle: e.target.value })}
                    className="w-full bg-cream-50 border border-cream-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-brand/50 transition-all text-brown-900"
                  />
                </div>
              </div>
            </div>
          ) : activeTab === 'contact' ? (
            <div className="space-y-6">
              <h2 className="font-serif text-lg font-bold text-brown-700 mb-1">
                📞 Pengaturan Kontak & Lokasi
              </h2>
              <p className="text-sm text-brown-400 mb-6 border-b border-cream-200 pb-4">
                Kelola informasi kontak dan URL Map.
              </p>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="nomor_wa"
                    className="block text-sm font-semibold text-brown-700 mb-1"
                  >
                    WhatsApp CS
                  </label>
                  <input
                    id="nomor_wa"
                    name="nomor_wa"
                    title="WhatsApp CS"
                    aria-label="WhatsApp CS"
                    type="text"
                    value={values.nomor_wa || ''}
                    onChange={(e) => setValues({ ...values, nomor_wa: e.target.value })}
                    className="w-full bg-cream-50 border border-cream-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-brand/50 transition-all text-brown-900"
                    placeholder="628123456789"
                  />
                </div>
                <div>
                  <label
                    htmlFor="alamat"
                    className="block text-sm font-semibold text-brown-700 mb-1"
                  >
                    Alamat Lengkap
                  </label>
                  <textarea
                    id="alamat"
                    name="alamat"
                    title="Alamat Lengkap"
                    aria-label="Alamat Lengkap"
                    placeholder="Masukkan alamat lengkap toko..."
                    value={values.alamat || ''}
                    onChange={(e) => setValues({ ...values, alamat: e.target.value })}
                    className="w-full bg-cream-50 border border-cream-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-brand/50 transition-all text-brown-900"
                    rows={3}
                  />
                </div>
                <div>
                  <label
                    htmlFor="jam_operasional"
                    className="block text-sm font-semibold text-brown-700 mb-1"
                  >
                    Jam Operasional
                  </label>
                  <input
                    id="jam_operasional"
                    name="jam_operasional"
                    title="Jam Operasional"
                    aria-label="Jam Operasional"
                    type="text"
                    value={values.jam_operasional || ''}
                    onChange={(e) => setValues({ ...values, jam_operasional: e.target.value })}
                    className="w-full bg-cream-50 border border-cream-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-brand/50 transition-all text-brown-900"
                    placeholder="Setiap Hari: 10.00-21.00 WIB"
                  />
                </div>
              </div>
            </div>
          ) : activeTab === 'store' ? (
            <div className="space-y-6">
              <h2 className="font-serif text-lg font-bold text-brown-700 mb-1">
                🏪 Pengaturan Toko
              </h2>
              <p className="text-sm text-brown-400 mb-6 border-b border-cream-200 pb-4">
                Kelola biaya dan pengaturan operasional.
              </p>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="store_delivery_fee"
                    className="block text-sm font-semibold text-brown-700 mb-1"
                  >
                    Biaya Pengiriman / Delivery Fee (Flat Rate)
                  </label>
                  <input
                    id="store_delivery_fee"
                    name="store_delivery_fee"
                    title="Biaya Pengiriman"
                    aria-label="Biaya Pengiriman"
                    type="number"
                    value={values.store_delivery_fee || '0'}
                    onChange={(e) => setValues({ ...values, store_delivery_fee: e.target.value })}
                    className="w-full bg-cream-50 border border-cream-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-brand/50 transition-all text-brown-900"
                    placeholder="Contoh: 10000"
                  />
                  <div className="text-xs text-brown-400 mt-1">
                    Akan otomatis ditambahkan ke total belanja ketika pelanggan memilih metode
                    "Pesan Antar (Delivery)".
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="font-serif text-lg font-bold text-brown-700 mb-1">
                {GROUP_ICONS[activeTab]} {GROUP_LABELS[activeTab] || activeTab}
              </h2>
              <p className="text-sm text-brown-400 mb-6 border-b border-cream-200 pb-4">
                Atur nilai pengaturan untuk kategori ini.
              </p>
              <div className="space-y-4">
                {groupSettings.map((s) => {
                  const isBoolean =
                    values[s.key] === 'true' ||
                    values[s.key] === 'false' ||
                    s.value === 'true' ||
                    s.value === 'false'
                  const cleanLabelText = cleanLabel(s.label, s.key)
                  return (
                    <div key={s.key}>
                      <label
                        htmlFor={s.key}
                        className="block text-xs font-semibold text-brown-400 uppercase tracking-wider mb-1.5"
                      >
                        {cleanLabelText}
                      </label>
                      {s.key === 'store_status' ? (
                        <select
                          id={s.key}
                          name={s.key}
                          title={cleanLabelText}
                          aria-label={cleanLabelText}
                          value={values[s.key] || 'AUTO'}
                          onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                          className="w-full bg-cream-50 border border-cream-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-brand/50 transition-all text-brown-900"
                        >
                          <option value="AUTO">Otomatis (Ikuti Jam Operasional)</option>
                          <option value="OPEN">Buka Paksa (Selalu Buka)</option>
                          <option value="CLOSED">Tutup Sementara (Selalu Tutup)</option>
                        </select>
                      ) : isBoolean ? (
                        <button
                          id={s.key}
                          name={s.key}
                          type="button"
                          title={cleanLabelText}
                          aria-label={cleanLabelText}
                          onClick={() =>
                            setValues((v) => ({
                              ...v,
                              [s.key]: v[s.key] === 'true' ? 'false' : 'true'
                            }))
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-[4px] transition-colors focus:outline-none ${
                            values[s.key] === 'true'
                              ? 'bg-secondary'
                              : 'bg-zinc-300 dark:bg-zinc-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-[4px] bg-white transition-transform ${
                              values[s.key] === 'true' ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      ) : (values[s.key] || '').length > 80 ? (
                        <textarea
                          id={s.key}
                          name={s.key}
                          title={cleanLabelText}
                          aria-label={cleanLabelText}
                          placeholder={cleanLabelText}
                          value={values[s.key] || ''}
                          onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                          rows={3}
                          className="form-input resize-none text-brown-900"
                        />
                      ) : (
                        <input
                          id={s.key}
                          name={s.key}
                          title={cleanLabelText}
                          aria-label={cleanLabelText}
                          placeholder={cleanLabelText}
                          type="text"
                          value={values[s.key] || ''}
                          onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                          className="form-input text-brown-900"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
