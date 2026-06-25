<template>
    <div class="app">
        <el-card class="generation-card">
            <template #header>
                <div class="card-header">
                    <span>数据生成 (内部版)</span>
                </div>
            </template>

            <el-form ref="ruleFormRef" class="task-form" :model="data" label-width="96px" :rules="rules">
                <div class="form-section">
                    <div class="section-title">基础信息</div>
                    <el-form-item label="订单号" prop="orderNo">
                        <el-input v-model="data.orderNo" placeholder="请输入订单号">
                        </el-input>
                    </el-form-item>
                </div>

                <div class="form-section">
                    <div class="section-title">文件路径</div>
                    <el-form-item label="Lua 脚本" prop="luaScriptPath">
                        <el-input v-model="data.luaScriptPath" placeholder="请选择 Lua 脚本">
                            <template #append>
                                <el-button @click="openFileDialog('Lua 脚本', '/input/Lua')">浏览</el-button>
                            </template>
                        </el-input>
                    </el-form-item>

                    <el-form-item label="输入文件夹" prop="inputDir">
                        <el-input v-model="data.inputDir" placeholder="请选择输入文件夹">
                            <template #append>
                                <el-button @click="openFileDialog('输入文件夹', '/DG/input')">浏览</el-button>
                            </template>
                        </el-input>
                    </el-form-item>

                    <el-form-item label="授权文件夹" prop="licenseDir">
                        <el-input v-model="data.licenseDir" placeholder="请选择授权文件夹">
                            <template #append>
                                <el-button @click="openFileDialog('授权文件夹', '/DG/input')">浏览</el-button>
                            </template>
                        </el-input>
                    </el-form-item>

                    <el-form-item label="PGP 密钥" prop="pgpKeyPath">
                        <el-input v-model="data.pgpKeyPath" placeholder="请选择 PGP 密钥">
                            <template #append>
                                <el-button @click="openFileDialog('PGP 密钥', '/input/PGP')">浏览</el-button>
                            </template>
                        </el-input>
                    </el-form-item>
                </div>

                <div class="form-section">
                    <div class="section-title">执行选项</div>
                    <el-form-item label="查重">
                        <el-switch v-model="data.isDeduplication" />
                    </el-form-item>
                </div>
            </el-form>

            <template #footer>
                <div class="button-group">
                    <el-button type="primary" @click="generation()" :disabled="isSubmit">生成</el-button>
                    <el-button @click="resetForm(ruleFormRef)" :disabled="isSubmit">清空</el-button>
                </div>
            </template>
        </el-card>
    </div>

    <FileDialog v-model="showDialog" :init-path="currentInitPath" :title="dialogTitle" @select="handleSelect" />
    <TaskOverlay :model-value="taskOverlayVisible" :status="taskStatus" :progress="progress" :text="progressText"
        @close="closeTaskOverlay" />
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import FileDialog from "@/components/FileDialog.vue"
import TaskOverlay from "@/components/TaskOverlay.vue"
import InternalApi from '@/apis/internal'
import WSClient from '@/utils/websocket'
import { getErrorMessage } from '@/utils/error'

import type { FormInstance, FormRules } from 'element-plus'


const showDialog = ref<boolean>(false)
const currentInitPath = ref<string>('/')
const dialogTitle = ref<string>('')

const progress = ref<number>(0)
const progressText = ref<string>("")
const isSubmit = ref<boolean>(false)
const taskOverlayVisible = ref<boolean>(false)
const taskStatus = ref<TaskStatus>('idle')
let wsClient: WSClient | null = null
let wsErrorShown = false

type TaskStatus = 'idle' | 'uploading' | 'starting' | 'running' | 'done' | 'error'

interface FtpNode {
    node: {
        isDir: boolean
    }
    path: string
}
const handleSelect = (ftpNode: FtpNode) => {
    switch (dialogTitle.value) {
        case "Lua 脚本":
            data.luaScriptPath = ftpNode.path
            break
        case "输入文件夹":
            data.inputDir = ftpNode.path
            break
        case "授权文件夹":
            data.licenseDir = ftpNode.path
            break
        case "PGP 密钥":
            data.pgpKeyPath = ftpNode.path
            break
        default:
            break
    }
}

const openFileDialog = async (title: string, path: string = '/') => {
    showDialog.value = true
    currentInitPath.value = path
    dialogTitle.value = title
}


interface Data {
    orderNo: string
    luaScriptPath: string
    inputDir: string
    licenseDir: string
    pgpKeyPath: string
    isDeduplication: boolean
}

const ruleFormRef = ref<FormInstance>()
const data = reactive<Data>({
    orderNo: "",
    luaScriptPath: "",
    inputDir: "",
    licenseDir: "",
    pgpKeyPath: "",
    isDeduplication: true
})

