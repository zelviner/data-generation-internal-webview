<template>
    <div class="app">
        <el-card class="generation-card">
            <template #header>
                <div class="card-header">
                    <span>数据生成 (内部开发版)</span>
                </div>
            </template>

            <el-form ref="ruleFormRef" class="task-form" :model="data" label-width="96px" :rules="rules">
                <div class="form-section">
                    <div class="section-title">基础信息</div>
                    <el-form-item label="需求编码" prop="rfCode">
                        <el-input v-model="data.rfCode" placeholder="请输入需求编码">
                        </el-input>
                    </el-form-item>
                </div>

                <div class="form-section">
                    <div class="section-title">上传文件</div>
                    <el-form-item label="Lua 脚本" prop="luaScriptPath">
                        <el-upload ref="luaUploadRef" class="upload-demo" drag :action="uploadUrl" :auto-upload="false"
                            accept=".lua" :before-upload="beforeUpload" :on-change="handleLuaChange"
                            :on-remove="handleLuaRemove" :on-success="handleLuaSuccess" :on-error="handleLuaError"
                            :data="uploadLuaData">
                            <el-icon class="el-icon--upload"><i-ep-upload-filled /></el-icon>
                            <div class="el-upload__text">
                                拖拽 Lua 脚本到此处，或 <em>点击上传</em>
                            </div>
                        </el-upload>
                    </el-form-item>

                    <el-form-item label="输入文件夹" prop="inputDir">
                        <el-upload ref="inputUploadRef" class="upload-demo" drag :action="uploadUrl" :auto-upload="false"
                            directory multiple :before-upload="beforeUpload" :on-success="handleInputSuccess"
                            :on-change="handleInputChange" :on-remove="handleInputRemove" :on-error="handleInputError"
                            :data="uploadInputData">
                            <el-icon class="el-icon--upload"><i-ep-upload-filled /></el-icon>
                            <div class="el-upload__text">
                                拖拽输入文件夹到此处，或 <em>点击上传</em>
                            </div>
                        </el-upload>
                    </el-form-item>

                    <el-form-item label="授权文件" prop="licensePath">
                        <el-upload ref="licenseUploadRef" class="upload-demo" drag :action="uploadUrl" :auto-upload="false"
                            accept=".xlsx" :before-upload="beforeUpload" :on-success="handleLicenseSuccess"
                            :on-change="handleLicenseChange" :on-remove="handleLicenseRemove"
                            :on-error="handleLicenseError" :data="uploadLicenseData">
                            <el-icon class="el-icon--upload"><i-ep-upload-filled /></el-icon>
                            <div class="el-upload__text">
                                拖拽授权文件到此处，或 <em>点击上传</em>
                            </div>
                        </el-upload>
                    </el-form-item>
                </div>
            </el-form>

            <template #footer>
                <div class="button-group">
                    <el-button type="primary" @click="generation()" :disabled="isSubmit">
                        生成
                    </el-button>
                    <el-button @click="download()" :disabled="isSubmit">下载</el-button>
                </div>
            </template>
        </el-card>
    </div>

    <TaskOverlay :model-value="taskOverlayVisible" :status="taskStatus" :progress="progress" :text="progressText"
        @close="closeTaskOverlay" />
</template>

<script setup lang="ts">
import { ref, reactive, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules, UploadFile, UploadFiles, UploadInstance, UploadProps } from 'element-plus'
import TaskOverlay from "@/components/TaskOverlay.vue"
import InternalApi from '@/apis/internal'
import WSClient from '@/utils/websocket'
import { getErrorMessage } from '@/utils/error'

interface RuleForm {
    rfCode: string
    luaScriptPath: string
    inputDir: string
    licensePath: string
}

// 表单数据
const data = reactive<RuleForm>({
    rfCode: "",
    luaScriptPath: "",
    inputDir: "",
    licensePath: "",
})

// 上传地址
const uploadUrl = `${import.meta.env.VITE_API_URL}/internal/upload`

// refs
const ruleFormRef = ref<FormInstance>()
const luaUploadRef = ref<UploadInstance>()
const inputUploadRef = ref<UploadInstance>()
const licenseUploadRef = ref<UploadInstance>()

const progress = ref<number>(0)
const progressText = ref<string>("")
const isSubmit = ref<boolean>(false)
const taskOverlayVisible = ref<boolean>(false)
const taskStatus = ref<TaskStatus>('idle')
let wsClient: WSClient | null = null
let wsErrorShown = false
const activeRunID = ref<string>("")
const downloadRunID = ref<string>("")

