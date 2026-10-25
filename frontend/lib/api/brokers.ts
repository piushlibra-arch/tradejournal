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
  ledger_entries_imported?: number
  skipped_duplicates: number
  last_sync_at: string
}

export interface BrokerLedgerEntry {
  id: string
  external_id: string
  voucher_date: string
  voucher_number: string | null
  narration: string
  exchange: string | null
  debit: number
  credit: number
  running_balance: number
  reconciled: boolean
}

export interface BrokerLedgerSummary {
  broker_id: string
  total_records: number
  total_debit: number
  total_credit: number
  net_movement: number
  entries: BrokerLedgerEntry[]
}

export interface BrokerChargesSummary {
  broker_id: string
  trade_count: number
  charges: {
    brokerage: number
    stt: number
    exchange_turnover: number
    sebi_turnover: number
    stamp_duty: number
    gst: number
    other_charges: number
    total_charges: number
  }
  currency: string
  provenance_distribution: Record<string, number>
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

  sync: async (
    brokerId: string = "dhan",
    fromDate?: string,
    toDate?: string,
    syncLedger: boolean = true
  ): Promise<BrokerSyncResult> => {
    const res = await apiClient.post<BrokerSyncResult>("/brokers/sync", {
      broker_id: brokerId,
      from_date: fromDate,
      to_date: toDate,
      sync_ledger: syncLedger,
    })
    return res.data
  },

  getLedger: async (
    brokerId: string = "dhan",
    fromDate?: string,
    toDate?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<BrokerLedgerSummary | null> => {
    try {
      const res = await apiClient.get<BrokerLedgerSummary>("/brokers/ledger", {
        params: {
          broker_id: brokerId,
          from_date: fromDate,
          to_date: toDate,
          limit,
          offset,
        },
      })
      return res.data
    } catch {
      return null
    }
  },

  getChargesSummary: async (
    brokerId: string = "dhan",
    fromDate?: string,
    toDate?: string
  ): Promise<BrokerChargesSummary | null> => {
    try {
      const res = await apiClient.get<BrokerChargesSummary>("/brokers/charges-summary", {
        params: {
          broker_id: brokerId,
          from_date: fromDate,
          to_date: toDate,
        },
      })
      return res.data
    } catch {
      return null
    }
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
