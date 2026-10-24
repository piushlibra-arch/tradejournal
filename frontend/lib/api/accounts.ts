import apiClient from "./client"

export interface Account {
  id: string
  name: string
  broker_name: string | null
  account_type: string
  currency: string
  initial_balance: string
  start_date: string | null
  status: string
  account_rules: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface CreateAccountPayload {
  name: string
  broker_name?: string
  account_type?: string
  currency?: string
  initial_balance?: string
  start_date?: string
  account_rules?: Record<string, unknown>
}

export interface UpdateAccountPayload {
  name?: string
  broker_name?: string
  account_type?: string
  currency?: string
  initial_balance?: string
  start_date?: string
  status?: string
  account_rules?: Record<string, unknown>
}

export const accountsApi = {
  list: async (): Promise<Account[]> => {
    const res = await apiClient.get<Account[]>("/accounts")
    return res.data
  },

  create: async (data: CreateAccountPayload): Promise<Account> => {
    const res = await apiClient.post<Account>("/accounts", data)
    return res.data
  },

  get: async (id: string): Promise<Account> => {
    const res = await apiClient.get<Account>(`/accounts/${id}`)
    return res.data
  },

  update: async (id: string, data: UpdateAccountPayload): Promise<Account> => {
    const res = await apiClient.patch<Account>(`/accounts/${id}`, data)
    return res.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/accounts/${id}`)
  },
}
