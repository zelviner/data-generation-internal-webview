import Request from "@/utils/request"

const InternalApi = {
    startTask<T = any>(params: any): Promise<T> {
        return Request.post<T>("/internal/start-task", params)
    },

    startTaskDev<T = any>(params: any): Promise<T> {
        return Request.post<T>("/internal/start-task-dev", params)
    },

    download<T = any>(params: any): Promise<T> {
        return Request.get<T>("/internal/download", params)
    },

    ftp<T = any>(params: any): Promise<T> {
        return Request.post<T>("/internal/ftp-file-tree", params)
    },

    taskState(taskId: string) {
        return Request.get("/internal/task-state", { task_id: taskId })
    }
}

export default InternalApi