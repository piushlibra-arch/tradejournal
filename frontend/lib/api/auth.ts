import apiClient from "./client"

export interface RegisterPayload {
  email: string
  password: string
  first_name: string
  last_name: string
  timezone?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface UserProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  timezone: string
  is_active: boolean
}

export const authApi = {
  register: async (payload: RegisterPayload): Promise<UserProfile> => {
    const res = await apiClient.post<UserProfile>("/auth/register", payload)
    return res.data
  },

  login: async (payload: LoginPayload): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>("/auth/login", payload)
    if (typeof window !== "undefined") {
      localStorage.setItem("mtj_access_token", res.data.access_token)
      localStorage.setItem("mtj_refresh_token", res.data.refresh_token)
    }
    return res.data
  },

  getMe: async (): Promise<UserProfile> => {
    const res = await apiClient.get<UserProfile>("/auth/me")
    return res.data
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("mtj_access_token")
      localStorage.removeItem("mtj_refresh_token")
    }
  },
}
