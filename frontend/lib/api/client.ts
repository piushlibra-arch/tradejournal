import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios"

let rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
if (rawBaseUrl && !rawBaseUrl.startsWith("http://") && !rawBaseUrl.startsWith("https://")) {
  rawBaseUrl = `https://${rawBaseUrl}`
}
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "")

const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
})

// Attach JWT access token from localStorage
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("mtj_access_token")
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Intercept 401 unauthenticated
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const isAuthRoute =
        window.location.pathname.startsWith("/login") ||
        window.location.pathname.startsWith("/register") ||
        window.location.pathname === "/"
      if (!isAuthRoute) {
        localStorage.removeItem("mtj_access_token")
        localStorage.removeItem("mtj_refresh_token")
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