const rules = reactive<FormRules<Data>>({
    orderNo: [
        { required: true, message: '请输入订单号', trigger: 'blur' },
        { min: 3, max: 20, message: '长度请控制在 3 - 20', trigger: 'blur' }
    ],
    luaScriptPath: [
        { required: true, message: '请选择 Lua 脚本', trigger: 'blur' }
    ],
    inputDir: [
        { required: true, message: '请选择输入文件夹', trigger: 'blur' }
    ],
    licenseDir: [
        { required: true, message: '请选择授权文件夹', trigger: 'blur' }
    ],
    pgpKeyPath: [
        { required: true, message: '请选择 PGP 密钥', trigger: 'blur' }
    ],
})

const resetState = () => {
    // 进度
    progress.value = 0
    progressText.value = ""
    taskStatus.value = 'idle'
    taskOverlayVisible.value = false

    // 关闭 WS
    if (wsClient) {
        wsClient.close()
        wsClient = null
    }

    isSubmit.value = false
    data.orderNo = ""
    data.luaScriptPath = ""
    data.inputDir = ""
    data.licenseDir = ""
    data.pgpKeyPath = ""

    // 清校验状态
    ruleFormRef.value?.clearValidate()
}

interface TaskMessage {
    status: string
    value?: number
    text?: string
}

const isDir = (path: string) => {
    return !path.split('/').pop()?.includes('.')
}

const showTaskResult = (msg: TaskMessage) => {
    progress.value = msg.value || 0
    progressText.value = msg.text || ""

    if (msg.status === "error" || msg.status === "done") {
        taskStatus.value = msg.status
        isSubmit.value = false
        wsClient?.close()
        return
    }

    taskStatus.value = 'running'
}

const closeTaskOverlay = () => resetState()

// 点击生成
const generation = async () => {
    if (!ruleFormRef.value) return
    isSubmit.value = true
    wsErrorShown = false

    if (wsClient) {
        wsClient.close()
    }

    try {
        await ruleFormRef.value.validate()

        // 校验是否是文件夹
        if (!isDir(data.inputDir) || !isDir(data.licenseDir)) {
            ElMessage.error("输入或授权不是文件夹，请检查")
            resetState()
            return
        }

        progress.value = 0
        progressText.value = ""
        taskStatus.value = 'starting'
        taskOverlayVisible.value = true

        const requestData = {
            order_no: data.orderNo,
            script_path: data.luaScriptPath,
            input_dir: data.inputDir,
            license_dir: data.licenseDir,
            pgp_path: data.pgpKeyPath,
            is_deduplication: data.isDeduplication
        }
        const rep = await InternalApi.startTask(requestData)
        wsClient = new WSClient({
            url: `/ws?task_id=${rep.task_id}`,

            onOpen: async () => {
                console.log("ws 已连接")
                taskStatus.value = 'running'

                try {
                    const state = await InternalApi.taskState<TaskMessage>(rep.task_id)
                    showTaskResult(state)
                } catch (err) {
                    ElMessage.error(getErrorMessage(err, "获取任务状态失败"))
                }
            },

            onMessage: (msg: TaskMessage) => {
                showTaskResult(msg)
            },

            onClose: () => {
                console.log("ws 已关闭")
            },

            onError: (err) => {
                console.error("ws 错误:", err)
                if (!wsErrorShown) {
                    wsErrorShown = true
                    ElMessage.error("WebSocket 连接异常，正在重试")
                }
            }
        })

        wsClient.connect()
    } catch (err) {
        const message = getErrorMessage(err, "请检查表单")
        if (taskOverlayVisible.value) {
            progressText.value = message
            taskStatus.value = 'error'
            isSubmit.value = false
            return
        }

        ElMessage.error(message)
        console.log(err)
        resetState()
    }
}


const resetForm = (formEl: FormInstance | undefined) => {
    if (!formEl) return

    if (wsClient) {
        wsClient.close()
        wsClient = null
    }

    formEl.resetFields()
}

</script>

<style scoped lang="scss">
.app {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
    padding: 48px 24px;
    background: #f5f7fb;
    box-sizing: border-box;

    .generation-card {
        display: flex;
        flex-direction: column;
        width: 720px;

        .card-header {
            text-align: center;
            font-size: 22px;
            font-weight: 600;
            color: #1f2d3d;
            letter-spacing: 0;
        }

        .task-form {
            max-width: 620px;
            margin: 0 auto;
        }

        .form-section + .form-section {
            margin-top: 20px;
        }

        .section-title {
            margin-bottom: 14px;
            padding-left: 10px;
            border-left: 3px solid #409eff;
            color: #303133;
            font-size: 15px;
            font-weight: 600;
        }

        .button-group {
            width: 100%;
            text-align: center;
        }

    }
}
</style>
