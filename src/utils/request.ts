import axios, { type AxiosInstance, type AxiosResponse } from "axios"
import { useUserStore } from "@/stores/user.js"

// 响应统一结构
interface ApiResponse<T = any> {
    code: number
    message: string
    data: T
}

// axios 实例
const axiosInstance: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 600000
});

// 请求拦截器，自动添加 token
axiosInstance.interceptors.request.use(
    config => {
        const userStore = useUserStore();
        const token = userStore.getToken();

        // 如果存在 token，则自动添加到请求头
        if (token) {
            config.headers = config.headers || {}
            config.headers['Authorization'] = `Bearer ${token}`
        }

        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

// 统一错误处理
const handleError = (error: any) => {
    if (error?.response?.data) {
        throw error.response.data
    }

    throw error
}

const Request = {

    // GET 请求
    get<T = any>(url: string, params: Record<string, any> = {}): Promise<T> {
        return axiosInstance
            .get<any, AxiosResponse<ApiResponse<T>>>(url, { params })
            .then(res => {
                const r = res.data

                if (r.code !== 200) {
                    throw r
                }

                return r.data
            })
            .catch(handleError)
    },

    // POST JSON
    post<T = any>(url: string, data?: any): Promise<T> {
        return axiosInstance
            .post<any, AxiosResponse<ApiResponse<T>>>(url, data)
            .then(res => {
                const r = res.data

                if (r.code !== 200) {
                    throw r
                }

                return r.data
            })
            .catch(handleError)
    },

    // POST form
    postForm<T = any>(url: string, data?: any): Promise<T> {
        return axiosInstance
            .post<any, AxiosResponse<ApiResponse<T>>>(url, data, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            })
            .then(res => {
                const r = res.data

                if (r.code !== 200) {
                    throw r
                }

                return r.data
            })
            .catch(handleError)
    },

    // 上传文件
    postFile<T = any>(url: string, data?: FormData): Promise<T> {
        return axiosInstance
            .post<any, AxiosResponse<ApiResponse<T>>>(url, data, {
                headers: { "Content-Type": "multipart/form-data" }
            })
            .then(res => {
                const r = res.data

                if (r.code !== 200) {
                    throw r
                }

                return r.data
            })
            .catch(handleError)
    },

    // PUT
    put<T = any>(url: string, data?: any): Promise<T> {
        return axiosInstance
            .put<any, AxiosResponse<ApiResponse<T>>>(url, data)
            .then(res => {
                const r = res.data

                if (r.code !== 200) {
                    throw r
                }

                return r.data
            })
            .catch(handleError)
    },

    // DELETE
    delete<T = any>(url: string, params?: any): Promise<T> {
        return axiosInstance
            .delete<any, AxiosResponse<ApiResponse<T>>>(url, { params })
            .then(res => {
                const r = res.data

                if (r.code !== 200) {
                    throw r
                }

                return r.data
            })
            .catch(handleError)
    }
};

export default Request;
