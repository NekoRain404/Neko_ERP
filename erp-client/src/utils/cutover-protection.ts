import type { CutoverControlModuleRow, CutoverPacketChain } from '@/utils/cutover-packets'
import type { SysScriptPreset } from '@/utils/sys-script-presets'

function yn(english: boolean, value?: boolean) {
  return value ? (english ? 'Yes' : '是') : (english ? 'No' : '否')
}

function listOrDash(items?: string[]) {
  return items?.filter(Boolean).join(', ') || '-'
}

function closedLoopLine(english: boolean, label?: string) {
  return `${english ? 'Closed Loop' : '闭环状态'}: ${label || '-'}`
}

function settlementLine(english: boolean, label?: string) {
  return `${english ? 'Settlement Closure' : '结算闭环'}: ${label || '-'}`
}

function financialTraceLine(english: boolean, label?: string) {
  return `${english ? 'Financial Trace' : '财务追溯'}: ${label || '-'}`
}

function financeCockpitLine(english: boolean, label?: string) {
  return `${english ? 'Finance Cockpit' : '财务驾驶舱'}: ${label || '-'}`
}

function closedLoopDetailLines(english: boolean, input: {
  closedLoopMissingLabels?: string[]
  closedLoopStaleLabels?: string[]
}) {
  const lines: string[] = []
  if (input.closedLoopMissingLabels?.length) {
    lines.push(`${english ? 'Missing' : '缺少'}: ${input.closedLoopMissingLabels.join(', ')}`)
  }
  if (input.closedLoopStaleLabels?.length) {
    lines.push(`${english ? 'Stale' : '过期'}: ${input.closedLoopStaleLabels.join(', ')}`)
  }
  return lines
}

function settlementDetailLines(english: boolean, input: {
  settlementMissingLabels?: string[]
  settlementWarningLabels?: string[]
}) {
  const lines: string[] = []
  if (input.settlementMissingLabels?.length) {
    lines.push(`${english ? 'Missing' : '缺失'}: ${input.settlementMissingLabels.join(', ')}`)
  }
  if (input.settlementWarningLabels?.length) {
    lines.push(`${english ? 'Pending' : '待推进'}: ${input.settlementWarningLabels.join(', ')}`)
  }
  return lines
}

function financialTraceDetailLines(english: boolean, input: {
  financialTraceMissingLabels?: string[]
  financialTraceWarningLabels?: string[]
}) {
  const lines: string[] = []
  if (input.financialTraceMissingLabels?.length) {
    lines.push(`${english ? 'Missing' : '缺失'}: ${input.financialTraceMissingLabels.join(', ')}`)
  }
  if (input.financialTraceWarningLabels?.length) {
    lines.push(`${english ? 'Pending' : '待推进'}: ${input.financialTraceWarningLabels.join(', ')}`)
  }
  return lines
}

function financialTraceReferenceLines(english: boolean, input: {
  financialTraceRecordRefs?: string[]
  financialTracePacketRefs?: string[]
}) {
  const lines: string[] = []
  if (input.financialTraceRecordRefs?.length) {
    lines.push(`${english ? 'Trace Records' : '追溯记录'}: ${input.financialTraceRecordRefs.join(', ')}`)
  }
  if (input.financialTracePacketRefs?.length) {
    lines.push(`${english ? 'Trace Packets' : '追溯包'}: ${input.financialTracePacketRefs.join(', ')}`)
  }
  return lines
}

function laneLabel(lane: SysScriptPreset['lane'], english: boolean) {
  if (lane === 'masterData') return english ? 'Master Data' : '主数据'
  if (lane === 'sales') return english ? 'Sales Chain' : '销售链'
  if (lane === 'purchase') return english ? 'Purchase Chain' : '采购链'
  return english ? 'Platform Layer' : '平台层'
}

function extractGuardrailPrompt(scriptCode: string) {
  const matched = String(scriptCode || '').match(/RuntimeException\('([^']+)'\)/)
  return matched?.[1] || ''
}

