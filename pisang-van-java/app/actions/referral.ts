"use server";

import { auth } from "@/src/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const referralInputSchema = z.object({
  code: z.string().trim().toUpperCase().min(5, "Kode tidak valid"),
});

/**
 * 1. Generate Referral Code jika belum punya
 */
export async function generateMyReferralCode() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.referralCode) return { code: user.referralCode };

  // Generate kode unik berbasis waktu/nama
  const baseName = (session.user.name || "PVJ").substring(0, 4).toUpperCase().replace(/\s/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const newCode = `${baseName}-${randomSuffix}`;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { referralCode: newCode },
  });

  revalidatePath("/profile/referral");
  return { code: newCode };
}

/**
 * 2. Apply Referral Code dari teman
 */
export async function applyReferralCode(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const rawCode = formData.get("code") as string;
  const { code } = referralInputSchema.parse({ code: rawCode });

  const currentUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  
  if (!currentUser) throw new Error("Pengguna tidak ditemukan.");
  if (currentUser.referredBy) throw new Error("Anda sudah menggunakan kode rujukan sebelumnya.");
  if (currentUser.hasOrdered) throw new Error("Kode rujukan hanya untuk pengguna yang belum pernah memesan.");
  if (currentUser.referralCode === code) throw new Error("Tidak dapat memasukkan kode rujukan milik sendiri.");

  // Cari siapa pemilik kode ini
  const inviter = await prisma.user.findUnique({ where: { referralCode: code } });
  if (!inviter) throw new Error("Kode rujukan tidak valid atau tidak ditemukan.");

  // Tautkan relasi
  await prisma.user.update({
    where: { id: session.user.id },
    data: { referredBy: inviter.id },
  });

  revalidatePath("/profile/referral");
  return { success: true, message: "Kode undangan berhasil diterapkan!" };
}

/**
 * 3. Tarik Statistik Referral
 */
export async function getReferralStats() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  
  const invitedCount = await prisma.user.count({
    where: { referredBy: session.user.id }
  });

  const successfulOrdersCount = await prisma.user.count({
    where: { referredBy: session.user.id, hasOrdered: true }
  });

  return {
    myCode: user?.referralCode || null,
    invitedCount,
    successfulOrdersCount,
    // Asumsi: Setiap teman sukses order = 5000 Koin
    potentialKoin: successfulOrdersCount * 5000 
  };
}
