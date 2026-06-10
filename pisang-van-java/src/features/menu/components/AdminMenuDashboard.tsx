'use client'

import { useState, useEffect } from 'react'
import { ProductType } from './MenuCards'
import { createMenuVariantSchema, CreateMenuVariantInput } from '../schemas'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { toggleAvailability, updateMenuStock } from '@/app/actions/menu'
import ImageUploadDropzone from '@/components/admin/ImageUploadDropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/src/lib/api'
import { FetchError } from 'ofetch'

export default function AdminMenuDashboard({ initialProducts }: { initialProducts: ProductType[] }) {
  const [products, setProducts] = useState<ProductType[]>(initialProducts)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<CreateMenuVariantInput>({
    flavorName: '',
    priceKembung: 0,
    priceLumpia: 0,
    priceKrispy: 0,
    wholesaleKembung: 0,
    wholesaleLumpia: 0,
    wholesaleKrispy: 0,
    imageUrl: '',
    deskripsi_topping: '',
    isActive: true,
    isAvailable: true,
    tags: [],
  })

  // SSE Listener for Real-Time Sync
  useEffect(() => {
    const eventSource = new EventSource('/api/admin/events');

    eventSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      if (parsed.type === 'connected') {
        console.log('SSE Connected');
        return;
      }

      if (parsed.action === 'CREATE') {
        setProducts(prev => [parsed.data, ...prev]);
        toast('New menu added remotely!', { icon: '🔄' });
      } else if (parsed.action === 'UPDATE') {
        setProducts(prev => prev.map(p => p.id === parsed.data.id ? parsed.data : p));
        toast('Menu updated remotely!', { icon: '🔄' });
      } else if (parsed.action === 'DELETE') {
        setProducts(prev => prev.filter(p => p.id !== parsed.data.id));
        toast('Menu deleted remotely!', { icon: '🗑️' });
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Open form for adding
  const handleAddClick = () => {
    setEditingId(null)
    setFormData({
      flavorName: '',
      priceKembung: 0,
      priceLumpia: 0,
      priceKrispy: 0,
      wholesaleKembung: 0,
      wholesaleLumpia: 0,
      wholesaleKrispy: 0,
      imageUrl: '',
      deskripsi_topping: '',
      isActive: true,
      isAvailable: true,
      tags: [],
    })
    setIsFormOpen(true)
  }

  // Open form for editing
  const handleEditClick = (p: ProductType) => {
    setEditingId(p.id)
    setFormData({
      flavorName: p.flavorName,
      priceKembung: p.priceKembung,
      priceLumpia: p.priceLumpia,
      priceKrispy: p.priceKrispy,
      wholesaleKembung: p.wholesaleKembung,
      wholesaleLumpia: p.wholesaleLumpia,
      wholesaleKrispy: p.wholesaleKrispy,
      imageUrl: p.imageUrl || '',
      deskripsi_topping: p.deskripsi_topping || '',
      isActive: true,
      isAvailable: p.isAvailable,
      tags: p.tags || [],
    })
    setIsFormOpen(true)
  }

  const deleteMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string, name: string }) => {
      const res = await api<{ success?: boolean; error?: string }>(`/api/admin/menu/${id}`, { method: 'DELETE' })
      if (res.error) throw new Error(res.error)
      return { id, name }
    },
    onSuccess: (data) => {
      toast.success(`Menu "${data.name}" berhasil dihapus`)
      setProducts(products.filter(p => p.id !== data.id))
    },
    onError: (error: FetchError | Error) => {
      const msg = error instanceof FetchError ? (error.data?.error || 'Gagal menghapus menu') : error.message
      toast.error(msg || 'Terjadi kesalahan')
    }
  })

  // Handle delete item
  const handleDeleteClick = (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus varian "${name}"?`)) return
    deleteMutation.mutate({ id, name })
  }

  const handleToggleAvailability = async (id: string, currentStatus: boolean) => {
    // Optimistic update
    setProducts(products.map(p => p.id === id ? { ...p, isAvailable: !currentStatus } : p));
    
    try {
      const res = await toggleAvailability(id, !currentStatus);
      if (!res.success) {
        toast.error(res.error || 'Gagal mengubah status stok');
        setProducts(products.map(p => p.id === id ? { ...p, isAvailable: currentStatus } : p));
      } else {
        toast.success(res.message || 'Status stok diperbarui');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan koneksi');
      setProducts(products.map(p => p.id === id ? { ...p, isAvailable: currentStatus } : p));
    }
  }

  const handleUpdateStock = async (id: string, newStock: number, currentStock: number) => {
    if (newStock < 0) return;
    
    // Optimistic update
    setProducts(products.map(p => p.id === id ? { ...p, stock: newStock } : p));
    
    try {
      const res = await updateMenuStock(id, newStock);
      if (!res.success) {
        toast.error(res.error || 'Gagal mengubah stok');
        setProducts(products.map(p => p.id === id ? { ...p, stock: currentStock } : p));
      } else {
        toast.success(res.message || 'Stok diperbarui', { icon: '📦' });
      }
    } catch (err) {
      toast.error('Terjadi kesalahan koneksi');
      setProducts(products.map(p => p.id === id ? { ...p, stock: currentStock } : p));
    }
  }

  const saveMutation = useMutation({
    mutationFn: async (validData: any) => {
      const url = editingId ? `/api/admin/menu/${editingId}` : '/api/admin/menu'
      const method = editingId ? 'PUT' : 'POST'

      const res = await api<{ success?: boolean; data: any; error?: string; message?: string }>(url, {
        method: method,
        body: validData,
      })
      
      if (res.error || (!res.success && res.message)) throw new Error(res.error || res.message || 'Terjadi kesalahan')
      return { data: res.data, isEdit: !!editingId }
    },
    onSuccess: ({ data, isEdit }) => {
      if (isEdit) {
        setProducts(products.map(p => p.id === editingId ? data : p))
        toast.success('Menu berhasil diperbarui')
      } else {
        setProducts([data, ...products])
        toast.success('Menu baru berhasil ditambahkan')
      }
      setIsFormOpen(false)
      setEditingId(null)
      setFormData({ flavorName: '', priceKembung: 0, priceLumpia: 0, priceKrispy: 0, wholesaleKembung: 0, wholesaleLumpia: 0, wholesaleKrispy: 0, imageUrl: '', deskripsi_topping: '', isActive: true, isAvailable: true, tags: [] })
    },
    onError: (error: FetchError | Error) => {
      const msg = error instanceof FetchError ? (error.data?.error || error.data?.message || 'Terjadi kesalahan') : error.message
      toast.error(msg)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const valid = createMenuVariantSchema.safeParse(formData)
    if (!valid.success) {
      toast.error(valid.error.issues[0].message)
      return
    }
    saveMutation.mutate(valid.data)
  }

  // Bagian Form Render (Tampil/Sembunyi)
  if (isFormOpen) {
    return (
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl max-w-xl mx-auto border-t-8 border-brown-700">
        <h2 className="font-serif font-bold text-2xl text-brown-800 mb-6 border-b pb-3 uppercase tracking-wide">
          {editingId ? 'Edit Menu Pisang Goreng' : 'Tambah Menu Baru'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-brown-500 uppercase tracking-wider mb-2">Nama Varian</label>
            <input 
              type="text" 
              className="w-full border border-cream-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brown-500 transition-all"
              placeholder="Contoh: Susu Keju Premium"
              value={formData.flavorName} 
              onChange={e => setFormData({...formData, flavorName: e.target.value})} 
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brown-500 uppercase tracking-wider mb-2">Harga Kembung</label>
              <input 
                type="number" 
                className="w-full border border-cream-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brown-500 transition-all"
                placeholder="15000"
                value={formData.priceKembung || ''} 
                onChange={e => setFormData({...formData, priceKembung: Number(e.target.value)})} 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brown-500 uppercase tracking-wider mb-2">Harga Lumpia</label>
              <input 
                type="number" 
                className="w-full border border-cream-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brown-500 transition-all"
                placeholder="15000"
                value={formData.priceLumpia || ''} 
                onChange={e => setFormData({...formData, priceLumpia: Number(e.target.value)})} 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brown-500 uppercase tracking-wider mb-2">Harga Krispy</label>
              <input 
                type="number" 
                className="w-full border border-cream-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brown-500 transition-all"
                placeholder="15000"
                value={formData.priceKrispy || ''} 
                onChange={e => setFormData({...formData, priceKrispy: Number(e.target.value)})} 
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brown-500 uppercase tracking-wider mb-2">Harga Grosir Kembung</label>
              <input 
                type="number" 
                className="w-full border border-cream-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brown-500 transition-all"
                placeholder="10000"
                value={formData.wholesaleKembung || ''} 
                onChange={e => setFormData({...formData, wholesaleKembung: Number(e.target.value)})} 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brown-500 uppercase tracking-wider mb-2">Harga Grosir Lumpia</label>
              <input 
                type="number" 
                className="w-full border border-cream-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brown-500 transition-all"
                placeholder="10000"
                value={formData.wholesaleLumpia || ''} 
                onChange={e => setFormData({...formData, wholesaleLumpia: Number(e.target.value)})} 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brown-500 uppercase tracking-wider mb-2">Harga Grosir Krispy</label>
              <input 
                type="number" 
                className="w-full border border-cream-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brown-500 transition-all"
                placeholder="10000"
                value={formData.wholesaleKrispy || ''} 
                onChange={e => setFormData({...formData, wholesaleKrispy: Number(e.target.value)})} 
              />
            </div>
          </div>
          
          <div className="mb-4">
            <ImageUploadDropzone 
              value={formData.imageUrl || ''} 
              onChange={(url) => setFormData({...formData, imageUrl: url})} 
              label="Foto Produk"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brown-500 uppercase tracking-wider mb-2">Deskripsi Topping (Penting untuk Penjualan)</label>
            <input 
              type="text" 
              placeholder="Contoh: Manis, lembut, dan lumer di mulut." 
              className="w-full border border-cream-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brown-500 transition-all"
              value={formData.deskripsi_topping || ''} 
              onChange={e => setFormData({...formData, deskripsi_topping: e.target.value})} 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-brown-500 uppercase tracking-wider mb-2">Tags (Pilih yang sesuai)</label>
            <div className="flex flex-wrap gap-2">
              {['Manis', 'Gurih', 'Premium', 'Best Seller', 'Baru', 'Rekomendasi'].map(tag => {
                const isSelected = formData.tags?.includes(tag) || false;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const newTags = isSelected 
                        ? (formData.tags || []).filter(t => t !== tag)
                        : [...(formData.tags || []), tag];
                      setFormData({ ...formData, tags: newTags });
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      isSelected 
                        ? 'bg-brown-600 text-white border-brown-600' 
                        : 'bg-white text-brown-500 border-brown-200 hover:border-brown-400'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '} {tag}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-brown-400 mt-2">Pilih tag agar badge muncul di kartu produk pelanggan. Jangan ada typo!</p>
          </div>
          
          <div className="flex gap-4 pt-4 border-t border-cream-100">
            <button 
              type="button" 
              onClick={() => { setIsFormOpen(false); setEditingId(null); }} 
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-95 flex-1"
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={saveMutation.isPending} 
              className="bg-brown-700 text-cream-100 px-6 py-3 rounded-xl font-bold hover:bg-brown-600 transition-all active:scale-95 flex-1"
            >
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // Bagian Table Render
  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-cream-200">
      <div className="p-6 flex justify-between items-center bg-brown-700 border-b border-brown-800 text-cream-100">
        <div>
          <h2 className="font-serif font-bold text-xl">Daftar Menu Pisang Goreng</h2>
          <p className="text-xs text-cream-200/80 mt-1">Kelola varian rasa, harga, dan gambar menu yang tampil di halaman utama</p>
        </div>
        <button 
          onClick={handleAddClick} 
          className="bg-cream-100 text-brown-800 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-cream-200 transition-all active:scale-95 shadow"
        >
          <span>+</span> Tambah Menu
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-cream-100/50 text-brown-800 border-b border-cream-200">
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-center w-16">No.</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider w-24">Gambar</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider">Nama Menu</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider w-40">Harga</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-center w-28">Stok</th>
              <th className="p-4 text-xs font-bold uppercase tracking-wider text-center w-48">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, index) => (
              <tr key={p.id} className="border-b border-cream-100 hover:bg-cream-50/50 transition-colors">
                <td className="p-4 text-center font-semibold text-brown-500">{index + 1}</td>
                <td className="p-4">
                  <div className="w-14 h-14 bg-cream-100 rounded-2xl overflow-hidden relative border border-cream-200 flex items-center justify-center shadow-inner">
                     {p.imageUrl ? (
                       <Image src={p.imageUrl} alt={p.flavorName} fill className="object-cover" />
                     ) : (
                       <span className="text-2xl">🍌</span>
                     )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-serif font-bold text-brown-800 text-base">{p.flavorName}</div>
                </td>
                <td className="p-4 font-bold text-brown-700 text-base">
                  <span className="text-xs font-normal">K:</span> Rp {p.priceKembung.toLocaleString('id-ID')}<br/>
                  <span className="text-xs font-normal">L:</span> Rp {p.priceLumpia.toLocaleString('id-ID')}<br/>
                  <span className="text-xs font-normal">Kr:</span> Rp {p.priceKrispy.toLocaleString('id-ID')}
                </td>
                <td className="p-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 bg-cream-100 rounded-xl p-1 border border-cream-200 shadow-sm">
                      <button 
                        onClick={() => handleUpdateStock(p.id, p.stock - 1, p.stock)}
                        className="w-7 h-7 flex items-center justify-center bg-white rounded-lg text-brown-600 font-bold hover:bg-brown-50 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={p.stock <= 0}
                      >
                        -
                      </button>
                      <input 
                        type="number"
                        min="0"
                        className="w-12 text-center font-bold text-brown-800 font-serif text-lg bg-transparent border-none p-0 m-0 focus:outline-none focus:ring-1 focus:ring-brown-400 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={p.stock}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                          setProducts(products.map(prod => prod.id === p.id ? { ...prod, stock: val === '' ? 0 : (val >= 0 ? val : 0) } : prod));
                        }}
                        onBlur={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                          if (val >= 0) {
                             // Avoid double call if it was just changed, handleUpdateStock already updates state
                             // But wait, onChange already called setProducts.
                             // handleUpdateStock also calls setProducts.
                             // We should just call updateMenuStock directly here to avoid double optimistic updates
                             updateMenuStock(p.id, val).then(res => {
                               if (!res.success) {
                                 toast.error(res.error || 'Gagal mengubah stok');
                                 // Fetch original state if needed, but keeping it simple for now
                               }
                             });
                          }
                        }}
                      />
                      <button 
                        onClick={() => handleUpdateStock(p.id, p.stock + 1, p.stock)}
                        className="w-7 h-7 flex items-center justify-center bg-brown-600 rounded-lg text-white font-bold hover:bg-brown-500 active:scale-95 transition-all shadow-sm"
                      >
                        +
                      </button>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.stock > 0 ? 'Tersedia' : 'Habis'}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex gap-2.5 justify-center">
                     <button 
                       onClick={() => handleEditClick(p)}
                       className="flex items-center gap-1 text-xs font-bold text-brown-700 bg-cream-100 hover:bg-cream-200 border border-cream-300 px-3.5 py-2 rounded-xl transition-all active:scale-95"
                     >
                       ✏️ Edit
                     </button>
                     <button 
                       onClick={() => handleDeleteClick(p.id, p.flavorName)}
                       className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3.5 py-2 rounded-xl transition-all active:scale-95"
                     >
                       🗑️ Hapus
                     </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-brown-400 font-serif">
                  <div className="text-4xl mb-2">🍌</div>
                  Belum ada menu produk aktif. Silakan tambahkan menu baru.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
