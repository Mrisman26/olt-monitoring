"use client"

import { useEffect, useRef, useState } from "react"

import type { Alert, MonitoringState } from "@/lib/types"

type SSEState = MonitoringState & {
  summary: { onlineOlts: number; totalOnu: number; downOnu: number; openAlerts: number }
  operationalAlerts: Alert[]
}

const initialState: SSEState = {
  olts: [],
  onus: [],
  alerts: [],
  settings: {
    telegram: {
      enabled: false,
      botToken: "",
      chatId: "",
      notifyOntDown: true,
      notifyRecovery: true,
      botPollingEnabled: false,
      lastUpdateId: 0,
    },
  },
  summary: { onlineOlts: 0, totalOnu: 0, downOnu: 0, openAlerts: 0 },
  operationalAlerts: [],
}

export function useSseState() {
  const [state, setState] = useState<SSEState>(initialState)
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setupRef = useRef<() => void>(() => {})

  useEffect(() => {
    function setupConnection() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      const es = new EventSource("/api/monitoring/sse")
      eventSourceRef.current = es

      es.addEventListener("state", (event) => {
        try {
          const data = JSON.parse(event.data) as SSEState
          setState(data)
          setConnected(true)
        } catch {
          // parse error
        }
      })

      es.addEventListener("error", () => {
        setConnected(false)
        es.close()
        eventSourceRef.current = null

        reconnectTimerRef.current = setTimeout(() => {
          setupRef.current()
        }, 5000)
      })
    }

    setupRef.current = setupConnection
    setupConnection()

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (eventSourceRef.current) eventSourceRef.current.close()
    }
  }, [])

  return { state, connected }
}
