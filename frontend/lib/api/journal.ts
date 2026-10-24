import apiClient from "./client"

export interface JournalEntry {
  id: string
  user_id: string
  date: string
  pre_market_plan: string | null
  post_market_review: string | null
  lessons_learned: string | null
  emotional_state: string | null
  discipline_score: number | null
  market_bias: string | null
  screenshots: any[] | null
  created_at: string
  updated_at: string
}

export interface JournalEntryPayload {
  date: string
  pre_market_plan?: string | null
  post_market_review?: string | null
  lessons_learned?: string | null
  emotional_state?: string | null
  discipline_score?: number | null
  market_bias?: string | null
  screenshots?: any[] | null
}

export interface JournalListResponse {
  items: JournalEntry[]
  total: number
}

export const journalApi = {
  get: async (dateStr: string): Promise<JournalEntry> => {
    const res = await apiClient.get<JournalEntry>(`/journal/${dateStr}`)
    return res.data
  },

  save: async (payload: JournalEntryPayload): Promise<JournalEntry> => {
    const res = await apiClient.post<JournalEntry>("/journal", payload)
    return res.data
  },

  list: async (startDate?: string, endDate?: string): Promise<JournalListResponse> => {
    const params: Record<string, string> = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    const res = await apiClient.get<JournalListResponse>("/journal", { params })
    return res.data
  },

  delete: async (dateStr: string): Promise<void> => {
    await apiClient.delete(`/journal/${dateStr}`)
  },
}
