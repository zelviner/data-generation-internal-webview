<template>
    <Transition name="task-overlay-fade">
        <div v-if="modelValue" class="task-overlay">
            <div class="task-panel" :class="`is-${status}`">
                <div class="progress-stage">
                    <div v-if="isRunning" class="orbit orbit-outer"></div>
                    <div v-if="isRunning" class="orbit orbit-inner"></div>
                    <el-progress type="dashboard" :percentage="displayProgress" :width="156" :stroke-width="10"
                        :status="progressStatus" />
                </div>

                <div class="task-content">
                    <div class="status-pill">
                        <span class="status-dot"></span>
                        {{ statusLabel }}
                    </div>
                    <h2>{{ title }}</h2>
                    <p>{{ description }}</p>
                </div>

                <div v-if="isFinished" class="task-actions">
                    <el-button type="primary" size="large" @click="$emit('close')">
                        {{ status === 'error' ? '返回修改' : '关闭' }}
                    </el-button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type TaskStatus = 'idle' | 'uploading' | 'starting' | 'running' | 'done' | 'error'

const props = defineProps<{
    modelValue: boolean
    status: TaskStatus
    progress: number
    text?: string
}>()

defineEmits<{
    close: []
}>()

const displayProgress = computed(() => {
    if (props.status === 'done') return 100
    return Math.max(0, Math.min(100, Math.round(props.progress || 0)))
})

const isFinished = computed(() => props.status === 'done' || props.status === 'error')
const isRunning = computed(() => !isFinished.value)

const progressStatus = computed(() => {
    if (props.status === 'done') return 'success'
    if (props.status === 'error') return 'exception'
    return undefined
})

const statusLabel = computed(() => {
    switch (props.status) {
        case 'uploading':
            return '上传中'
        case 'starting':
            return '创建任务'
        case 'running':
            return '生成中'
        case 'done':
            return '已完成'
        case 'error':
            return '失败'
        default:
            return '准备中'
    }
})

const title = computed(() => {
    switch (props.status) {
        case 'uploading':
            return '正在上传文件'
        case 'starting':
            return '正在创建生成任务'
        case 'running':
            return '数据正在生成'
        case 'done':
            return '数据生成完成'
        case 'error':
            return '数据生成失败'
        default:
            return '任务准备中'
    }
})

const description = computed(() => {
    if (props.text) return props.text

    switch (props.status) {
        case 'uploading':
            return '文件上传完成后会自动开始生成。'
        case 'starting':
            return '正在提交任务，请稍候。'
        case 'running':
            return '任务正在执行，页面会实时更新进度。'
        case 'done':
            return '任务已完成，可以关闭此面板。'
        case 'error':
            return '请返回表单检查参数或文件后重试。'
        default:
            return '请稍候。'
    }
})
</script>

<style scoped lang="scss">
.task-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
        radial-gradient(circle at 50% 35%, rgba(64, 158, 255, 0.18), transparent 34%),
        rgba(245, 247, 251, 0.86);
    backdrop-filter: blur(10px);
}

.task-panel {
    width: 420px;
    padding: 42px 44px 36px;
    border: 1px solid rgba(64, 158, 255, 0.14);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 24px 80px rgba(31, 45, 61, 0.18);
    text-align: center;
}

.progress-stage {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 190px;
    height: 190px;
}

.orbit {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(64, 158, 255, 0.22);
}

.orbit-outer {
    width: 188px;
    height: 188px;
    animation: pulse-ring 2.4s ease-in-out infinite;
}

.orbit-inner {
    width: 164px;
    height: 164px;
    border-top-color: rgba(64, 158, 255, 0.7);
    animation: rotate-ring 3s linear infinite;
}

.task-content {
    margin-top: 14px;
}

.status-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 999px;
    background: #ecf5ff;
    color: #337ecc;
    font-size: 13px;
    font-weight: 600;
}

.status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #409eff;
    box-shadow: 0 0 0 5px rgba(64, 158, 255, 0.14);
}

h2 {
    margin: 18px 0 10px;
    color: #1f2d3d;
    font-size: 24px;
    font-weight: 650;
}

p {
    min-height: 44px;
    margin: 0;
    color: #606266;
    font-size: 15px;
    line-height: 1.7;
}

.task-actions {
    margin-top: 28px;
}

.is-done {
    border-color: rgba(103, 194, 58, 0.22);

    .status-pill {
        background: #f0f9eb;
        color: #529b2e;
    }

    .status-dot {
        background: #67c23a;
        box-shadow: 0 0 0 5px rgba(103, 194, 58, 0.14);
    }
}

.is-error {
    border-color: rgba(245, 108, 108, 0.22);

    .status-pill {
        background: #fef0f0;
        color: #c45656;
    }

    .status-dot {
        background: #f56c6c;
        box-shadow: 0 0 0 5px rgba(245, 108, 108, 0.14);
    }
}

.task-overlay-fade-enter-active,
.task-overlay-fade-leave-active {
    transition: opacity 0.22s ease;
}

.task-overlay-fade-enter-from,
.task-overlay-fade-leave-to {
    opacity: 0;
}

@keyframes rotate-ring {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

@keyframes pulse-ring {
    0%,
    100% {
        transform: scale(0.96);
        opacity: 0.45;
    }

    50% {
        transform: scale(1.03);
        opacity: 1;
    }
}
</style>
