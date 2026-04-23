<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from '@/i18n'
import clientManualMarkdown from '@clientDocs/USER_MANUAL.md?raw'
import serverManualMarkdown from '@serverDocs/USER_MANUAL.md?raw'

type ManualTabKey = 'client' | 'server'

interface ManualTabDefinition {
  key: ManualTabKey
  title: string
  subtitle: string
  filePath: string
  audience: string
  markdown: string
  html: string
}

const { locale, t } = useI18n()
const appVersion = ref('0.1.0-preview.1')
const buildDate = '2026-04-23'
const isEnglish = computed(() => locale.value === 'en-US')
const gpuStatus = ref<any | null>(null)
const activeManualTab = ref<ManualTabKey>('client')
const releaseChannel = computed(() => (isEnglish.value ? 'Preview 0.1' : '0.1 预览版'))

const baseInfo = computed(() => [
  { label: isEnglish.value ? 'Product Name' : '产品名称', value: 'NEKO_ERP' },
  { label: t('about.version'), value: `Desktop ${appVersion.value}` },
  { label: isEnglish.value ? 'Release Channel' : '发布通道', value: releaseChannel.value },
  { label: isEnglish.value ? 'Product Direction' : '产品方向', value: isEnglish.value ? 'Desktop-first NEKO_ERP workspace and service stack' : '桌面优先的 NEKO_ERP 工作区与服务端一体化架构' },
  { label: isEnglish.value ? 'Runtime' : '运行环境', value: 'Electron / Vue 3 / Spring Boot 0.1 Preview' },
  { label: isEnglish.value ? 'Hardware Acceleration' : '硬件加速', value: gpuStatus.value?.hardwareAcceleration ? (isEnglish.value ? 'Enabled' : '已启用') : (isEnglish.value ? 'Unknown' : '未检测') },
])

const stackRows = computed(() =>
  isEnglish.value
    ? [
        { name: 'Desktop Shell', detail: 'Electron 35.2.1 for native desktop experience and window management' },
        { name: 'Frontend', detail: 'Vue 3.5 + TypeScript + Element Plus + Vite' },
        { name: 'Backend', detail: 'Spring Boot 3.2.4 + MyBatis-Plus + MapStruct' },
        { name: 'Data Layer', detail: 'PostgreSQL + Flyway migrations with modular entities and queries' },
      ]
    : [
        { name: '桌面容器', detail: 'Electron 35.2.1，承接本地桌面体验与窗口管理' },
        { name: '前端层', detail: 'Vue 3.5 + TypeScript + Element Plus + Vite' },
        { name: '服务端', detail: 'Spring Boot 3.2.4 + MyBatis-Plus + MapStruct' },
        { name: '数据层', detail: 'PostgreSQL + Flyway 迁移，按模块扩展实体与查询' },
      ],
)

const capabilityRows = computed(() =>
  isEnglish.value
    ? [
        'The preview home now carries a first-run checklist with server, session, and recent-record actions so operators can start without reading internal notes',
        'Preview home, core workbenches, account administration, settings, and manuals are now connected in one desktop path',
        'Core records open into detail pages with attachment, timeline, document, and action areas instead of expanding inside crowded lists',
        'Advanced rollout, evidence, and governance panels stay collapsed by default so daily users see business work first',
      ]
    : [
        '预览首页已经带上首跑检查清单，直接覆盖服务端、会话和最近对象动作，操作员不看内部说明也能开始试跑',
        '预览首页、核心工作台、账户管理、设置页和使用手册已经串成一条桌面路径',
        '核心记录进入独立详情页，并保留附件、时间轴、文档和动作区，不再在拥挤列表里展开',
        '切换、证据和治理类高级面板默认收起，让日常用户先看到真实业务处理',
      ],
)

const roadmapRows = computed(() =>
  isEnglish.value
    ? [
        'Run the final preview smoke path on a clean install: login, first-run checklist, list loading, create, edit, detail page, attachment, and logout',
        'Freeze the 0.1 preview package only after client and server manuals, release notes, and checksums are verified together',
        'Keep reducing page noise before opening deeper accounting, manufacturing, HR, or reporting scope after the preview trial',
      ]
    : [
        '在干净安装环境完成最后一轮预览版 smoke 主路径：登录、首跑检查清单、列表加载、新建、编辑、详情页、附件和退出',
        '只有在客户端和服务端手册、发布说明、校验和一起核对通过后，才冻结 0.1 预览版发包',
        '在预览试点开始前继续降低页面噪音，再考虑加深会计、制造、HR 或报表范围',
      ],
)

