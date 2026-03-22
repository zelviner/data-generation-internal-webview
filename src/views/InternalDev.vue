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

                <el-form-item label="输入文件夹" prop="inputPath">
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
                        <el-button type="primary" @click="submitForm()">
                            生成
                        </el-button>
                        <el-button @click="">下载</el-button>
                    </div>
                </div>
            </template>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules, UploadInstance, UploadProps } from 'element-plus'
import InternalApi from '@/apis/internal'
import WSClient from '@/utils/websocket'

interface RuleForm {
    rfCode: string
    luaScriptPath: string
    inputPath: string
    licensePath: string
}

// 表单数据
const data = reactive<RuleForm>({
    rfCode: "",
    luaScriptPath: "",
    inputPath: "",
    licensePath: "",
})

// 上传地址
const uploadUrl = `${import.meta.env.VITE_API_URL}/internal/uploadfile`

// refs
const ruleFormRef = ref<FormInstance>()
const luaUploadRef = ref<UploadInstance>()
const inputUploadRef = ref<UploadInstance>()
const licenseUploadRef = ref<UploadInstance>()

const progress = ref(0)
const progressText = ref("")
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
    inputPath: [
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
const beforeUpload: UploadProps['beforeUpload'] = async (file) => {
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
    data.luaScriptPath = res.data
    ruleFormRef.value?.validateField('luaScriptPath')

    luaUploadDone.value?.()
}

const handleInputSuccess: UploadProps['onSuccess'] = (res) => {
    const index = res.data.lastIndexOf('\\')
    data.inputPath = index !== -1 ? res.data.substring(0, index) : ''

    ruleFormRef.value?.validateField('inputPath')

    inputUploadDone.value?.()
}

const handleLicenseSuccess: UploadProps['onSuccess'] = (res) => {
    data.licensePath = res.data
    ruleFormRef.value?.validateField('licensePath')

    licenseUploadDone.value?.()
}

function submitUpload(uploadRef: UploadInstance | undefined, doneRef: any) {
    return new Promise<void>((resolve) => {
        doneRef.value = resolve
        uploadRef?.submit()
    })
}


// 点击生成
const submitForm = async () => {
    if (!ruleFormRef.value) return

    try {
        wsClient = new WSClient({
            url: `/ws?rf_code=${data.rfCode}`,

            onOpen: () => {
                console.log("ws 已连接")
            },

            onMessage: (msg: any) => {
                console.log("收到消息:", msg)

                progress.value = msg.value || 0
                progressText.value = msg.text || ""
            },

            onClose: () => {
                console.log("ws 已关闭")
            },

            onError: (err) => {
                console.error("ws 错误:", err)
            }
        })

        wsClient.connect()

        // 上传文件
        await Promise.all([
            submitUpload(luaUploadRef.value, luaUploadDone),
            submitUpload(inputUploadRef.value, inputUploadDone),
            submitUpload(licenseUploadRef.value, licenseUploadDone)
        ])

        ElMessage.success("上传完成")

        await ruleFormRef.value.validate()

        var requestData = {
            input_path: data.inputPath,
            rf_code: data.rfCode,
            license_path: data.licensePath,
            lua_script_path: data.luaScriptPath
        }
        await InternalApi.dataGenerateDev(requestData)
    } catch (err) {
        ElMessage.error("请检查表单")
        console.log(err)
    }
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