export function buildSharedRollbackDrillPacket(input: {
  english: boolean
  generatedAt: string
  title?: string
  chains: CutoverPacketChain[]
  modules: CutoverControlModuleRow[]
}) {
  const english = input.english
  const readyChains = input.chains.filter((chain) => !chain.pendingLabels.length && !chain.blockerLabels.length).length
  const pendingGates = input.chains.reduce((sum, chain) => sum + chain.pendingLabels.length, 0)
  const criticalChains = input.chains.filter((chain) => (chain.critical ?? 0) > 0).length
  const disabledModules = input.modules.filter((module) => module.enabled === false).length

  return [
    `# ${input.title || (english ? 'NEKO_ERP First-Wave Rollback Drill Packet' : 'NEKO_ERP 首批回退演练包')}`,
    '',
    `${english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`,
    `${english ? 'Ready Chains' : '就绪链路'}: ${readyChains}/${input.chains.length}`,
    `${english ? 'Pending Gates' : '未完成门槛'}: ${pendingGates}`,
    `${english ? 'Critical Chains' : '严重链路'}: ${criticalChains}`,
    `${english ? 'Disabled Modules' : '已关闭模块'}: ${disabledModules}`,
    '',
    `## ${english ? 'Rollback Drill Scope' : '回退演练范围'}`,
    ...(input.chains.length
      ? input.chains.map((chain) => [
          `### ${chain.label}`,
          `- ${english ? 'Enabled' : '启用'}: ${chain.enabled === undefined ? '-' : yn(english, chain.enabled)}`,
          `- ${english ? 'Modules' : '模块'}: ${chain.modulesLabel}`,
          `- ${english ? 'Gate Status' : '门槛状态'}: ${chain.readyLabel}${chain.summaryLabel ? ` · ${chain.summaryLabel}` : ''}`,
          `- ${closedLoopLine(english, chain.closedLoopLabel)}`,
          `- ${settlementLine(english, chain.settlementLabel)}`,
          `- ${financialTraceLine(english, chain.financialTraceLabel)}`,
          `- ${financeCockpitLine(english, chain.financeCockpitLabel)}`,
          `- ${english ? 'Pending Gates' : '未完成门槛'}: ${listOrDash(chain.pendingLabels)}`,
          `- ${english ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(chain.blockerLabels)}`,
          ...closedLoopDetailLines(english, chain).map((item) => `- ${item}`),
          ...settlementDetailLines(english, chain).map((item) => `- ${item}`),
          ...(chain.settlementLines || []).map((item) => `- ${item}`),
          ...financialTraceDetailLines(english, chain).map((item) => `- ${item}`),
          ...financialTraceReferenceLines(english, chain).map((item) => `- ${item}`),
          ...(chain.financialTraceLines || []).map((item) => `- ${item}`),
          ...(chain.financeCockpitLines?.length
            ? ['', `#### ${english ? 'Finance Cockpit' : '财务驾驶舱'}`, ...chain.financeCockpitLines]
            : []),
          `- ${english ? 'Top Risk' : '最高风险'}: ${chain.topRiskLabel || '-'}`,
          `- ${english ? 'Owner' : '负责人'}: ${chain.owner || '-'}`,
          `- ${english ? 'Fallback Owner' : '回退负责人'}: ${chain.fallbackOwner || '-'}`,
          `- ${english ? 'Rehearsal Owner' : '演练负责人'}: ${chain.rehearsalOwner || '-'}`,
          `- ${english ? 'Pilot Confirmation Owner' : '试点确认负责人'}: ${chain.pilotConfirmOwner || '-'}`,
          `- ${english ? 'Drill Steps' : '演练步骤'}:`,
          `  1. ${english ? 'Disable the chain and related module entry before accepting new pilot records.' : '先关闭链路和关联模块入口，停止新的试点单据进入。'}`,
          `  2. ${english ? 'Export blocker packets, exception lists, and record rollback packets for the affected scope.' : '导出阻塞包、异常清单和受影响记录的回退包。'}`,
          `  3. ${english ? 'Hand off to the fallback owner and return ongoing work to the Odoo fallback path.' : '移交给回退负责人，并把进行中的工作切回 Odoo 兜底路径。'}`,
          `  4. ${english ? 'Verify traceability, gate notes, and pilot confirmation notes before re-opening the scope.' : '重新放开范围前，核对追溯信息、门槛备注和试点确认记录。'}`,
        ].join('\n'))
      : [`- ${english ? 'No first-wave chains available.' : '当前没有首批链路。'}`]),
    '',
    `## ${english ? 'Module Switch Snapshot' : '模块开关快照'}`,
    ...(input.modules.length
      ? input.modules.map((module) => [
          `### ${module.title}`,
          `- ${english ? 'Enabled' : '启用'}: ${module.enabled === undefined ? '-' : yn(english, module.enabled)}`,
          `- ${english ? 'Reminders' : '提醒'}: ${module.reminders ?? 0}`,
          `- ${english ? 'Critical / Warning' : '严重 / 警告'}: ${module.critical ?? 0}/${module.warning ?? 0}`,
          `- ${english ? 'Top Risk' : '最高风险'}: ${module.topRiskLabel || '-'}`,
          `- ${english ? 'Suggested Blockers' : '建议阻塞项'}: ${listOrDash(module.blockerLabels)}`,
          `- ${english ? 'Required Evidence' : '必备证据'}: ${listOrDash(module.requiredLabels)}`,
          `- ${english ? 'Recommended Upload' : '推荐上传'}: ${module.recommendedLabel || '-'}`,
          `- ${settlementLine(english, module.settlementLabel)}`,
          ...settlementDetailLines(english, module).map((item) => `- ${item}`),
          ...(module.settlementLines || []).map((item) => `- ${item}`),
          `- ${financialTraceLine(english, module.financialTraceLabel)}`,
          ...financialTraceDetailLines(english, module).map((item) => `- ${item}`),
          ...financialTraceReferenceLines(english, module).map((item) => `- ${item}`),
          ...(module.financialTraceLines || []).map((item) => `- ${item}`),
          `- ${financeCockpitLine(english, module.financeCockpitLabel)}`,
          ...(module.financeCockpitLines?.length
            ? ['', `#### ${english ? 'Finance Cockpit' : '财务驾驶舱'}`, ...module.financeCockpitLines]
            : []),
          ...(module.paymentLinkageLines?.length
            ? ['', `#### ${english ? 'Payment Linkage' : '付款联动'}`, ...module.paymentLinkageLines]
            : []),
          ...(module.quantImpactLines?.length
            ? ['', `#### ${english ? 'Quant Impact' : '库存影响'}`, ...module.quantImpactLines]
            : []),
        ].join('\n'))
      : [`- ${english ? 'No first-wave modules available.' : '当前没有首批模块。'}`]),
    '',
    `## ${english ? 'Drill Evidence Checklist' : '演练证据清单'}`,
    `- ${english ? 'Current blocker packet export' : '当前阻塞包导出'}`,
    `- ${english ? 'Current exception list export' : '当前异常清单导出'}`,
    `- ${english ? 'At least one record rollback packet per active chain' : '每条活动链至少一份记录级回退包'}`,
    `- ${english ? 'Fallback owner confirmation and re-entry instruction' : '回退负责人确认和回录说明'}`,
    `- ${english ? 'Pilot confirmation note explaining why the drill passed or blocked' : '说明本次演练通过或阻塞原因的试点确认备注'}`,
  ].join('\n')
}

