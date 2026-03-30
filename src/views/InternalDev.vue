<template>
    <div class="app">
        <el-card>
            <template #header>
                <div class="card-header">
                    <span>数据生成 (内部开发版)</span>
                </div>
            </template>

            <el-form ref="ruleFormRef" :model="data" label-width="auto" style="max-width: 600px;" :rules="rules">
                <el-form-item label="需求编码" prop="rfCode">
                    <el-input v-model="data.rfCode" placeholder="请输入需求编码">
                    </el-input>
                </el-form-item>

                <el-form-item label="Lua 脚本" prop="luaScriptPath">
                    <el-upload ref="luaUploadRef" class="upload-demo" drag :action="uploadUrl" :auto-upload="false"
                        accept=".lua" :before-upload="beforeUpload" :on-success="handleLuaSuccess"
                        :data="uploadLuaData">
                        <el-icon class="el-icon--upload"><i-ep-upload-filled /></el-icon>
                        <div class="el-upload__text">
                            Drop lua script here or <em>click to upload</em>
                        </div>
                    </el-upload>
                </el-form-item>

                <el-form-item label="输入文件夹" prop="inputDir">
                    <el-upload ref="inputUploadRef" class="upload-demo" drag :action="uploadUrl" :auto-upload="false"
                        directory multiple :before-upload="beforeUpload" :on-success="handleInputSuccess"
                        :data="uploadInputData">
                        <el-icon class="el-icon--upload"><i-ep-upload-filled /></el-icon>
                        <div class="el-upload__text">
                            Drop directory here or <em>click to upload</em>
                        </div>
                    </el-upload>
                </el-form-item>

                <el-form-item label="授权文件夹" prop="licensePath">
                    <el-upload ref="licenseUploadRef" class="upload-demo" drag :action="uploadUrl" :auto-upload="false"
                        accept=".xlsx" :before-upload="beforeUpload" :on-success="handleLicenseSuccess"
                        :data="uploadLicenseData">
                        <el-icon class="el-icon--upload"><i-ep-upload-filled /></el-icon>
                        <div class="el-upload__text">
                            Drop directory here or <em>click to upload</em>
                        </div>
                    </el-upload>
                </el-form-item>
            </el-form>

            <template #footer>
                <div class="generation">
                    <el-progress :text-inside="false" :stroke-width="26" :percentage="progress" striped striped-flow />
                    <div style="text-align:center">
                        {{ progressText }}
                    </div>
                    <div class="button-group">
                        <el-button type="primary" @click="generation()" :disabled="isSubmit">
                            生成
                        </el-button>
                        <el-button @click="download()" :disabled="isSubmit">下载</el-button>
                    </div>
                </div>
            </template>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules, UploadInstance, UploadProps } from 'element-plus'
import InternalApi from '@/apis/internal'
import WSClient from '@/utils/websocket'

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
let wsClient: WSClient | null = null

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
const uploadLuaData: UploadProps['data'] = (file: File) => ({
    rfCode: data.rfCode,
    dir: 'lua',
    relativePath: file.webkitRelativePath || file.name
})

const uploadInputData: UploadProps['data'] = (file: File) => ({
    rfCode: data.rfCode,
    dir: 'input',
    relativePath: file.webkitRelativePath || file.name
})

