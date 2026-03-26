<template>
    <el-dialog v-model="visible" width="800px" class="ftp-dialog">
        <!-- header -->
        <template #header>
            <div class="dialog-header">
                <h2>{{ props.title }}</h2>
            </div>
        </template>

        <!-- 面包屑 -->
        <div class="path-nav">
            <el-button size="small" @click="goBack" :disabled="pathStack.length === 0">
                返回上一层
            </el-button>

            <el-breadcrumb separator="/">
                <el-breadcrumb-item @click="goRoot">root</el-breadcrumb-item>
                <el-breadcrumb-item v-for="(item, index) in pathStack" :key="index" @click="goTo(index)">
                    {{ item.name }}
                </el-breadcrumb-item>
            </el-breadcrumb>
        </div>

        <!-- 文件列表 -->
        <el-scrollbar class="file-list" v-loading="loading">
            <div v-for="item in currentList" :key="item.id" class="file-item"
                :class="{ selected: selected?.id === item.id }" @click="select(item)" @dblclick="enter(item)">
                <div class="file-icon">
                    <el-icon v-if="item.isDir"><i-ep-folder /></el-icon>
                    <el-icon v-else><i-ep-document /></el-icon>
                </div>

                <div class="file-name">{{ item.title }}</div>
                <div class="file-date">{{ formatDate(item.create) }}</div>
            </div>

            <el-empty v-if="!loading && !currentList.length" description="暂无文件" />
        </el-scrollbar>

        <!-- footer -->
        <template #footer>
            <div class="dialog-footer">
                <el-button @click="close">取消</el-button>
                <el-button type="primary" :disabled="!selected" @click="confirm">
                    选择
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import InternalApi from "@/apis/internal"

const props = defineProps({
    modelValue: Boolean,
    initPath: {
        type: String,
        default: "/",
    },
    title: {
        type: String,
        default: "选择文件",
    }
})

const emit = defineEmits(["update:modelValue", "select"])

const visible = ref(false)
const loading = ref(false)

const currentList = ref<any[]>([])
const selected = ref<any>(null)

// 路径栈（用于面包屑）
const pathStack = ref<{ name: string; path: string }[]>([])

// 缓存（核心优化点）
const cache = new Map<string, any[]>()

// 当前路径
const currentPath = ref("/")

watch(
    () => props.modelValue,
    async (v) => {
        visible.value = v
        if (v) {
            buildPathStack(props.initPath)
            await loadDir(props.initPath)
        }
    }
)

watch(visible, (v) => emit("update:modelValue", v))

const buildPathStack = (path: string) => {
    const parts = path.split('/').filter(Boolean)

    const stack: { name: string; path: string }[] = []

    let current = '/'

    for (const part of parts) {
        current += part + '/'
        stack.push({
            name: part,
            path: current,
        })
    }

    pathStack.value = stack
}

const joinPath = (base: string, name: string) => {
    return base.replace(/\/+$/, '') + '/' + name + '/'
}

// 加载目录
const loadDir = async (path: string) => {
    if (loading.value) return

    // 命中缓存
    if (cache.has(path)) {
        currentList.value = cache.get(path)!
        currentPath.value = path
        return
    }

    try {
        loading.value = true

        const res = await InternalApi.ftp({ path })

        currentList.value = res || []
        currentPath.value = path

        cache.set(path, res || [])
    } finally {
        loading.value = false
    }
}

// 点击选中
const select = (item: any) => {
    selected.value = item
}

// 双击进入目录
const enter = async (item: any) => {
    if (!item.isDir) return

    const nextPath = joinPath(currentPath.value, item.title)

    pathStack.value.push({
        name: item.title,
        path: nextPath,
    })

    await loadDir(nextPath)
    selected.value = null
}

// 返回上一层
const goBack = async () => {
    pathStack.value.pop()

    const path =
        pathStack.value.length === 0
            ? "/"
            : pathStack.value[pathStack.value.length - 1].path

    await loadDir(path)
}

// 面包屑跳转
const goTo = async (index: number) => {
    pathStack.value = pathStack.value.slice(0, index + 1)
    await loadDir(pathStack.value[index].path)
}

// 回到根目录
const goRoot = async () => {
    pathStack.value = []
    await loadDir("/")
}

// 确认
const confirm = () => {
    emit("select", {
        node: selected.value,
        path: currentPath.value + "/" + selected.value.title,
    })
    visible.value = false
}

const close = () => (visible.value = false)

const formatDate = (d: any) => {
    if (!d) return ""
    return new Date(d).toLocaleString()
}
</script>

<style scoped lang="scss">
.path-nav {
    padding: 10px 20px;
    background: #f8f9fa;
    display: flex;
    align-items: center;
    gap: 10px;
}

.file-list {
    height: 400px;
    padding: 20px;
}

.file-item {
    display: flex;
    align-items: center;
    padding: 12px 10px;
    border: 1px solid #eee;
    border-radius: 4px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        border-color: #409eff;
        box-shadow: 0 0 6px rgba(64, 158, 255, 0.2);
    }

    &.selected {
        border-color: #409eff;
        background: rgba(64, 158, 255, 0.1);
    }

    .file-icon {
        margin-right: 10px;
        font-size: 18px;
        color: #409eff;
    }

    .file-name {
        flex: 1;
        font-size: 14px;
        color: #333;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .file-date {
        margin-left: auto;
        font-size: 12px;
        color: #999;
        min-width: 140px;
        text-align: right;
    }
}
</style>