export function buildSharedGuardrailRulesPacket(input: {
  english: boolean
  generatedAt: string
  title?: string
  presets: SysScriptPreset[]
}) {
  const english = input.english
  const lanes: SysScriptPreset['lane'][] = ['masterData', 'sales', 'purchase', 'platform']

  return [
    `# ${input.title || (english ? 'NEKO_ERP First-Wave Guardrail Rules' : 'NEKO_ERP 首批 Guardrail 规则')}`,
    '',
    `${english ? 'Generated At' : '生成时间'}: ${input.generatedAt}`,
    `${english ? 'Preset Count' : '预设数量'}: ${input.presets.length}`,
    '',
    `## ${english ? 'Operating Principles' : '运行原则'}`,
    `- ${english ? 'Keep rules focused on first-wave pilot safety, not a general low-code engine.' : '规则只聚焦首批试点安全，不发散成通用低代码引擎。'}`,
    `- ${english ? 'Prefer reusable presets before writing one-off scripts.' : '优先复用预设，再写一次性脚本。'}`,
    `- ${english ? 'Use before_save to stop bad drafts early and before_action to guard risky transitions.' : '用 before_save 尽早拦住坏草稿，用 before_action 保护高风险状态流转。'}`,
    '',
    ...lanes.flatMap((lane) => {
      const rows = input.presets.filter((preset) => preset.lane === lane)
      return [
        `## ${laneLabel(lane, english)}`,
        ...(rows.length
          ? rows.map((preset) => [
              `### ${english ? preset.titleEn : preset.titleZh}`,
              `- ${english ? 'Model' : '模型'}: ${preset.model}`,
              `- ${english ? 'Event' : '事件'}: ${preset.eventName}`,
              `- ${english ? 'Remark' : '备注'}: ${preset.remark}`,
              `- ${english ? 'Purpose' : '目的'}: ${english ? preset.descriptionEn : preset.descriptionZh}`,
              `- ${english ? 'Failure Prompt' : '失败提示'}: ${extractGuardrailPrompt(preset.scriptCode) || '-'}`,
              '',
              '```groovy',
              preset.scriptCode,
              '```',
            ].join('\n'))
          : [`- ${english ? 'No rules configured for this lane.' : '当前链路没有配置规则。'}`]),
        '',
      ]
    }),
    `## ${english ? 'Review Checklist' : '核对清单'}`,
    `- ${english ? 'Confirm the target module or chain is still inside the first-wave pilot scope.' : '确认目标模块或链路仍处在首批试点范围内。'}`,
    `- ${english ? 'Check whether the rule should block save or block action execution.' : '确认该规则应该阻断保存还是阻断动作执行。'}`,
    `- ${english ? 'Validate the error prompt is business-readable and not a stack trace.' : '确认提示语是业务可读的，而不是技术堆栈。'}`,
    `- ${english ? 'Keep rollback, traceability, and evidence requirements aligned with the rule.' : '让回退、追溯和证据要求与规则保持一致。'}`,
  ].join('\n')
}
