'use client'

import { useAdminRealtimeSync } from '@/src/hooks/admin/use-admin-realtime'

export default function AdminSyncWrapper() {
  useAdminRealtimeSync()
  return null
}