type TaskStatus = 'idle' | 'uploading' | 'starting' | 'running' | 'done' | 'error'

// 表单规则
const rules: FormRules<RuleForm> = {
    rfCode: [
        { required: true, message: '请输入需求编码', trigger: 'blur' },
        { min: 10, max: 30, message: '长度 10-30', trigger: 'blur' }
    ],
    luaScriptPath: [
        { required: true, message: '请上传 Lua 脚本', trigger: 'change' }
    ],
    inputDir: [
        { required: true, message: '请上传输入文件夹', trigger: 'change' }
    ],
    licensePath: [
        { required: true, message: '请上传授权文件', trigger: 'change' }
    ]
}

// 上传参数
const uploadLuaData: UploadProps['data'] = () => ({
    rf_code: data.rfCode,
    dir: 'lua',
    run_id: activeRunID.value
})

const uploadInputData: UploadProps['data'] = () => ({
    rf_code: data.rfCode,
    dir: 'input',
    run_id: activeRunID.value
})

const uploadLicenseData: UploadProps['data'] = () => ({
    rf_code: data.rfCode,
    dir: 'license',
    run_id: activeRunID.value
})

// 上传前校验
const beforeUpload: UploadProps['beforeUpload'] = async () => {
    if (!ruleFormRef.value) return false

    try {
        await ruleFormRef.value.validateField("rfCode")
    } catch {
        ElMessage.error("请先填写需求编码")
        return false
    }

    return true
}

interface UploadTracker {
    label: string
    pending: number
    settled: boolean
    resolve?: () => void
    reject?: (error: Error) => void
}

interface TaskMessage {
    status: string
    value?: number
    text?: string
}

const luaFileCount = ref(0)
const inputFileCount = ref(0)
const licenseFileCount = ref(0)

const luaTracker: UploadTracker = { label: "Lua 脚本", pending: 0, settled: false }
const inputTracker: UploadTracker = { label: "输入文件夹", pending: 0, settled: false }
const licenseTracker: UploadTracker = { label: "授权文件", pending: 0, settled: false }

const updateUploadCount = (target: Ref<number>, files: UploadFiles) => {
    target.value = files.length
}

const handleLuaChange: UploadProps['onChange'] = (_file, files) => updateUploadCount(luaFileCount, files)
const handleInputChange: UploadProps['onChange'] = (_file, files) => updateUploadCount(inputFileCount, files)
const handleLicenseChange: UploadProps['onChange'] = (_file, files) => updateUploadCount(licenseFileCount, files)

const handleLuaRemove: UploadProps['onRemove'] = (_file, files) => {
    updateUploadCount(luaFileCount, files)
    if (!files.length) data.luaScriptPath = ""
}

const handleInputRemove: UploadProps['onRemove'] = (_file, files) => {
    updateUploadCount(inputFileCount, files)
    if (!files.length) data.inputDir = ""
}

const handleLicenseRemove: UploadProps['onRemove'] = (_file, files) => {
    updateUploadCount(licenseFileCount, files)
    if (!files.length) data.licensePath = ""
}

const settleUpload = (tracker: UploadTracker, error?: Error) => {
    if (tracker.settled) return

    if (error) {
        tracker.settled = true
        tracker.reject?.(error)
        return
    }

    tracker.pending -= 1

    if (tracker.pending <= 0) {
        tracker.settled = true
        tracker.resolve?.()
    }
}

const getUploadData = (res: unknown, label: string) => {
    if (!res || typeof res !== "object") {
        throw new Error(`${label}上传失败`)
    }

    const response = res as { code?: number; data?: string }
    if (response.code !== undefined && response.code !== 200) {
        throw new Error(getErrorMessage(res, `${label}上传失败`))
    }

    if (!response.data) {
        throw new Error(getErrorMessage(res, `${label}上传失败`))
    }

    return response.data
}

// 上传成功
const handleLuaSuccess: UploadProps['onSuccess'] = (res) => {
    try {
        data.luaScriptPath = getUploadData(res, luaTracker.label)
        ruleFormRef.value?.validateField('luaScriptPath')
        settleUpload(luaTracker)
    } catch (err) {
        settleUpload(luaTracker, new Error(getErrorMessage(err, "Lua 脚本上传失败")))
    }
}

