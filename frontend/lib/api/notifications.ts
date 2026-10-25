import apiClient from "./client"

export interface NotificationItem {
  id: string
  user_id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  is_read: boolean
  action_url: string | null
  extra_data: Record<string, unknown> | null
  created_at: string
}

export interface NotificationListResponse {
  notifications: NotificationItem[]
  total: number
  unread_count: number
}

export const notificationsApi = {
  list: async (limit: number = 20, unreadOnly: boolean = false): Promise<NotificationListResponse> => {
    try {
      const res = await apiClient.get<NotificationListResponse>("/notifications", {
        params: { limit, unread_only: unreadOnly },
      })
      return res.data
    } catch {
      return { notifications: [], total: 0, unread_count: 0 }
    }
  },

  markAsRead: async (id: string): Promise<NotificationItem | null> => {
    try {
      const res = await apiClient.patch<NotificationItem>(`/notifications/${id}/read`)
      return res.data
    } catch {
      return null
    }
  },

  markAllAsRead: async (): Promise<number> => {
    try {
      const res = await apiClient.post<{ marked_read: number }>("/notifications/read-all")
      return res.data.marked_read
    } catch {
      return 0
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/notifications/${id}`)
      return true
    } catch {
      return false
    }
  },
}
