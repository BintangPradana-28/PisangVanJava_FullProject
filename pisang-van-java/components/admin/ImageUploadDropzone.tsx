'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';

interface ImageUploadDropzoneProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUploadDropzone({ value, onChange, label = "Upload Gambar" }: ImageUploadDropzoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Frontend validation (Max 2MB to match server)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    const toastId = toast.loading('Mengunggah gambar...');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengunggah gambar');
      }

      toast.success('Gambar berhasil diunggah', { id: toastId });
      onChange(data.data.url);
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <label className="block text-xs font-semibold text-brown-500 uppercase tracking-wider mb-2">
        {label}
      </label>
      
      <div className="flex flex-col gap-3">
        {value && (
          <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-cream-300">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-1 right-1 bg-red-500 text-white p-1 text-xs rounded-lg hover:bg-red-600 transition"
              title="Hapus gambar"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            id={`file-upload-${label.replace(/\s+/g, '-')}`}
          />
          <label
            htmlFor={`file-upload-${label.replace(/\s+/g, '-')}`}
            className={`cursor-pointer px-4 py-2 border border-dashed rounded-xl font-semibold text-sm transition-all
              ${isUploading 
                ? 'bg-cream-100 border-cream-300 text-brown-300 cursor-not-allowed' 
                : 'bg-white border-brown-300 text-brown-600 hover:bg-brown-50 hover:border-brown-500'
              }`}
          >
            {isUploading ? 'Sedang Mengunggah...' : value ? 'Ganti Gambar' : 'Pilih File (Max 2MB)'}
          </label>
          {!value && !isUploading && (
            <span className="text-xs text-brown-400">Atau masukkan URL secara manual:</span>
          )}
        </div>
        
        {!value && (
           <input 
             type="url" 
             placeholder="https://..." 
             className="w-full border border-cream-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brown-500 transition-all mt-1"
             value={value} 
             onChange={e => onChange(e.target.value)} 
           />
        )}
      </div>
    </div>
  );
}
