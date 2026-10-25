import apiClient from "./client"

export interface Tag {
  id: string
  name: string
  color: string | null
}

export interface Trade {
  id: string
  account_id: string
  symbol: string
  asset_class: string | null
  direction: "long" | "short"
  entry_time: string
  exit_time: string | null
  entry_price: string
  exit_price: string | null
  quantity: string
  contract_size: string
  gross_pnl: string | null
  commission: string
  fees: string
  swap: string
  net_pnl: string | null
  stop_loss_price: string | null
  take_profit_price: string | null
  setup_name: string | null
  strategy_id: string | null
  trading_session: string | null
  market_condition: string | null
  emotion_before: string | null
  emotion_during: string | null
  emotion_after: string | null
  followed_plan: boolean | null
  mistake_classification: string | null
  notes: string | null
  import_source: string | null
  external_id: string | null
  charges_breakdown?: {
    brokerage?: number
    stt?: number
    exchange_turnover?: number
    sebi_turnover?: number
    stamp_duty?: number
    gst?: number
    other_charges?: number
    total_charges?: number
    provenance?: string
  } | null
  charge_provenance?: string | null
  status: string
  tags: Tag[]
  created_at: string
  updated_at: string
}

export interface TradeListResponse {
  trades: Trade[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface TradeFilters {
  page?: number
  page_size?: number
  account_id?: string
  symbol?: string
  direction?: string
  status?: string
  start_date?: string
  end_date?: string
  min_pnl?: number
  max_pnl?: number
  setup_name?: string
  sort_by?: string
  sort_order?: string
}

export interface CreateTradePayload {
  account_id: string
  symbol: string
  asset_class?: string
  direction: "long" | "short"
  entry_time: string
  exit_time?: string
  entry_price: string
  exit_price?: string
  quantity: string
  contract_size?: string
  gross_pnl?: string
  commission?: string
  fees?: string
  swap?: string
  net_pnl?: string
  stop_loss_price?: string
  take_profit_price?: string
  setup_name?: string
  strategy_id?: string
  trading_session?: string
  market_condition?: string
  emotion_before?: string
  emotion_during?: string
  emotion_after?: string
  followed_plan?: boolean
  mistake_classification?: string
  notes?: string
  status?: string
  tag_ids?: string[]
}

export const tradesApi = {
  list: async (filters?: TradeFilters): Promise<TradeListResponse> => {
    const res = await apiClient.get<TradeListResponse>("/trades", { params: filters })
    return res.data
  },

  create: async (payload: CreateTradePayload): Promise<Trade> => {
    const res = await apiClient.post<Trade>("/trades", payload)
    return res.data
  },

  get: async (id: string): Promise<Trade> => {
    const res = await apiClient.get<Trade>(`/trades/${id}`)
    return res.data
  },

  update: async (id: string, payload: Partial<CreateTradePayload>): Promise<Trade> => {
    const res = await apiClient.patch<Trade>(`/trades/${id}`, payload)
    return res.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/trades/${id}`)
  },
}
