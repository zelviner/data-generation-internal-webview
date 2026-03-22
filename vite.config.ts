import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// unplugin
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'

export default defineConfig({
  plugins: [
    vue(),

    AutoImport({
      imports: [
        'vue',
        'vue-router',
        {
          'element-plus': [
            'ElMessage',
            'ElMessageBox',
            'ElNotification',
            'ElLoading',
          ],
        },
      ],
      resolvers: [
        ElementPlusResolver({
          importStyle: 'css',
        }),
        IconsResolver(),
      ],
      dts: 'src/auto-imports.d.ts',
    }),

    Components({
      resolvers: [
        ElementPlusResolver({
          importStyle: 'css',
        }),
        IconsResolver({
          enabledCollections: ['ep'],
        }),
      ],
      dts: 'src/components.d.ts',
    }),

    Icons({
      autoInstall: true,
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})