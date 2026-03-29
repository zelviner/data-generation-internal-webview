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

        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws = null
        }

        // 防止重复连接
        if (this.ws && this.ws.readyState === WebSocket.OPEN) return
        if (this.isConnecting) return

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


        this.ws.onopen = () => {
            this.isConnecting = false
            this.retryCount = 0

            // 发送缓存消息
            this.queue.forEach(msg => {
                this.ws?.send(JSON.stringify(msg))
            })
            this.queue = []

            this.options.onOpen?.()
        }

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                this.options.onMessage?.(data)
            } catch {
                this.options.onMessage?.(event.data as any)
            }
        }

        this.ws.onclose = () => {
            console.log("WS closed")
            this.isConnecting = false
            this.options.onClose?.()

            if (!this.manualClose) {
                this.reconnect()
            }
        }

        this.ws.onerror = (err) => {
            console.error("WS error:", err)
            this.options.onError?.(err)
        }
    }

    private reconnect() {
        if (this.retryCount >= this.maxRetry) {
            console.warn("WS 重连次数达到上限")
            return
        }

        const delay = Math.min(1000 * 2 ** this.retryCount, 10000) // 最大10秒

        console.log(`WS 重连中... ${delay}ms`)

        setTimeout(() => {
            this.retryCount++
            this.connect()
        }, delay)
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
        this.ws?.close()
        this.ws = null
        this.queue = []
    }
}

export default WSClient