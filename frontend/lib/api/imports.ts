import apiClient from "./client"

export interface ImportPreviewPayload {
  account_id: string
  csv_content: string
  broker_source?: string
}

export interface ImportPreviewResponse {
  delimiter: string
  headers: string[]
  sample_rows: string[][]
  suggested_mapping: Record<string, string | null>
  canonical_fields: Record<string, { label: string; required: boolean; type: string }>
}

export interface ImportValidatePayload {
  account_id: string
  csv_content: string
  column_mapping: Record<string, string>
  broker_source?: string
}

export interface ImportValidateResponse {
  total_rows: number
  valid_rows_count: number
  duplicate_rows_count: number
  error_rows_count: number
  duplicates: Array<{ row_number: number; external_id?: string; symbol: string; entry_time?: string }>
  errors: Array<{ row_number: number; error_message: string; raw_data?: Record<string, string> }>
  sample_valid_trades: Record<string, string | null>[]
}

export interface ImportConfirmPayload {
  account_id: string
  csv_content: string
  column_mapping: Record<string, string>
  broker_source?: string
  filename?: string
  skip_duplicates?: boolean
}

export interface ImportConfirmResponse {
  job_id: string
  status: string
  total_rows: number
  imported_rows: number
  skipped_rows: number
  error_rows: number
  message: string
}

export const importsApi = {
  preview: async (payload: ImportPreviewPayload): Promise<ImportPreviewResponse> => {
    const res = await apiClient.post<ImportPreviewResponse>("/imports/preview", payload)
    return res.data
  },

  validate: async (payload: ImportValidatePayload): Promise<ImportValidateResponse> => {
    const res = await apiClient.post<ImportValidateResponse>("/imports/validate", payload)
    return res.data
  },

  confirm: async (payload: ImportConfirmPayload): Promise<ImportConfirmResponse> => {
    const res = await apiClient.post<ImportConfirmResponse>("/imports/confirm", payload)
    return res.data
  },

  downloadTemplate: async () => {
    const res = await apiClient.get("/imports/template/download", { responseType: "blob" })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv" }))
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "mytradejournal_template.csv")
    document.body.appendChild(link)
    link.click()
    link.remove()
  },
}
