<template>
    <div class="app">
        <el-card>
            <template #header>
                <div class="card-header">
                    <span>数据生成 (内部版)</span>
                </div>
            </template>

            <el-form ref="ruleFormRef" :model="data" label-width="auto" style="max-width: 600px;" :rules="rules">
                <el-form-item label="订单号" prop="orderNo">
                    <el-input v-model="data.orderNo" placeholder="请输入订单号">
                    </el-input>
                </el-form-item>

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

                <el-form-item label="PGP 密钥">
                    <el-input v-model="data.pgpKeyPath" placeholder="请选择 PGP 密钥">
                        <template #append>
                            <el-button @click="openFileDialog('PGP 密钥', '/input/PGP')">浏览</el-button>
                        </template>
                    </el-input>
                </el-form-item>

                <el-form-item label="查重">
                    <el-switch v-model="data.isDeduplication" />
                </el-form-item>
            </el-form>

            <template #footer>
                <div class="generation">
                    <el-progress :text-inside="false" :stroke-width="26" :percentage="progress" striped striped-flow />
                    <div style="text-align:center">
                        {{ progressText }}
                    </div>
                    <div class="button-group">
                        <el-button type="primary" @click="generation()">
                            生成
                        </el-button>
                        <el-button @click="resetForm(ruleFormRef)">清空</el-button>
                    </div>
                </div>
            </template>
        </el-card>
    </div>

    <FileDialog v-model="showDialog" :init-path="currentInitPath" :title="dialogTitle" @select="handleSelect" />
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import FileDialog from "@/components/FileDialog.vue"
import InternalApi from '@/apis/internal'
import WSClient from '@/utils/websocket'

import type { FormInstance, FormRules } from 'element-plus'


const showDialog = ref<boolean>(false)
const currentInitPath = ref<string>('/')
const dialogTitle = ref<string>('')

const progress = ref<number>(0)
const progressText = ref<string>("")
const isSubmit = ref<boolean>(false)
let wsClient: WSClient | null = null

interface FtpNode {
    node: string
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

// 点击生成
const generation = async () => {
    if (!ruleFormRef.value) return
    isSubmit.value = true

    try {
        wsClient = new WSClient({
            url: `/ws?rf_code=${data.orderNo}`,

            onOpen: () => {
                console.log("ws 已连接")
            },

            onMessage: (msg: any) => {
                if (msg.type === "error") {
                    ElMessageBox.alert(msg.text, "数据生成错误", {
                        confirmButtonText: '确定',
                        callback: () => {
                            resetState()
                        }
                    })
                    console.log(msg.text);
                } else if (msg.type === "done") {
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


        await ruleFormRef.value.validate()

        var requestData = {
            order_no: data.orderNo,
            script_path: data.luaScriptPath,
            input_dir: data.inputDir,
            license_dir: data.licenseDir,
            pgp_path: data.pgpKeyPath,
            is_deduplication: data.isDeduplication
        }
        console.log(requestData);

        await InternalApi.dataGenerate(requestData)
    } catch (err) {
        ElMessage.error("请检查表单")
        console.log(err)
        resetState()
    }
}


const resetForm = (formEl: FormInstance | undefined) => {
    if (!formEl) return
    formEl.resetFields()
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
        height: 550px;

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

        .generation {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

    }
}
</style>