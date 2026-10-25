import apiClient from "./client"

export interface BackendCandle {
  time: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface InstrumentMeta {
  symbol: string
  name: string
  tv_symbol: string
  asset_class: string
  base_price: number
  tick_size: number
  contract_size: number
}

export const marketDataApi = {
  getInstruments: async (): Promise<InstrumentMeta[]> => {
    try {
      const res = await apiClient.get<InstrumentMeta[]>("/market-data/instruments")
      return res.data
    } catch {
      return []
    }
  },

  getCandles: async (
    symbol: string,
    timeframe: string = "15m",
    limit: number = 100
  ): Promise<BackendCandle[]> => {
    try {
      const res = await apiClient.get<BackendCandle[]>("/market-data/candles", {
        params: { symbol, timeframe, limit },
      })
      return res.data
    } catch {
      return []
    }
  },
}
