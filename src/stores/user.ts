import { defineStore } from 'pinia'

interface UserInfo {
    token: string
}

/*
  定义一个基于 Pinia 的 Store
  第1个参数 web 是 useWebStore 在应用中的唯一标识符(ID)
  第2个参数是 Setup函数 或 Option对象
*/
export const useUserStore = defineStore('user', () => {
    const data: UserInfo = reactive({
        token: ""
    })

    //定义方法
    const storeToken = (token: string): boolean => {
        data.token = token
        return true
    }

    const getToken = (): string => {
        return data.token
    }

    return {
        storeToken,
        getToken
    }
},
    {
        //持久化存储到 localStorage 中
        persist: true
    })