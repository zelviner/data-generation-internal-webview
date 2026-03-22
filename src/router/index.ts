import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router"

const routes: RouteRecordRaw[] = [
    {
        path: "/", // http://localhost:5173
        component: () => import("../views/Internal.vue")
    },
    {
        path: "/dev", // http://localhost:5173/dev
        component: () => import("../views/InternalDev.vue")
    }
]

const router = createRouter({
    // 使用 history 模式：
    history: createWebHistory(),
    routes
})

export default router