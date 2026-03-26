import Request from "@/utils/request"

const InternalApi = {
    dataGenerate<T = any>(params: any): Promise<T> {
        return Request.post<T>("/internal/data-generate", params)
    },

    dataGenerateDev<T = any>(params: any): Promise<T> {
        return Request.post<T>("/internal/data-generate-dev", params)
    },

    download<T = any>(params: any): Promise<T> {
        return Request.get<T>("/internal/download", params)
    },

    ftp<T = any>(params: any): Promise<T> {
        return Request.post<T>("/internal/ftp-file-tree", params)
    },
}

export default InternalApi