const handleInputSuccess: UploadProps['onSuccess'] = (res) => {
    try {
        const path = getUploadData(res, inputTracker.label)

        if (!data.inputDir) {
            const index = Math.max(
                path.lastIndexOf('/'),
                path.lastIndexOf('\\')
            )

            data.inputDir = index !== -1 ? path.substring(0, index) : path

            ruleFormRef.value?.validateField('inputDir')
        }

        settleUpload(inputTracker)
    } catch (err) {
        settleUpload(inputTracker, new Error(getErrorMessage(err, "输入文件夹上传失败")))
    }
}

const handleLicenseSuccess: UploadProps['onSuccess'] = (res) => {
    try {
        data.licensePath = getUploadData(res, licenseTracker.label)
        ruleFormRef.value?.validateField('licensePath')
        settleUpload(licenseTracker)
    } catch (err) {
        settleUpload(licenseTracker, new Error(getErrorMessage(err, "授权文件上传失败")))
    }
}

const handleUploadError = (tracker: UploadTracker, err: Error, file: UploadFile) => {
    settleUpload(tracker, new Error(`${tracker.label}上传失败：${getErrorMessage(err, file.name)}`))
}

const handleLuaError: UploadProps['onError'] = (err, file) => handleUploadError(luaTracker, err, file)
const handleInputError: UploadProps['onError'] = (err, file) => handleUploadError(inputTracker, err, file)
const handleLicenseError: UploadProps['onError'] = (err, file) => handleUploadError(licenseTracker, err, file)

function submitUpload(uploadRef: UploadInstance | undefined, tracker: UploadTracker, fileCount: number) {
    return new Promise<void>((resolve, reject) => {
        if (!uploadRef || fileCount === 0) {
            reject(new Error(`请上传${tracker.label}`))
            return
        }

        tracker.pending = fileCount
        tracker.settled = false
        tracker.resolve = resolve
        tracker.reject = reject
        uploadRef?.submit()
    })
}

const validateUploadSelections = () => {
    if (luaFileCount.value === 0) {
        throw new Error("请上传 Lua 脚本")
    }

    if (inputFileCount.value === 0) {
        throw new Error("请上传输入文件夹")
    }

    if (licenseFileCount.value === 0) {
        throw new Error("请上传授权文件")
    }
}

const createRunID = () => {
    if (crypto.randomUUID) {
        return crypto.randomUUID()
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

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

    // 清空上传组件
    luaUploadRef.value?.abort()
    inputUploadRef.value?.abort()
    licenseUploadRef.value?.abort()
    luaUploadRef.value?.clearFiles()
    inputUploadRef.value?.clearFiles()
    licenseUploadRef.value?.clearFiles()

    isSubmit.value = false
    activeRunID.value = ""
    data.luaScriptPath = ""
    data.inputDir = ""
    data.licensePath = ""
    luaFileCount.value = 0
    inputFileCount.value = 0
    licenseFileCount.value = 0

    // 清校验状态
    ruleFormRef.value?.clearValidate()
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
        await ruleFormRef.value.validateField("rfCode")
        validateUploadSelections()

        const runID = createRunID()
        activeRunID.value = runID
        progress.value = 0
        progressText.value = ""
        taskStatus.value = 'uploading'
        taskOverlayVisible.value = true

        // 上传文件
        await Promise.all([
            submitUpload(luaUploadRef.value, luaTracker, luaFileCount.value),
            submitUpload(inputUploadRef.value, inputTracker, inputFileCount.value),
            submitUpload(licenseUploadRef.value, licenseTracker, licenseFileCount.value)
        ])

        progressText.value = "上传完成，正在创建任务"
        taskStatus.value = 'starting'

        await ruleFormRef.value.validate()

        const requestData = {
            rf_code: data.rfCode,
            local_script_path: data.luaScriptPath,
            local_input_dir: data.inputDir,
            local_license_path: data.licensePath,
            run_id: runID
        }
        const rep = await InternalApi.startTaskDev<{ task_id: string; run_id: string }>(requestData)
        activeRunID.value = rep.run_id || runID
        downloadRunID.value = activeRunID.value

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

const download = async () => {
    if (!data.rfCode) {
        ElMessage.error("请先填写需求编码")
        return
    }

    const params = new URLSearchParams({ rfCode: data.rfCode })
    if (downloadRunID.value) {
        params.set("run_id", downloadRunID.value)
    }

    const url = `${import.meta.env.VITE_API_URL}/internal/download?${params.toString()}`
    window.open(url)
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
        width: 760px;

        .card-header {
            text-align: center;
            font-size: 22px;
            font-weight: 600;
            color: #1f2d3d;
            letter-spacing: 0;
        }

        .task-form {
            max-width: 640px;
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

        .upload-demo {
            width: 100%;
        }

    }
}
</style>
