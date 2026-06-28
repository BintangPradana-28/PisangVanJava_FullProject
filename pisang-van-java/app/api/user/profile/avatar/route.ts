import { nanoid } from 'nanoid'
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/src/auth'
import { createSupabaseAuthClient } from '@/src/lib/supabase-auth-client'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    const supabaseToken = session?.supabaseAccessToken

    if (!session || !userId || !supabaseToken) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized or missing JWT bridge.' },
        { status: 401 }
      )
    }

    const supabase = createSupabaseAuthClient(supabaseToken)

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ success: false, message: 'File tidak ditemukan' }, { status: 400 })
    }

    // Validasi ukuran
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'Ukuran maksimal 2MB' }, { status: 400 })
    }

    // Validasi tipe (optional tapi disarankan)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, message: 'Format file tidak didukung' },
        { status: 400 }
      )
    }

    const ext = file.name.split('.').pop()
    const fileName = `${userId}-${nanoid()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars') // Asumsi bucket bernama 'avatars' sudah ada di Supabase
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('Supabase Storage Error:', uploadError)
      return NextResponse.json(
        { success: false, message: 'Gagal mengunggah ke penyimpanan.' },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName)

    const publicUrl = publicUrlData.publicUrl

    // Simpan ke DB
    await prisma.user.update({
      where: { id: userId },
      data: { image: publicUrl }
    })

    return NextResponse.json({ success: true, data: { url: publicUrl } })
  } catch (error) {
    console.error('POST /api/user/profile/avatar Error:', error)
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    const supabaseToken = session?.supabaseAccessToken

    if (!session || !userId || !supabaseToken) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized or missing JWT bridge.' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true }
    })

    if (!user?.image) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada foto untuk dihapus' },
        { status: 400 }
      )
    }

    // Extract filename from URL (assuming format: .../avatars/filename.ext)
    const urlParts = user.image.split('/')
    const fileName = urlParts[urlParts.length - 1]

    if (fileName) {
      const supabase = createSupabaseAuthClient(supabaseToken)
      const { error: deleteError } = await supabase.storage.from('avatars').remove([fileName])
      if (deleteError) {
        console.error('Supabase Storage Delete Error:', deleteError)
        // Lanjutkan hapus di DB meskipun gagal di storage untuk konsistensi user experience
      }
    }

    // Hapus dari DB
    await prisma.user.update({
      where: { id: userId },
      data: { image: null }
    })

    return NextResponse.json({ success: true, message: 'Foto berhasil dihapus' })
  } catch (error) {
    console.error('DELETE /api/user/profile/avatar Error:', error)
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 })
  }
}
