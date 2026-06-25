export const getErrorMessage = (error: unknown, fallback = "操作失败") => {
    if (typeof error === "string" && error.trim()) {
        return error
    }

    if (error && typeof error === "object") {
        const record = error as Record<string, unknown>
        const message = record.message || record.msg || record.error

        if (typeof message === "string" && message.trim()) {
            return message
        }
    }

    return fallback
}
