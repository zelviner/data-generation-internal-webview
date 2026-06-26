<template>
    <Transition name="task-overlay-fade">
        <div v-if="modelValue" class="task-overlay">
            <div class="task-panel" :class="`is-${status}`">
                <div class="task-visual">
                    <div v-if="isRunning" class="orbit orbit-outer"></div>
                    <div v-if="isRunning" class="orbit orbit-inner"></div>
                    <div class="progress-ring" :style="ringStyle">
                        <div class="ring-core">
                            <span>已用时</span>
                            <strong>{{ elapsedText }}</strong>
                            <em>{{ displayProgress }}%</em>
                        </div>
                    </div>
                </div>

                <div class="task-content">
                    <div class="task-meta">
                        <div class="status-pill">
                            <span class="status-dot"></span>
                            {{ statusLabel }}
                        </div>
                        <span class="progress-value">{{ displayProgress }}%</span>
                    </div>

                    <h2>{{ title }}</h2>
                    <p>{{ description }}</p>

                    <div class="stage-rail">
                        <div v-for="(stage, index) in stages" :key="stage.label" class="stage-item"
                            :class="getStageClass(index)">
                            <span class="stage-dot">{{ index + 1 }}</span>
                            <span>{{ stage.label }}</span>
                        </div>
                    </div>
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
import { computed, onBeforeUnmount, ref, watch } from 'vue'

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

let timer: ReturnType<typeof window.setInterval> | null = null
const elapsedSeconds = ref(0)

const displayProgress = computed(() => {
    if (props.status === 'done') return 100
    return Math.max(0, Math.min(100, Math.round(props.progress || 0)))
})

const isFinished = computed(() => props.status === 'done' || props.status === 'error')
const isRunning = computed(() => !isFinished.value)

const stages = [
    { label: '上传文件' },
    { label: '创建任务' },
    { label: '生成数据' },
]

const currentStageIndex = computed(() => {
    if (props.status === 'uploading') return 0
    if (props.status === 'starting') return 1
    if (props.status === 'running' || props.status === 'done') return 2
    if (props.status === 'error') return displayProgress.value > 0 ? 2 : 0
    return 0
})

const ringColor = computed(() => {
    if (props.status === 'done') return '#67c23a'
    if (props.status === 'error') return '#f56c6c'
    return '#409eff'
})

const ringStyle = computed(() => ({
    '--ring-progress': `${displayProgress.value * 3.6}deg`,
    '--ring-color': ringColor.value,
}))

const elapsedText = computed(() => {
    const minutes = Math.floor(elapsedSeconds.value / 60)
    const seconds = elapsedSeconds.value % 60

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const stopTimer = () => {
    if (!timer) return

    window.clearInterval(timer)
    timer = null
}

const startTimer = () => {
    if (timer) return

    timer = window.setInterval(() => {
        elapsedSeconds.value += 1
    }, 1000)
}

watch(
    () => props.modelValue,
    (visible) => {
        if (!visible) {
            stopTimer()
            elapsedSeconds.value = 0
            return
        }

        elapsedSeconds.value = 0
        if (!isFinished.value) startTimer()
    }
)

watch(isFinished, (finished) => {
    if (!props.modelValue) return

    if (finished) {
        stopTimer()
        return
    }

    startTimer()
})

onBeforeUnmount(stopTimer)

const getStageClass = (index: number) => ({
    active: currentStageIndex.value === index && props.status !== 'done',
    done: props.status === 'done' || currentStageIndex.value > index,
    error: props.status === 'error' && currentStageIndex.value === index,
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
        radial-gradient(circle at 28% 20%, rgba(64, 158, 255, 0.22), transparent 28%),
        radial-gradient(circle at 76% 72%, rgba(103, 194, 58, 0.14), transparent 30%),
        linear-gradient(135deg, rgba(245, 247, 251, 0.92), rgba(238, 244, 252, 0.9));
    backdrop-filter: blur(14px);
}

.task-panel {
    position: relative;
    width: 520px;
    padding: 44px 48px 38px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.72);
    border-radius: 22px;
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(250, 252, 255, 0.94)),
        #fff;
    box-shadow: 0 28px 90px rgba(31, 45, 61, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.9);
    text-align: center;
}

.task-panel::before {
    content: "";
    position: absolute;
    inset: 0 0 auto;
    height: 4px;
    background: linear-gradient(90deg, #409eff, #79bbff, #67c23a);
}

.task-visual {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 210px;
    height: 210px;
}

.progress-ring {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 176px;
    height: 176px;
    border-radius: 50%;
    background:
        conic-gradient(var(--ring-color) var(--ring-progress), #e5eaf3 0),
        #f5f7fa;
    box-shadow: 0 18px 48px rgba(64, 158, 255, 0.18);
}

.progress-ring::before {
    content: "";
    position: absolute;
    inset: 10px;
    border-radius: 50%;
    background: #fff;
    box-shadow: inset 0 0 0 1px rgba(64, 158, 255, 0.08);
}

.ring-core {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.ring-core span {
    color: #909399;
    font-size: 13px;
}

.ring-core strong {
    margin-top: 4px;
    color: #1f2d3d;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    font-size: 34px;
    font-weight: 760;
    line-height: 1.1;
    letter-spacing: 0.03em;
}

.ring-core em {
    margin-top: 6px;
    color: #606266;
    font-size: 13px;
    font-style: normal;
}

.orbit {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(64, 158, 255, 0.22);
}

.orbit-outer {
    width: 210px;
    height: 210px;
    animation: pulse-ring 2.4s ease-in-out infinite;
}

.orbit-inner {
    width: 190px;
    height: 190px;
    border-top-color: rgba(64, 158, 255, 0.7);
    animation: rotate-ring 3s linear infinite;
}

.task-content {
    margin-top: 20px;
}

.task-meta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
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

.progress-value {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    background: #f5f7fa;
    color: #606266;
    font-size: 13px;
    font-weight: 600;
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

.stage-rail {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 26px;
}

.stage-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 38px;
    border: 1px solid #e4e7ed;
    border-radius: 12px;
    background: #fafafa;
    color: #909399;
    font-size: 13px;
}

.stage-dot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #e4e7ed;
    color: #606266;
    font-size: 12px;
    font-weight: 700;
}

.stage-item.active {
    border-color: rgba(64, 158, 255, 0.36);
    background: #ecf5ff;
    color: #337ecc;
}

.stage-item.active .stage-dot {
    background: #409eff;
    color: #fff;
    box-shadow: 0 0 0 5px rgba(64, 158, 255, 0.12);
}

.stage-item.done {
    border-color: rgba(103, 194, 58, 0.22);
    background: #f0f9eb;
    color: #529b2e;
}

.stage-item.done .stage-dot {
    background: #67c23a;
    color: #fff;
}

.stage-item.error {
    border-color: rgba(245, 108, 108, 0.26);
    background: #fef0f0;
    color: #c45656;
}

.stage-item.error .stage-dot {
    background: #f56c6c;
    color: #fff;
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