const previewScopeRows = computed(() =>
  isEnglish.value
    ? [
        { label: 'Must Work', value: 'Login / Users / Core Lists', description: 'The preview must be usable by an operator without reading development notes.' },
        { label: 'Main Scope', value: 'Master Data / Sales / Purchase / Inventory / Billing', description: 'The first release stays narrow but covers the daily ERP loop.' },
        { label: 'Not First', value: 'Deep BI / Full Accounting / Full Manufacturing', description: 'These stay behind the preview scope until the main workflow is stable.' },
      ]
    : [
        { label: '必须可用', value: '登录 / 用户 / 核心列表', description: '预览版必须让操作员不读开发说明也能进入系统并完成基础操作。' },
        { label: '主范围', value: '主数据 / 销售 / 采购 / 库存 / 账单', description: '第一版范围保持窄，但要覆盖日常 ERP 主循环。' },
        { label: '暂不优先', value: '深 BI / 全会计 / 全制造', description: '这些能力先放在预览范围之后，等主流程稳定再加深。' },
      ],
)

const manualTabs = computed<ManualTabDefinition[]>(() => [
  {
    key: 'client',
    title: isEnglish.value ? 'Client Manual' : '客户端手册',
    subtitle: isEnglish.value ? 'Desktop operation guide for pilot users and implementers' : '试点业务用户与实施人员的桌面操作指南',
    filePath: 'erp-client/docs/USER_MANUAL.md',
    audience: isEnglish.value ? 'Operators / Implementers / Pilot Users' : '业务操作员 / 实施人员 / 试点用户',
    markdown: clientManualMarkdown,
    html: renderMarkdownToHtml(clientManualMarkdown),
  },
  {
    key: 'server',
    title: isEnglish.value ? 'Server Manual' : '服务端手册',
    subtitle: isEnglish.value ? 'Backend startup, configuration, release, and troubleshooting guide' : '后端启动、配置、发布与排错指南',
    filePath: 'erp-server/docs/USER_MANUAL.md',
    audience: isEnglish.value ? 'Developers / DevOps / Support' : '开发人员 / 运维人员 / 支持人员',
    markdown: serverManualMarkdown,
    html: renderMarkdownToHtml(serverManualMarkdown),
  },
])

const activeManual = computed(
  () => manualTabs.value.find((item) => item.key === activeManualTab.value) || manualTabs.value[0],
)

