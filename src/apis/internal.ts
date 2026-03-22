import Request from "@/utils/request"

const InternalApi = {
    dataGenerateDev<T = any>(params: any): Promise<T> {
        return Request.post<T>("/internal/data-generate-dev", params)
    }
}

export default InternalApi