<!-- <template>
    <el-dialog v-model="visible" title="选择文件" width="600px">
        <el-tree :data="treeData" node-key="id" :props="defaultProps" highlight-current @node-click="handleNodeClick" />

        <template #footer>
            <el-button @click="visible = false">取消</el-button>
            <el-button type="primary" @click="confirmSelect">确定</el-button>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue"
import InternalApi from "@/apis/internal.js"


interface FtpDirTree {
    id: string
    title: string
    create: string
    isDir: boolean
    children?: FtpDirTree[]
}

const visible = ref(false)
const treeData = ref<FtpDirTree[]>([])
const selectedNode = ref<FtpDirTree | null>(null)

const defaultProps = {
    children: "children",
    label: "title",
}

// 打开对话框 + 加载数据
const open = async () => {
    visible.value = true

    const res = await axios.get("/api/ftp/tree")
    treeData.value = res.data
}

// 点击节点
const handleNodeClick = (node: FtpDirTree) => {
    if (!node.isDir) {
        selectedNode.value = node
    }
}

// 确认选择
const emit = defineEmits(["select"])

const confirmSelect = () => {
    if (selectedNode.value) {
        emit("select", selectedNode.value)
        visible.value = false
    }
}

// 暴露给父组件
defineExpose({ open })
</script> -->