const uploadLicenseData: UploadProps['data'] = (file: File) => ({
    rfCode: data.rfCode,
    dir: 'license',
    relativePath: file.webkitRelativePath || file.name
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

const luaUploadDone = ref<() => void>()
const inputUploadDone = ref<() => void>()
const licenseUploadDone = ref<() => void>()

// 上传成功
const handleLuaSuccess: UploadProps['onSuccess'] = (res) => {
    if (res.data) {
        data.luaScriptPath = res.data
        ruleFormRef.value?.validateField('luaScriptPath')
    }
    luaUploadDone.value?.()
}

const handleInputSuccess: UploadProps['onSuccess'] = (res) => {
    if (!res.data) return

    if (!data.inputDir) {
        const index = Math.max(
            res.data.lastIndexOf('/'),
            res.data.lastIndexOf('\\')
        )

        data.inputDir = index !== -1 ? res.data.substring(0, index) : res.data

        ruleFormRef.value?.validateField('inputDir')
    }

    inputUploadDone.value?.()
}

const handleLicenseSuccess: UploadProps['onSuccess'] = (res) => {
    if (res.data) {
        data.licensePath = res.data
        ruleFormRef.value?.validateField('licensePath')
    }

    licenseUploadDone.value?.()
}

function submitUpload(uploadRef: UploadInstance | undefined, doneRef: any) {
    return new Promise<void>((resolve) => {
        doneRef.value = resolve
        uploadRef?.submit()
    })
}

const resetState = () => {
    // 进度
    progress.value = 0
    progressText.value = ""

    // 关闭 WS
    if (wsClient) {
        wsClient.close()
        wsClient = null
    }

    // 清空上传组件
    luaUploadRef.value?.clearFiles()
    inputUploadRef.value?.clearFiles()
    licenseUploadRef.value?.clearFiles()

    isSubmit.value = false
    data.luaScriptPath = ""
    data.inputDir = ""
    data.licensePath = ""

    // 清校验状态
    ruleFormRef.value?.clearValidate()
}


// 点击生成
const generation = async () => {
    if (!ruleFormRef.value) return
    isSubmit.value = true

    if (wsClient) {
        wsClient.close()
    }

    try {
        // 上传文件
        await Promise.all([
            submitUpload(luaUploadRef.value, luaUploadDone),
            submitUpload(inputUploadRef.value, inputUploadDone),
            submitUpload(licenseUploadRef.value, licenseUploadDone)
        ])

        ElMessage.success("上传完成")

        await ruleFormRef.value.validate()

        var requestData = {
            rf_code: data.rfCode,
            local_script_path: data.luaScriptPath,
            local_input_dir: data.inputDir,
            local_license_path: data.licensePath
        }
        const rep = await InternalApi.startTaskDev(requestData)

        wsClient = new WSClient({
            url: `/ws?task_id=${rep.task_id}`,

            onOpen: async () => {
                console.log("ws 已连接")

                const state = await InternalApi.taskState(rep.task_id)

                progress.value = state.value || 0
                progressText.value = state.text || ""

                if (state.status === "done" || state.status === "error") {
                    wsClient?.close()
                }
            },

            onMessage: (msg: any) => {
                if (msg.status === "error") {
                    ElMessageBox.alert(msg.text, "数据生成错误", {
                        confirmButtonText: '确定',
                        callback: () => {
                            resetState()
                        }
                    })
                    console.log(msg.text);
                } else if (msg.status === "done") {
                    progress.value = msg.value || 0
                    progressText.value = msg.text || ""
                    ElMessageBox.alert(msg.text, "数据生成完成", {
                        confirmButtonText: '确定',
                        callback: () => {
                            resetState()
                        }
                    })
                    console.log(msg.text);
                } else {
                    progress.value = msg.value || 0
                    progressText.value = msg.text || ""
                }

            },

            onClose: () => {
                console.log("ws 已关闭")
            },

            onError: (err) => {
                console.error("ws 错误:", err)
            }
        })

        wsClient.connect()
    } catch (err) {
        ElMessage.error("请检查表单")
        console.log(err)
        resetState()
    }
}

const download = async () => {
    if (!data.rfCode) {
        ElMessage.error("请先填写需求编码")
        return
    }

    const url = `${import.meta.env.VITE_API_URL}/internal/download?rfCode=${encodeURIComponent(data.rfCode)}`
    window.open(url)
}

</script>

<style scoped lang="scss">
.app {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;

    .el-card {
        display: flex;
        flex-direction: column;
        width: 650px;
        height: 980px;

        .card-header {
            text-align: center;
            font-size: 28px;
            font-weight: bold;
            color: #007bff;
            text-shadow: 0 0 20px rgba(0, 123, 255, 0.3);
            letter-spacing: 2px;
        }

        .button-group {
            width: 100%;
            text-align: center;
        }

        .upload-demo {
            width: 100%;
        }

        .generation {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

    }
}
</style>