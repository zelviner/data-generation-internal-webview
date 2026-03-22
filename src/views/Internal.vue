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
                            <el-button>浏览</el-button>
                        </template>
                    </el-input>
                </el-form-item>

                <el-form-item label="输入文件夹" prop="inputPath">
                    <el-input v-model="data.inputPath" placeholder="请选择输入文件夹">
                        <template #append>
                            <el-button>浏览</el-button>
                        </template>
                    </el-input>
                </el-form-item>

                <el-form-item label="授权文件夹" prop="licensePath">
                    <el-input v-model="data.licensePath" placeholder="请选择授权文件夹">
                        <template #append>
                            <el-button>浏览</el-button>
                        </template>
                    </el-input>
                </el-form-item>

                <el-form-item label="PGP 密钥">
                    <el-input v-model="data.pgpKeyPath" placeholder="请选择 PGP 密钥">
                        <template #append>
                            <el-button>浏览</el-button>
                        </template>
                    </el-input>
                </el-form-item>

                <el-form-item label="查重">
                    <el-switch v-model="data.isDeduplication" />
                </el-form-item>
            </el-form>

            <template #footer>
                <div class="generation">
                    <el-progress :text-inside="false" :stroke-width="26" :percentage="30" striped striped-flow />
                    <div class="button-group">
                        <el-button type="primary" @click="submitForm(ruleFormRef)">
                            生成
                        </el-button>
                        <el-button @click="resetForm(ruleFormRef)">清空</el-button>
                    </div>
                </div>
            </template>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';

interface RuleForm {
    orderNo: string
    luaScriptPath: string
    inputPath: string
    licensePath: string
    pgpKeyPath: string
    isDeduplication: boolean
}

const ruleFormRef = ref<FormInstance>()
const data = reactive<RuleForm>({
    orderNo: "",
    luaScriptPath: "",
    inputPath: "",
    licensePath: "",
    pgpKeyPath: "",
    isDeduplication: true
})

const rules = reactive<FormRules<RuleForm>>({
    orderNo: [
        { required: true, message: '请输入订单号', trigger: 'blur' },
        { min: 3, max: 20, message: '长度请控制在 3 - 20', trigger: 'blur' }
    ],
    luaScriptPath: [
        { required: true, message: '请选择 Lua 脚本', trigger: 'blur' }
    ],
    inputPath: [
        { required: true, message: '请选择输入文件夹', trigger: 'blur' }
    ],
    licensePath: [
        { required: true, message: '请选择授权文件夹', trigger: 'blur' }
    ],
    pgpKeyPath: [
        { required: true, message: '请选择 PGP 密钥', trigger: 'blur' }
    ],
})

const submitForm = async (formEl: FormInstance | undefined) => {
    if (!formEl) return
    await formEl.validate((valid, fields) => {
        if (valid) {
            console.log("submit");
        } else {
            console.log("error submit", fields);
        }
    })
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