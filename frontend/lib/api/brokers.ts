import apiClient from "./client"

export interface BrokerProvider {
  id: string
  name: string
  country: string
  features: string[]
  status: "active" | "planned_gateway" | "inactive"
  auth_fields: Array<{
    key: string
    label: string
    type: string
    required: boolean
  }>
}

export interface BrokerConnection {
  id: string
  broker_id: string
  client_id: string
  account_id: string | null
  is_active: boolean
  sync_status: "idle" | "syncing" | "success" | "error"
  last_sync_at: string | null
  last_error: string | null
  created_at: string
}

export interface BrokerSyncResult {
  broker_id: string
  total_fetched: number
  new_executions: number
  new_trades: number
  skipped_duplicates: number
  last_sync_at: string
}

export const brokersApi = {
  getProviders: async (): Promise<BrokerProvider[]> => {
    try {
      const res = await apiClient.get<BrokerProvider[]>("/brokers/providers")
      return res.data
    } catch {
      return []
    }
  },

  getConnections: async (): Promise<BrokerConnection[]> => {
    try {
      const res = await apiClient.get<BrokerConnection[]>("/brokers/connections")
      return res.data
    } catch {
      return []
    }
  },

  connect: async (payload: {
    broker_id: string
    client_id: string
    access_token: string
    account_id?: string
  }): Promise<{ status: string; client_id: string; available_cash: number }> => {
    const res = await apiClient.post("/brokers/connect", payload)
    return res.data
  },

  sync: async (brokerId: string = "dhan"): Promise<BrokerSyncResult> => {
    const res = await apiClient.post<BrokerSyncResult>("/brokers/sync", null, {
      params: { broker_id: brokerId },
    })
    return res.data
  },

  disconnect: async (connectionId: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/brokers/${connectionId}`)
      return true
    } catch {
      return false
    }
  },
}