function renderMarkdownToHtml(markdown: string) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n')
  const htmlParts: string[] = []
  const paragraphBuffer: string[] = []
  let inCodeBlock = false
  let inUnorderedList = false
  let inOrderedList = false

  const closeLists = () => {
    if (inUnorderedList) {
      htmlParts.push('</ul>')
      inUnorderedList = false
    }
    if (inOrderedList) {
      htmlParts.push('</ol>')
      inOrderedList = false
    }
  }

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return
    htmlParts.push(`<p>${paragraphBuffer.join('<br/>')}</p>`)
    paragraphBuffer.length = 0
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()

    if (trimmed.startsWith('```')) {
      flushParagraph()
      closeLists()
      if (!inCodeBlock) {
        htmlParts.push('<pre><code>')
        inCodeBlock = true
      } else {
        htmlParts.push('</code></pre>')
        inCodeBlock = false
      }
      continue
    }

    if (inCodeBlock) {
      htmlParts.push(`${escapeHtml(rawLine)}\n`)
      continue
    }

    if (!trimmed) {
      flushParagraph()
      closeLists()
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      closeLists()
      const level = Math.min(headingMatch[1].length, 3)
      htmlParts.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`)
      continue
    }

    const unorderedMatch = trimmed.match(/^- (.+)$/)
    if (unorderedMatch) {
      flushParagraph()
      if (inOrderedList) {
        htmlParts.push('</ol>')
        inOrderedList = false
      }
      if (!inUnorderedList) {
        htmlParts.push('<ul>')
        inUnorderedList = true
      }
      htmlParts.push(`<li>${renderInlineMarkdown(unorderedMatch[1])}</li>`)
      continue
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (orderedMatch) {
      flushParagraph()
      if (inUnorderedList) {
        htmlParts.push('</ul>')
        inUnorderedList = false
      }
      if (!inOrderedList) {
        htmlParts.push('<ol>')
        inOrderedList = true
      }
      htmlParts.push(`<li>${renderInlineMarkdown(orderedMatch[1])}</li>`)
      continue
    }

    paragraphBuffer.push(renderInlineMarkdown(trimmed))
  }

  flushParagraph()
  closeLists()
  if (inCodeBlock) {
    htmlParts.push('</code></pre>')
  }
  return htmlParts.join('')
}

function renderInlineMarkdown(text: string) {
  let html = escapeHtml(text)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  return html
}

function escapeHtml(text: string) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

onMounted(async () => {
  if (window.erpDesktop?.getAppVersion) {
    appVersion.value = await window.erpDesktop.getAppVersion()
  }
  if (!window.erpDesktop?.getGpuStatus) return
  gpuStatus.value = await window.erpDesktop.getGpuStatus()
})
</script>

<template>
  <div class="about-workspace">
    <header class="about-header">
      <nav class="breadcrumb">{{ t('about.breadcrumb') }}</nav>
      <h1 class="page-title">{{ t('about.title') }}</h1>
      <p class="subtitle">{{ t('about.subtitle') }}</p>
    </header>

    <main class="about-content">
      <section class="hero-card">
        <div class="hero-brand">
          <div class="brand-logo">
            <div class="logo-inner">NE</div>
          </div>
          <div class="brand-copy">
            <h2>NEKO_ERP</h2>
            <p>{{ t('about.heroText') }}</p>
            <div class="hero-meta">
              <span class="version-tag">{{ t('about.version') }} {{ appVersion }}</span>
              <span class="version-tag">{{ releaseChannel }}</span>
              <span class="build-tag">{{ t('about.build') }} {{ buildDate }}</span>
            </div>
          </div>
        </div>

        <div class="info-grid">
          <div v-for="item in baseInfo" :key="item.label" class="info-item">
            <label>{{ item.label }}</label>
            <span>{{ item.value }}</span>
          </div>
        </div>
      </section>

      <section class="section-card">
        <div class="section-head">
          <h3>{{ t('about.stack') }}</h3>
          <span>{{ t('about.stackEn') }}</span>
        </div>
        <div class="stack-list">
          <div v-for="item in stackRows" :key="item.name" class="stack-item">
            <div class="stack-name">{{ item.name }}</div>
            <div class="stack-detail">{{ item.detail }}</div>
          </div>
        </div>
      </section>

      <section class="section-card preview-scope-section">
        <div class="section-head">
          <h3>{{ isEnglish ? '0.1 Preview Scope' : '0.1 预览版范围' }}</h3>
          <span>{{ isEnglish ? 'Usable First' : '可用优先' }}</span>
        </div>
        <div class="preview-scope-grid">
          <div v-for="item in previewScopeRows" :key="item.label" class="preview-scope-item">
            <label>{{ item.label }}</label>
            <strong>{{ item.value }}</strong>
            <p>{{ item.description }}</p>
          </div>
        </div>
      </section>

      <section class="grid-sections">
        <div class="section-card compact-card">
          <div class="section-head">
            <h3>{{ t('about.capability') }}</h3>
            <span>{{ t('about.capabilityEn') }}</span>
          </div>
          <ul class="detail-list">
            <li v-for="item in capabilityRows" :key="item">
              <el-icon><Check /></el-icon>
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>

        <div class="section-card compact-card">
          <div class="section-head">
            <h3>{{ t('about.roadmap') }}</h3>
            <span>{{ t('about.roadmapEn') }}</span>
          </div>
          <ul class="detail-list">
            <li v-for="item in roadmapRows" :key="item">
              <el-icon><ArrowRightBold /></el-icon>
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>
      </section>

      <section class="section-card manual-section">
        <div class="section-head section-head-manual">
          <div>
            <h3>{{ isEnglish ? 'User Manuals' : '使用手册' }}</h3>
            <span>{{ isEnglish ? 'Integrated from source markdown files' : '直接读取源码中的 Markdown 手册' }}</span>
          </div>
          <div class="manual-headline">
            <strong>{{ activeManual.title }}</strong>
            <span>{{ activeManual.filePath }}</span>
          </div>
        </div>

        <div class="manual-switch-grid">
          <button
            v-for="item in manualTabs"
            :key="item.key"
            type="button"
            :class="['manual-switch-card', { active: activeManualTab === item.key }]"
            @click="activeManualTab = item.key"
          >
            <div class="manual-switch-title">{{ item.title }}</div>
            <div class="manual-switch-subtitle">{{ item.subtitle }}</div>
          </button>
        </div>

        <el-tabs v-model="activeManualTab" class="manual-tabs">
          <el-tab-pane
            v-for="item in manualTabs"
            :key="item.key"
            :label="item.title"
            :name="item.key"
          >
            <div class="manual-meta-grid">
              <div class="manual-meta-item">
                <label>{{ isEnglish ? 'Audience' : '适用对象' }}</label>
                <span>{{ item.audience }}</span>
              </div>
              <div class="manual-meta-item">
                <label>{{ isEnglish ? 'Source File' : '源文件' }}</label>
                <span>{{ item.filePath }}</span>
              </div>
              <div class="manual-meta-item manual-meta-wide">
                <label>{{ isEnglish ? 'Integration' : '集成方式' }}</label>
                <span>{{ isEnglish ? 'The About page renders the live markdown source directly.' : '关于页直接渲染当前 markdown 源文件，文档和界面保持同步。' }}</span>
              </div>
            </div>

            <div class="manual-markdown" v-html="item.html"></div>
          </el-tab-pane>
        </el-tabs>
      </section>

      <footer class="about-footer">
        <div class="footer-main">NEKO_ERP Desktop</div>
        <div class="footer-sub">© 2024-2026 NEKO_ERP · {{ t('about.footer') }}</div>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.about-workspace { min-height: 100vh; background: var(--app-bg); display: flex; flex-direction: column; color: var(--app-text); }
.about-header { padding: 40px 48px; border-bottom: 1px solid var(--app-border); }
.breadcrumb { font-size: 12px; color: var(--app-text-secondary); font-weight: 600; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px; }
.page-title { font-size: 32px; font-weight: 700; margin: 0; color: var(--app-text); letter-spacing: -0.5px; }
.subtitle { font-size: 14px; color: var(--app-text-secondary); margin-top: 12px; font-weight: 400; }

.about-content { padding: 40px 48px 56px; display: flex; flex-direction: column; gap: 24px; }

.hero-card,
.section-card {
  background: var(--app-panel);
  border-radius: 16px;
  border: 1px solid var(--app-border);
  box-shadow: var(--app-card-shadow);
}

.hero-card { padding: 32px; }
.hero-brand { display: flex; align-items: center; gap: 20px; }
.brand-logo {
  width: 72px; height: 72px; background: color-mix(in srgb, var(--app-primary) 10%, transparent); border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
}
.logo-inner { font-size: 24px; font-weight: 800; color: var(--app-primary); letter-spacing: -0.4px; }
.brand-copy h2 { margin: 0; font-size: 28px; font-weight: 800; color: var(--app-text); letter-spacing: -0.5px; }
.brand-copy p { margin: 10px 0 0; font-size: 14px; color: var(--app-text-secondary); }
.hero-meta { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
.version-tag,
.build-tag {
  font-size: 12px; font-weight: 700; color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 10%, transparent); padding: 5px 10px; border-radius: 999px;
}
.build-tag { color: var(--app-text-secondary); background: var(--app-muted-bg); }

.info-grid {
  margin-top: 28px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.info-item {
  padding: 18px 20px; border-radius: 12px; background: var(--app-muted-bg); border: 1px solid var(--app-border);
  display: flex; flex-direction: column; gap: 8px;
}
.info-item label { font-size: 12px; color: var(--app-text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.4px; }
.info-item span { font-size: 15px; color: var(--app-text); font-weight: 600; line-height: 1.5; }

.section-card { padding: 24px 28px; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 20px; }
.section-head h3 { margin: 0; font-size: 18px; color: var(--app-text); font-weight: 700; }
.section-head span { font-size: 12px; color: var(--app-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }

.stack-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.stack-item {
  border: 1px solid var(--app-border); border-radius: 12px; padding: 18px 20px; background: var(--app-muted-bg);
}
.stack-name { font-size: 14px; font-weight: 700; color: var(--app-text); }
.stack-detail { margin-top: 8px; font-size: 13px; line-height: 1.6; color: var(--app-text-secondary); }

.preview-scope-section {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--app-primary) 7%, transparent), transparent 52%),
    var(--app-panel);
}

.preview-scope-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.preview-scope-item {
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid var(--app-border);
  background: color-mix(in srgb, var(--app-panel) 86%, var(--app-muted-bg));
}

.preview-scope-item label,
.preview-scope-item strong {
  display: block;
}

.preview-scope-item label {
  color: var(--app-text-secondary);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.preview-scope-item strong {
  margin-top: 8px;
  color: var(--app-text);
  font-size: 15px;
}

.preview-scope-item p {
  margin: 10px 0 0;
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.grid-sections { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
.compact-card { min-height: 100%; }

.detail-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
.detail-list li { display: flex; align-items: flex-start; gap: 12px; color: var(--app-text); font-size: 14px; line-height: 1.6; }
.detail-list .el-icon { margin-top: 3px; color: var(--app-primary); }

.section-head-manual {
  align-items: flex-start;
}

.manual-headline {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  min-width: 260px;
}

.manual-headline strong {
  font-size: 14px;
  color: var(--app-text);
}

.manual-headline span {
  text-transform: none;
  letter-spacing: 0;
  font-size: 12px;
}

.manual-switch-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.manual-switch-card {
  border: 1px solid var(--app-border);
  border-radius: 14px;
  padding: 18px 20px;
  background: var(--app-muted-bg);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.manual-switch-card:hover {
  border-color: color-mix(in srgb, var(--app-primary) 50%, var(--app-border));
  transform: translateY(-1px);
}

.manual-switch-card.active {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--app-primary) 45%, transparent);
  background: color-mix(in srgb, var(--app-primary) 7%, var(--app-muted-bg));
}

.manual-switch-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--app-text);
}

.manual-switch-subtitle {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--app-text-secondary);
}

.manual-tabs :deep(.el-tabs__header) {
  margin-bottom: 18px;
}

.manual-tabs :deep(.el-tabs__nav-wrap::after) {
  background: var(--app-border);
}

.manual-tabs :deep(.el-tabs__item) {
  color: var(--app-text-secondary);
  font-weight: 600;
}

.manual-tabs :deep(.el-tabs__item.is-active) {
  color: var(--app-primary);
}

.manual-tabs :deep(.el-tabs__active-bar) {
  background: var(--app-primary);
}

.manual-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.manual-meta-item {
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid var(--app-border);
  background: var(--app-muted-bg);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.manual-meta-item label {
  font-size: 12px;
  color: var(--app-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-weight: 600;
}

.manual-meta-item span {
  font-size: 14px;
  line-height: 1.6;
  color: var(--app-text);
}

.manual-meta-wide {
  grid-column: 1 / -1;
}

.manual-markdown {
  border: 1px solid var(--app-border);
  border-radius: 14px;
  padding: 24px 26px;
  background: color-mix(in srgb, var(--app-panel) 92%, var(--app-muted-bg));
}

.manual-markdown :deep(h1),
.manual-markdown :deep(h2),
.manual-markdown :deep(h3) {
  color: var(--app-text);
  letter-spacing: -0.2px;
}

.manual-markdown :deep(h1) {
  font-size: 24px;
  margin: 0 0 16px;
}

.manual-markdown :deep(h2) {
  font-size: 18px;
  margin: 26px 0 12px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--app-border) 75%, transparent);
}

.manual-markdown :deep(h3) {
  font-size: 15px;
  margin: 20px 0 10px;
}

.manual-markdown :deep(p) {
  margin: 0 0 12px;
  color: var(--app-text);
  font-size: 14px;
  line-height: 1.75;
}

.manual-markdown :deep(ul),
.manual-markdown :deep(ol) {
  margin: 0 0 14px 20px;
  padding: 0;
  color: var(--app-text);
}

.manual-markdown :deep(li) {
  margin-bottom: 8px;
  line-height: 1.7;
}

.manual-markdown :deep(code) {
  font-family: 'SFMono-Regular', 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--app-primary) 10%, var(--app-muted-bg));
  color: var(--app-primary);
}

.manual-markdown :deep(pre) {
  margin: 14px 0 18px;
  padding: 16px 18px;
  border-radius: 12px;
  background: #0f1720;
  overflow-x: auto;
}

.manual-markdown :deep(pre code) {
  padding: 0;
  background: transparent;
  color: #d8e4f2;
}

.manual-markdown :deep(strong) {
  color: var(--app-text);
  font-weight: 700;
}

.about-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 4px; color: var(--app-text-secondary); font-size: 13px;
}
.footer-main { font-weight: 700; color: var(--app-text); }
.footer-sub { color: var(--app-text-secondary); }

@media (max-width: 960px) {
  .about-content { padding: 24px; }
  .about-header { padding: 28px 24px; }
  .info-grid,
  .stack-list,
  .preview-scope-grid,
  .grid-sections,
  .manual-switch-grid,
  .manual-meta-grid { grid-template-columns: 1fr; }
  .manual-headline { align-items: flex-start; min-width: 0; }
  .section-head-manual { flex-direction: column; }
  .about-footer { flex-direction: column; align-items: flex-start; gap: 8px; }
}

@media (max-width: 720px) {
  .hero-card { padding: 24px; }
  .hero-brand { flex-direction: column; align-items: flex-start; }
  .manual-markdown { padding: 18px; }
}
</style>
