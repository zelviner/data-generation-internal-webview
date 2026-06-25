import { useUserStore } from "@/stores/user"

interface WSOptions<T = any> {
    url: string
    onMessage?: (data: T) => void
    onOpen?: () => void
    onClose?: () => void
    onError?: (err: Event) => void
}

class WSClient<T = any> {
    private ws: WebSocket | null = null
    private options: WSOptions<T>

    private retryCount = 0
    private maxRetry = 10
    private manualClose = false
    private isConnecting = false
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null

    constructor(options: WSOptions<T>) {
        this.options = options
    }

    isOpen() {
        return this.ws?.readyState === WebSocket.OPEN
    }

    getWsBase() {
        const apiUrl = import.meta.env.VITE_API_URL

        // 开发环境（带 http://）
        if (apiUrl.startsWith("http")) {
            return apiUrl
                .replace(/^http/, "ws")
                .replace(/\/api$/, "")
        }

        // 生产环境（/api 走 nginx）
        const protocol = location.protocol === "https:" ? "wss" : "ws"
        return `${protocol}://${location.host}`
    }

    connect() {
        this.manualClose = false
        this.clearReconnectTimer()

        // 防止重复连接
        if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
            return
        }

        if (this.isConnecting) return

        this.ws = null
        this.isConnecting = true

        const userStore = useUserStore()
        const token = userStore.getToken()

        const base = this.getWsBase()
        const path = this.options.url.startsWith("/") ? this.options.url : `/${this.options.url}`
        const url = new URL(base + path)

        if (token) {
            url.searchParams.set("token", token)
        }

        const ws = new WebSocket(url.toString())
        this.ws = ws
        console.log("WS connecting:", url)

        ws.onopen = () => {
            if (this.ws !== ws) return

            this.isConnecting = false
            this.retryCount = 0

            // 发送缓存消息
            this.queue.forEach(msg => {
                ws.send(JSON.stringify(msg))
            })
            this.queue = []

            this.options.onOpen?.()
        }

        ws.onmessage = (event) => {
            if (this.ws !== ws) return

            try {
                const data = JSON.parse(event.data)
                this.options.onMessage?.(data)
            } catch {
                this.options.onMessage?.(event.data as any)
            }
        }

        ws.onclose = () => {
            if (this.ws && this.ws !== ws) return

            console.log("WS closed")
            this.isConnecting = false
            this.options.onClose?.()

            if (!this.manualClose) {
                this.reconnect()
            }
        }

        ws.onerror = (err) => {
            if (this.ws && this.ws !== ws) return

            console.error("WS error:", err)
            this.options.onError?.(err)
        }
    }

    private reconnect() {
        if (this.manualClose) return

        if (this.retryCount >= this.maxRetry) {
            console.warn("WS 重连次数达到上限")
            return
        }

        this.clearReconnectTimer()

        const delay = Math.min(1000 * 2 ** this.retryCount, 10000) // 最大10秒

        console.log(`WS 重连中... ${delay}ms`)

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null
            if (this.manualClose) return

            this.retryCount++
            this.connect()
        }, delay)
    }

    private clearReconnectTimer() {
        if (!this.reconnectTimer) return

        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
    }

    private queue: any[] = []

    send(data: any) {
        if (!this.ws) return

        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data))
        } else {
            this.queue.push(data)
        }
    }

    close() {
        this.manualClose = true
        this.clearReconnectTimer()
        this.isConnecting = false

        const ws = this.ws
        this.ws = null
        this.queue = []
        ws?.close()
    }
}

export default WSClient
