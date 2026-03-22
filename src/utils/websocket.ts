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

    constructor(options: WSOptions<T>) {
        this.options = options
    }

    connect() {
        const userStore = useUserStore()
        const token = userStore.getToken()

        // http → ws
        const base = import.meta.env.VITE_URL.replace(/^http/, "ws")
        const hasQuery = this.options.url.includes("?")
        const url = `${base}${this.options.url}${token ? `${hasQuery ? "&" : "?"}token=${token}` : ""}`

        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
            this.options.onOpen?.()
        }

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                this.options.onMessage?.(data)
            } catch {
                // 非 JSON 数据
                this.options.onMessage?.(event.data)
            }
        }

        this.ws.onclose = () => {
            this.options.onClose?.()
        }

        this.ws.onerror = (err) => {
            this.options.onError?.(err)
        }
    }

    send(data: any) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
        this.ws.send(JSON.stringify(data))
    }

    close() {
        this.ws?.close()
        this.ws = null
    }
}

export default WSClient