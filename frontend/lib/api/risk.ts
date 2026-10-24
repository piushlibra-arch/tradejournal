import apiClient from "./client"

export interface RiskRule {
  id: string
  user_id: string
  account_id: string | null
  rule_type: string
  threshold: string
  action: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RiskEvaluationItem {
  rule_id: string
  rule_type: string
  threshold: string
  current_value: string
  status: "safe" | "warning" | "breached"
  message: string
  account_id: string | null
}

export interface RiskStatusReport {
  overall_status: "safe" | "warning" | "breached"
  evaluations: RiskEvaluationItem[]
  rules_checked: number
  breaches_count: number
  warnings_count: number
}

export interface RiskRuleCreatePayload {
  rule_type: string
  threshold: number | string
  action?: string
  is_active?: boolean
  account_id?: string | null
}

export interface RiskRuleListResponse {
  items: RiskRule[]
  total: number
}

export const riskApi = {
  getStatus: async (accountId?: string): Promise<RiskStatusReport> => {
    const params: Record<string, string> = {}
    if (accountId) params.account_id = accountId
    const res = await apiClient.get<RiskStatusReport>("/risk/status", { params })
    return res.data
  },

  listRules: async (accountId?: string): Promise<RiskRuleListResponse> => {
    const params: Record<string, string> = {}
    if (accountId) params.account_id = accountId
    const res = await apiClient.get<RiskRuleListResponse>("/risk/rules", { params })
    return res.data
  },

  createRule: async (payload: RiskRuleCreatePayload): Promise<RiskRule> => {
    const res = await apiClient.post<RiskRule>("/risk/rules", payload)
    return res.data
  },

  updateRule: async (id: string, payload: Partial<RiskRuleCreatePayload>): Promise<RiskRule> => {
    const res = await apiClient.patch<RiskRule>(`/risk/rules/${id}`, payload)
    return res.data
  },

  deleteRule: async (id: string): Promise<void> => {
    await apiClient.delete(`/risk/rules/${id}`)
  },
}
