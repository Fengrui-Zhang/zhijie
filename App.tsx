
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  DEFAULT_ANALYSIS_MODEL,
  DEFAULT_REASONING_MODEL,
  type AnalysisModel,
  type ChatModel,
} from './lib/analysis-models';
import {
  buildCaseDateTimeValue,
  buildCaseSessionTitle,
  buildCaseTitle,
  CASE_MODEL_TYPES,
  type CaseDetail,
  type CaseItem,
  type CaseModelType,
  type CaseSessionItem,
  type InitialAnalysisData,
  isCaseModelType,
  normalizeInitialAnalysisData,
  normalizeCaseChartParams,
} from './lib/divination-cases';
import {
  buildCaseRelationPromptText,
  getCaseDisplayRelations,
  mapPairRelationsToDrafts,
  normalizeCaseRelationItems,
  type CaseRelationDraft,
  type CaseRelationItem,
} from './lib/case-relations';
import { deriveInitialAnalysisFromSession } from './lib/initial-analysis';
import {
  appendCaseSpecialTag,
  BAZI_COMPATIBILITY_SESSION_TYPE,
  getBaziCompatibilityCaseIds,
  isBaziCompatibilityChartData,
  getCaseSpecialTags,
  getProfessionalFeature,
  getProfessionalSourceModel,
  isJointChartData,
  JOINT_BAZI_ZIWEI_SESSION_TYPE,
  JOINT_CASE_TAG,
  PROFESSIONAL_FEATURE_BAZI_COMPAT,
  PROFESSIONAL_FEATURE_JOINT,
  type BaziCompatibilityChartData,
  type JointChartData,
} from './lib/professional-features';
import {
  DEFAULT_SITE_SETTINGS,
  type PublicSiteSettings,
} from './lib/site-settings-defaults';

// Services
import { 
  fetchQimen, fetchBazi, fetchZiwei, fetchMeihua, fetchLiuyao,
  fetchDaliuren, fetchTaiyi, fetchXiaoliuren, fetchAlmanac, fetchDailyFortune, fetchMonthlyFortune,
  formatQimenPrompt, formatBaziPrompt, formatZiweiPrompt, formatMeihuaPrompt, formatLiuyaoPrompt,
  formatDaliurenPrompt, formatTaiyiPrompt, formatXiaoliurenPrompt, formatAlmanacPrompt,
  formatDailyFortunePrompt, formatMonthlyFortunePrompt,
} from './services/apiService';
import {
  startQimenChat,
  sendMessageToDeepseekStream,
  clearChatSession,
  restoreChatSession,
  type KnowledgeSourceSummary,
} from './services/deepseekService';

// Auth & Session Components
import AuthForm from './components/AuthForm';
import SessionSidebar, { type SessionItem } from './components/SessionSidebar';
import AdminPanel from '@/components/AdminPanel';
import AccountSettingsModal from '@/components/AccountSettingsModal';
import UserMenuPopup from './components/UserMenuPopup';
import ChangePasswordModal from './components/ChangePasswordModal';

// Types
import {
  BaseParams,
  ModelType,
  LiuyaoMode,
  BaziResponse,
  QimenResponse,
  ZiweiResponse,
  MeihuaResponse,
  LiuyaoResponse,
  GenericTaibuResponse,
} from './types';

// Components
import QimenGrid from './components/QimenGrid';
import BaziGrid from './components/BaziGrid';
import ZiweiGrid from './components/ZiweiGrid';
import MeihuaGrid from './components/MeihuaGrid';
import LiuyaoGrid from './components/LiuyaoGrid';
import GenericTaibuGrid from './components/GenericTaibuGrid';
import FortuneGrid from './components/FortuneGrid';
import LocationSelector from './components/LocationSelector';
import LifeReadingForm from './components/LifeReadingForm';
import MarkdownContent from './components/MarkdownContent';
import { buildBirthPlaceText, findPlaceCoord } from './utils/locations';

// --- Icons ---
const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>);
const ReportIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25V6.75A2.25 2.25 0 0017.25 4.5H6.75A2.25 2.25 0 004.5 6.75v10.5A2.25 2.25 0 006.75 19.5h4.5m4.5-5.25v5.25m0 0l-2.25-2.25m2.25 2.25l2.25-2.25M8.25 9h7.5M8.25 12h4.5" /></svg>);
const RefreshIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992V4.356M2.985 19.644v-4.992h4.992m11.18-2.872a7.5 7.5 0 0 0-12.232-2.679M4.843 14.22a7.5 7.5 0 0 0 12.232 2.679" />
  </svg>
);
const CopyIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125H4.875A1.125 1.125 0 0 1 3.75 20.625V8.625c0-.621.504-1.125 1.125-1.125H8.25m7.5 9.75H19.125c.621 0 1.125-.504 1.125-1.125V4.125C20.25 3.504 19.746 3 19.125 3H9.375c-.621 0-1.125.504-1.125 1.125v3.375m7.5 9.75H9.375A1.125 1.125 0 0 1 8.25 16.125V8.625c0-.621.504-1.125 1.125-1.125h5.25c.298 0 .584.118.795.33l2.625 2.625c.211.211.33.497.33.795v4.875c0 .621-.504 1.125-1.125 1.125Z" />
  </svg>
);
const EditIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a2.25 2.25 0 1 1 3.182 3.182l-10.5 10.5a4.5 4.5 0 0 1-1.897 1.092l-2.685.805.804-2.685a4.5 4.5 0 0 1 1.093-1.897l10.316-10.309Z" />
  </svg>
);
const HistoryIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m5.25 0A9.75 9.75 0 1 1 18 5.756L21.75 9M21.75 4.5v4.5h-4.5" />
  </svg>
);
const SessionIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path d="M3.25 4A2.25 2.25 0 0 0 1 6.25v5.5A2.25 2.25 0 0 0 3.25 14h2.63l2.66 2.28a.75.75 0 0 0 1.24-.57V14h7.02A2.25 2.25 0 0 0 19 11.75v-5.5A2.25 2.25 0 0 0 16.75 4H3.25Zm1.5 3.25a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75Zm0 3.5a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5H5.5a.75.75 0 0 1-.75-.75Z" />
  </svg>
);
const TaijiIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="#111827" />
    <path d="M12 3a9 9 0 0 1 0 18c2.9 0 5.25-2.01 5.25-4.5S14.9 12 12 12s-5.25-2.01-5.25-4.5S9.1 3 12 3Z" fill="#F6EAD8" />
    <circle cx="12" cy="7.5" r="1.4" fill="#111827" />
    <circle cx="12" cy="16.5" r="1.4" fill="#F6EAD8" />
  </svg>
);
const GlowCheck = ({
  checked,
  sizeClass = 'h-4 w-4',
  dotClass = 'h-1.5 w-1.5',
  activeClass = 'border-amber-300/85 bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.14),0_0_18px_rgba(251,191,36,0.36)]',
}: {
  checked: boolean;
  sizeClass?: string;
  dotClass?: string;
  activeClass?: string;
}) => (
  <span
    aria-hidden="true"
    className={`flex shrink-0 items-center justify-center rounded-full border transition-all ${sizeClass} ${
      checked
        ? activeClass
        : 'border-stone-300/90 bg-white/35'
    }`}
  >
    <span className={`${dotClass} rounded-full transition-all ${checked ? 'bg-white/95' : 'bg-transparent'}`} />
  </span>
);

const THINKING_START = '[[THINKING]]';
const THINKING_END = '[[/THINKING]]';
const DISCLAIMER_TEXT = 'AI 命理分析仅供娱乐，请大家切勿过分当真。命运掌握在自己手中，要相信科学，理性看待。';
const KLINE_DEV_NOTE = 'K线功能尚处于开发阶段，仅供娱乐';
const GUEST_CASES_STORAGE_KEY = 'guest-divination-cases:v1';
const GUEST_CASE_SESSIONS_STORAGE_KEY = 'guest-divination-case-sessions:v1';
const GUEST_CASE_RELATIONS_STORAGE_KEY = 'guest-divination-case-relations:v1';
const GUEST_FORTUNE_LIMIT = 1;
const DESKTOP_PANEL_EXPANDED_OFFSET = 320;
const DESKTOP_PANEL_COLLAPSED_OFFSET = 72;
const KLINE_CHAT_MODEL: ChatModel = DEFAULT_REASONING_MODEL;

const buildModelContent = (reasoning: string, answer: string) => {
  return answer;
};

const parseModelContent = (content: string) => {
  const start = content.indexOf(THINKING_START);
  const end = content.indexOf(THINKING_END);
  if (start !== -1 && end !== -1 && end > start) {
    const reasoning = content.slice(start + THINKING_START.length, end).trim();
    const answer = content.slice(end + THINKING_END.length).trim();
    return { reasoning, answer };
  }
  return { reasoning: '', answer: content };
};

const appendDisclaimer = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return DISCLAIMER_TEXT;
  if (trimmed.endsWith(DISCLAIMER_TEXT)) return trimmed;
  return `${trimmed}\n\n${DISCLAIMER_TEXT}`;
};

const stripDisclaimer = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (trimmed.endsWith(DISCLAIMER_TEXT)) {
    return trimmed.slice(0, -DISCLAIMER_TEXT.length).trim();
  }
  return trimmed;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderMarkdownToHtml = (text: string) => {
  const lines = text.split(/\r?\n/);
  let html = '';
  let inCodeBlock = false;
  let listType: 'ul' | 'ol' | null = null;
  let lastWasGap = false;
  let hasVisibleContent = false;

  const closeList = () => {
    if (listType) {
      html += `</${listType}>`;
      listType = null;
    }
  };

  const appendGap = () => {
    if (!hasVisibleContent || lastWasGap) return;
    html += '<div class="gap"></div>';
    lastWasGap = true;
  };

  const inlineFormat = (value: string) =>
    value
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');

  for (const rawLine of lines) {
    const line = rawLine ?? '';
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        html += '</code></pre>';
        inCodeBlock = false;
        hasVisibleContent = true;
        lastWasGap = false;
      } else {
        closeList();
        inCodeBlock = true;
        html += '<pre class="code-block"><code>';
        hasVisibleContent = true;
        lastWasGap = false;
      }
      continue;
    }

    if (inCodeBlock) {
      html += `${escapeHtml(line)}\n`;
      continue;
    }

    if (!trimmed) {
      closeList();
      appendGap();
      continue;
    }

    const hrMatch = trimmed.match(/^([-*_])\1{2,}$/);
    if (hrMatch) {
      closeList();
      if (hasVisibleContent) {
        html += '<hr class="msg-divider" />';
        lastWasGap = false;
      }
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      const content = inlineFormat(escapeHtml(headingMatch[2]));
      html += `<h${level}>${content}</h${level}>`;
      hasVisibleContent = true;
      lastWasGap = false;
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      closeList();
      const content = inlineFormat(escapeHtml(quoteMatch[1]));
      html += `<blockquote>${content}</blockquote>`;
      hasVisibleContent = true;
      lastWasGap = false;
      continue;
    }

    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (listType !== 'ol') {
        closeList();
        listType = 'ol';
        html += '<ol>';
      }
      html += `<li>${inlineFormat(escapeHtml(olMatch[1]))}</li>`;
      hasVisibleContent = true;
      lastWasGap = false;
      continue;
    }

    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (listType !== 'ul') {
        closeList();
        listType = 'ul';
        html += '<ul>';
      }
      html += `<li>${inlineFormat(escapeHtml(ulMatch[1]))}</li>`;
      hasVisibleContent = true;
      lastWasGap = false;
      continue;
    }

    closeList();
    html += `<p>${inlineFormat(escapeHtml(line))}</p>`;
    hasVisibleContent = true;
    lastWasGap = false;
  }

  closeList();
  if (inCodeBlock) {
    html += '</code></pre>';
  }
  return html;
};

const formatSizhuInfo = (sizhu?: {
  year_gan: string; year_zhi: string;
  month_gan: string; month_zhi: string;
  day_gan: string; day_zhi: string;
  hour_gan: string; hour_zhi: string;
}) => {
  if (!sizhu) return '';
  return `${sizhu.year_gan}${sizhu.year_zhi} ${sizhu.month_gan}${sizhu.month_zhi} ${sizhu.day_gan}${sizhu.day_zhi} ${sizhu.hour_gan}${sizhu.hour_zhi}`;
};

const getCasePillarsPreview = (modelType: CaseModelType, chartData: unknown) => {
  if (modelType === ModelType.BAZI) {
    const pillars = (chartData as BaziResponse | null)?.bazi_info?.bazi;
    if (Array.isArray(pillars) && pillars.length > 0) {
      return pillars.join(' ');
    }
  }

  const sizhu = (chartData as { sizhu_info?: {
    year_gan: string; year_zhi: string;
    month_gan: string; month_zhi: string;
    day_gan: string; day_zhi: string;
    hour_gan: string; hour_zhi: string;
  } } | null)?.sizhu_info;

  return formatSizhuInfo(sizhu);
};

const isSameCaseChartIdentity = (left: unknown, right: unknown) => {
  const a = normalizeCaseChartParams(left);
  const b = normalizeCaseChartParams(right);
  return (
    a.sex === b.sex &&
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day &&
    a.hours === b.hours &&
    a.minute === b.minute &&
    (a.province || '') === (b.province || '') &&
    (a.city || '') === (b.city || '')
  );
};

const getCaseDisplayName = (item: Pick<CaseItem, 'title' | 'chartParams'> | Pick<CaseDetail, 'title' | 'chartParams'>) => {
  const params = normalizeCaseChartParams(item.chartParams);
  return params.name || item.title.replace(/^八字命例\s*·\s*/, '').replace(/^紫微命例\s*·\s*/, '') || item.title;
};

const getCaseSexLabel = (chartParams: unknown) => {
  const params = normalizeCaseChartParams(chartParams);
  if (params.sex === 0) return '乾造';
  if (params.sex === 1) return '坤造';
  return '';
};

const getCaseModelDisplayLabel = (modelType: CaseModelType) =>
  modelType === ModelType.BAZI ? '四柱八字' : '紫微斗数';

const buildStandaloneCaseReferenceText = (items: CaseItem[]) => {
  const blocks = items
    .map((item, index) => {
      const label = getCaseModelDisplayLabel(item.modelType);
      const title = getCaseDisplayName(item);
      let chartText = '';
      try {
        chartText = item.modelType === ModelType.BAZI
          ? formatBaziPrompt(item.chartData as BaziResponse)
          : formatZiweiPrompt(item.chartData as ZiweiResponse);
      } catch {
        chartText = JSON.stringify(item.chartData ?? {});
      }

      const initialAnalysis = item.initialAnalysisData?.content?.trim()
        ? [
            '',
            '【命例基线分析】',
            item.initialAnalysisData.content.trim().slice(0, 2800),
          ].join('\n')
        : '';

      return [
        `【引用命例 ${index + 1}：${title}｜${label}】`,
        chartText,
        initialAnalysis,
      ].filter(Boolean).join('\n');
    })
    .filter(Boolean);

  if (blocks.length === 0) return '';

  return [
    '用户已在本次聊天中选择以下命例作为资料源。若用户问题涉及命主、运势、性格、关系或择事，请优先结合这些命例；若问题与命例无关，可以简要说明后直接回答。',
    '',
    blocks.join('\n\n'),
  ].join('\n');
};

const buildJointAnalysisPrompt = (jointData: JointChartData) => {
  const baziBundle = buildLifeReadingAnalysisBundle(ModelType.BAZI, jointData.baziChartData, '');
  const ziweiBundle = buildLifeReadingAnalysisBundle(ModelType.ZIWEI, jointData.ziweiChartData, '');

  return [
    '请你进行八字与紫微斗数的联合全盘分析。',
    '要求：先分别提炼两套命盘的核心结论，再说明二者互相印证或互补的位置，最后给出整合后的性格、事业、财运、婚恋、家庭与未来趋势判断。',
    '如果两套体系的侧重点不同，请解释差异来源，不要只做简单拼接。',
    '',
    '【八字分析任务】',
    baziBundle.prompt,
    '',
    '【紫微斗数分析任务】',
    ziweiBundle.prompt,
  ].join('\n');
};

const buildJointAnalysisSystemInstruction = (jointData: JointChartData) => {
  return [
    '你是同时精通盲派八字与紫微斗数的高级命理顾问。',
    '回答时要先分别读取两套命盘，再做交叉验证与综合判断，避免只用其中一套体系下结论。',
    '',
    '【八字命盘系统上下文】',
    buildBaziSystemInstruction(jointData.baziChartData),
    '',
    '【紫微斗数命盘系统上下文】',
    `${buildZiweiSystemInstruction(jointData.ziweiChartData)}\n\n${formatZiweiPrompt(jointData.ziweiChartData)}`,
  ].join('\n');
};

const buildJointInitialUserContent = (jointData: JointChartData) => {
  return `请为“${jointData.summaryTitle}”做八字与紫微斗数联合全盘分析。`;
};

const buildBaziCompatibilityAnalysisPrompt = (compatData: BaziCompatibilityChartData) => {
  const relationText = buildCaseRelationPromptText(
    compatData.relations || [],
    compatData.personAName,
    compatData.personBName
  );

  return [
    '请你进行两人的八字合盘全局分析。',
    '要求：先分别提炼两人命局的核心特征、做功逻辑、情感表达方式与关系需求，再分析双方的匹配度、吸引点、冲突点、现实磨合重点与长期稳定性。',
    relationText ? `两人关系补充：${relationText}` : '两人关系补充：未提供明确关系，请按默认合盘逻辑分析。',
    '请不要只做抽象性格判断，要结合双方八字之间的实际互动来分析。',
    '',
    `【${compatData.personAName}的八字命盘】`,
    formatBaziPrompt(compatData.personAChartData),
    '',
    `【${compatData.personBName}的八字命盘】`,
    formatBaziPrompt(compatData.personBChartData),
  ].join('\n');
};

const buildBaziCompatibilitySystemInstruction = (compatData: BaziCompatibilityChartData) => {
  return [
    '你是一位同时精通盲派八字与八字合盘分析的高级命理顾问。',
    '回答时要先分别读取两人的命局，再做关系互动分析，避免只看单方命盘下结论。',
    '',
    `【${compatData.personAName}的八字系统上下文】`,
    buildBaziSystemInstruction(compatData.personAChartData),
    '',
    `【${compatData.personBName}的八字系统上下文】`,
    buildBaziSystemInstruction(compatData.personBChartData),
  ].join('\n');
};

const buildBaziCompatibilityInitialUserContent = (compatData: BaziCompatibilityChartData) => {
  return `请为“${compatData.personAName}”与“${compatData.personBName}”做八字合盘分析。`;
};

const buildReportHeadAssets = () =>
  Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join('\n');

const buildReportChartMarkup = (element: HTMLElement) => {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[data-report-ignore="true"]').forEach((node) => node.remove());
  clone.querySelectorAll('button').forEach((button) => {
    button.setAttribute('tabindex', '-1');
    button.setAttribute('aria-hidden', 'true');
  });
  return clone.outerHTML;
};

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  knowledgeSources?: KnowledgeSourceSummary[];
}

type PersistedChatMessage = {
  role: string;
  content: string;
  knowledgeSources?: KnowledgeSourceSummary[];
};

type MessageVersionEntry = {
  id: string;
  content: string;
  createdAt: string;
};

type MessageVersionState = {
  entries: MessageVersionEntry[];
  activeId: string;
};

type GuestStoredSession = {
  id: string;
  caseId: string;
  modelType: string;
  title: string;
  chartParams: Record<string, unknown>;
  chartData: unknown;
  messages: Array<{
    id: string;
    role: 'user' | 'model';
    content: string;
    timestamp: string;
    knowledgeSources?: KnowledgeSourceSummary[];
  }>;
  guestFollowUpCount: number;
  createdAt: string;
  updatedAt: string;
};

const isSupportedGuestSessionType = (value: unknown): value is string => {
  return (
    Object.values(ModelType).includes(value as ModelType) ||
    isCaseModelType(value) ||
    value === JOINT_BAZI_ZIWEI_SESSION_TYPE ||
    value === BAZI_COMPATIBILITY_SESSION_TYPE
  );
};

type ProfessionalPersonComposer = {
  mode: 'existing' | 'new';
  selectedCaseId: string | null;
  name: string;
  gender: number;
  customDate: string;
  province: string;
  city: string;
};

type EditableCaseRelationDraft = CaseRelationDraft & {
  id?: string;
};

const createProfessionalPersonComposer = (): ProfessionalPersonComposer => ({
  mode: 'existing',
  selectedCaseId: null,
  name: '',
  gender: 0,
  customDate: '',
  province: '',
  city: '',
});

type KlineScores = {
  wealth: number;
  career: number;
  love: number;
  health: number;
};

type KlineDayunItem = {
  name: string;
  start_year: number;
  end_year: number;
  scores: KlineScores;
  tag: string;
};

type KlineLiunianItem = {
  year: number;
  scores: KlineScores;
  tag: string;
};

type KlineResult = {
  schema_version: 'kline_v1';
  dayun: KlineDayunItem[];
  liunian: KlineLiunianItem[];
};

type KlineSelection =
  | { kind: 'dayun'; start_year: number }
  | { kind: 'liunian'; year: number }
  | null;

type SeriesKey = 'overall' | 'wealth' | 'career' | 'love' | 'health';

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const getGanzhiYear = (year: number) => {
  const baseYear = 1984; // 1984 is 甲子
  const offset = ((year - baseYear) % 60 + 60) % 60;
  const stem = STEMS[offset % 10];
  const branch = BRANCHES[offset % 12];
  return `${stem}${branch}`;
};

const MODEL_LABELS: Record<string, string> = {
  chat: '聊天',
  qimen: '奇门遁甲',
  bazi: '四柱八字',
  ziwei: '紫微斗数',
  meihua: '梅花易数',
  liuyao: '六爻纳甲',
  daliuren: '大六壬',
  taiyi: '太乙神数',
  xiaoliuren: '小六壬',
  almanac: '黄历/择日',
  daily_fortune: '每日运势',
  monthly_fortune: '每月运势',
  joint_bazi_ziwei: '八字+紫微联合',
  bazi_compatibility: '八字合盘',
};

const MODEL_ROUTES: Partial<Record<ModelType, string>> = {
  [ModelType.BAZI]: '/bazi',
  [ModelType.ZIWEI]: '/ziwei',
  [ModelType.DAILY_FORTUNE]: '/daily',
  [ModelType.MONTHLY_FORTUNE]: '/monthly',
  [ModelType.QIMEN]: '/qimen',
  [ModelType.LIUYAO]: '/liuyao',
  [ModelType.MEIHUA]: '/meihua',
  [ModelType.DALIUREN]: '/daliuren',
  [ModelType.TAIYI]: '/taiyi',
  [ModelType.XIAOLIUREN]: '/xiaoliuren',
  [ModelType.ALMANAC]: '/almanac',
};

const ROUTE_MODELS: Record<string, ModelType> = Object.entries(MODEL_ROUTES).reduce(
  (acc, [model, route]) => {
    if (route) acc[route] = model as ModelType;
    return acc;
  },
  {} as Record<string, ModelType>
);

type WorkspaceView = 'divination' | 'records' | 'chat' | 'settings';
type SettingsWorkspaceTab = 'profile' | 'general' | 'charts' | 'knowledge' | 'help' | 'security';

const WORKSPACE_ROUTES: Record<Exclude<WorkspaceView, 'divination'>, string> = {
  records: '/records',
  chat: '/chat',
  settings: '/settings',
};

const SETTINGS_TAB_ROUTES: Record<SettingsWorkspaceTab, string> = {
  profile: '/settings/profile',
  general: '/settings/general',
  charts: '/settings/charts',
  knowledge: '/settings/knowledge',
  help: '/settings/help',
  security: '/settings/security',
};

const ROUTE_WORKSPACES: Record<string, WorkspaceView> = Object.entries(WORKSPACE_ROUTES).reduce(
  (acc, [workspace, route]) => {
    acc[route] = workspace as WorkspaceView;
    return acc;
  },
  {} as Record<string, WorkspaceView>
);

const ROUTE_SETTINGS_TABS: Record<string, SettingsWorkspaceTab> = Object.entries(SETTINGS_TAB_ROUTES).reduce(
  (acc, [tab, route]) => {
    acc[route] = tab as SettingsWorkspaceTab;
    return acc;
  },
  {} as Record<string, SettingsWorkspaceTab>
);

const SETTINGS_WORKSPACE_TABS: Array<{
  id: SettingsWorkspaceTab;
  label: string;
  group: string;
  icon: string;
  description: string;
}> = [
  { id: 'profile', label: '我的', group: '账户', icon: '人', description: '账户与额度' },
  { id: 'general', label: '常规', group: '账户', icon: '设', description: '界面与记录' },
  { id: 'charts', label: '命盘', group: '资料', icon: '盘', description: '八字与紫微信息' },
  { id: 'knowledge', label: '知识参考', group: '资料', icon: '书', description: '问答引用设置' },
  { id: 'help', label: '帮助', group: '支持', icon: '？', description: '使用规则说明' },
  { id: 'security', label: '安全', group: '账户', icon: '锁', description: '密码与账号' },
];

const KNOWLEDGE_REFERENCE_BOARDS = [
  {
    id: 'bazi',
    title: '四柱八字资料',
    status: '已接入',
    file: 'data/index/bazi.json',
    coverage: ['四柱八字问答', '八字命例分析', '独立聊天'],
    description: '用于补充十神、格局、用神、断语等传统资料片段。',
  },
  {
    id: 'qimen',
    title: '奇门遁甲资料',
    status: '已接入',
    file: 'data/index/qimen.json',
    coverage: ['奇门遁甲问答', '占卜追问', '独立聊天'],
    description: '用于补充九宫、八门、九星、神盘和断局依据。',
  },
  {
    id: 'planned',
    title: '待补充资料',
    status: '待建索引',
    file: 'data/knowledge/liuyao、meihua、ziweidoushu',
    coverage: ['六爻纳甲', '梅花易数', '紫微斗数'],
    description: '目录已预留，后续补充文本并生成索引后可进入检索。',
  },
];

const MEIHUA_MODE_OPTIONS: Array<[LiuyaoMode, string]> = [
  [LiuyaoMode.AUTO, '时间起卦'],
  [LiuyaoMode.CUSTOM_TIME, '指定时间'],
  [LiuyaoMode.LIFETIME, '终身卦'],
  [LiuyaoMode.MANUAL, '手动摇卦'],
  [LiuyaoMode.NUMBER, '数字起卦'],
  [LiuyaoMode.SINGLE_NUM, '单数起卦'],
  [LiuyaoMode.DOUBLE_NUM, '双数起卦'],
];

const LIUYAO_MODE_OPTIONS: Array<[LiuyaoMode, string]> = [
  [LiuyaoMode.AUTO, '时间起卦'],
  [LiuyaoMode.CUSTOM_TIME, '指定时间'],
  [LiuyaoMode.MANUAL, '手动摇卦'],
  [LiuyaoMode.NUMBER, '数字起卦'],
  [LiuyaoMode.DOUBLE_NUM, '双数起卦'],
];

const isLiupanModeModel = (mType: ModelType) =>
  mType === ModelType.MEIHUA || mType === ModelType.LIUYAO;

const requiresLiupanDate = (mode: LiuyaoMode) =>
  mode === LiuyaoMode.CUSTOM_TIME || mode === LiuyaoMode.LIFETIME;

const usesLiupanSingleNumber = (mode: LiuyaoMode) =>
  mode === LiuyaoMode.NUMBER || mode === LiuyaoMode.SINGLE_NUM;

const toManualYaoValue = (lineValue: number, isMoving: boolean) => {
  if (lineValue === 1) return isMoving ? 3 : 1;
  return isMoving ? 2 : 0;
};

const buildLiupanModeParams = ({
  mode,
  manualLines,
  manualMovingLines,
  lyNum,
  lyNumUp,
  lyNumDown,
  yaoAddTime,
}: {
  mode: LiuyaoMode;
  manualLines: number[];
  manualMovingLines: boolean[];
  lyNum: string;
  lyNumUp: string;
  lyNumDown: string;
  yaoAddTime: boolean;
}) => {
  if (mode === LiuyaoMode.MANUAL) {
    return {
      gua_yao1: toManualYaoValue(manualLines[0], manualMovingLines[0]),
      gua_yao2: toManualYaoValue(manualLines[1], manualMovingLines[1]),
      gua_yao3: toManualYaoValue(manualLines[2], manualMovingLines[2]),
      gua_yao4: toManualYaoValue(manualLines[3], manualMovingLines[3]),
      gua_yao5: toManualYaoValue(manualLines[4], manualMovingLines[4]),
      gua_yao6: toManualYaoValue(manualLines[5], manualMovingLines[5]),
    };
  }

  if (usesLiupanSingleNumber(mode)) {
    return {
      number: parseInt(lyNum, 10),
      yao_add_time: yaoAddTime ? 1 : 0,
    };
  }

  if (mode === LiuyaoMode.DOUBLE_NUM) {
    return {
      number_up: parseInt(lyNumUp, 10),
      number_down: parseInt(lyNumDown, 10),
      yao_add_time: yaoAddTime ? 1 : 0,
    };
  }

  return {};
};

const KnowledgeToggleCard = ({
  useKnowledge,
  onToggle,
  className = 'mb-6',
}: {
  useKnowledge: boolean;
  onToggle: () => void;
  className?: string;
}) => (
  <div className={`glass-panel-soft flex items-center justify-between rounded-[22px] px-3.5 py-3 ${className}`}>
    <div className="flex items-center gap-3">
      <div className="glass-chip flex h-9 w-9 items-center justify-center rounded-xl text-base text-amber-700">
        册
      </div>
      <div>
        <div className="text-sm font-bold text-stone-700">参考古籍</div>
        <div className="text-xs text-stone-500">检索并参考知识库资料</div>
      </div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={useKnowledge}
      onClick={onToggle}
      className={`inline-flex h-11 min-w-[126px] items-center gap-3 rounded-full border px-3 py-1.5 transition-all ${
        useKnowledge
          ? 'glass-panel-dark border-transparent text-amber-200'
          : 'glass-chip text-stone-600'
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all ${
          useKnowledge
            ? 'border-amber-300/80 bg-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.16),0_0_24px_rgba(251,191,36,0.42)]'
            : 'border-stone-300/90 bg-white/30'
        }`}
      >
        <span
          className={`h-3 w-3 rounded-full transition-all ${
            useKnowledge ? 'bg-white/95' : 'bg-transparent'
          }`}
        />
      </span>
      <span className="min-w-[52px] text-right text-sm font-medium leading-none">{useKnowledge ? '已开启' : '已关闭'}</span>
    </button>
  </div>
);

const KnowledgeSourceSummaryPanel = ({ sources }: { sources?: KnowledgeSourceSummary[] }) => {
  const [expanded, setExpanded] = useState(false);
  if (!sources?.length) return null;

  const shownSources = expanded ? sources : sources.slice(0, 4);

  return (
    <div className="mt-3 border-t border-stone-200/70 pt-3 text-xs text-stone-600">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left transition hover:text-stone-900"
      >
        <span className="inline-flex items-center gap-2 font-semibold">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-[10px] text-amber-700">引</span>
          <span>参考了 {sources.length} 个来源</span>
        </span>
        <span className={`shrink-0 text-stone-400 transition ${expanded ? 'rotate-180' : ''}`}>⌄</span>
      </button>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {shownSources.map((source, index) => (
          <span
            key={`${source.id || source.source}-badge-${index}`}
            title={source.preview || source.source}
            className="inline-flex max-w-[220px] items-center gap-1 rounded-full border border-stone-200 bg-white/70 px-2.5 py-1 text-[11px] text-stone-600"
          >
            <span className="shrink-0 text-amber-600">册</span>
            <span className="truncate">{source.title || source.source || `参考资料 ${index + 1}`}</span>
          </span>
        ))}
        {!expanded && sources.length > shownSources.length && (
          <span className="rounded-full border border-stone-200 bg-white/50 px-2.5 py-1 text-[11px] text-stone-400">
            +{sources.length - shownSources.length}
          </span>
        )}
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          {sources.map((source, index) => (
            <div key={`${source.id || source.source}-${index}`} className="rounded-xl border border-stone-200/70 bg-white/74 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-bold text-stone-800">
                  {source.title || source.source || `参考资料 ${index + 1}`}
                </span>
                <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-500">
                  {Math.round((source.score || 0) * 100)}%
                </span>
              </div>
              {source.source && (
                <div className="mt-1 text-[11px] text-stone-400">{source.source}</div>
              )}
              {source.preview && (
                <div className="mt-1 max-h-14 overflow-hidden leading-5 text-stone-500">
                  {source.preview}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const buildBaziSystemInstruction = (data: BaziResponse) => {
  const panText = formatBaziPrompt(data);
  const now = new Date();
  const currentTimeText = `当前时间: ${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日${now.getHours()}时${now.getMinutes()}分`;

  return [
    "你是一位深谙段建业盲派命理体系的算命专家。你推命的核心逻辑是理法、象法、技法三位一体，重点在于观察八字如何通过做功来表述人生 。",
    "如果知识库检索到强有力的证据，请保持专业判断，不要为了迎合用户情绪而轻易动摇观点；在适当位置可引用或提及知识库中的关键信息作为依据。",
    "Workflow:",
    "1. 建立坐标：宾主与体用 分清宾主：日、时为主位（代表我、我的家、我的工具）；年、月为宾位（代表他人的、外界的、我面对的环境） 。 定体用：将十神分为体（日主、印、禄、比劫，代表我自己或操纵的工具）和用（财、官，代表我的目的和追求）。食伤视情况而定，食神近体，伤官近用 。",
    "2. 核心分析：寻找做功方式 请根据以下逻辑分析八字的能量耗散与效率： 日干意向：日干有无合（合财/官）、有无生（生食伤），这是日干追求目标的体现 。 主位动作：日支是否参与刑、冲、克、穿、合、墓。若日支不做功，再看有无禄神和比劫做功 。 成党成势：分析干支是否成党，成功者往往有势，通过强方制掉弱方来做功 。 做功类型：判定是制用、化用、生用还是合用结构 ，干支自合（如丁亥、戊子、辛巳、壬午）属于合制做功，合则能去，效率极高。",
    "3. 层次判定：效率与干净度 富贵贫贱：制得干净、做功效率高者为大富贵；制不干净、能量内耗或废神多者为平庸 。 虚实取象：财星虚透主才华、口才而非钱财；官星虚透主名气而非权位 。",
    "4. 细节推断：穿、破与墓库 穿（害）分析：重点观察子未、丑午、卯辰、酉戌等相穿，这代表防不胜防的伤害或穿倒（破坏性质） 。 墓库开闭：辰戌丑未是否逢冲刑，不冲为墓（死的），冲开为库（活的），库必须开才能发挥作用 。日主坐下的印库或者比劫库不能被冲，财库和官库逢冲则开。",
    "5. 输出格式要求：",
    "6. 八字排盘及体用分析。",
    "7. 做功逻辑详解（说明使用了什么工具，制了什么东西，效率如何）。",
    "8. 富贵层次判定。",
    "",
    "这是某位提问者的八字排盘信息，请你据此进行推断：",
    "",
    panText,
    currentTimeText,
    "",
    "请严格基于以上数据分析，不得臆测与杜撰。",
  ].join('\n');
};

const buildZiweiSystemInstruction = (data: ZiweiResponse) =>
  "你是紫微斗数专家。请基于十二宫位星曜，分析命主天赋与人生轨迹。";

const buildLifeReadingAnalysisBundle = (
  mType: CaseModelType,
  cData: BaziResponse | ZiweiResponse,
  question: string
) => {
  const trimmedQuestion = question.trim();
  const now = new Date();
  const currentTimeText = `当前时间: ${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日${now.getHours()}时${now.getMinutes()}分`;

  if (mType === ModelType.BAZI) {
    const defaultBaziQuestion = "请分析此命造的性格、事业、财运、婚姻，并给出未来5-10年的大致运势点评。";
    const finalQuestion = trimmedQuestion || defaultBaziQuestion;
    return {
      prompt: trimmedQuestion
        ? `用户问题：${trimmedQuestion}\n请结合命盘重点回答，必要时补充全盘背景。`
        : `用户问题：${finalQuestion}\n请结合命盘重点回答，必要时补充全盘背景。`,
      systemInstruction: buildBaziSystemInstruction(cData as BaziResponse),
      knowledgeQuery: trimmedQuestion || defaultBaziQuestion,
    };
  }

  return {
    prompt: `${formatZiweiPrompt(cData as ZiweiResponse)}\n${currentTimeText}`,
    systemInstruction: buildZiweiSystemInstruction(cData as ZiweiResponse),
    knowledgeQuery: trimmedQuestion,
  };
};

const buildInitialUserContent = (
  mType: ModelType,
  chartParams: Record<string, unknown>,
  question: string
) => {
  const trimmedQuestion = question.trim();
  const professionalFeature = getProfessionalFeature(chartParams);
  if (professionalFeature === PROFESSIONAL_FEATURE_JOINT && isJointChartData((chartParams as Record<string, unknown>).jointChartData)) {
    const jointData = (chartParams as Record<string, unknown>).jointChartData as JointChartData;
    return trimmedQuestion
      ? `请结合八字与紫微斗数联合命盘回答我的问题。\n问题: ${trimmedQuestion}`
      : buildJointInitialUserContent(jointData);
  }
  if (professionalFeature === PROFESSIONAL_FEATURE_BAZI_COMPAT && isBaziCompatibilityChartData((chartParams as Record<string, unknown>).compatibilityChartData)) {
    const compatData = (chartParams as Record<string, unknown>).compatibilityChartData as BaziCompatibilityChartData;
    return trimmedQuestion
      ? `请结合两人的八字合盘结果回答我的问题。\n问题: ${trimmedQuestion}`
      : buildBaziCompatibilityInitialUserContent(compatData);
  }
  const params = normalizeCaseChartParams(chartParams);
  const birthText =
    params.year !== undefined &&
    params.month !== undefined &&
    params.day !== undefined
      ? `${params.year}年${params.month}月${params.day}日`
      : '命盘';

  if (mType === ModelType.BAZI) {
    return `请分析我的命盘: ${birthText}${trimmedQuestion ? `\n问题: ${trimmedQuestion}` : ''}`;
  }

  if (mType === ModelType.ZIWEI) {
    return `请分析我的命盘: ${birthText}${trimmedQuestion ? `\n问题: ${trimmedQuestion}` : ''}`;
  }

  return `问题: ${question}`;
};

const appendInitialAnalysisContext = (systemInstruction: string, initialAnalysisContent: string) => {
  const trimmed = initialAnalysisContent.trim();
  if (!trimmed) return systemInstruction;
  return [
    systemInstruction,
    '',
    '【命例初始化分析基线】',
    '以下内容是该命例在无具体问题时生成的全盘分析结论。回答当前问题时，可将其视为背景参考，但若命盘原始信息与当前问题更具体，应以命盘信息和当前问题为准。',
    trimmed,
  ].join('\n');
};

const getSessionInitialAnalysisSnapshot = (chartParams: Record<string, unknown>) => {
  const initialAnalysis = normalizeInitialAnalysisData({
    content: chartParams.baseAnalysisContent,
    model: chartParams.baseAnalysisModel,
    generatedAt: chartParams.baseAnalysisGeneratedAt,
  });
  const isInitialAnalysisSession = chartParams.isInitialAnalysisSession === true;
  return { initialAnalysis, isInitialAnalysisSession };
};

const buildCaseInitialAnalysisSnapshot = (
  initialAnalysis: InitialAnalysisData | null,
  isInitialAnalysisSession: boolean
) => {
  if (!initialAnalysis) {
    return {
      isInitialAnalysisSession,
    };
  }

  return {
    baseAnalysisContent: initialAnalysis.content,
    baseAnalysisModel: DEFAULT_ANALYSIS_MODEL,
    baseAnalysisGeneratedAt: initialAnalysis.generatedAt,
    isInitialAnalysisSession,
  };
};

const buildSystemInstruction = (
  mType: ModelType,
  cData: unknown,
  chartParams?: Record<string, unknown>
): string => {
  const professionalFeature = chartParams ? getProfessionalFeature(chartParams) : null;
  if (
    professionalFeature === PROFESSIONAL_FEATURE_JOINT &&
    chartParams &&
    isJointChartData(chartParams.jointChartData)
  ) {
    return buildJointAnalysisSystemInstruction(chartParams.jointChartData);
  }
  if (
    professionalFeature === PROFESSIONAL_FEATURE_BAZI_COMPAT &&
    chartParams &&
    isBaziCompatibilityChartData(chartParams.compatibilityChartData)
  ) {
    return buildBaziCompatibilitySystemInstruction(chartParams.compatibilityChartData);
  }

  const snapshot = chartParams ? getSessionInitialAnalysisSnapshot(chartParams) : null;
  const baseAnalysisContent =
    snapshot && !snapshot.isInitialAnalysisSession ? snapshot.initialAnalysis?.content ?? '' : '';

  switch (mType) {
    case ModelType.QIMEN:
      return `你是精通奇门遁甲的大师。请基于排盘，用通俗专业语言解答用户疑惑。关注用神、时令、吉凶。\n\n${formatQimenPrompt(cData as any, '')}`;
    case ModelType.BAZI:
      return appendInitialAnalysisContext(
        buildBaziSystemInstruction(cData as BaziResponse),
        baseAnalysisContent
      );
    case ModelType.ZIWEI:
      return appendInitialAnalysisContext(
        buildZiweiSystemInstruction(cData as ZiweiResponse),
        baseAnalysisContent
      );
    case ModelType.MEIHUA:
      return `你是梅花易数占卜师。请基于本卦、互卦、变卦及动爻，直断吉凶成败。\n\n${formatMeihuaPrompt(cData as any, '')}`;
    case ModelType.LIUYAO:
      return `你是六爻纳甲预测专家。请基于卦象、六亲、世应、六神及神煞空亡，详细推断吉凶、应期及建议。\n\n${formatLiuyaoPrompt(cData as any, '')}`;
    case ModelType.DALIUREN:
      return `你是大六壬预测专家。请基于四课三传、天将、课体与神煞解答问题。\n\n${formatDaliurenPrompt(cData as GenericTaibuResponse, '')}`;
    case ModelType.TAIYI:
      return `你是太乙神数预测专家。请基于太乙盘面与局式信号解答问题。\n\n${formatTaiyiPrompt(cData as GenericTaibuResponse, '')}`;
    case ModelType.XIAOLIUREN:
      return `你是小六壬预测师。请基于六宫课体和所问事项给出直接判断。\n\n${formatXiaoliurenPrompt(cData as GenericTaibuResponse, '')}`;
    case ModelType.ALMANAC:
      return `你是黄历择日顾问。请结合日课、宜忌、神煞与用户事项给出择日建议。\n\n${formatAlmanacPrompt(cData as GenericTaibuResponse, '')}`;
    case ModelType.DAILY_FORTUNE:
      return `你是命理运势顾问。请结合每日运势盘面给出当天建议，不输出重要日期提醒。\n\n${formatDailyFortunePrompt(cData as GenericTaibuResponse, '')}`;
    case ModelType.MONTHLY_FORTUNE:
      return `你是命理运势顾问。请结合每月运势盘面给出本月建议，不输出重要日期提醒。\n\n${formatMonthlyFortunePrompt(cData as GenericTaibuResponse, '')}`;
    default:
      return '';
  }
};

const extractQuestionFromMessages = (messages: ChatMessage[]) => {
  const firstUserMessage = messages.find((msg) => msg.role === 'user');
  if (!firstUserMessage) return '';

  const questionLine = firstUserMessage.content.match(/(?:^|\n)问题:\s*(.+)$/m);
  if (questionLine?.[1]) {
    return questionLine[1].trim();
  }

  if (firstUserMessage.content.startsWith('问题:')) {
    return firstUserMessage.content.replace(/^问题:\s*/, '').trim();
  }

  return '';
};

const getInitialAnalysisQuestion = (
  chartParams: Record<string, unknown>,
  messages: ChatMessage[]
) => {
  const storedQuestion = typeof chartParams.question === 'string' ? chartParams.question.trim() : '';
  if (storedQuestion) return storedQuestion;
  return extractQuestionFromMessages(messages);
};

const buildInitialAnalysisBundle = (
  mType: ModelType,
  cData: unknown,
  chartParams: Record<string, unknown>,
  messages: ChatMessage[]
) => {
  const professionalFeature = getProfessionalFeature(chartParams);
  if (
    professionalFeature === PROFESSIONAL_FEATURE_JOINT &&
    isJointChartData(chartParams.jointChartData)
  ) {
    const jointData = chartParams.jointChartData;
    return {
      question: '',
      prompt: buildJointAnalysisPrompt(jointData),
      systemInstruction: buildJointAnalysisSystemInstruction(jointData),
      knowledgeQuery: '',
      userContent: buildJointInitialUserContent(jointData),
    };
  }

  if (
    professionalFeature === PROFESSIONAL_FEATURE_BAZI_COMPAT &&
    isBaziCompatibilityChartData(chartParams.compatibilityChartData)
  ) {
    const compatData = chartParams.compatibilityChartData;
    return {
      question: '',
      prompt: buildBaziCompatibilityAnalysisPrompt(compatData),
      systemInstruction: buildBaziCompatibilitySystemInstruction(compatData),
      knowledgeQuery: buildCaseRelationPromptText(
        compatData.relations || [],
        compatData.personAName,
        compatData.personBName
      ) || `${compatData.personAName} ${compatData.personBName} 八字合盘`,
      userContent: buildBaziCompatibilityInitialUserContent(compatData),
    };
  }

  const question = getInitialAnalysisQuestion(chartParams, messages);
  const snapshot = getSessionInitialAnalysisSnapshot(chartParams);

  if (mType === ModelType.BAZI || mType === ModelType.ZIWEI) {
    const analysisBundle = buildLifeReadingAnalysisBundle(
      mType,
      cData as BaziResponse | ZiweiResponse,
      question
    );

    return {
      question,
      prompt: analysisBundle.prompt,
      systemInstruction: snapshot.isInitialAnalysisSession
        ? analysisBundle.systemInstruction
        : appendInitialAnalysisContext(
            analysisBundle.systemInstruction,
            snapshot.initialAnalysis?.content ?? ''
          ),
      knowledgeQuery: analysisBundle.knowledgeQuery,
      userContent: buildInitialUserContent(mType, chartParams, question),
    };
  }

  if (mType === ModelType.QIMEN) {
    return {
      question,
      prompt: formatQimenPrompt(cData as QimenResponse, question),
      systemInstruction: "你是精通奇门遁甲的大师。请基于排盘，用通俗专业语言解答用户疑惑。关注用神、时令、吉凶。",
      knowledgeQuery: question,
      userContent: buildInitialUserContent(mType, chartParams, question),
    };
  }

  if (mType === ModelType.MEIHUA) {
    return {
      question,
      prompt: formatMeihuaPrompt(cData as MeihuaResponse, question),
      systemInstruction: "你是梅花易数占卜师。请基于本卦、互卦、变卦及动爻，直断吉凶成败。",
      knowledgeQuery: question,
      userContent: buildInitialUserContent(mType, chartParams, question),
    };
  }

  if (mType === ModelType.DALIUREN) {
    return {
      question,
      prompt: formatDaliurenPrompt(cData as GenericTaibuResponse, question),
      systemInstruction: "你是大六壬预测专家。请基于四课三传、天将、课体与神煞解答问题。",
      knowledgeQuery: question,
      userContent: buildInitialUserContent(mType, chartParams, question),
    };
  }

  if (mType === ModelType.TAIYI) {
    return {
      question,
      prompt: formatTaiyiPrompt(cData as GenericTaibuResponse, question),
      systemInstruction: "你是太乙神数预测专家。请基于太乙盘面与局式信号解答问题。",
      knowledgeQuery: question,
      userContent: buildInitialUserContent(mType, chartParams, question),
    };
  }

  if (mType === ModelType.XIAOLIUREN) {
    return {
      question,
      prompt: formatXiaoliurenPrompt(cData as GenericTaibuResponse, question),
      systemInstruction: "你是小六壬预测师。请基于六宫课体和所问事项给出直接判断。",
      knowledgeQuery: question,
      userContent: buildInitialUserContent(mType, chartParams, question),
    };
  }

  if (mType === ModelType.ALMANAC) {
    return {
      question,
      prompt: formatAlmanacPrompt(cData as GenericTaibuResponse, question),
      systemInstruction: "你是黄历择日顾问。请结合日课、宜忌、神煞与用户事项给出择日建议。",
      knowledgeQuery: question,
      userContent: buildInitialUserContent(mType, chartParams, question),
    };
  }

  if (mType === ModelType.DAILY_FORTUNE || mType === ModelType.MONTHLY_FORTUNE) {
    const isMonthly = mType === ModelType.MONTHLY_FORTUNE;
    return {
      question,
      prompt: isMonthly
        ? formatMonthlyFortunePrompt(cData as GenericTaibuResponse, question)
        : formatDailyFortunePrompt(cData as GenericTaibuResponse, question),
      systemInstruction: isMonthly
        ? "你是命理运势顾问。请结合每月运势盘面给出本月建议，不输出重要日期提醒。"
        : "你是命理运势顾问。请结合每日运势盘面给出当天建议，不输出重要日期提醒。",
      knowledgeQuery: question,
      userContent: buildInitialUserContent(mType, chartParams, question),
    };
  }

  return {
    question,
    prompt: formatLiuyaoPrompt(cData as LiuyaoResponse, question),
    systemInstruction: "你是六爻纳甲预测专家。请基于卦象、六亲、世应、六神及神煞空亡，详细推断吉凶、应期及建议。",
    knowledgeQuery: question,
    userContent: buildInitialUserContent(mType, chartParams, question),
  };
};

type AppProps = {
  initialModelType?: ModelType;
  initialWorkspace?: WorkspaceView;
  initialSettingsTab?: SettingsWorkspaceTab;
};

const App: React.FC<AppProps> = ({
  initialModelType = ModelType.BAZI,
  initialWorkspace = 'divination',
  initialSettingsTab = 'profile',
}) => {
  const { data: authSession, status: authStatus, update: updateSession } = useSession();
  const isLoggedIn = authStatus === 'authenticated';
  const [showAuth, setShowAuth] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showInitialAnalysisModal, setShowInitialAnalysisModal] = useState(false);
  const [userQuota, setUserQuota] = useState<number | null>(null);
  const [guestFortuneCount, setGuestFortuneCount] = useState(0);
  const [guestFollowUpCount, setGuestFollowUpCount] = useState(0);
  const [siteSettings, setSiteSettings] = useState<PublicSiteSettings>(DEFAULT_SITE_SETTINGS);

  // --- Persistence State ---
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [savedSessions, setSavedSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [caseItems, setCaseItems] = useState<CaseItem[]>([]);
  const [activeCase, setActiveCase] = useState<CaseDetail | null>(null);
  const [caseFormOpen, setCaseFormOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [caseBusy, setCaseBusy] = useState(false);
  const [selectedCaseRelationId, setSelectedCaseRelationId] = useState<string | null>(null);
  const [editingCaseRelationId, setEditingCaseRelationId] = useState<string | null>(null);
  const [caseRelationEditDraft, setCaseRelationEditDraft] = useState<EditableCaseRelationDraft>({ labelAToB: '', labelBToA: '' });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeCompactPanel, setActiveCompactPanel] = useState<'history' | 'more' | null>(null);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const analysisModel = DEFAULT_ANALYSIS_MODEL;
  const [activeChartParams, setActiveChartParams] = useState<Record<string, unknown>>({});
  const [sessionAnalysisModel, setSessionAnalysisModel] = useState<AnalysisModel | null>(null);
  const [professionalModalOpen, setProfessionalModalOpen] = useState(false);
  const [professionalSelectedProject, setProfessionalSelectedProject] = useState<string | null>(null);
  const [professionalMode, setProfessionalMode] = useState<'existing' | 'new'>('existing');
  const [professionalCaseOptions, setProfessionalCaseOptions] = useState<CaseItem[]>([]);
  const [fortuneCaseOptions, setFortuneCaseOptions] = useState<CaseItem[]>([]);
  const [fortuneCaseId, setFortuneCaseId] = useState<string>('');
  const autoFortuneChartKeyRef = useRef('');
  const [professionalCasesLoading, setProfessionalCasesLoading] = useState(false);
  const [professionalSelectedCaseId, setProfessionalSelectedCaseId] = useState<string | null>(null);
  const [professionalBusy, setProfessionalBusy] = useState(false);
  const [professionalResultSummary, setProfessionalResultSummary] = useState('');
  const [professionalName, setProfessionalName] = useState('');
  const [professionalGender, setProfessionalGender] = useState<number>(0);
  const [professionalCustomDate, setProfessionalCustomDate] = useState('');
  const [professionalProvince, setProfessionalProvince] = useState('');
  const [professionalCity, setProfessionalCity] = useState('');
  const [compatPersonA, setCompatPersonA] = useState<ProfessionalPersonComposer>(createProfessionalPersonComposer);
  const [compatPersonB, setCompatPersonB] = useState<ProfessionalPersonComposer>(createProfessionalPersonComposer);
  const [compatRelationModalOpen, setCompatRelationModalOpen] = useState(false);
  const [compatRelationDrafts, setCompatRelationDrafts] = useState<EditableCaseRelationDraft[]>([{ labelAToB: '', labelBToA: '' }]);
  const [pendingCompatibilityData, setPendingCompatibilityData] = useState<BaziCompatibilityChartData | null>(null);
  const [professionalPos, setProfessionalPos] = useState<{ x: number; y: number } | null>(null);
  const professionalDragRef = useRef<{
    offsetX: number;
    offsetY: number;
    moved: boolean;
    startX: number;
    startY: number;
  } | null>(null);
  const activeProfessionalFeature = getProfessionalFeature(activeChartParams);

  // --- State ---
  const [hasSelectedModel, setHasSelectedModel] = useState(true);
  const [modelType, setModelType] = useState<ModelType>(initialModelType);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(initialWorkspace);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'chart'>('input');
  
  // Inputs
  const [name, setName] = useState('');
  const [question, setQuestion] = useState('');
  const [gender, setGender] = useState<number>(0); // 0 Male, 1 Female
  const [timeMode, setTimeMode] = useState<'now' | 'custom'>('now');
  const [customDate, setCustomDate] = useState('');
  const todayForLifeForm = new Date();
  const [lifeCalendarType, setLifeCalendarType] = useState<'solar' | 'lunar' | 'pillars'>('solar');
  const [lifeYear, setLifeYear] = useState(todayForLifeForm.getFullYear());
  const [lifeMonth, setLifeMonth] = useState(todayForLifeForm.getMonth() + 1);
  const [lifeDay, setLifeDay] = useState(todayForLifeForm.getDate());
  const [lifeHour, setLifeHour] = useState(9);
  const [lifeMinute, setLifeMinute] = useState(0);
  const [lifeTimeInputMode, setLifeTimeInputMode] = useState<'exact' | 'quick'>('exact');
  const [lifeUseTrueSolar, setLifeUseTrueSolar] = useState(false);
  const [lifeIsLeapMonth, setLifeIsLeapMonth] = useState(false);
  const [lifePillars, setLifePillars] = useState({ year: '甲子', month: '甲子', day: '甲子', hour: '甲子' });
  const [birthYear, setBirthYear] = useState('');
  const [qimenProEnabled, setQimenProEnabled] = useState(false);
  const [qimenJuModel, setQimenJuModel] = useState(0);
  
  // Liuyao Specifics
  const [liuyaoMode, setLiuyaoMode] = useState<LiuyaoMode>(LiuyaoMode.AUTO);
  // Manual Lines: 0 = Yin, 1 = Yang; moving state is tracked separately.
  const [manualLines, setManualLines] = useState<number[]>([1,0,1,0,1,0]);
  const [manualMovingLines, setManualMovingLines] = useState<boolean[]>([false, false, false, false, false, false]);
  const [lyNum, setLyNum] = useState<string>(''); // For single number
  const [lyNumUp, setLyNumUp] = useState<string>('');
  const [lyNumDown, setLyNumDown] = useState<string>('');
  const [yaoAddTime, setYaoAddTime] = useState(false);

  // Location Inputs (for Bazi/Ziwei True Solar Time)
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');

  // Data
  const [chartData, setChartData] = useState<any | null>(null);
  const [error, setError] = useState<string>('');

  // Chat
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [recordsSearch, setRecordsSearch] = useState('');
  const [recordsFilter, setRecordsFilter] = useState<'all' | 'life' | 'forecast' | 'fortune' | 'tool' | 'chat'>('all');
  const [recordsScope, setRecordsScope] = useState<'active' | 'pinned' | 'archived'>('active');
  const [standaloneChatInput, setStandaloneChatInput] = useState('');
  const [standaloneChatMessages, setStandaloneChatMessages] = useState<ChatMessage[]>([]);
  const [standaloneChatLoading, setStandaloneChatLoading] = useState(false);
  const [standaloneChatError, setStandaloneChatError] = useState('');
  const [standaloneChatUseKnowledge, setStandaloneChatUseKnowledge] = useState(true);
  const [standaloneChatKnowledgeBoard, setStandaloneChatKnowledgeBoard] = useState<'bazi' | 'qimen'>('bazi');
  const [standaloneSessionId, setStandaloneSessionId] = useState<string | null>(null);
  const [standaloneCaseOptions, setStandaloneCaseOptions] = useState<CaseItem[]>([]);
  const [standaloneSelectedCaseIds, setStandaloneSelectedCaseIds] = useState<string[]>([]);
  const [standaloneCaseSelectValue, setStandaloneCaseSelectValue] = useState('');
  const [settingsWorkspaceTab, setSettingsWorkspaceTab] = useState<SettingsWorkspaceTab>(initialSettingsTab);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isKlineRunning, setIsKlineRunning] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const pendingCaseSessionScrollRef = useRef(false);
  const pendingSectionScrollRef = useRef<'report' | 'case-form' | 'case-detail' | 'chat' | null>(null);
  const reportChartRef = useRef<HTMLDivElement>(null);
  const caseFormRef = useRef<HTMLDivElement>(null);
  const caseDetailRef = useRef<HTMLDivElement>(null);
  const [useKnowledge, setUseKnowledge] = useState(true);
  const [showUpdates, setShowUpdates] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const supportsKnowledge =
    modelType === ModelType.QIMEN ||
    modelType === ModelType.BAZI ||
    activeProfessionalFeature === PROFESSIONAL_FEATURE_JOINT ||
    activeProfessionalFeature === PROFESSIONAL_FEATURE_BAZI_COMPAT;
  const recommendedModels = new Set([ModelType.QIMEN, ModelType.BAZI]);
  const isCaseModel = isCaseModelType(modelType) && !activeProfessionalFeature;
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [editingUserMessageId, setEditingUserMessageId] = useState<string | null>(null);
  const [editingUserMessageDraft, setEditingUserMessageDraft] = useState('');
  const [messageVersionMap, setMessageVersionMap] = useState<Record<string, MessageVersionState>>({});
  const [openVersionMenuId, setOpenVersionMenuId] = useState<string | null>(null);
  const [showRerunConfirm, setShowRerunConfirm] = useState(false);
  const [showInitialAnalysisRegenerateConfirm, setShowInitialAnalysisRegenerateConfirm] = useState(false);
  const [confirmCaseSessionDeleteId, setConfirmCaseSessionDeleteId] = useState<string | null>(null);
  const [initialAnalysisBusy, setInitialAnalysisBusy] = useState(false);
  const [knowledgeHint, setKnowledgeHint] = useState<string | null>(null);
  const [messageSourceMap, setMessageSourceMap] = useState<Record<string, KnowledgeSourceSummary[]>>({});
  const [baziInitialAnalysis, setBaziInitialAnalysis] = useState('');
  const [, setKlineUnlocked] = useState(false);
  const [klineModalOpen, setKlineModalOpen] = useState(false);
  const [klineStatus, setKlineStatus] = useState<'idle' | 'analyzing' | 'ready' | 'error'>('idle');
  const [klineResult, setKlineResult] = useState<KlineResult | null>(null);
  const [klineError, setKlineError] = useState('');
  const [klineZoom, setKlineZoom] = useState(1);
  const [klineSelected, setKlineSelected] = useState<KlineSelection>(null);
  const [klineProgress, setKlineProgress] = useState(0);
  const [klineYearProgress, setKlineYearProgress] = useState(0);

  const registrationEnabled = siteSettings.registrationEnabled;
  const guestModeEnabled = siteSettings.guestModeEnabled;
  const authEntryLabel = registrationEnabled ? '登录 / 注册' : '登录';
  const registrationClosedMessage = `注册通道已关闭，若有需要请联系${siteSettings.registrationClosedContact}`;
  const welcomeIntroText = guestModeEnabled
    ? siteSettings.welcomeIntro
    : siteSettings.welcomeIntro
        .split(/\r?\n/)
        .filter((line) => !line.includes('访客'))
        .join('\n');
  const [klineSeries, setKlineSeries] = useState({
    overall: true,
    wealth: false,
    love: false,
    career: false,
    health: false,
  });
  const [klinePos, setKlinePos] = useState<{ x: number; y: number } | null>(null);
  const klineDragRef = useRef<{
    offsetX: number;
    offsetY: number;
    moved: boolean;
    startX: number;
    startY: number;
  } | null>(null);
  const klineYearProgressRef = useRef(0);

  const syncAutoScrollState = useCallback(() => {
    const container = chatScrollRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 96;
  }, []);

  const requestSectionScroll = useCallback((target: 'report' | 'case-form' | 'case-detail' | 'chat') => {
    pendingSectionScrollRef.current = target;
  }, []);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container || !shouldAutoScrollRef.current) return;

    const frameId = window.requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: isTyping ? 'auto' : 'smooth',
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [chatHistory, isTyping]);

  useEffect(() => {
    if (!pendingCaseSessionScrollRef.current) return;
    const panel = chatPanelRef.current;
    if (!panel) return;

    pendingCaseSessionScrollRef.current = false;
    const frameId = window.requestAnimationFrame(() => {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeSessionId, chatHistory.length, isCaseModel]);

  useEffect(() => {
    const targetKey = pendingSectionScrollRef.current;
    if (!targetKey) return;

    const target = (
      targetKey === 'report'
        ? reportChartRef.current
        : targetKey === 'case-form'
          ? caseFormRef.current
          : targetKey === 'case-detail'
            ? caseDetailRef.current
            : chatPanelRef.current
    );
    if (!target) return;

    pendingSectionScrollRef.current = null;
    const frameId = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [step, caseFormOpen, activeSessionId, chatHistory.length, activeCase?.id, requestSectionScroll]);

  useEffect(() => {
    const messageIds = new Set(chatHistory.map((msg) => msg.id));
    setMessageVersionMap((current) => {
      const nextEntries = Object.entries(current).filter(([messageId]) => messageIds.has(messageId));
      if (nextEntries.length === Object.keys(current).length) {
        return current;
      }
      return Object.fromEntries(nextEntries);
    });
    if (openVersionMenuId && !messageIds.has(openVersionMenuId)) {
      setOpenVersionMenuId(null);
    }
    if (editingUserMessageId && !messageIds.has(editingUserMessageId)) {
      setEditingUserMessageId(null);
      setEditingUserMessageDraft('');
    }
  }, [chatHistory, editingUserMessageId, openVersionMenuId]);

  useEffect(() => {
    setSelectedCaseRelationId(null);
    setEditingCaseRelationId(null);
    setCaseRelationEditDraft({ labelAToB: '', labelBToA: '' });
  }, [activeCase?.id]);

  const readGuestCases = useCallback((): CaseItem[] => {
    try {
      const raw = localStorage.getItem(GUEST_CASES_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item): item is CaseItem => {
        return !!item && typeof item.id === 'string' && isCaseModelType(item.modelType);
      });
    } catch {
      return [];
    }
  }, []);

  const writeGuestCases = useCallback((items: CaseItem[]) => {
    localStorage.setItem(GUEST_CASES_STORAGE_KEY, JSON.stringify(items));
  }, []);

  const readGuestCaseSessions = useCallback((): GuestStoredSession[] => {
    try {
      const raw = localStorage.getItem(GUEST_CASE_SESSIONS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item): item is GuestStoredSession => {
        return (
          !!item &&
          typeof item.id === 'string' &&
          typeof item.caseId === 'string' &&
          isSupportedGuestSessionType(item.modelType) &&
          Array.isArray(item.messages)
        );
      });
    } catch {
      return [];
    }
  }, []);

  const writeGuestCaseSessions = useCallback((items: GuestStoredSession[]) => {
    localStorage.setItem(GUEST_CASE_SESSIONS_STORAGE_KEY, JSON.stringify(items));
  }, []);

  const readGuestCaseRelations = useCallback((): CaseRelationItem[] => {
    try {
      const raw = localStorage.getItem(GUEST_CASE_RELATIONS_STORAGE_KEY);
      if (!raw) return [];
      return normalizeCaseRelationItems(JSON.parse(raw));
    } catch {
      return [];
    }
  }, []);

  const writeGuestCaseRelations = useCallback((items: CaseRelationItem[]) => {
    localStorage.setItem(GUEST_CASE_RELATIONS_STORAGE_KEY, JSON.stringify(items));
  }, []);

  const applyCaseChartParamsToForm = useCallback((chartParams: unknown) => {
    const params = normalizeCaseChartParams(chartParams);
    const extendedParams = params as typeof params & {
      calendarType?: 'solar' | 'lunar' | 'pillars';
      isLeapMonth?: boolean;
      timeInputMode?: 'exact' | 'quick';
      useTrueSolar?: boolean;
      district?: string;
      pillars?: { year: string; month: string; day: string; hour: string };
    };
    const dateValue = buildCaseDateTimeValue(params);
    const date = dateValue ? new Date(dateValue) : null;
    setName(params.name || '');
    setGender(params.sex ?? 0);
    setCustomDate(dateValue);
    if (date && !Number.isNaN(date.getTime())) {
      setLifeYear(date.getFullYear());
      setLifeMonth(date.getMonth() + 1);
      setLifeDay(date.getDate());
      setLifeHour(date.getHours());
      setLifeMinute(date.getMinutes());
    }
    setLifeCalendarType(extendedParams.calendarType || 'solar');
    setLifeIsLeapMonth(Boolean(extendedParams.isLeapMonth));
    setLifeTimeInputMode(extendedParams.timeInputMode || 'exact');
    setLifeUseTrueSolar(Boolean(extendedParams.useTrueSolar));
    if (extendedParams.pillars && typeof extendedParams.pillars === 'object') {
      setLifePillars(extendedParams.pillars);
    }
    setProvince(params.province || '');
    setCity(params.city || '');
    setDistrict(extendedParams.district || '');
    setTimeMode('custom');
  }, []);

  const resetCaseFormInputs = useCallback(() => {
    setName('');
    setGender(0);
    setCustomDate('');
    const now = new Date();
    setLifeCalendarType('solar');
    setLifeYear(now.getFullYear());
    setLifeMonth(now.getMonth() + 1);
    setLifeDay(now.getDate());
    setLifeHour(9);
    setLifeMinute(0);
    setLifeTimeInputMode('exact');
    setLifeUseTrueSolar(false);
    setLifeIsLeapMonth(false);
    setLifePillars({ year: '甲子', month: '甲子', day: '甲子', hour: '甲子' });
    setProvince('');
    setCity('');
    setDistrict('');
    setQuestion('');
  }, []);

  const getGuestCaseDetail = useCallback((caseId: string): CaseDetail | null => {
    const allCases = readGuestCases();
    const matchedCase = allCases.find((item) => item.id === caseId);
    if (!matchedCase) return null;

    const rawSessions = readGuestCaseSessions()
      .filter((item) => {
        if (item.caseId === caseId) return true;
        const compatibilityCaseIds = getBaziCompatibilityCaseIds(item.chartParams);
        return compatibilityCaseIds?.caseAId === caseId || compatibilityCaseIds?.caseBId === caseId;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const currentInitialAnalysis = normalizeInitialAnalysisData(matchedCase.initialAnalysisData);
    let effectiveCase = matchedCase;

    if (!currentInitialAnalysis) {
      for (const session of rawSessions) {
        const derived = deriveInitialAnalysisFromSession(
          session.chartParams,
          session.messages,
          session.updatedAt
        );
        if (!derived) continue;

        effectiveCase = {
          ...matchedCase,
          initialAnalysisData: derived,
        };
        const nextCases = allCases.map((item) => (item.id === caseId ? effectiveCase : item));
        writeGuestCases(nextCases);
        setCaseItems(nextCases.filter((item) => item.modelType === modelType));
        break;
      }
    }

    const sessions = rawSessions.map((item) => ({
        id: item.id,
        modelType: item.modelType,
        title: item.title,
        caseId: item.caseId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
    const relations = readGuestCaseRelations()
      .filter((item) => item.caseAId === caseId || item.caseBId === caseId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return {
      ...effectiveCase,
      sessions,
      relations,
    };
  }, [modelType, readGuestCaseRelations, readGuestCaseSessions, readGuestCases, writeGuestCases]);

  const hydrateCasesForModel = useCallback(async (type: ModelType) => {
    if (!isCaseModelType(type)) return;

    if (!isLoggedIn) {
      const items = readGuestCases()
        .filter((item) => item.modelType === type)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setCaseItems(items);
      return;
    }

    try {
      const res = await fetch(`/api/cases?modelType=${type}`);
      if (!res.ok) return;
      const data = await res.json();
      setCaseItems(Array.isArray(data) ? data : []);
    } catch {
      // silently ignore
    }
  }, [isLoggedIn, readGuestCases]);

  const hydrateFortuneCaseOptions = useCallback(async () => {
    if (!isLoggedIn) {
      const items = readGuestCases()
        .filter((item) => item.modelType === ModelType.BAZI)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setFortuneCaseOptions(items);
      setFortuneCaseId((current) => current || items[0]?.id || '');
      return;
    }

    try {
      const res = await fetch('/api/cases?modelType=bazi');
      if (!res.ok) return;
      const data = await res.json();
      const items = Array.isArray(data) ? data : [];
      setFortuneCaseOptions(items);
      setFortuneCaseId((current) => current || items[0]?.id || '');
    } catch {
      // silently ignore
    }
  }, [isLoggedIn, readGuestCases]);

  const hydrateStandaloneCaseOptions = useCallback(async () => {
    if (!isLoggedIn) {
      const items = readGuestCases()
        .filter((item) => item.modelType === ModelType.BAZI || item.modelType === ModelType.ZIWEI)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setStandaloneCaseOptions(items);
      setStandaloneSelectedCaseIds((current) => current.filter((id) => items.some((item) => item.id === id)));
      return;
    }

    try {
      const [baziRes, ziweiRes] = await Promise.all([
        fetch('/api/cases?modelType=bazi'),
        fetch('/api/cases?modelType=ziwei'),
      ]);
      const [baziData, ziweiData] = await Promise.all([
        baziRes.ok ? baziRes.json() : Promise.resolve([]),
        ziweiRes.ok ? ziweiRes.json() : Promise.resolve([]),
      ]);
      const items = [
        ...(Array.isArray(baziData) ? baziData : []),
        ...(Array.isArray(ziweiData) ? ziweiData : []),
      ].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
      setStandaloneCaseOptions(items);
      setStandaloneSelectedCaseIds((current) => current.filter((id) => items.some((item) => item.id === id)));
    } catch {
      // silently ignore
    }
  }, [isLoggedIn, readGuestCases]);

  const loadCaseDetail = useCallback(async (caseId: string) => {
    if (!isCaseModel) return;

    if (!isLoggedIn) {
      const detail = getGuestCaseDetail(caseId);
      if (!detail) return;
      const storedSession = readGuestCaseSessions().find((item) => item.caseId === caseId);
      clearChatSession();
      setHasSelectedModel(true);
      setActiveCase(detail);
      setChartData(detail.chartData);
      setActiveChartParams((detail.chartParams || {}) as Record<string, unknown>);
      setQuestion('');
      setChatHistory([]);
      setKnowledgeHint(null);
      setActiveSessionId(null);
      setSessionAnalysisModel(null);
      const nextFollowUpCount = storedSession?.guestFollowUpCount || 0;
      setGuestFollowUpCount(nextFollowUpCount);
      localStorage.setItem('guestFollowUpCount', String(nextFollowUpCount));
      setStep('chart');
      requestSectionScroll('case-detail');
      return;
    }

    try {
      const res = await fetch(`/api/cases/${caseId}`);
      if (!res.ok) return;
      const data = await res.json();
      clearChatSession();
      setHasSelectedModel(true);
      setActiveCase(data);
      setChartData(data.chartData);
      setActiveChartParams((data.chartParams || {}) as Record<string, unknown>);
      setQuestion('');
      setChatHistory([]);
      setKnowledgeHint(null);
      setActiveSessionId(null);
      setSessionAnalysisModel(null);
      setStep('chart');
      requestSectionScroll('case-detail');
    } catch {
      // silently ignore
    }
  }, [getGuestCaseDetail, isCaseModel, isLoggedIn, readGuestCaseSessions, requestSectionScroll]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1279px)');
    const syncViewport = (matches: boolean) => {
      setIsCompactLayout(matches);
      if (!matches) {
        setActiveCompactPanel(null);
      }
    };

    syncViewport(mediaQuery.matches);
    const handleChange = (event: MediaQueryListEvent) => syncViewport(event.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!activeCompactPanel) return;
    document.body.classList.add('overflow-hidden');
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [activeCompactPanel]);

  useEffect(() => {
    if (modelType !== ModelType.BAZI || !activeCase || activeCase.modelType !== ModelType.BAZI) {
      setKlineResult(null);
      setKlineStatus('idle');
      setBaziInitialAnalysis('');
      return;
    }

    const currentInitialAnalysis = normalizeInitialAnalysisData(activeCase.initialAnalysisData);
    setBaziInitialAnalysis(currentInitialAnalysis?.content ?? '');

    const parsed = activeCase.klineData as KlineResult | null | undefined;
    if (parsed?.schema_version === 'kline_v1') {
      setKlineResult(parsed);
      setKlineStatus('ready');
      setKlineUnlocked(true);
      return;
    }

    setKlineResult(null);
    setKlineStatus('idle');
  }, [activeCase, modelType]);

  useEffect(() => {
    if (klineStatus !== 'analyzing') return;
    setKlineProgress(0);
    setKlineYearProgress(0);
    klineYearProgressRef.current = 0;
  }, [klineStatus]);

  useEffect(() => {
    if (!showInitialAnalysisModal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowInitialAnalysisModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showInitialAnalysisModal]);

  useEffect(() => {
    if (modelType !== ModelType.BAZI || step !== 'chart') return;
    if (klinePos) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    setKlinePos({
      x: Math.max(16, width - 120),
      y: Math.max(120, Math.round(height * 0.55)),
    });
  }, [modelType, step, klinePos]);

  useEffect(() => {
    if (professionalPos) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    setProfessionalPos(clampProfessionalPos(width - 108, Math.round(height * 0.22)));
  }, [professionalPos]);

  useEffect(() => {
    const hasModalOpen =
      showAuth ||
      showAccountSettings ||
      showChangePassword ||
      showInitialAnalysisModal ||
      showInitialAnalysisRegenerateConfirm ||
      showRerunConfirm ||
      showUpdates ||
      compatRelationModalOpen ||
      professionalModalOpen ||
      klineModalOpen;
    if (!hasModalOpen) return;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [
    klineModalOpen,
    professionalModalOpen,
    compatRelationModalOpen,
    showAccountSettings,
    showAuth,
    showChangePassword,
    showInitialAnalysisModal,
    showInitialAnalysisRegenerateConfirm,
    showRerunConfirm,
    showUpdates,
  ]);

  // --- Session Persistence ---
  const fetchSessions = useCallback(async () => {
    if (!isLoggedIn) {
      setSessionsLoading(false);
      return;
    }
    setSessionsLoading(true);
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json();
        setSavedSessions(data);
      }
    } catch {
      // silently ignore
    } finally {
      setSessionsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (!isCaseModelType(modelType)) {
      setCaseItems([]);
      setActiveCase(null);
      setCaseFormOpen(false);
      setEditingCaseId(null);
      return;
    }

    hydrateCasesForModel(modelType);
  }, [hydrateCasesForModel, modelType]);

  useEffect(() => {
    if (modelType !== ModelType.DAILY_FORTUNE && modelType !== ModelType.MONTHLY_FORTUNE) return;
    hydrateFortuneCaseOptions();
  }, [hydrateFortuneCaseOptions, modelType]);

  useEffect(() => {
    if (workspaceView !== 'chat' && workspaceView !== 'settings') return;
    hydrateStandaloneCaseOptions();
  }, [hydrateStandaloneCaseOptions, workspaceView]);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      const dismissed = sessionStorage.getItem('welcomeDismissed');
      if (!dismissed) setShowWelcome(true);
    } else {
      setShowWelcome(false);
    }
  }, [authStatus]);

  useEffect(() => {
    setGuestFortuneCount(parseInt(localStorage.getItem('guestFortuneCount') || '0', 10));
    setGuestFollowUpCount(parseInt(localStorage.getItem('guestFollowUpCount') || '0', 10));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSiteSettings = async () => {
      try {
        const res = await fetch('/api/site-settings');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data || typeof data !== 'object') return;
        setSiteSettings({
          ...DEFAULT_SITE_SETTINGS,
          ...data,
          announcementItems: Array.isArray(data.announcementItems)
            ? data.announcementItems.filter((item: unknown): item is string => typeof item === 'string')
            : DEFAULT_SITE_SETTINGS.announcementItems,
        });
      } catch {
        // fall back to defaults
      }
    };

    void loadSiteSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchUserProfile = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setUserQuota(data.quota);
      }
    } catch { /* ignore */ }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const requireLoginIfGuestModeDisabled = useCallback(() => {
    if (!isLoggedIn && !guestModeEnabled) {
      setError('需要登录后才能使用');
      setShowAuth(true);
      return true;
    }
    return false;
  }, [guestModeEnabled, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) return;
    setActiveCompactPanel(null);
  }, [isLoggedIn]);

  const saveSessionToDb = async (
    mType: string,
    title: string,
    chartParams: Record<string, unknown>,
    cData: unknown,
    caseId?: string | null
  ): Promise<string | null> => {
    if (!isLoggedIn) return null;
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelType: mType, title, chartParams, chartData: cData, caseId }),
      });
      if (res.ok) {
        const created = await res.json();
        fetchSessions();
        return created.id as string;
      }
    } catch {
      // silently ignore
    }
    return null;
  };

  const createCaseInDb = async (
    type: CaseModelType,
    chartParams: Record<string, unknown>,
    cData: unknown
  ): Promise<CaseDetail | null> => {
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelType: type,
          title: buildCaseTitle(type, chartParams),
          chartParams,
          chartData: cData,
          klineData: null,
          initialAnalysisData: null,
        }),
      });
      if (!res.ok) return null;
      const created = await res.json();
      const detailRes = await fetch(`/api/cases/${created.id}`);
      if (!detailRes.ok) return null;
      return await detailRes.json();
    } catch {
      return null;
    }
  };

  const updateCaseInDb = async (
    caseId: string,
    type: CaseModelType,
    chartParams: Record<string, unknown>,
    cData: unknown,
    klineData?: unknown,
    initialAnalysisData?: unknown
  ): Promise<CaseDetail | null> => {
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: buildCaseTitle(type, chartParams),
          chartParams,
          chartData: cData,
          ...(klineData !== undefined ? { klineData } : {}),
          ...(initialAnalysisData !== undefined ? { initialAnalysisData } : {}),
        }),
      });
      if (!res.ok) return null;
      const detailRes = await fetch(`/api/cases/${caseId}`);
      if (!detailRes.ok) return null;
      return await detailRes.json();
    } catch {
      return null;
    }
  };

  const deleteCaseInDb = async (caseId: string) => {
    try {
      const res = await fetch(`/api/cases/${caseId}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  };

  const saveCaseKlineInDb = async (caseId: string, klineData: KlineResult | null): Promise<CaseDetail | null> => {
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ klineData }),
      });
      if (!res.ok) return null;
      const detailRes = await fetch(`/api/cases/${caseId}`);
      if (!detailRes.ok) return null;
      return await detailRes.json();
    } catch {
      return null;
    }
  };

  const saveCaseInitialAnalysisInDb = async (
    caseId: string,
    initialAnalysisData: InitialAnalysisData | null
  ): Promise<CaseDetail | null> => {
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialAnalysisData }),
      });
      if (!res.ok) return null;
      const detailRes = await fetch(`/api/cases/${caseId}`);
      if (!detailRes.ok) return null;
      return await detailRes.json();
    } catch {
      return null;
    }
  };

  const fetchCaseRelationsForPairInDb = async (
    caseAId: string,
    caseBId: string
  ): Promise<CaseRelationItem[]> => {
    try {
      const res = await fetch(`/api/case-relations?caseAId=${caseAId}&caseBId=${caseBId}`);
      if (!res.ok) return [];
      return normalizeCaseRelationItems(await res.json());
    } catch {
      return [];
    }
  };

  const saveCaseRelationsInDb = async (
    caseAId: string,
    caseBId: string,
    relations: EditableCaseRelationDraft[]
  ): Promise<CaseRelationItem[]> => {
    try {
      const res = await fetch('/api/case-relations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseAId,
          caseBId,
          relations,
        }),
      });
      if (!res.ok) return [];
      return normalizeCaseRelationItems(await res.json());
    } catch {
      return [];
    }
  };

  const deleteCaseRelationInDb = async (relationId: string) => {
    try {
      const res = await fetch(`/api/case-relations/${relationId}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  };

  const updateCaseRelationInDb = async (
    relationId: string,
    draft: EditableCaseRelationDraft
  ): Promise<CaseRelationItem | null> => {
    try {
      const res = await fetch(`/api/case-relations/${relationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labelAToB: draft.labelAToB,
          labelBToA: draft.labelBToA,
        }),
      });
      if (!res.ok) return null;
      return normalizeCaseRelationItems([await res.json()])[0] || null;
    } catch {
      return null;
    }
  };

  const saveGuestCase = useCallback((nextCase: CaseItem) => {
    const current = readGuestCases().filter((item) => item.id !== nextCase.id);
    const next = [nextCase, ...current].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    writeGuestCases(next);
    setCaseItems(next.filter((item) => item.modelType === modelType));
  }, [modelType, readGuestCases, writeGuestCases]);

  const saveGuestCaseSession = useCallback((session: GuestStoredSession) => {
    const current = readGuestCaseSessions().filter((item) => item.id !== session.id);
    const next = [session, ...current];
    writeGuestCaseSessions(next);
  }, [readGuestCaseSessions, writeGuestCaseSessions]);

  const updateGuestCaseSession = useCallback((
    sessionId: string,
    updater: (session: GuestStoredSession) => GuestStoredSession
  ) => {
    const current = readGuestCaseSessions();
    const next = current.map((item) => (item.id === sessionId ? updater(item) : item));
    writeGuestCaseSessions(next);
  }, [readGuestCaseSessions, writeGuestCaseSessions]);

  const updateGuestCaseSessionMessages = useCallback((
    sessionId: string,
    messages: ChatMessage[],
    nextFollowUpCount?: number
  ) => {
    updateGuestCaseSession(sessionId, (item) => ({
      ...item,
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        knowledgeSources: msg.knowledgeSources,
      })),
      guestFollowUpCount: nextFollowUpCount ?? item.guestFollowUpCount,
      updatedAt: new Date().toISOString(),
    }));
  }, [updateGuestCaseSession]);

  const deleteGuestCase = useCallback((caseId: string) => {
    const nextCases = readGuestCases().filter((item) => item.id !== caseId);
    const nextSessions = readGuestCaseSessions().filter((item) => item.caseId !== caseId);
    const nextRelations = readGuestCaseRelations().filter((item) => item.caseAId !== caseId && item.caseBId !== caseId);
    writeGuestCases(nextCases);
    writeGuestCaseSessions(nextSessions);
    writeGuestCaseRelations(nextRelations);
    setCaseItems(nextCases.filter((item) => item.modelType === modelType));
  }, [modelType, readGuestCaseRelations, readGuestCaseSessions, readGuestCases, writeGuestCases, writeGuestCaseRelations, writeGuestCaseSessions]);

  const upsertGuestCaseRelations = useCallback((
    caseA: Pick<CaseItem, 'id' | 'title'>,
    caseB: Pick<CaseItem, 'id' | 'title'>,
    relations: EditableCaseRelationDraft[]
  ) => {
    const current = readGuestCaseRelations().filter((item) => {
      return !(
        (item.caseAId === caseA.id && item.caseBId === caseB.id) ||
        (item.caseAId === caseB.id && item.caseBId === caseA.id)
      );
    });
    const nowIso = new Date().toISOString();
    const nextRelations = relations
      .filter((item) => item.labelAToB.trim() || item.labelBToA.trim())
      .map((item, index) => ({
        id: item.id || `guest-case-relation-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        caseAId: caseA.id,
        caseBId: caseB.id,
        labelAToB: item.labelAToB.trim() || null,
        labelBToA: item.labelBToA.trim() || null,
        caseATitle: caseA.title,
        caseBTitle: caseB.title,
        createdAt: nowIso,
        updatedAt: nowIso,
      } satisfies CaseRelationItem));
    writeGuestCaseRelations([...nextRelations, ...current].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    return nextRelations;
  }, [readGuestCaseRelations, writeGuestCaseRelations]);

  const deleteGuestCaseRelation = useCallback((relationId: string) => {
    const next = readGuestCaseRelations().filter((item) => item.id !== relationId);
    writeGuestCaseRelations(next);
  }, [readGuestCaseRelations, writeGuestCaseRelations]);

  const updateGuestCaseRelation = useCallback((relationId: string, draft: EditableCaseRelationDraft) => {
    const next = readGuestCaseRelations().map((item) => (
      item.id === relationId
        ? {
            ...item,
            labelAToB: draft.labelAToB.trim() || null,
            labelBToA: draft.labelBToA.trim() || null,
            updatedAt: new Date().toISOString(),
          }
        : item
    ));
    writeGuestCaseRelations(next);
  }, [readGuestCaseRelations, writeGuestCaseRelations]);

  const clearGuestCaseSessions = useCallback((caseId: string) => {
    const nextSessions = readGuestCaseSessions().filter((item) => item.caseId !== caseId);
    writeGuestCaseSessions(nextSessions);
  }, [readGuestCaseSessions, writeGuestCaseSessions]);

  const saveMessagesToDb = async (
    sessionId: string | null,
    messages: PersistedChatMessage[]
  ) => {
    if (!isLoggedIn || !sessionId || messages.length === 0) return;
    try {
      await fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
    } catch {
      // silently ignore
    }
  };

  const replaceMessagesInDb = async (
    sessionId: string | null,
    messages: PersistedChatMessage[]
  ) => {
    if (!isLoggedIn || !sessionId) return;
    try {
      await fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
    } catch {
      // silently ignore
    }
  };

  const updateSessionInDb = async (
    sessionId: string | null,
    payload: { title?: string; chartParams?: Record<string, unknown>; isPinned?: boolean; isArchived?: boolean }
  ) => {
    if (!isLoggedIn || !sessionId) return;
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // silently ignore
    }
  };

  const handleUpdateSessionFlags = async (
    id: string,
    flags: { isPinned?: boolean; isArchived?: boolean }
  ) => {
    const current = savedSessions.find((item) => item.id === id);
    if (!current) return;
    const nextFlags = {
      isPinned: flags.isPinned ?? Boolean(current.isPinned),
      isArchived: flags.isArchived ?? Boolean(current.isArchived),
    };
    setSavedSessions((prev) => prev.map((item) => (
      item.id === id ? { ...item, ...nextFlags, updatedAt: new Date().toISOString() } : item
    )));
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextFlags),
      });
      if (!res.ok) throw new Error('更新记录失败');
      const updated = await res.json();
      setSavedSessions((prev) => prev.map((item) => (
        item.id === id
          ? {
              ...item,
              isPinned: Boolean(updated.isPinned),
              isArchived: Boolean(updated.isArchived),
              updatedAt: updated.updatedAt || item.updatedAt,
            }
          : item
      )));
    } catch {
      setSavedSessions((prev) => prev.map((item) => (
        item.id === id ? current : item
      )));
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      setSavedSessions(prev => prev.filter(s => s.id !== id));
      if (activeCase && isLoggedIn) {
        const detailRes = await fetch(`/api/cases/${activeCase.id}`);
        if (detailRes.ok) {
          const detail = await detailRes.json();
          setActiveCase(detail);
        }
      }
      if (activeSessionId === id) {
        setActiveSessionId(null);
        handleReset();
      }
    } catch {
      // silently ignore
    }
  };

  const handleLoadSession = async (id: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const sessionChartParams = (data.chartParams || {}) as Record<string, unknown>;

      if (data.modelType === 'chat') {
        const msgs: ChatMessage[] = (data.messages || []).map(
          (m: { id: string; role: string; content: string; createdAt: string; knowledgeSources?: KnowledgeSourceSummary[] }) => ({
            id: m.id,
            role: m.role as 'user' | 'model',
            content: m.content,
            timestamp: new Date(m.createdAt),
            knowledgeSources: Array.isArray(m.knowledgeSources) ? m.knowledgeSources : undefined,
          })
        );
        clearChatSession();
        setActiveSessionId(id);
        setStandaloneSessionId(id);
        setWorkspaceView('chat');
        setStandaloneChatMessages(msgs);
        setMessageSourceMap(Object.fromEntries(
          msgs
            .filter((msg) => msg.knowledgeSources?.length)
            .map((msg) => [msg.id, msg.knowledgeSources as KnowledgeSourceSummary[]])
        ));
        setStandaloneChatInput('');
        setStandaloneChatError('');
        setStandaloneChatLoading(false);
        setStandaloneSelectedCaseIds(
          Array.isArray(sessionChartParams.sourceCaseIds)
            ? sessionChartParams.sourceCaseIds.filter((item): item is string => typeof item === 'string')
            : []
        );
        setChatHistory([]);
        setChartData(null);
        setActiveChartParams({});
        setActiveCase(null);
        setStep('input');
        if (typeof window !== 'undefined' && window.location.pathname !== '/chat') {
          window.history.pushState(null, '', '/chat');
        }
        return;
      }

      const sessionProfessionalFeature = getProfessionalFeature(sessionChartParams);
      let effectiveChartData = data.chartData;
      let matchedCase: CaseDetail | null = null;

      if (!sessionProfessionalFeature && isCaseModelType(data.modelType) && data.caseId) {
        try {
          const detailRes = await fetch(`/api/cases/${data.caseId}`);
          if (detailRes.ok) {
            matchedCase = await detailRes.json();
            effectiveChartData = matchedCase.chartData;
          }
        } catch {
          // silently ignore
        }
      }

      clearChatSession();
      setActiveSessionId(id);
      setWorkspaceView('divination');
      setHasSelectedModel(true);
      const loadedModelType = sessionProfessionalFeature ? ModelType.BAZI : (data.modelType as ModelType);
      setModelType(loadedModelType);
      const loadedRoute = MODEL_ROUTES[loadedModelType];
      if (loadedRoute && typeof window !== 'undefined' && window.location.pathname !== loadedRoute) {
        window.history.pushState(null, '', loadedRoute);
      }
      setChartData(effectiveChartData);
      setActiveChartParams(sessionChartParams);
      setStep('chart');
      setError('');
      setCaseFormOpen(false);
      setEditingCaseId(null);

      if (data.chartParams) {
        const p = data.chartParams as Record<string, unknown>;
        if (p.name) setName(p.name as string);
        if (p.question) setQuestion(p.question as string);
        setSessionAnalysisModel(DEFAULT_ANALYSIS_MODEL);
      } else {
        setSessionAnalysisModel(DEFAULT_ANALYSIS_MODEL);
      }

      const msgs: ChatMessage[] = (data.messages || []).map(
        (m: { id: string; role: string; content: string; createdAt: string; knowledgeSources?: KnowledgeSourceSummary[] }) => ({
          id: m.id,
          role: m.role as 'user' | 'model',
          content: m.content,
          timestamp: new Date(m.createdAt),
          knowledgeSources: Array.isArray(m.knowledgeSources) ? m.knowledgeSources : undefined,
        })
      );
      resetMessageVersions();
      setChatHistory(msgs);
      setMessageSourceMap(Object.fromEntries(
        msgs
          .filter((msg) => msg.knowledgeSources?.length)
          .map((msg) => [msg.id, msg.knowledgeSources as KnowledgeSourceSummary[]])
      ));
      pendingCaseSessionScrollRef.current = true;

      if (msgs.length > 0) {
        const systemInstruction = buildSystemInstruction(
          data.modelType as ModelType,
          effectiveChartData,
          (data.chartParams || {}) as Record<string, unknown>
        );
        restoreChatSession(
          systemInstruction,
          msgs.map(m => ({ role: m.role, content: m.content }))
        );
      }

      if (data.modelType === 'bazi' && effectiveChartData) {
        const chartParams = (data.chartParams || {}) as Record<string, unknown>;
        const snapshot = getSessionInitialAnalysisSnapshot(chartParams);
        if (snapshot.initialAnalysis?.content) {
          setBaziInitialAnalysis(snapshot.initialAnalysis.content);
          setKlineUnlocked(true);
        } else {
          const firstModelMsg = msgs.find(m => m.role === 'model');
          if (firstModelMsg) {
            const parsed = parseModelContent(firstModelMsg.content);
            setBaziInitialAnalysis(stripDisclaimer(parsed.answer));
            setKlineUnlocked(true);
          }
        }
      }

      if (data.modelType !== 'bazi') {
        setBaziInitialAnalysis('');
        setKlineUnlocked(false);
      }

      if (data.modelType === 'bazi' && effectiveChartData && msgs.length === 0) {
        const currentInitialAnalysis = matchedCase
          ? normalizeInitialAnalysisData(matchedCase.initialAnalysisData)
          : null;
        if (currentInitialAnalysis?.content) {
          setBaziInitialAnalysis(currentInitialAnalysis.content);
          setKlineUnlocked(true);
        }
      }

      setActiveCase(sessionProfessionalFeature ? null : matchedCase);
    } catch {
      // silently ignore
    }
  };

  const handleOpenRecordWorkspaceSession = (id: string) => {
    const session = savedSessions.find((item) => item.id === id);
    if (session) {
      if (session.modelType === 'chat') {
        setWorkspaceView('chat');
        setProfessionalSelectedProject(null);
        setProfessionalModalOpen(false);
        if (typeof window !== 'undefined' && window.location.pathname !== '/chat') {
          window.history.pushState(null, '', '/chat');
        }
        void handleLoadSession(id);
        return;
      }
      const nextModel = session.modelType as ModelType;
      setWorkspaceView('divination');
      setHasSelectedModel(true);
      setProfessionalSelectedProject(null);
      setProfessionalModalOpen(false);
      setModelType(nextModel);
      const nextRoute = MODEL_ROUTES[nextModel];
      if (nextRoute && typeof window !== 'undefined' && window.location.pathname !== nextRoute) {
        window.history.pushState(null, '', nextRoute);
      }
    }
    void handleLoadSession(id);
  };

  const handleLoadGuestCaseSession = (sessionId: string) => {
    const storedSession = readGuestCaseSessions().find((item) => item.id === sessionId);
    if (!storedSession) return;

    const detail = getGuestCaseDetail(storedSession.caseId);
    const sessionProfessionalFeature = getProfessionalFeature(storedSession.chartParams || {});
    const effectiveChartData = sessionProfessionalFeature
      ? storedSession.chartData
      : (detail?.chartData ?? storedSession.chartData);
    clearChatSession();
    setWorkspaceView('divination');
    setHasSelectedModel(true);
    const loadedModelType = sessionProfessionalFeature ? ModelType.BAZI : (storedSession.modelType as ModelType);
    setModelType(loadedModelType);
    const loadedRoute = MODEL_ROUTES[loadedModelType];
    if (loadedRoute && typeof window !== 'undefined' && window.location.pathname !== loadedRoute) {
      window.history.pushState(null, '', loadedRoute);
    }
    setChartData(effectiveChartData);
    setActiveChartParams(storedSession.chartParams || {});
    setActiveSessionId(storedSession.id);
    setActiveCase(sessionProfessionalFeature ? null : detail);
    setStep('chart');
    setError('');
    setCaseFormOpen(false);
    setEditingCaseId(null);
    setQuestion('');
    setSessionAnalysisModel(DEFAULT_ANALYSIS_MODEL);

    const msgs: ChatMessage[] = storedSession.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      knowledgeSources: Array.isArray(msg.knowledgeSources) ? msg.knowledgeSources : undefined,
    }));
    resetMessageVersions();
    setChatHistory(msgs);
    setMessageSourceMap(Object.fromEntries(
      msgs
        .filter((msg) => msg.knowledgeSources?.length)
        .map((msg) => [msg.id, msg.knowledgeSources as KnowledgeSourceSummary[]])
    ));
    setGuestFollowUpCount(storedSession.guestFollowUpCount || 0);
    pendingCaseSessionScrollRef.current = true;

    if (msgs.length > 0) {
      const restoreModelType =
        sessionProfessionalFeature
          ? ModelType.BAZI
          : (storedSession.modelType as ModelType);
      const systemInstruction = buildSystemInstruction(
        restoreModelType,
        effectiveChartData,
        storedSession.chartParams || {}
      );
      restoreChatSession(
        systemInstruction,
        msgs.map((msg) => ({ role: msg.role, content: msg.content }))
      );
    }

    if (storedSession.modelType === ModelType.BAZI) {
      const snapshot = getSessionInitialAnalysisSnapshot(storedSession.chartParams || {});
      if (snapshot.initialAnalysis?.content) {
        setBaziInitialAnalysis(snapshot.initialAnalysis.content);
        setKlineUnlocked(true);
      } else {
        const firstModelMsg = msgs.find((msg) => msg.role === 'model');
        if (firstModelMsg) {
          const parsed = parseModelContent(firstModelMsg.content);
          setBaziInitialAnalysis(stripDisclaimer(parsed.answer));
          setKlineUnlocked(true);
        }
      }
    } else {
      setBaziInitialAnalysis('');
      setKlineUnlocked(false);
    }

    if (storedSession.modelType === ModelType.BAZI && msgs.length === 0) {
      const currentInitialAnalysis = detail
        ? normalizeInitialAnalysisData(detail.initialAnalysisData)
        : null;
      if (currentInitialAnalysis?.content) {
        setBaziInitialAnalysis(currentInitialAnalysis.content);
        setKlineUnlocked(true);
      }
    }
  };

  const updateChatMessage = (id: string, content: string) => {
    setChatHistory(prev =>
      prev.map(msg => (msg.id === id ? { ...msg, content } : msg))
    );
  };

  const recordKnowledgeSources = (messageId: string, sources?: KnowledgeSourceSummary[]) => {
    if (!sources?.length) return;
    setMessageSourceMap((prev) => ({
      ...prev,
      [messageId]: sources,
    }));
    setChatHistory((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, knowledgeSources: sources } : msg))
    );
    setStandaloneChatMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, knowledgeSources: sources } : msg))
    );
  };

  const withKnowledgeSources = <T extends ChatMessage>(
    message: T,
    sources?: KnowledgeSourceSummary[]
  ): T => (sources?.length ? { ...message, knowledgeSources: sources } : message);

  const buildMessageVersionEntry = (messageId: string, content: string, timestamp?: Date): MessageVersionEntry => ({
    id: `${messageId}-${timestamp?.getTime() ?? Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content,
    createdAt: (timestamp ?? new Date()).toISOString(),
  });

  const resetMessageVersions = () => {
    setMessageVersionMap({});
    setOpenVersionMenuId(null);
  };

  const buildChartInfoLines = () => {
    if (!chartData) return [] as string[];
    const lines: string[] = [];

    if (modelType === ModelType.QIMEN) {
      const data = chartData as QimenResponse;
      lines.push(`公历：${data.gongli}`);
      lines.push(`农历：${data.nongli}`);
      const sizhuText = formatSizhuInfo(data.sizhu_info);
      if (sizhuText) lines.push(`四柱：${sizhuText}`);
      lines.push(`遁局：${data.dunju}`);
      lines.push(`旬首：${data.xunshou}`);
      if (data.zhifu_info?.zhifu_name) {
        lines.push(`值符：${data.zhifu_info.zhifu_name}（落宫：${data.zhifu_info.zhifu_luogong}）`);
      }
      if (data.zhifu_info?.zhishi_name) {
        lines.push(`值使：${data.zhifu_info.zhishi_name}（落宫：${data.zhifu_info.zhishi_luogong}）`);
      }
      return lines.filter(Boolean);
    }

    if (modelType === ModelType.BAZI) {
      const data = chartData as BaziResponse;
      lines.push(`公历：${data.base_info?.gongli ?? ''}`);
      lines.push(`农历：${data.base_info?.nongli ?? ''}`);
      if (data.bazi_info?.bazi?.length) {
        lines.push(`四柱：${data.bazi_info.bazi.join(' ')}`);
      }
      if (data.base_info?.qiyun) lines.push(`起运：${data.base_info.qiyun}`);
      if (data.base_info?.jiaoyun) lines.push(`交运：${data.base_info.jiaoyun}`);
      return lines.filter(Boolean);
    }

    if (modelType === ModelType.ZIWEI) {
      const data = chartData as ZiweiResponse;
      lines.push(`公历：${data.base_info?.gongli ?? ''}`);
      lines.push(`农历：${data.base_info?.nongli ?? ''}`);
      lines.push(`命宫：${data.base_info?.minggong ?? ''}`);
      lines.push(`身宫：${data.base_info?.shengong ?? ''}`);
      lines.push(`命局：${data.base_info?.mingju ?? ''}`);
      lines.push(`命主：${data.base_info?.mingzhu ?? ''}`);
      lines.push(`身主：${data.base_info?.shenzhu ?? ''}`);
      return lines.filter(Boolean);
    }

    if (modelType === ModelType.MEIHUA) {
      const data = chartData as MeihuaResponse;
      lines.push(`公历：${data.gongli}`);
      lines.push(`农历：${data.nongli}`);
      const sizhuText = formatSizhuInfo(data.sizhu_info);
      if (sizhuText) lines.push(`四柱：${sizhuText}`);
      if (data.gua_info?.bengua?.gua_name) lines.push(`本卦：${data.gua_info.bengua.gua_name}`);
      if (data.has_biangua) lines.push(`有变卦：${data.has_biangua}`);
      if (data.dongyao) lines.push(`动爻：${data.dongyao}`);
      return lines.filter(Boolean);
    }

    if (modelType === ModelType.LIUYAO) {
      const data = chartData as LiuyaoResponse;
      lines.push(`公历：${data.gongli}`);
      lines.push(`农历：${data.nongli}`);
      if (data.nianming) lines.push(`年命：${data.nianming}`);
      if (data.guashen) lines.push(`卦身：${data.guashen}`);
      if (data.kongwang) lines.push(`空亡：${data.kongwang}`);
      const sizhuText = formatSizhuInfo(data.sizhu_info);
      if (sizhuText) lines.push(`四柱：${sizhuText}`);
      if (data.gua_info?.bengua?.gua_name) lines.push(`本卦：${data.gua_info.bengua.gua_name}`);
      if (data.has_biangua) lines.push(`有变卦：${data.has_biangua}`);
      if (data.dongyao) lines.push(`动爻：${data.dongyao}`);
      return lines.filter(Boolean);
    }

    return lines;
  };

  const buildReportHtml = (chartMarkup = '', headAssetsHtml = '') => {
    const now = new Date();
    const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const modelLabel = modelType === ModelType.QIMEN ? '奇门排盘' :
      modelType === ModelType.BAZI ? '八字命盘' :
      modelType === ModelType.ZIWEI ? '紫微斗数' :
      modelType === ModelType.MEIHUA ? '梅花易数' : '六爻纳甲';
    const modelShortLabel = modelType === ModelType.QIMEN ? '奇门' :
      modelType === ModelType.BAZI ? '八字' :
      modelType === ModelType.ZIWEI ? '紫薇' :
      modelType === ModelType.MEIHUA ? '梅花' : '六爻';
    const reportName = `元分 · 智解_${name?.trim() || '匿名'}_${modelShortLabel}_${dateStamp}.pdf`;
    const chartInfoLines = buildChartInfoLines();

    const messagesHtml = chatHistory.map((msg, index) => {
      const parsed = msg.role === 'model' ? parseModelContent(msg.content) : null;
      const displayText = msg.role === 'model' && parsed ? parsed.answer : msg.content;
      const timeText = msg.timestamp ? new Date(msg.timestamp).toLocaleString('zh-CN', { hour12: false }) : '';
      const roleLabel = msg.role === 'user' ? '用户' : '大师';
      const contentHtml = renderMarkdownToHtml(displayText);

      return `
        <div class="msg ${msg.role}">
          <div class="msg-head">
            <div class="msg-role">${roleLabel}</div>
            <div class="msg-time">${escapeHtml(timeText)}</div>
          </div>
          <div class="msg-text">${contentHtml}</div>
          <div class="msg-index">#${index + 1}</div>
        </div>
      `;
    }).join('');

    const chartSnapshotHtml = chartMarkup
      ? `<div class="chart-section">
          <div class="chart-live">${chartMarkup}</div>
        </div>`
      : '';
    const chartInfoHtml = !chartMarkup && chartInfoLines.length
      ? `<div class="chart-info">
          <div class="chart-title">排盘信息</div>
          <div class="chart-lines">${chartInfoLines.map(line => `<div class="chart-line">${escapeHtml(line)}</div>`).join('')}</div>
        </div>`
      : '';

    return `
      <!doctype html>
      <html lang="zh-CN">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <base href="${escapeHtml(window.location.href)}" />
          <title>${escapeHtml(reportName)}</title>
          ${headAssetsHtml}
          <style>
            * { box-sizing: border-box; }
            html {
              background: #fff !important;
            }
            html::before,
            html::after,
            body::before,
            body::after {
              content: none !important;
              display: none !important;
              background: none !important;
              box-shadow: none !important;
            }
            body {
              margin: 0;
              font-family: "Songti SC", "Noto Serif SC", "STSong", serif;
              color: #1c1917;
              background: #f8f5ef !important;
              min-height: auto !important;
              position: static !important;
            }
            .page {
              padding: 32px 40px 56px;
              max-width: 900px;
              margin: 0 auto;
            }
            .header {
              background: linear-gradient(135deg, #1c1917 0%, #292524 100%);
              color: #fef3c7;
              padding: 20px 24px;
              border-radius: 16px;
            }
            .title {
              font-size: 24px;
              font-weight: 700;
              letter-spacing: 1px;
            }
            .subtitle {
              margin-top: 6px;
              font-size: 12px;
              opacity: 0.8;
            }
            .chart-info {
              margin-top: 14px;
              padding: 14px 16px;
              background: #fff;
              border-radius: 14px;
              border: 1px solid #e7e5e4;
            }
            .chart-section {
              margin-top: 14px;
              break-inside: auto;
              page-break-inside: auto;
            }
            .chart-live {
              overflow: visible;
              break-inside: auto;
              page-break-inside: auto;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .chart-live [data-report-ignore="true"] {
              display: none !important;
            }
            .chart-live button {
              pointer-events: none !important;
            }
            .chart-live * {
              animation: none !important;
              transition: none !important;
              text-shadow: none !important;
            }
            .chart-live .glass-panel,
            .chart-live .glass-panel-soft,
            .chart-live .glass-input,
            .chart-live .glass-chip,
            .chart-live .glass-banner {
              background: #fff !important;
              border-color: #e7e5e4 !important;
              box-shadow: none !important;
              backdrop-filter: none !important;
              -webkit-backdrop-filter: none !important;
            }
            .chart-live .glass-panel-dark,
            .chart-live .glass-cta,
            .chart-live .glass-topbar {
              background: linear-gradient(135deg, #1c1917 0%, #292524 100%) !important;
              color: #fef3c7 !important;
              border-color: rgba(245, 158, 11, 0.35) !important;
              box-shadow: none !important;
              backdrop-filter: none !important;
              -webkit-backdrop-filter: none !important;
            }
            .chart-live .glass-chat-bg,
            .chart-live .glass-scrollbar,
            .chart-live [class*="overflow-hidden"],
            .chart-live [class*="overflow-x-auto"],
            .chart-live [class*="overflow-y-auto"],
            .chart-live [class*="backdrop-blur"] {
              overflow: visible !important;
              backdrop-filter: none !important;
              -webkit-backdrop-filter: none !important;
            }
            .chart-live [class*="max-w-"] {
              max-width: none !important;
            }
            .chart-live [class*="shadow-"] {
              box-shadow: none !important;
            }
            .chart-live > * {
              margin-left: 0 !important;
              margin-right: 0 !important;
            }
            .chart-title {
              font-weight: 700;
              font-size: 13px;
              color: #44403c;
              margin-bottom: 8px;
            }
            .chart-lines {
              display: grid;
              gap: 6px;
              font-size: 13px;
              color: #57534e;
            }
            .chart-line {
              padding-bottom: 6px;
              border-bottom: 1px dashed #e7e5e4;
            }
            .chart-line:last-child {
              border-bottom: none;
              padding-bottom: 0;
            }
            .content {
              margin-top: 20px;
            }
            .content > .msg + .msg {
              margin-top: 16px;
            }
            .msg {
              background: #fff;
              border-radius: 16px;
              padding: 16px 18px;
              border: 1px solid #e7e5e4;
              position: relative;
              break-inside: auto;
              page-break-inside: auto;
            }
            .msg.user {
              border-color: #f3d7a1;
              background: #fffaf0;
              color: #44403c;
              break-inside: auto;
              page-break-inside: auto;
            }
            .msg.user .msg-time,
            .msg.user .msg-index {
              color: #b45309;
            }
            .msg-head {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              margin-bottom: 8px;
              color: #78716c;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .msg-role {
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .msg-text {
              font-size: 14px;
              line-height: 1.65;
              color: inherit;
            }
            .msg-text p {
              margin: 0 0 10px;
              break-inside: auto;
              page-break-inside: auto;
            }
            .msg-text p:last-child {
              margin-bottom: 0;
            }
            .msg-text ul,
            .msg-text ol {
              margin: 0 0 10px 18px;
              padding: 0;
              break-inside: auto;
              page-break-inside: auto;
            }
            .msg-text li {
              margin-bottom: 6px;
            }
            .msg-text blockquote {
              margin: 0 0 10px;
              padding: 8px 12px;
              border-left: 3px solid #f59e0b;
              background: #fffbeb;
              color: #92400e;
              break-inside: auto;
              page-break-inside: auto;
            }
            .msg-text code {
              background: #f5f5f4;
              border-radius: 6px;
              padding: 2px 6px;
              font-size: 12px;
              font-family: "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            }
            .msg-text .code-block {
              margin: 0 0 12px;
              padding: 12px;
              border-radius: 10px;
              background: #0f172a;
              color: #e2e8f0;
              overflow-x: auto;
            }
            .msg-text .code-block code {
              background: transparent;
              padding: 0;
              color: inherit;
              font-size: 12px;
            }
            .msg-text h1,
            .msg-text h2,
            .msg-text h3,
            .msg-text h4,
            .msg-text h5,
            .msg-text h6 {
              margin: 8px 0;
              font-weight: 700;
            }
            .msg-text a {
              color: #b45309;
              text-decoration: underline;
            }
            .msg-divider {
              margin: 12px 0;
              border: 0;
              border-top: 1px dashed #d6d3d1;
            }
            .msg.user .msg-role {
              color: #92400e;
            }
            .msg.user .msg-text,
            .msg.user .msg-text p,
            .msg.user .msg-text li,
            .msg.user .msg-text strong,
            .msg.user .msg-text code {
              color: #44403c;
            }
            .gap {
              height: 4px;
            }
            .msg-reasoning {
              margin-bottom: 10px;
              padding: 10px 12px;
              border-radius: 12px;
              background: rgba(251, 191, 36, 0.15);
              border: 1px solid rgba(251, 191, 36, 0.4);
              color: #92400e;
              font-size: 12px;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .tag {
              font-weight: 700;
              margin-bottom: 6px;
            }
            .msg-index {
              position: absolute;
              right: 16px;
              bottom: 12px;
              font-size: 11px;
              color: #a8a29e;
            }
            .footer {
              margin-top: 24px;
              font-size: 12px;
              color: #78716c;
              text-align: center;
            }
            @media print {
              body { background: #fff; }
              .page { padding: 0; max-width: none; }
              .header { border-radius: 0; }
              .chart-section,
              .chart-info,
              .content {
                margin-top: 12px;
              }
              .chart-section {
                break-inside: auto;
                page-break-inside: auto;
              }
              .chart-live,
              .chart-live > * {
                break-inside: auto;
                page-break-inside: auto;
              }
              .msg {
                break-inside: auto;
                page-break-inside: auto;
              }
              .msg.user {
                break-inside: auto;
                page-break-inside: auto;
              }
              .msg-index {
                margin-top: 10px;
                position: static;
                display: block;
                text-align: right;
              }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="title">解读报告</div>
            </div>
            ${chartSnapshotHtml}
            ${chartInfoHtml}
            <div class="content">${messagesHtml}</div>
            <div class="footer">${escapeHtml(DISCLAIMER_TEXT)}</div>
          </div>
        </body>
      </html>
    `;
  };

  const handleGenerateReport = async () => {
    if (!chatHistory.length || isGeneratingReport) return;
    setIsGeneratingReport(true);

    try {
      let chartMarkup = '';
      let headAssetsHtml = '';
      if (reportChartRef.current) {
        try {
          chartMarkup = buildReportChartMarkup(reportChartRef.current);
          headAssetsHtml = buildReportHeadAssets();
        } catch (chartBuildError) {
          console.error('Failed to build live chart markup for report:', chartBuildError);
        }
      }

      const reportHtml = buildReportHtml(chartMarkup, headAssetsHtml);
      const frame = document.createElement('iframe');
      frame.style.position = 'fixed';
      frame.style.right = '0';
      frame.style.bottom = '0';
      frame.style.width = '0';
      frame.style.height = '0';
      frame.style.border = '0';
      frame.style.opacity = '0';
      frame.setAttribute('aria-hidden', 'true');
      document.body.appendChild(frame);

      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        window.setTimeout(() => {
          frame.remove();
          setIsGeneratingReport(false);
        }, 1000);
      };

      frame.onload = () => {
        try {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
        } finally {
          cleanup();
        }
      };

      window.setTimeout(() => {
        cleanup();
      }, 4000);

      const iframe = frame as HTMLIFrameElement & { srcdoc?: string };
      if (typeof iframe.srcdoc !== 'undefined') {
        iframe.srcdoc = reportHtml;
      } else {
        const win = iframe.contentWindow;
        if (win) {
          win.document.open();
          win.document.write(reportHtml);
          win.document.close();
        } else {
          cleanup();
        }
      }
    } catch (reportError) {
      console.error('Failed to generate report:', reportError);
      setIsGeneratingReport(false);
    }
  };

  const knowledgeBoardMap: Partial<Record<ModelType, string>> = {
    [ModelType.QIMEN]: 'qimen',
    [ModelType.BAZI]: 'bazi',
    [ModelType.ZIWEI]: 'ziweidoushu',
    [ModelType.MEIHUA]: 'meihua',
    [ModelType.LIUYAO]: 'liuyao',
  };

  const clearViewState = useCallback((options?: { clearInputs?: boolean }) => {
    const clearInputs = options?.clearInputs !== false;
    setStep('input');
    setChartData(null);
    setChatHistory([]);
    setMessageSourceMap({});
    resetMessageVersions();
    clearChatSession();
    setError('');
    if (clearInputs) {
      setQuestion('');
      setBirthYear('');
      setName('');
      setCustomDate('');
      setProvince('');
      setCity('');
      setLiuyaoMode(LiuyaoMode.AUTO);
      setManualLines([1, 0, 1, 0, 1, 0]);
      setManualMovingLines([false, false, false, false, false, false]);
      setLyNum('');
      setLyNumUp('');
      setLyNumDown('');
      setQimenProEnabled(false);
      setQimenJuModel(0);
    }
    setBaziInitialAnalysis('');
    setKlineUnlocked(false);
    setKlineModalOpen(false);
    setKlineStatus('idle');
    setKlineResult(null);
    setKlineError('');
    setKlineSelected(null);
    setKlineZoom(1);
    setKlineProgress(0);
    setKlineYearProgress(0);
    klineYearProgressRef.current = 0;
    setKlinePos(null);
    setActiveSessionId(null);
    setActiveChartParams({});
    setSessionAnalysisModel(null);
    setActiveCase(null);
    setCaseFormOpen(false);
    setEditingCaseId(null);
    setShowInitialAnalysisModal(false);
    setKnowledgeHint(null);
  }, []);

  useEffect(() => {
    const syncModelFromPath = () => {
      if (typeof window === 'undefined') return;
      const routedSettingsTab = ROUTE_SETTINGS_TABS[window.location.pathname];
      if (routedSettingsTab) {
        setWorkspaceView('settings');
        setSettingsWorkspaceTab(routedSettingsTab);
        setProfessionalSelectedProject(null);
        setProfessionalModalOpen(false);
        return;
      }
      const routedWorkspace = ROUTE_WORKSPACES[window.location.pathname];
      if (routedWorkspace === 'settings') {
        setWorkspaceView('settings');
        setSettingsWorkspaceTab('profile');
        setProfessionalSelectedProject(null);
        setProfessionalModalOpen(false);
        return;
      }
      if (routedWorkspace && routedWorkspace !== workspaceView) {
        setWorkspaceView(routedWorkspace);
        setProfessionalSelectedProject(null);
        setProfessionalModalOpen(false);
        return;
      }
      const routedModel = ROUTE_MODELS[window.location.pathname];
      if (routedModel && routedModel !== modelType) {
        setWorkspaceView('divination');
        setHasSelectedModel(true);
        setProfessionalSelectedProject(null);
        setProfessionalModalOpen(false);
        setModelType(routedModel);
        autoFortuneChartKeyRef.current = '';
        clearViewState();
        if (![ModelType.QIMEN, ModelType.BAZI].includes(routedModel)) {
          setUseKnowledge(false);
        }
        setTimeMode(routedModel === ModelType.BAZI || routedModel === ModelType.ZIWEI ? 'custom' : 'now');
      }
    };

    window.addEventListener('popstate', syncModelFromPath);
    return () => window.removeEventListener('popstate', syncModelFromPath);
  }, [clearViewState, modelType, workspaceView]);

  // --- Reset when model changes ---
  const handleModelChange = (type: ModelType) => {
    setWorkspaceView('divination');
    setHasSelectedModel(true);
    setProfessionalSelectedProject(null);
    setProfessionalModalOpen(false);
    setModelType(type);
    const nextRoute = MODEL_ROUTES[type];
    if (nextRoute && typeof window !== 'undefined' && window.location.pathname !== nextRoute) {
      window.history.pushState(null, '', nextRoute);
    }
    autoFortuneChartKeyRef.current = '';
    clearViewState();
    if (![ModelType.QIMEN, ModelType.BAZI].includes(type)) {
      setUseKnowledge(false);
    }
    // Set default time mode: Life reading (Bazi/Ziwei) usually requires custom birth time
    if (type === ModelType.BAZI || type === ModelType.ZIWEI) {
      setTimeMode('custom');
    } else {
      setTimeMode('now');
    }
  };

  const navigateWorkspace = (view: Exclude<WorkspaceView, 'divination'>) => {
    setWorkspaceView(view);
    if (view === 'settings') {
      setSettingsWorkspaceTab('profile');
    }
    setProfessionalSelectedProject(null);
    setProfessionalModalOpen(false);
    const nextRoute = WORKSPACE_ROUTES[view];
    if (nextRoute && typeof window !== 'undefined' && window.location.pathname !== nextRoute) {
      window.history.pushState(null, '', nextRoute);
    }
  };

  const handleSettingsWorkspaceTabChange = (tab: SettingsWorkspaceTab) => {
    setSettingsWorkspaceTab(tab);
    const nextRoute = SETTINGS_TAB_ROUTES[tab];
    if (typeof window !== 'undefined' && window.location.pathname !== nextRoute) {
      window.history.pushState(null, '', nextRoute);
    }
  };

  const handleReset = () => {
    clearViewState();
  };

  const handleAddStandaloneCaseReference = () => {
    const nextId = standaloneCaseSelectValue;
    if (!nextId) return;
    setStandaloneSelectedCaseIds((current) => {
      if (current.includes(nextId)) return current;
      return [...current, nextId].slice(-4);
    });
    setStandaloneCaseSelectValue('');
  };

  const handleRemoveStandaloneCaseReference = (caseId: string) => {
    setStandaloneSelectedCaseIds((current) => current.filter((id) => id !== caseId));
  };

  const handleStandaloneChatSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const content = standaloneChatInput.trim();
    if (!content || standaloneChatLoading) return;
    if (requireLoginIfGuestModeDisabled()) return;
    setStandaloneChatError('');
    setStandaloneChatInput('');
    const userMsg: ChatMessage = {
      id: `standalone-u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    const nextMessages = [...standaloneChatMessages, userMsg];
    setStandaloneChatMessages(nextMessages);
    setStandaloneChatLoading(true);
    try {
      const selectedCases = standaloneSelectedCaseIds
        .map((id) => standaloneCaseOptions.find((item) => item.id === id))
        .filter((item): item is CaseItem => Boolean(item));
      const caseReferenceText = buildStandaloneCaseReferenceText(selectedCases);
      const apiMessages = [
        {
          role: 'system',
          content: [
            '你是专业、克制、清晰的命理分析助手。回答时先说明依据，再给出可执行建议。不要展示内部推理过程。',
            caseReferenceText,
          ].filter(Boolean).join('\n\n'),
        },
        ...nextMessages.map((msg) => ({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: msg.content,
        })),
      ];
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          model: analysisModel,
          temperature: 0.7,
          knowledge: standaloneChatUseKnowledge
            ? {
                enabled: true,
                board: standaloneChatKnowledgeBoard,
                query: content,
                topK: 5,
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '发送失败');
      }
      const modelSources = Array.isArray(data.knowledgeSources) ? data.knowledgeSources : undefined;
      const modelMsg: ChatMessage = withKnowledgeSources({
        id: `standalone-m-${Date.now()}`,
        role: 'model',
        content: data.content || '暂无回复',
        timestamp: new Date(),
      }, modelSources);
      setStandaloneChatMessages((prev) => [...prev, modelMsg]);
      recordKnowledgeSources(modelMsg.id, modelSources);
      if (isLoggedIn) {
        let targetSessionId = standaloneSessionId;
        if (!targetSessionId) {
          targetSessionId = await saveSessionToDb(
            'chat',
            `聊天 - ${content.slice(0, 20)}`,
            {
              sourceCaseIds: selectedCases.map((item) => item.id),
              knowledgeBoard: standaloneChatUseKnowledge ? standaloneChatKnowledgeBoard : '',
            },
            {
              type: 'standalone_chat',
              sourceCases: selectedCases.map((item) => ({
                id: item.id,
                title: getCaseDisplayName(item),
                modelType: item.modelType,
              })),
            }
          );
          setStandaloneSessionId(targetSessionId);
        }
        await saveMessagesToDb(targetSessionId, [
          { role: 'user', content },
          { role: 'model', content: modelMsg.content, knowledgeSources: modelMsg.knowledgeSources },
        ]);
        fetchSessions();
      }
      if (data.knowledgeFailed) {
        setStandaloneChatError(`知识库检索失败，本次回答未使用参考资料：${data.knowledgeFailed}`);
      }
      await fetchUserProfile();
    } catch (err) {
      setStandaloneChatError(err instanceof Error ? err.message : '发送失败，请稍后再试');
      setStandaloneChatInput(content);
    } finally {
      setStandaloneChatLoading(false);
    }
  };

  const handleDeleteGuestSession = useCallback((id: string) => {
    const nextSessions = readGuestCaseSessions().filter((item) => item.id !== id);
    writeGuestCaseSessions(nextSessions);

    setActiveCase((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sessions: prev.sessions.filter((session) => session.id !== id),
      };
    });

    if (activeSessionId === id) {
      setActiveSessionId(null);
      clearViewState();
    }
  }, [activeSessionId, clearViewState, readGuestCaseSessions, writeGuestCaseSessions]);

  const handleDeleteCaseSessionEntry = useCallback((id: string) => {
    if (isLoggedIn) {
      void handleDeleteSession(id);
      return;
    }
    handleDeleteGuestSession(id);
  }, [handleDeleteGuestSession, isLoggedIn]);

  useEffect(() => {
    if (supportsKnowledge) {
      setUseKnowledge(true);
    }
  }, [supportsKnowledge, modelType]);

  const beginCaseCreate = () => {
    setEditingCaseId(null);
    setCaseFormOpen(true);
    resetCaseFormInputs();
    setError('');
    requestSectionScroll('case-form');
  };

  const beginCaseEdit = () => {
    if (!activeCase) return;
    setEditingCaseId(activeCase.id);
    setCaseFormOpen(true);
    applyCaseChartParamsToForm(activeCase.chartParams);
    setError('');
    setStep('input');
    requestSectionScroll('case-form');
  };

  const refreshGuestActiveCase = useCallback((caseId: string) => {
    const detail = getGuestCaseDetail(caseId);
    setActiveCase(detail);
    if (detail) {
      setChartData(detail.chartData);
    }
  }, [getGuestCaseDetail]);

  const resetProfessionalComposer = useCallback(() => {
    setProfessionalSelectedProject(null);
    setProfessionalMode('existing');
    setProfessionalSelectedCaseId(null);
    setProfessionalResultSummary('');
    setProfessionalName('');
    setProfessionalGender(0);
    setProfessionalCustomDate('');
    setProfessionalProvince('');
    setProfessionalCity('');
    setCompatPersonA(createProfessionalPersonComposer());
    setCompatPersonB(createProfessionalPersonComposer());
    setCompatRelationDrafts([{ labelAToB: '', labelBToA: '' }]);
    setPendingCompatibilityData(null);
    setCompatRelationModalOpen(false);
  }, []);

  const syncProfessionalCaseOption = useCallback((nextCase: CaseItem) => {
    setProfessionalCaseOptions((current) => {
      const merged = [nextCase, ...current.filter((item) => item.id !== nextCase.id)];
      return merged.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
    if (nextCase.modelType === modelType) {
      setCaseItems((current) => {
        const merged = [nextCase, ...current.filter((item) => item.id !== nextCase.id)];
        return merged.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      });
    }
  }, [modelType]);

  const fetchProfessionalCaseOptions = useCallback(async () => {
    setProfessionalCasesLoading(true);
    try {
      if (isLoggedIn) {
        const [baziRes, ziweiRes] = await Promise.all([
          fetch('/api/cases?modelType=bazi'),
          fetch('/api/cases?modelType=ziwei'),
        ]);
        const [baziData, ziweiData] = await Promise.all([
          baziRes.ok ? baziRes.json() : [],
          ziweiRes.ok ? ziweiRes.json() : [],
        ]);
        setProfessionalCaseOptions([...(baziData as CaseItem[]), ...(ziweiData as CaseItem[])]);
        return;
      }

      const allGuestCases = readGuestCases().filter((item) => isCaseModelType(item.modelType));
      setProfessionalCaseOptions(allGuestCases);
    } finally {
      setProfessionalCasesLoading(false);
    }
  }, [isLoggedIn, readGuestCases]);

  useEffect(() => {
    if (!professionalSelectedProject) return;
    void fetchProfessionalCaseOptions();
  }, [fetchProfessionalCaseOptions, professionalSelectedProject]);

  const buildProfessionalBirthChartParams = useCallback(() => {
    if (!professionalCustomDate) return null;
    const date = new Date(professionalCustomDate);
    return {
      name: professionalName || '',
      sex: professionalGender,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hours: date.getHours(),
      minute: date.getMinutes(),
      province: professionalProvince || '',
      city: professionalCity || '',
    } as BaseParams;
  }, [professionalCity, professionalCustomDate, professionalGender, professionalName, professionalProvince]);

  const buildCompatBirthChartParams = useCallback((person: ProfessionalPersonComposer) => {
    if (!person.customDate) return null;
    const date = new Date(person.customDate);
    return {
      name: person.name || '',
      sex: person.gender,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hours: date.getHours(),
      minute: date.getMinutes(),
      province: person.province || '',
      city: person.city || '',
    } as BaseParams;
  }, []);

  const toFullBaseParams = useCallback((chartParams: ReturnType<typeof normalizeCaseChartParams>) => {
    if (
      chartParams.sex === undefined ||
      chartParams.year === undefined ||
      chartParams.month === undefined ||
      chartParams.day === undefined ||
      chartParams.hours === undefined ||
      chartParams.minute === undefined
    ) {
      return null;
    }

    return {
      name: chartParams.name,
      sex: chartParams.sex,
      year: chartParams.year,
      month: chartParams.month,
      day: chartParams.day,
      hours: chartParams.hours,
      minute: chartParams.minute,
      province: chartParams.province,
      city: chartParams.city,
      specialTags: chartParams.specialTags,
    } satisfies BaseParams;
  }, []);

  const persistProfessionalCase = useCallback(async (
    type: CaseModelType,
    chartParams: Record<string, unknown>,
    chartData: unknown,
    existingCase?: CaseItem | CaseDetail | null
  ): Promise<CaseDetail | null> => {
    const nextChartParams = appendCaseSpecialTag(chartParams, JOINT_CASE_TAG);

    if (isLoggedIn) {
      const detail = existingCase
        ? await updateCaseInDb(
            existingCase.id,
            type,
            nextChartParams,
            chartData,
            existingCase.klineData,
            existingCase.initialAnalysisData
          )
        : await createCaseInDb(type, nextChartParams, chartData);
      if (detail) {
        syncProfessionalCaseOption(detail);
        if (activeCase?.id === detail.id) {
          setActiveCase(detail);
        }
      }
      return detail;
    }

    const nowIso = new Date().toISOString();
    const nextCase: CaseItem = existingCase
      ? {
          id: existingCase.id,
          modelType: type,
          title: buildCaseTitle(type, nextChartParams, existingCase.title),
          chartParams: nextChartParams,
          chartData,
          klineData: existingCase.klineData,
          initialAnalysisData: existingCase.initialAnalysisData,
          createdAt: existingCase.createdAt,
          updatedAt: nowIso,
        }
      : {
          id: `guest-case-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          modelType: type,
          title: buildCaseTitle(type, nextChartParams),
          chartParams: nextChartParams,
          chartData,
          klineData: null,
          initialAnalysisData: null,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

    saveGuestCase(nextCase);
    syncProfessionalCaseOption(nextCase);
    return getGuestCaseDetail(nextCase.id);
  }, [activeCase?.id, createCaseInDb, getGuestCaseDetail, isLoggedIn, saveGuestCase, syncProfessionalCaseOption, updateCaseInDb]);

  const persistProfessionalPlainCase = useCallback(async (
    type: CaseModelType,
    chartParams: Record<string, unknown>,
    chartData: unknown,
    existingCase?: CaseItem | CaseDetail | null
  ): Promise<CaseDetail | null> => {
    if (isLoggedIn) {
      const detail = existingCase
        ? await updateCaseInDb(
            existingCase.id,
            type,
            chartParams,
            chartData,
            existingCase.klineData,
            existingCase.initialAnalysisData
          )
        : await createCaseInDb(type, chartParams, chartData);
      if (detail) {
        syncProfessionalCaseOption(detail);
        if (activeCase?.id === detail.id) {
          setActiveCase(detail);
        }
      }
      return detail;
    }

    const nowIso = new Date().toISOString();
    const nextCase: CaseItem = existingCase
      ? {
          id: existingCase.id,
          modelType: type,
          title: buildCaseTitle(type, chartParams, existingCase.title),
          chartParams,
          chartData,
          klineData: existingCase.klineData,
          initialAnalysisData: existingCase.initialAnalysisData,
          createdAt: existingCase.createdAt,
          updatedAt: nowIso,
        }
      : {
          id: `guest-case-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          modelType: type,
          title: buildCaseTitle(type, chartParams),
          chartParams,
          chartData,
          klineData: null,
          initialAnalysisData: null,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

    saveGuestCase(nextCase);
    syncProfessionalCaseOption(nextCase);
    return getGuestCaseDetail(nextCase.id);
  }, [activeCase?.id, createCaseInDb, getGuestCaseDetail, isLoggedIn, saveGuestCase, syncProfessionalCaseOption, updateCaseInDb]);

  const findProfessionalMatchingCase = useCallback((
    targetType: CaseModelType,
    chartParams: Record<string, unknown>
  ) => {
    return professionalCaseOptions.find(
      (item) => item.modelType === targetType && isSameCaseChartIdentity(item.chartParams, chartParams)
    ) || null;
  }, [professionalCaseOptions]);

  const fetchLoggedCaseDetail = useCallback(async (caseId: string) => {
    const res = await fetch(`/api/cases/${caseId}`);
    if (!res.ok) return null;
    return await res.json() as CaseDetail;
  }, []);

  const buildJointSummaryTitle = useCallback((chartParams: Record<string, unknown>) => {
    const fullTitle = buildCaseTitle(ModelType.BAZI, chartParams);
    return fullTitle.replace(/^八字命例\s*·\s*/, '') || '联合命盘';
  }, []);

  const runJointProfessionalSession = useCallback(async (
    jointData: JointChartData,
    sourceChartParams: Record<string, unknown>
  ) => {
    const sessionChartParams = {
      ...sourceChartParams,
      professionalFeature: PROFESSIONAL_FEATURE_JOINT,
      sourceModelType: ModelType.BAZI,
      jointChartData: jointData,
      question: '',
      analysisModel,
    };
    const systemInstruction = buildJointAnalysisSystemInstruction(jointData);
    const prompt = buildJointAnalysisPrompt(jointData);
    const userContent = buildJointInitialUserContent(jointData);
    const sessionTitle = `联合分析 · ${jointData.summaryTitle}`;

    setHasSelectedModel(true);
    setModelType(ModelType.BAZI);
    setStep('chart');
    setChartData(jointData);
    setActiveChartParams(sessionChartParams);
    setSessionAnalysisModel(analysisModel);
    setActiveCase(null);
    setQuestion('');
    setError('');
    setKnowledgeHint(null);
    setLoading(true);
    setIsTyping(true);
    setProfessionalModalOpen(false);
    resetMessageVersions();
    clearChatSession();
    setChatHistory([]);

    try {
      let currentSessionId: string | null = null;

      if (isLoggedIn) {
        currentSessionId = await saveSessionToDb(
          JOINT_BAZI_ZIWEI_SESSION_TYPE,
          sessionTitle,
          sessionChartParams,
          jointData,
          jointData.baziCaseId ?? null
        );
      } else {
        const nowIso = new Date().toISOString();
        const guestSession: GuestStoredSession = {
          id: `guest-case-session-${Date.now()}`,
          caseId: jointData.baziCaseId || jointData.ziweiCaseId || `joint-${Date.now()}`,
          modelType: JOINT_BAZI_ZIWEI_SESSION_TYPE,
          title: sessionTitle,
          chartParams: sessionChartParams,
          chartData: jointData,
          messages: [],
          guestFollowUpCount: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        saveGuestCaseSession(guestSession);
        currentSessionId = guestSession.id;
      }

      if (currentSessionId) {
        setActiveSessionId(currentSessionId);
      }

      await startQimenChat(systemInstruction);

      const userMsg: ChatMessage = {
        id: 'joint-init-u',
        role: 'user',
        content: userContent,
        timestamp: new Date(),
      };
      const modelId = 'joint-init-m';
      setChatHistory([
        userMsg,
        { id: modelId, role: 'model', content: '', timestamp: new Date() },
      ]);
      requestSectionScroll('chat');

      const finalState = await sendMessageToDeepseekStream(
        prompt,
        (state) => {
          updateChatMessage(modelId, buildModelContent(state.reasoning, state.content));
        },
        undefined,
        analysisModel
      );

      const finalAnswer = appendDisclaimer(finalState.content);
      const finalContent = buildModelContent(finalState.reasoning, finalAnswer);
      const finalMessages: ChatMessage[] = [
        userMsg,
        withKnowledgeSources({
          id: modelId,
          role: 'model',
          content: finalContent,
          timestamp: new Date(),
        }, finalState.knowledgeSources),
      ];

      setChatHistory(finalMessages);
      setProfessionalResultSummary(stripDisclaimer(finalState.content).slice(0, 120));

      if (isLoggedIn) {
        await saveMessagesToDb(currentSessionId, [
          { role: 'user', content: userContent },
          { role: 'model', content: finalContent },
        ]);
        fetchSessions();
        fetchUserProfile();
      } else if (currentSessionId) {
        updateGuestCaseSessionMessages(currentSessionId, finalMessages, 0);
      }
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  }, [analysisModel, fetchSessions, fetchUserProfile, isLoggedIn, requestSectionScroll, saveGuestCaseSession, saveSessionToDb, updateGuestCaseSessionMessages]);

  const handleRunJointProfessionalFromExisting = useCallback(async () => {
    if (requireLoginIfGuestModeDisabled()) return;
    if (!professionalSelectedCaseId) {
      setError('请先选择一个已有命例');
      return;
    }

    const selectedCase = professionalCaseOptions.find((item) => item.id === professionalSelectedCaseId);
    if (!selectedCase) {
      setError('未找到所选命例');
      return;
    }

    setProfessionalBusy(true);
    setError('');

    try {
      const sourceDetail = isLoggedIn
        ? await fetchLoggedCaseDetail(selectedCase.id)
        : getGuestCaseDetail(selectedCase.id);
      if (!sourceDetail) {
        throw new Error('命例读取失败，请稍后重试');
      }

      const sourceParams = normalizeCaseChartParams(sourceDetail.chartParams);
      const sourceBaseParams = toFullBaseParams(sourceParams);
      if (!sourceBaseParams) {
        throw new Error('命例出生信息不完整，无法进行联合分析');
      }
      const sourceCase = await persistProfessionalCase(
        sourceDetail.modelType,
        sourceParams,
        sourceDetail.chartData,
        sourceDetail
      );
      if (!sourceCase) {
        throw new Error('命例标签更新失败，请稍后重试');
      }

      const counterpartType =
        sourceCase.modelType === ModelType.BAZI ? ModelType.ZIWEI : ModelType.BAZI;
      const existingCounterpart = findProfessionalMatchingCase(counterpartType, sourceParams);
      const counterpartChartData = existingCounterpart
        ? existingCounterpart.chartData
        : counterpartType === ModelType.BAZI
          ? await fetchBazi(sourceBaseParams)
          : await fetchZiwei(sourceBaseParams);
      const counterpartCase = await persistProfessionalCase(
        counterpartType,
        sourceParams,
        counterpartChartData,
        existingCounterpart
      );
      if (!counterpartCase) {
        throw new Error('另一套命盘保存失败，请稍后重试');
      }

      const jointData: JointChartData = {
        feature: PROFESSIONAL_FEATURE_JOINT,
        summaryTitle: buildJointSummaryTitle(sourceParams),
        baziCaseId: sourceCase.modelType === ModelType.BAZI ? sourceCase.id : counterpartCase.id,
        ziweiCaseId: sourceCase.modelType === ModelType.ZIWEI ? sourceCase.id : counterpartCase.id,
        baziChartData: (sourceCase.modelType === ModelType.BAZI ? sourceCase.chartData : counterpartCase.chartData) as BaziResponse,
        ziweiChartData: (sourceCase.modelType === ModelType.ZIWEI ? sourceCase.chartData : counterpartCase.chartData) as ZiweiResponse,
      };

      await runJointProfessionalSession(jointData, sourceParams);
    } catch (err: any) {
      setError(err?.message || '联合分析启动失败，请稍后重试');
    } finally {
      setProfessionalBusy(false);
    }
  }, [buildJointSummaryTitle, fetchLoggedCaseDetail, findProfessionalMatchingCase, getGuestCaseDetail, isLoggedIn, persistProfessionalCase, professionalCaseOptions, professionalSelectedCaseId, requireLoginIfGuestModeDisabled, runJointProfessionalSession]);

  const handleRunJointProfessionalFromNew = useCallback(async () => {
    if (requireLoginIfGuestModeDisabled()) return;
    const sourceParams = buildProfessionalBirthChartParams();
    if (!sourceParams) {
      setError('请选择出生日期');
      return;
    }

    setProfessionalBusy(true);
    setError('');

    try {
      const sourceChartParams = sourceParams as unknown as Record<string, unknown>;
      const [baziChartData, ziweiChartData] = await Promise.all([
        fetchBazi(sourceParams),
        fetchZiwei(sourceParams),
      ]);

      const [baziCase, ziweiCase] = await Promise.all([
        persistProfessionalCase(
          ModelType.BAZI,
          sourceChartParams,
          baziChartData,
          findProfessionalMatchingCase(ModelType.BAZI, sourceChartParams)
        ),
        persistProfessionalCase(
          ModelType.ZIWEI,
          sourceChartParams,
          ziweiChartData,
          findProfessionalMatchingCase(ModelType.ZIWEI, sourceChartParams)
        ),
      ]);

      if (!baziCase || !ziweiCase) {
        throw new Error('联合命例保存失败，请稍后重试');
      }

      const jointData: JointChartData = {
        feature: PROFESSIONAL_FEATURE_JOINT,
        summaryTitle: buildJointSummaryTitle(sourceChartParams),
        baziCaseId: baziCase.id,
        ziweiCaseId: ziweiCase.id,
        baziChartData,
        ziweiChartData,
      };

      await runJointProfessionalSession(jointData, sourceChartParams);
    } catch (err: any) {
      setError(err?.message || '联合分析启动失败，请稍后重试');
    } finally {
      setProfessionalBusy(false);
    }
  }, [buildJointSummaryTitle, buildProfessionalBirthChartParams, findProfessionalMatchingCase, persistProfessionalCase, requireLoginIfGuestModeDisabled, runJointProfessionalSession]);

  const buildBaziCompatibilitySummaryTitle = useCallback((leftTitle: string, rightTitle: string) => {
    return `${leftTitle} × ${rightTitle}`;
  }, []);

  const runBaziCompatibilitySession = useCallback(async (
    compatData: BaziCompatibilityChartData
  ) => {
    const sessionChartParams = {
      professionalFeature: PROFESSIONAL_FEATURE_BAZI_COMPAT,
      sourceModelType: ModelType.BAZI,
      compatibilityChartData: compatData,
      question: '',
      analysisModel,
    };
    const systemInstruction = buildBaziCompatibilitySystemInstruction(compatData);
    const prompt = buildBaziCompatibilityAnalysisPrompt(compatData);
    const userContent = buildBaziCompatibilityInitialUserContent(compatData);
    const sessionTitle = `合盘分析 · ${compatData.summaryTitle}`;

    setHasSelectedModel(true);
    setModelType(ModelType.BAZI);
    setStep('chart');
    setChartData(compatData);
    setActiveChartParams(sessionChartParams);
    setSessionAnalysisModel(analysisModel);
    setActiveCase(null);
    setQuestion('');
    setError('');
    setKnowledgeHint(null);
    setLoading(true);
    setIsTyping(true);
    setProfessionalModalOpen(false);
    setCompatRelationModalOpen(false);
    resetMessageVersions();
    clearChatSession();
    setChatHistory([]);

    try {
      let currentSessionId: string | null = null;

      if (isLoggedIn) {
        currentSessionId = await saveSessionToDb(
          BAZI_COMPATIBILITY_SESSION_TYPE,
          sessionTitle,
          sessionChartParams,
          compatData,
          compatData.caseAId ?? null
        );
      } else {
        const nowIso = new Date().toISOString();
        const guestSession: GuestStoredSession = {
          id: `guest-case-session-${Date.now()}`,
          caseId: compatData.caseAId || compatData.caseBId || `compat-${Date.now()}`,
          modelType: BAZI_COMPATIBILITY_SESSION_TYPE,
          title: sessionTitle,
          chartParams: sessionChartParams,
          chartData: compatData,
          messages: [],
          guestFollowUpCount: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        saveGuestCaseSession(guestSession);
        currentSessionId = guestSession.id;
      }

      if (currentSessionId) {
        setActiveSessionId(currentSessionId);
      }

      await startQimenChat(systemInstruction);

      const userMsg: ChatMessage = {
        id: 'compat-init-u',
        role: 'user',
        content: userContent,
        timestamp: new Date(),
      };
      const modelId = 'compat-init-m';
      setChatHistory([
        userMsg,
        { id: modelId, role: 'model', content: '', timestamp: new Date() },
      ]);
      requestSectionScroll('chat');

      const finalState = await sendMessageToDeepseekStream(
        prompt,
        (state) => {
          updateChatMessage(modelId, buildModelContent(state.reasoning, state.content));
        },
        undefined,
        analysisModel
      );

      const finalAnswer = appendDisclaimer(finalState.content);
      const finalContent = buildModelContent(finalState.reasoning, finalAnswer);
      const finalMessages: ChatMessage[] = [
        userMsg,
        {
          id: modelId,
          role: 'model',
          content: finalContent,
          timestamp: new Date(),
        },
      ];

      setChatHistory(finalMessages);
      setProfessionalResultSummary(stripDisclaimer(finalState.content).slice(0, 120));

      if (isLoggedIn) {
        await saveMessagesToDb(currentSessionId, [
          { role: 'user', content: userContent },
          { role: 'model', content: finalContent },
        ]);
        fetchSessions();
        fetchUserProfile();
      } else if (currentSessionId) {
        updateGuestCaseSessionMessages(currentSessionId, finalMessages, 0);
      }
    } finally {
      setLoading(false);
      setIsTyping(false);
      setPendingCompatibilityData(null);
      setCompatRelationDrafts([{ labelAToB: '', labelBToA: '' }]);
    }
  }, [analysisModel, fetchSessions, fetchUserProfile, isLoggedIn, requestSectionScroll, saveGuestCaseSession, saveSessionToDb, updateGuestCaseSessionMessages]);

  const handleRunBaziCompatibilityProfessional = useCallback(async () => {
    if (requireLoginIfGuestModeDisabled()) return;
    setProfessionalBusy(true);
    setError('');

    try {
      const resolvePersonCase = async (person: ProfessionalPersonComposer, personLabel: '甲' | '乙') => {
        if (person.mode === 'existing') {
          if (!person.selectedCaseId) {
            throw new Error(`请先为${personLabel}选择一个已有命例`);
          }
          const selectedCase = professionalCaseOptions.find((item) => item.id === person.selectedCaseId && item.modelType === ModelType.BAZI);
          if (!selectedCase) {
            throw new Error(`未找到${personLabel}所选命例`);
          }
          const detail = isLoggedIn
            ? await fetchLoggedCaseDetail(selectedCase.id)
            : getGuestCaseDetail(selectedCase.id);
          if (!detail || detail.modelType !== ModelType.BAZI) {
            throw new Error(`${personLabel}命例读取失败，请稍后重试`);
          }
          return detail;
        }

        const sourceParams = buildCompatBirthChartParams(person);
        if (!sourceParams) {
          throw new Error(`请为${personLabel}选择出生日期`);
        }
        const chartParams = sourceParams as unknown as Record<string, unknown>;
        const chartData = await fetchBazi(sourceParams);
        const existingCase = findProfessionalMatchingCase(ModelType.BAZI, chartParams);
        const detail = await persistProfessionalPlainCase(
          ModelType.BAZI,
          chartParams,
          chartData,
          existingCase
        );
        if (!detail) {
          throw new Error(`${personLabel}命例保存失败，请稍后重试`);
        }
        return detail;
      };

      const [caseA, caseB] = await Promise.all([
        resolvePersonCase(compatPersonA, '甲'),
        resolvePersonCase(compatPersonB, '乙'),
      ]);

      if (caseA.id === caseB.id) {
        throw new Error('合盘需要选择两个不同的命例');
      }

      const personAName = getCaseDisplayName(caseA);
      const personBName = getCaseDisplayName(caseB);

      const existingRelations = isLoggedIn
        ? await fetchCaseRelationsForPairInDb(caseA.id, caseB.id)
        : readGuestCaseRelations().filter((item) => {
            return (
              (item.caseAId === caseA.id && item.caseBId === caseB.id) ||
              (item.caseAId === caseB.id && item.caseBId === caseA.id)
            );
          });

      const drafts = mapPairRelationsToDrafts(existingRelations, caseA.id, caseB.id);

      setCompatRelationDrafts(drafts.length > 0 ? drafts : [{ labelAToB: '', labelBToA: '' }]);
      setPendingCompatibilityData({
        feature: PROFESSIONAL_FEATURE_BAZI_COMPAT,
        summaryTitle: buildBaziCompatibilitySummaryTitle(personAName, personBName),
        caseAId: caseA.id,
        caseBId: caseB.id,
        personAName,
        personBName,
        personAChartData: caseA.chartData as BaziResponse,
        personBChartData: caseB.chartData as BaziResponse,
        relations: drafts,
      });
      setCompatRelationModalOpen(true);
    } catch (err: any) {
      setError(err?.message || '八字合盘启动失败，请稍后重试');
    } finally {
      setProfessionalBusy(false);
    }
  }, [buildBaziCompatibilitySummaryTitle, buildCompatBirthChartParams, compatPersonA, compatPersonB, fetchCaseRelationsForPairInDb, fetchLoggedCaseDetail, findProfessionalMatchingCase, getGuestCaseDetail, isLoggedIn, persistProfessionalPlainCase, professionalCaseOptions, readGuestCaseRelations, requireLoginIfGuestModeDisabled]);

  const handleConfirmCompatibilityRelations = useCallback(async (skip: boolean) => {
    if (!pendingCompatibilityData || !pendingCompatibilityData.caseAId || !pendingCompatibilityData.caseBId) return;

    const normalizedDrafts = compatRelationDrafts
      .map((item) => ({
        id: item.id,
        labelAToB: item.labelAToB.trim(),
        labelBToA: item.labelBToA.trim(),
      }))
      .filter((item) => item.labelAToB || item.labelBToA);
    const hasExistingRelations = compatRelationDrafts.some((item) => item.id || item.labelAToB.trim() || item.labelBToA.trim());

    let finalRelations = skip ? (hasExistingRelations ? normalizedDrafts : []) : normalizedDrafts;

    if (!skip && isLoggedIn) {
      await saveCaseRelationsInDb(
        pendingCompatibilityData.caseAId,
        pendingCompatibilityData.caseBId,
        normalizedDrafts
      );
      if (activeCase && (activeCase.id === pendingCompatibilityData.caseAId || activeCase.id === pendingCompatibilityData.caseBId)) {
        const detail = await fetchLoggedCaseDetail(activeCase.id);
        if (detail) setActiveCase(detail);
      }
    } else if (!skip) {
      upsertGuestCaseRelations(
        { id: pendingCompatibilityData.caseAId, title: pendingCompatibilityData.personAName },
        { id: pendingCompatibilityData.caseBId, title: pendingCompatibilityData.personBName },
        normalizedDrafts
      );
      if (activeCase && (activeCase.id === pendingCompatibilityData.caseAId || activeCase.id === pendingCompatibilityData.caseBId)) {
        refreshGuestActiveCase(activeCase.id);
      }
    }

    await runBaziCompatibilitySession({
      ...pendingCompatibilityData,
      relations: finalRelations,
    });
  }, [activeCase, compatRelationDrafts, fetchLoggedCaseDetail, isLoggedIn, pendingCompatibilityData, refreshGuestActiveCase, runBaziCompatibilitySession, saveCaseRelationsInDb, upsertGuestCaseRelations]);

  const handleDeleteCase = async () => {
    if (!activeCase) return;

    if (isLoggedIn) {
      const ok = await deleteCaseInDb(activeCase.id);
      if (!ok) {
        setError('删除命例失败，请稍后重试');
        return;
      }
      await hydrateCasesForModel(activeCase.modelType);
      fetchSessions();
    } else {
      deleteGuestCase(activeCase.id);
    }

    setActiveCase(null);
    setActiveSessionId(null);
    setChartData(null);
    setChatHistory([]);
    setQuestion('');
    clearChatSession();
    setGuestFollowUpCount(0);
    localStorage.setItem('guestFollowUpCount', '0');
    setStep('input');
  };

  const beginCaseEditFromLibrary = async (caseId: string) => {
    const detail = isLoggedIn ? await fetchLoggedCaseDetail(caseId) : getGuestCaseDetail(caseId);
    if (!detail) {
      setError('命例读取失败，请稍后重试');
      return;
    }
    setHasSelectedModel(true);
    setModelType(detail.modelType);
    setActiveCase(detail);
    setChartData(detail.chartData);
    setActiveChartParams((detail.chartParams || {}) as Record<string, unknown>);
    setEditingCaseId(detail.id);
    setCaseFormOpen(true);
    applyCaseChartParamsToForm(detail.chartParams);
    setError('');
    setStep('input');
    requestSectionScroll('case-form');
  };

  const handleDeleteCaseFromLibrary = async (caseId: string) => {
    if (isLoggedIn) {
      const ok = await deleteCaseInDb(caseId);
      if (!ok) {
        setError('删除命例失败，请稍后重试');
        return;
      }
      await hydrateCasesForModel(modelType);
      fetchSessions();
    } else {
      deleteGuestCase(caseId);
    }

    if (activeCase?.id === caseId) {
      setActiveCase(null);
      setActiveSessionId(null);
      setChartData(null);
      setChatHistory([]);
      setQuestion('');
      clearChatSession();
      setStep('input');
    }
  };

  const openCaseRelationEditor = useCallback((relationId: string) => {
    if (!activeCase?.relations) return;
    const relation = activeCase.relations.find((item) => item.id === relationId);
    if (!relation) return;
    setSelectedCaseRelationId(relationId);
    setEditingCaseRelationId(relationId);
    setCaseRelationEditDraft({
      id: relation.id,
      labelAToB: relation.labelAToB?.trim() || '',
      labelBToA: relation.labelBToA?.trim() || '',
    });
  }, [activeCase]);

  const handleDeleteCaseRelation = useCallback(async (relationId: string) => {
    if (!activeCase) return;

    const finishRefresh = async () => {
      setSelectedCaseRelationId(null);
      setEditingCaseRelationId(null);
      setCaseRelationEditDraft({ labelAToB: '', labelBToA: '' });
      if (isLoggedIn) {
        const detail = await fetchLoggedCaseDetail(activeCase.id);
        if (detail) setActiveCase(detail);
      } else {
        refreshGuestActiveCase(activeCase.id);
      }
    };

    if (isLoggedIn) {
      const ok = await deleteCaseRelationInDb(relationId);
      if (!ok) {
        setError('删除关系标签失败，请稍后重试');
        return;
      }
      await finishRefresh();
      return;
    }

    deleteGuestCaseRelation(relationId);
    await finishRefresh();
  }, [activeCase, deleteGuestCaseRelation, fetchLoggedCaseDetail, isLoggedIn, refreshGuestActiveCase]);

  const handleSaveCaseRelationEdit = useCallback(async () => {
    if (!activeCase || !editingCaseRelationId) return;

    const nextDraft = {
      labelAToB: caseRelationEditDraft.labelAToB.trim(),
      labelBToA: caseRelationEditDraft.labelBToA.trim(),
    };

    if (!nextDraft.labelAToB && !nextDraft.labelBToA) {
      await handleDeleteCaseRelation(editingCaseRelationId);
      return;
    }

    if (isLoggedIn) {
      const updated = await updateCaseRelationInDb(editingCaseRelationId, nextDraft);
      if (!updated) {
        setError('修改关系标签失败，请稍后重试');
        return;
      }
      const detail = await fetchLoggedCaseDetail(activeCase.id);
      if (detail) setActiveCase(detail);
    } else {
      updateGuestCaseRelation(editingCaseRelationId, nextDraft);
      refreshGuestActiveCase(activeCase.id);
    }

    setEditingCaseRelationId(null);
    setSelectedCaseRelationId(null);
    setCaseRelationEditDraft({ labelAToB: '', labelBToA: '' });
  }, [activeCase, caseRelationEditDraft, editingCaseRelationId, fetchLoggedCaseDetail, handleDeleteCaseRelation, isLoggedIn, refreshGuestActiveCase, updateGuestCaseRelation]);

  const handleSaveCase = async () => {
    if (!isCaseModelType(modelType)) return;
    if (requireLoginIfGuestModeDisabled()) return;
    if (lifeCalendarType === 'pillars') {
      if (!lifePillars.year || !lifePillars.month || !lifePillars.day || !lifePillars.hour) {
        setError('请填写完整四柱');
        return;
      }
    } else if (!lifeYear || !lifeMonth || !lifeDay) {
      setError('请选择出生日期');
      return;
    }

    try {
      const lifePlaceText = buildBirthPlaceText(province, city, district);
      const lifeCoord = findPlaceCoord(district, city, province);
      const lifeUsesTrueSolar = lifeCalendarType !== 'pillars' && lifeTimeInputMode === 'exact' && lifeUseTrueSolar && Boolean(lifeCoord);
      const chartParams = {
        name: name || '',
        sex: gender,
        year: lifeYear,
        month: lifeMonth,
        day: lifeDay,
        hours: lifeHour,
        minute: lifeMinute,
        province: province || '',
        city: city || '',
        district: district || '',
        birthPlace: lifePlaceText,
        longitude: lifeUsesTrueSolar ? lifeCoord?.lng : undefined,
        latitude: lifeUsesTrueSolar ? lifeCoord?.lat : undefined,
        useTrueSolar: lifeUsesTrueSolar,
        timeInputMode: lifeTimeInputMode,
        calendarType: lifeCalendarType,
        isLeapMonth: lifeIsLeapMonth,
        pillars: lifeCalendarType === 'pillars' ? lifePillars : undefined,
      };
      const shouldReuseExistingChart = Boolean(
        editingCaseId &&
        activeCase &&
        activeCase.chartData &&
        isSameCaseChartIdentity(activeCase.chartParams, chartParams)
      );

      setCaseBusy(true);
      setLoading(true);
      setError('');

      const chartResponse = shouldReuseExistingChart
        ? activeCase!.chartData
        : modelType === ModelType.BAZI
          ? await fetchBazi(chartParams)
          : await fetchZiwei(chartParams);

      const nowIso = new Date().toISOString();

      if (isLoggedIn) {
        const detail = editingCaseId
          ? await updateCaseInDb(
              editingCaseId,
              modelType,
              chartParams,
              chartResponse,
              shouldReuseExistingChart ? activeCase?.klineData : null,
              shouldReuseExistingChart ? activeCase?.initialAnalysisData : null
            )
          : await createCaseInDb(modelType, chartParams, chartResponse);
        if (!detail) {
          throw new Error('保存命例失败');
        }

        await hydrateCasesForModel(modelType);
        setActiveCase(detail);
      } else {
        const caseId = editingCaseId || `guest-case-${Date.now()}`;
        if (editingCaseId && !shouldReuseExistingChart) {
          clearGuestCaseSessions(caseId);
        }
        const nextCase: CaseItem = {
          id: caseId,
          modelType,
          title: buildCaseTitle(modelType, chartParams),
          chartParams,
          chartData: chartResponse,
          klineData: shouldReuseExistingChart ? activeCase?.klineData : null,
          initialAnalysisData: shouldReuseExistingChart ? activeCase?.initialAnalysisData : null,
          createdAt: editingCaseId && activeCase ? activeCase.createdAt : nowIso,
          updatedAt: nowIso,
        };
        saveGuestCase(nextCase);
        refreshGuestActiveCase(caseId);
        if (shouldReuseExistingChart) {
          const currentGuestSession = readGuestCaseSessions().find((item) => item.caseId === caseId);
          const nextFollowUpCount = currentGuestSession?.guestFollowUpCount || 0;
          setGuestFollowUpCount(nextFollowUpCount);
          localStorage.setItem('guestFollowUpCount', String(nextFollowUpCount));
        } else {
          setGuestFollowUpCount(0);
          localStorage.setItem('guestFollowUpCount', '0');
        }
      }

      setChartData(chartResponse);
      setActiveChartParams(chartParams);
      setSessionAnalysisModel(null);
      setChatHistory([]);
      setActiveSessionId(null);
      setQuestion('');
      clearChatSession();
      setStep('chart');
      setCaseFormOpen(false);
      setEditingCaseId(null);
      setKnowledgeHint(null);
      requestSectionScroll('report');
    } catch (err: any) {
      setError(err.message || '排盘失败，请稍后重试');
    } finally {
      setLoading(false);
      setCaseBusy(false);
    }
  };

  const buildInitialAnalysisDataPayload = (
    content: string
  ): InitialAnalysisData => ({
    content: content.trim(),
    model: DEFAULT_ANALYSIS_MODEL,
    generatedAt: new Date().toISOString(),
  });

  const persistInitialAnalysisToCase = async (
    targetCase: CaseDetail,
    initialAnalysisData: InitialAnalysisData | null
  ) => {
    if (isLoggedIn) {
      const detail = await saveCaseInitialAnalysisInDb(targetCase.id, initialAnalysisData);
      if (detail) {
        await hydrateCasesForModel(targetCase.modelType);
        setActiveCase(detail);
        return detail;
      }
      return targetCase;
    }

    const nextCase: CaseItem = {
      id: targetCase.id,
      modelType: targetCase.modelType,
      title: targetCase.title,
      chartParams: targetCase.chartParams,
      chartData: targetCase.chartData,
      klineData: targetCase.klineData,
      initialAnalysisData,
      createdAt: targetCase.createdAt,
      updatedAt: new Date().toISOString(),
    };
    saveGuestCase(nextCase);
    const detail = getGuestCaseDetail(targetCase.id);
    if (detail) {
      setActiveCase(detail);
      return detail;
    }
    return {
      ...targetCase,
      initialAnalysisData,
      updatedAt: nextCase.updatedAt,
    };
  };

  const resolveStoredCaseInitialAnalysis = async (targetCase: CaseDetail) => {
    const currentInitialAnalysis = normalizeInitialAnalysisData(targetCase.initialAnalysisData);
    if (currentInitialAnalysis) {
      return { initialAnalysis: currentInitialAnalysis, caseDetail: targetCase };
    }

    if (isLoggedIn) {
      try {
        const detailRes = await fetch(`/api/cases/${targetCase.id}`);
        if (detailRes.ok) {
          const detail = await detailRes.json() as CaseDetail;
          const syncedInitialAnalysis = normalizeInitialAnalysisData(detail.initialAnalysisData);
          if (syncedInitialAnalysis) {
            setActiveCase(detail);
            return { initialAnalysis: syncedInitialAnalysis, caseDetail: detail };
          }
        }
      } catch {
        // silently ignore
      }
      return { initialAnalysis: null, caseDetail: targetCase };
    }

    const guestSessions = readGuestCaseSessions()
      .filter((item) => item.caseId === targetCase.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    for (const session of guestSessions) {
      const derived = deriveInitialAnalysisFromSession(
        session.chartParams,
        session.messages,
        session.updatedAt
      );
      if (!derived) continue;

      const nextCase: CaseItem = {
        id: targetCase.id,
        modelType: targetCase.modelType,
        title: targetCase.title,
        chartParams: targetCase.chartParams,
        chartData: targetCase.chartData,
        klineData: targetCase.klineData,
        initialAnalysisData: derived,
        createdAt: targetCase.createdAt,
        updatedAt: targetCase.updatedAt,
      };
      saveGuestCase(nextCase);
      const detail = getGuestCaseDetail(targetCase.id);
      if (detail) {
        setActiveCase(detail);
        return { initialAnalysis: derived, caseDetail: detail };
      }
      return {
        initialAnalysis: derived,
        caseDetail: {
          ...targetCase,
          initialAnalysisData: derived,
        },
      };
    }

    return { initialAnalysis: null, caseDetail: targetCase };
  };

  const openCaseInitialAnalysisSession = async (
    targetCase: CaseDetail,
    initialAnalysis: InitialAnalysisData
  ) => {
    const chartParams = (targetCase.chartParams || {}) as Record<string, unknown>;
    const sessionChartParams = {
      ...chartParams,
      question: '',
      analysisModel: DEFAULT_ANALYSIS_MODEL,
      ...buildCaseInitialAnalysisSnapshot(initialAnalysis, true),
    };
    const userContent = buildInitialUserContent(targetCase.modelType, chartParams, '');
    const userMsg: ChatMessage = {
      id: 'init-u',
      role: 'user',
      content: userContent,
      timestamp: new Date(),
    };
    const modelMsg: ChatMessage = {
      id: 'init-m',
      role: 'model',
      content: buildModelContent('', appendDisclaimer(initialAnalysis.content)),
      timestamp: new Date(),
    };

    clearChatSession();
    resetMessageVersions();
    setChatHistory([userMsg, modelMsg]);
    setChartData(targetCase.chartData);
    setActiveChartParams(sessionChartParams);
    setSessionAnalysisModel(DEFAULT_ANALYSIS_MODEL);
    setQuestion('');
    setKnowledgeHint(null);
    setStep('chart');
    setShowInitialAnalysisModal(false);
    requestSectionScroll('chat');

    const systemInstruction = buildSystemInstruction(
      targetCase.modelType,
      targetCase.chartData,
      sessionChartParams
    );
    restoreChatSession(systemInstruction, [
      { role: userMsg.role, content: userMsg.content },
      { role: modelMsg.role, content: modelMsg.content },
    ]);

    const sessionTitle = buildCaseSessionTitle(targetCase.modelType, targetCase.title, '');

    if (isLoggedIn) {
      const sessionId = await saveSessionToDb(
        targetCase.modelType,
        sessionTitle,
        sessionChartParams,
        targetCase.chartData,
        targetCase.id
      );
      if (sessionId) {
        setActiveSessionId(sessionId);
        await saveMessagesToDb(sessionId, [
          { role: 'user', content: userMsg.content },
          { role: 'model', content: modelMsg.content },
        ]);
      }
      fetchSessions();
      fetchUserProfile();
      try {
        const detailRes = await fetch(`/api/cases/${targetCase.id}`);
        if (detailRes.ok) {
          const detail = await detailRes.json();
          setActiveCase(detail);
        }
      } catch {
        // silently ignore
      }
      return;
    }

    const nowIso = new Date().toISOString();
    const guestSession: GuestStoredSession = {
      id: `guest-case-session-${Date.now()}`,
      caseId: targetCase.id,
      modelType: targetCase.modelType,
      title: sessionTitle,
      chartParams: sessionChartParams,
      chartData: targetCase.chartData,
      messages: [
        {
          id: userMsg.id,
          role: userMsg.role,
          content: userMsg.content,
          timestamp: userMsg.timestamp.toISOString(),
        },
        {
          id: modelMsg.id,
          role: modelMsg.role,
          content: modelMsg.content,
          timestamp: modelMsg.timestamp.toISOString(),
        },
      ],
      guestFollowUpCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    saveGuestCaseSession(guestSession);
    setActiveSessionId(guestSession.id);
    setGuestFollowUpCount(0);
    localStorage.setItem('guestFollowUpCount', '0');
    refreshGuestActiveCase(targetCase.id);
  };

  const generateCaseInitialAnalysis = async (
    targetCase: CaseDetail,
    options?: { displaySession?: boolean }
  ) => {
    const displaySession = options?.displaySession === true;
    const chartParams = (targetCase.chartParams || {}) as Record<string, unknown>;
    const { prompt, systemInstruction, knowledgeQuery } = buildLifeReadingAnalysisBundle(
      targetCase.modelType,
      targetCase.chartData as BaziResponse & ZiweiResponse,
      ''
    );
    const userContent = buildInitialUserContent(targetCase.modelType, chartParams, '');

    setLoading(true);
    setError('');
    setKnowledgeHint(null);
    setInitialAnalysisBusy(true);
    if (displaySession) {
      setIsTyping(true);
      clearChatSession();
      resetMessageVersions();
      setChatHistory([]);
      setActiveSessionId(null);
      setChartData(targetCase.chartData);
      setStep('chart');
      setQuestion('');
    }

    try {
      await startQimenChat(systemInstruction);

      const userMsg: ChatMessage = {
        id: 'init-u',
        role: 'user',
        content: userContent,
        timestamp: new Date(),
      };
      const modelId = 'init-m';

      if (displaySession) {
        setChatHistory([
          userMsg,
          { id: modelId, role: 'model', content: '', timestamp: new Date() },
        ]);
        requestSectionScroll('chat');
      }

      const knowledge = useKnowledge && supportsKnowledge
        ? {
            enabled: true,
            board: knowledgeBoardMap[targetCase.modelType] || 'bazi',
            query: knowledgeQuery,
          }
        : undefined;

      const finalState = await sendMessageToDeepseekStream(
        prompt,
        (state) => {
          if (displaySession) {
            updateChatMessage(modelId, buildModelContent(state.reasoning, state.content));
          }
        },
        knowledge,
        analysisModel
      );

      if (finalState.knowledgeFailed) {
        setKnowledgeHint(finalState.knowledgeFailed);
      }
      recordKnowledgeSources(modelId, finalState.knowledgeSources);

      const cleanContent = stripDisclaimer(finalState.content);
      const initialAnalysis = buildInitialAnalysisDataPayload(cleanContent);
      const finalAnswer = appendDisclaimer(finalState.content);
      const finalContent = buildModelContent(finalState.reasoning, finalAnswer);
      const finalMessages: ChatMessage[] = [
        userMsg,
        {
          id: modelId,
          role: 'model',
          content: finalContent,
          timestamp: new Date(),
        },
      ];

      const updatedCase = await persistInitialAnalysisToCase(targetCase, initialAnalysis);

      if (displaySession) {
        setChatHistory(finalMessages);
        setActiveChartParams({
          ...chartParams,
          question: '',
          analysisModel,
          ...buildCaseInitialAnalysisSnapshot(initialAnalysis, true),
        });
        setSessionAnalysisModel(analysisModel);
      }

      if (targetCase.modelType === ModelType.BAZI) {
        setBaziInitialAnalysis(initialAnalysis.content);
        setKlineUnlocked(true);
      }

      if (displaySession) {
        await openCaseInitialAnalysisSession(updatedCase, initialAnalysis);
      }

      return { initialAnalysis, caseDetail: updatedCase };
    } catch (err: any) {
      setError(err.message || '初始化分析失败，请稍后重试');
      return { initialAnalysis: null, caseDetail: targetCase };
    } finally {
      setLoading(false);
      setIsTyping(false);
      setInitialAnalysisBusy(false);
    }
  };

  const ensureCaseInitialAnalysis = async (
    targetCase: CaseDetail,
    options?: { displaySession?: boolean; forceRegenerate?: boolean }
  ) => {
    const displaySession = options?.displaySession === true;
    const forceRegenerate = options?.forceRegenerate === true;

    if (!forceRegenerate) {
      const resolved = await resolveStoredCaseInitialAnalysis(targetCase);
      if (resolved.initialAnalysis) {
        if (displaySession) {
          await openCaseInitialAnalysisSession(resolved.caseDetail, resolved.initialAnalysis);
        }
        return resolved;
      }
    }

    return await generateCaseInitialAnalysis(targetCase, { displaySession });
  };

  const runCaseQuestionSession = async (
    targetCase: CaseDetail,
    questionText: string,
    baseAnalysis: InitialAnalysisData
  ) => {
    const trimmedQuestion = questionText.trim();
    setLoading(true);
    setIsTyping(true);
    setError('');
    setKnowledgeHint(null);
    clearChatSession();
    resetMessageVersions();
    setChatHistory([]);
    setActiveSessionId(null);
    setChartData(targetCase.chartData);
    setStep('chart');

    if (!isLoggedIn) {
      setGuestFollowUpCount(0);
      localStorage.setItem('guestFollowUpCount', '0');
    }

    const chartParams = (targetCase.chartParams || {}) as Record<string, unknown>;
    const sessionChartParams = {
      ...chartParams,
      question: trimmedQuestion,
      analysisModel,
      ...buildCaseInitialAnalysisSnapshot(baseAnalysis, false),
    };
    const { prompt, systemInstruction: rawSystemInstruction, knowledgeQuery } = buildLifeReadingAnalysisBundle(
      targetCase.modelType,
      targetCase.chartData as BaziResponse & ZiweiResponse,
      trimmedQuestion
    );
    const systemInstruction = appendInitialAnalysisContext(rawSystemInstruction, baseAnalysis.content);
    const userContent = buildInitialUserContent(targetCase.modelType, chartParams, trimmedQuestion);
    const sessionTitle = buildCaseSessionTitle(targetCase.modelType, targetCase.title, trimmedQuestion);

    try {
      let currentSessionId: string | null = null;

      if (isLoggedIn) {
        currentSessionId = await saveSessionToDb(
          targetCase.modelType,
          sessionTitle,
          sessionChartParams,
          targetCase.chartData,
          targetCase.id
        );
      } else {
        const nowIso = new Date().toISOString();
        const guestSession: GuestStoredSession = {
          id: `guest-case-session-${Date.now()}`,
          caseId: targetCase.id,
          modelType: targetCase.modelType,
          title: sessionTitle,
          chartParams: sessionChartParams,
          chartData: targetCase.chartData,
          messages: [],
          guestFollowUpCount: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        saveGuestCaseSession(guestSession);
        currentSessionId = guestSession.id;
        refreshGuestActiveCase(targetCase.id);
      }

      if (currentSessionId) {
        setActiveSessionId(currentSessionId);
      }
      setActiveChartParams(sessionChartParams);
      setSessionAnalysisModel(analysisModel);

      await startQimenChat(systemInstruction);

      const userMsg: ChatMessage = {
        id: 'init-u',
        role: 'user',
        content: userContent,
        timestamp: new Date(),
      };
      const modelId = 'init-m';
      setChatHistory([
        userMsg,
        { id: modelId, role: 'model', content: '', timestamp: new Date() },
      ]);
      requestSectionScroll('chat');

      const knowledge = useKnowledge && supportsKnowledge
        ? {
            enabled: true,
            board: knowledgeBoardMap[targetCase.modelType] || 'bazi',
            query: knowledgeQuery || trimmedQuestion,
          }
        : undefined;

      const finalState = await sendMessageToDeepseekStream(
        prompt,
        (state) => {
          updateChatMessage(modelId, buildModelContent(state.reasoning, state.content));
        },
        knowledge,
        analysisModel
      );

      if (finalState.knowledgeFailed) {
        setKnowledgeHint(finalState.knowledgeFailed);
      }
      recordKnowledgeSources(modelId, finalState.knowledgeSources);

      const finalAnswer = appendDisclaimer(finalState.content);
      const finalContent = buildModelContent(finalState.reasoning, finalAnswer);
      const finalModelMessage: ChatMessage = withKnowledgeSources({
        id: modelId,
        role: 'model',
        content: finalContent,
        timestamp: new Date(),
      }, finalState.knowledgeSources);
      const finalMessages = [userMsg, finalModelMessage];
      setChatHistory(finalMessages);

      if (targetCase.modelType === ModelType.BAZI) {
        setBaziInitialAnalysis(baseAnalysis.content);
        setKlineUnlocked(true);
      }

      if (isLoggedIn) {
        await saveMessagesToDb(currentSessionId, [
          { role: 'user', content: userContent },
          { role: 'model', content: finalContent, knowledgeSources: finalState.knowledgeSources },
        ]);
        fetchSessions();
        const detailRes = await fetch(`/api/cases/${targetCase.id}`);
        if (detailRes.ok) {
          const detail = await detailRes.json();
          setActiveCase(detail);
        }
        fetchUserProfile();
      } else if (currentSessionId) {
        updateGuestCaseSessionMessages(currentSessionId, finalMessages, 0);
        refreshGuestActiveCase(targetCase.id);
      }

      setQuestion('');
      return stripDisclaimer(finalState.content);
    } catch (err: any) {
      setError(err.message || '分析失败，请稍后重试');
      return '';
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const resolveKlineInitializationAnalysis = async (targetCase: CaseDetail) => {
    const result = await ensureCaseInitialAnalysis(targetCase, { displaySession: false });
    return result.initialAnalysis?.content ?? '';
  };

  const handleStartCaseAnalysis = async () => {
    if (!activeCase || !isCaseModelType(activeCase.modelType)) return;
    if (requireLoginIfGuestModeDisabled()) return;
    if (isLoggedIn && userQuota !== null && userQuota <= 0) {
      setError('您的提问额度已用完');
      return;
    }

    const existingGuestSession = !isLoggedIn
      ? readGuestCaseSessions().find((item) => item.caseId === activeCase.id)
      : null;

    if (!isLoggedIn && existingGuestSession) {
      handleLoadGuestCaseSession(existingGuestSession.id);
      requestSectionScroll('chat');
      const nextQuestion = question.trim();
      setQuestion('');
      if (!nextQuestion) return;
      if ((existingGuestSession.guestFollowUpCount || 0) >= 1) {
        setShowAuth(true);
        return;
      }
      await sendFollowUpMessage(nextQuestion, {
        bypassGuestLimit: true,
        sessionIdOverride: existingGuestSession.id,
        caseIdOverride: activeCase.id,
        guestFollowUpCountOverride: existingGuestSession.guestFollowUpCount || 0,
      });
      return;
    }

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      await ensureCaseInitialAnalysis(activeCase, { displaySession: true });
      return;
    }

    const baselineResult = await ensureCaseInitialAnalysis(activeCase, { displaySession: false });
    if (!baselineResult.initialAnalysis) return;
    await runCaseQuestionSession(
      baselineResult.caseDetail ?? activeCase,
      trimmedQuestion,
      baselineResult.initialAnalysis
    );
  };

  const handleRegenerateCaseInitialAnalysis = async () => {
    if (!activeCase || !isCaseModelType(activeCase.modelType)) return;
    if (isLoggedIn && userQuota !== null && userQuota <= 0) {
      setError('您的提问额度已用完');
      return;
    }

    const result = await ensureCaseInitialAnalysis(activeCase, {
      displaySession: false,
      forceRegenerate: true,
    });
    if (!result.initialAnalysis) return;

    if (activeCase.modelType === ModelType.BAZI) {
      setBaziInitialAnalysis(result.initialAnalysis.content);
      setKlineUnlocked(true);
    }

    setShowInitialAnalysisModal(true);
  };

  const handleCalculate = async (options?: { targetDate?: Date }) => {
    if (requireLoginIfGuestModeDisabled()) return;

    // Validation
    const isDivination = [
      ModelType.QIMEN,
      ModelType.MEIHUA,
      ModelType.LIUYAO,
      ModelType.DALIUREN,
      ModelType.TAIYI,
      ModelType.XIAOLIUREN,
    ].includes(modelType);
    const isFortuneReading = modelType === ModelType.DAILY_FORTUNE || modelType === ModelType.MONTHLY_FORTUNE;
    
    if (isDivination && !question.trim()) {
      setError("请输入您的问题");
      return;
    }
    if (isFortuneReading && !fortuneCaseId) {
      setError("请先选择一个八字命例。没有命例时，请先在四柱八字中新增命例。");
      return;
    }
    if ((modelType === ModelType.BAZI || modelType === ModelType.ZIWEI) && lifeCalendarType === 'pillars') {
      if (!lifePillars.year || !lifePillars.month || !lifePillars.day || !lifePillars.hour) {
        setError("请填写完整四柱");
        return;
      }
    }
    if ((modelType === ModelType.BAZI || modelType === ModelType.ZIWEI) && lifeCalendarType !== 'pillars' && (!lifeYear || !lifeMonth || !lifeDay)) {
      setError("请选择出生日期");
      return;
    }
    // Meihua / Liuyao Specific Validation
    if (isLiupanModeModel(modelType)) {
      if (
        liuyaoMode === LiuyaoMode.MANUAL &&
        modelType === ModelType.MEIHUA &&
        manualMovingLines.filter(Boolean).length !== 1
      ) {
        setError("梅花易数手动摇卦必须且只能指定一个变爻");
        return;
      }
      if (usesLiupanSingleNumber(liuyaoMode) && !lyNum) {
        setError("请输入数字");
        return;
      }
      if (liuyaoMode === LiuyaoMode.DOUBLE_NUM && (!lyNumUp || !lyNumDown)) {
        setError("请输入上卦和下卦的数字");
        return;
      }
      if (requiresLiupanDate(liuyaoMode) && !customDate) {
         setError("请选择起卦时间");
         return;
      }
    }

    setLoading(true);
    setError('');
    setKnowledgeHint(null);
    setChartData(null);
    clearChatSession();
    setChatHistory([]);
    if (!isLoggedIn) {
      setGuestFollowUpCount(0);
      localStorage.setItem('guestFollowUpCount', '0');
    }

    try {
      // Date logic
      let date = options?.targetDate || new Date();
      if (!options?.targetDate && isLiupanModeModel(modelType) && requiresLiupanDate(liuyaoMode) && customDate) {
         date = new Date(customDate);
      } else if (!options?.targetDate && isLiupanModeModel(modelType) && liuyaoMode === LiuyaoMode.AUTO) {
         date = new Date();
      } else if (!options?.targetDate && !isLifeReading && timeMode === 'custom' && customDate) {
         date = new Date(customDate);
      }
      const fortuneCase = isFortuneReading
        ? fortuneCaseOptions.find((item) => item.id === fortuneCaseId)
        : null;
      const fortuneCaseParams = (fortuneCase?.chartParams || {}) as Record<string, any>;

      const lifePlaceText = buildBirthPlaceText(province, city, district);
      const lifeCoord = findPlaceCoord(district, city, province);
      const lifeUsesTrueSolar = isLifeReading && lifeTimeInputMode === 'exact' && lifeUseTrueSolar && Boolean(lifeCoord);

      const baseParams: any = {
        year: isFortuneReading ? Number(fortuneCaseParams.year || date.getFullYear()) : (isLifeReading ? lifeYear : date.getFullYear()),
        month: isFortuneReading ? Number(fortuneCaseParams.month || date.getMonth() + 1) : (isLifeReading ? lifeMonth : date.getMonth() + 1),
        day: isFortuneReading ? Number(fortuneCaseParams.day || date.getDate()) : (isLifeReading ? lifeDay : date.getDate()),
        hours: isFortuneReading ? Number(fortuneCaseParams.hours || 9) : (isLifeReading ? lifeHour : date.getHours()),
        minute: isFortuneReading ? Number(fortuneCaseParams.minute || 0) : (isLifeReading ? lifeMinute : date.getMinutes()),
        sex: isFortuneReading ? Number(fortuneCaseParams.sex || 0) : gender,
        name: isFortuneReading ? (fortuneCaseParams.name || fortuneCase?.title || '某人') : (name || '某人'),
        born_year: birthYear ? parseInt(birthYear) : undefined,
        province: isFortuneReading ? fortuneCaseParams.province : province,
        city: isFortuneReading ? fortuneCaseParams.city : city,
        district: isFortuneReading ? fortuneCaseParams.district : district,
        birthPlace: isFortuneReading ? fortuneCaseParams.birthPlace : lifePlaceText,
        longitude: isFortuneReading ? fortuneCaseParams.longitude : (lifeUsesTrueSolar ? lifeCoord?.lng : undefined),
        latitude: isFortuneReading ? fortuneCaseParams.latitude : (lifeUsesTrueSolar ? lifeCoord?.lat : undefined),
        useTrueSolar: isFortuneReading ? fortuneCaseParams.useTrueSolar : lifeUsesTrueSolar,
        timeInputMode: isFortuneReading ? fortuneCaseParams.timeInputMode : (isLifeReading ? lifeTimeInputMode : undefined),
        calendarType: isFortuneReading ? fortuneCaseParams.calendarType : (isLifeReading ? lifeCalendarType : undefined),
        isLeapMonth: isFortuneReading ? fortuneCaseParams.isLeapMonth : (isLifeReading ? lifeIsLeapMonth : undefined),
        pillars: isFortuneReading ? fortuneCaseParams.pillars : (isLifeReading && lifeCalendarType === 'pillars' ? lifePillars : undefined),
        targetYear: isFortuneReading ? date.getFullYear() : undefined,
        targetMonth: isFortuneReading ? date.getMonth() + 1 : undefined,
        targetDay: isFortuneReading ? date.getDate() : undefined,
        pan_model: isLiupanModeModel(modelType) ? liuyaoMode : undefined,
        taiyi_mode: modelType === ModelType.TAIYI ? 'hour' : undefined,
        question,
      };

      if (isLiupanModeModel(modelType)) {
        Object.assign(baseParams, buildLiupanModeParams({
          mode: liuyaoMode,
          manualLines,
          manualMovingLines,
          lyNum,
          lyNumUp,
          lyNumDown,
          yaoAddTime,
        }));
      }

      let resultData: any = null;
      let systemInstruction = "";

      // --- API Calls & Prompt Gen ---
      switch (modelType) {
        case ModelType.QIMEN:
          {
            const qimenZhen = (province && city) ? 1 : 2;
            const qimenParams = {
              ...baseParams,
              question,
              zhen: qimenZhen,
              ju_model: qimenProEnabled ? qimenJuModel : 0,
            };
            resultData = await fetchQimen(qimenParams);
          }
          systemInstruction = "你是精通奇门遁甲的大师。请基于排盘，用通俗专业语言解答用户疑惑。关注用神、时令、吉凶。";
          break;
        case ModelType.BAZI:
          resultData = await fetchBazi(baseParams);
          systemInstruction = buildLifeReadingAnalysisBundle(ModelType.BAZI, resultData, question).systemInstruction;
          break;
        case ModelType.ZIWEI:
          resultData = await fetchZiwei(baseParams);
          systemInstruction = buildLifeReadingAnalysisBundle(ModelType.ZIWEI, resultData, question).systemInstruction;
          break;
        case ModelType.MEIHUA:
          resultData = await fetchMeihua(baseParams);
          systemInstruction = "你是梅花易数占卜师。请基于本卦、互卦、变卦及动爻，直断吉凶成败。";
          break;
        case ModelType.LIUYAO:
          resultData = await fetchLiuyao(baseParams);
          systemInstruction = "你是六爻纳甲预测专家。请基于卦象、六亲、世应、六神及神煞空亡，详细推断吉凶、应期及建议。";
          break;
        case ModelType.DALIUREN:
          resultData = await fetchDaliuren(baseParams);
          systemInstruction = "你是大六壬预测专家。请基于四课三传、天将、课体与神煞解答问题。";
          break;
        case ModelType.TAIYI:
          resultData = await fetchTaiyi(baseParams);
          systemInstruction = "你是太乙神数预测专家。请基于太乙盘面与局式信号解答问题。";
          break;
        case ModelType.XIAOLIUREN:
          resultData = await fetchXiaoliuren(baseParams);
          systemInstruction = "你是小六壬预测师。请基于六宫课体和所问事项给出直接判断。";
          break;
        case ModelType.ALMANAC:
          resultData = await fetchAlmanac(baseParams);
          systemInstruction = "你是黄历择日顾问。请结合日课、宜忌、神煞与用户事项给出择日建议。";
          break;
        case ModelType.DAILY_FORTUNE:
          resultData = await fetchDailyFortune(baseParams);
          systemInstruction = "你是命理运势顾问。请结合每日运势盘面给出当天建议，不输出重要日期提醒。";
          break;
        case ModelType.MONTHLY_FORTUNE:
          resultData = await fetchMonthlyFortune(baseParams);
          systemInstruction = "你是命理运势顾问。请结合每月运势盘面给出本月建议，不输出重要日期提醒。";
          break;
      }

      setChartData(resultData);
      setStep(isFortuneReading ? 'input' : 'chart');
      requestSectionScroll('report');

      const sessionChartParams = { ...baseParams, question, timeMode, analysisModel } as Record<string, unknown>;
      setActiveSessionId(null);
      setActiveChartParams(sessionChartParams);
      setSessionAnalysisModel(analysisModel);

      // 排盘只生成盘面。首次点击解读、重新分析或追问时才请求模型并保存历史。
      await startQimenChat(buildSystemInstruction(modelType, resultData, sessionChartParams) || systemInstruction);
      resetMessageVersions();
      setChatHistory([]);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Operation failed.");
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const toPersistedMessages = (messages: ChatMessage[]): PersistedChatMessage[] =>
    messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      knowledgeSources: msg.knowledgeSources,
    }));

  const persistCurrentMessages = useCallback(async (messages: ChatMessage[]) => {
    if (isLoggedIn) {
      await replaceMessagesInDb(activeSessionId, toPersistedMessages(messages));
      fetchSessions();
      return;
    }

    if (activeSessionId && activeCase) {
      updateGuestCaseSessionMessages(activeSessionId, messages);
      refreshGuestActiveCase(activeCase.id);
    }
  }, [activeCase, activeSessionId, isLoggedIn, refreshGuestActiveCase]);

  const applyMessageVersion = useCallback(async (messageId: string, versionId: string) => {
    const versionState = messageVersionMap[messageId];
    const selectedVersion = versionState?.entries.find((entry) => entry.id === versionId);
    if (!selectedVersion) return;

    const nextMessages = chatHistory.map((message) =>
      message.id === messageId
        ? { ...message, content: selectedVersion.content }
        : message
    );

    setChatHistory(nextMessages);
    setMessageVersionMap((current) => ({
      ...current,
      [messageId]: {
        entries: current[messageId]?.entries ?? [],
        activeId: versionId,
      },
    }));
    setOpenVersionMenuId(null);

    try {
      await persistCurrentMessages(nextMessages);
    } catch {
      setError('切换历史生成记录失败，请稍后重试');
    }
  }, [chatHistory, messageVersionMap, persistCurrentMessages]);

  const handleRequestRerunAnalysis = () => {
    if (!chartData) return;
    if (isLoggedIn && userQuota !== null && userQuota <= 0) {
      setError('您的提问额度已用完');
      return;
    }
    setShowRerunConfirm(true);
  };

  const handleRerunAnalysis = async () => {
    if (!chartData) return;
    if (isLoggedIn && userQuota !== null && userQuota <= 0) {
      setError('您的提问额度已用完');
      setShowRerunConfirm(false);
      return;
    }
    setShowRerunConfirm(false);

    const bundle = buildInitialAnalysisBundle(
      modelType,
      chartData,
      activeChartParams,
      chatHistory
    );

    const nextChartParams = {
      ...activeChartParams,
      question: bundle.question,
      analysisModel,
    };

    setLoading(true);
    setIsTyping(true);
    setError('');
    setKnowledgeHint(null);
    resetMessageVersions();
    clearChatSession();

    try {
      await startQimenChat(bundle.systemInstruction);

      const userMsg: ChatMessage = {
        id: 'rerun-u',
        role: 'user',
        content: bundle.userContent,
        timestamp: new Date(),
      };
      const modelId = 'rerun-m';
      setChatHistory([
        userMsg,
        { id: modelId, role: 'model', content: '', timestamp: new Date() },
      ]);

      const knowledge = useKnowledge && supportsKnowledge
        ? {
            enabled: true,
            board: knowledgeBoardMap[modelType] || 'bazi',
            query: bundle.knowledgeQuery || bundle.question,
          }
        : undefined;

      const finalState = await sendMessageToDeepseekStream(
        bundle.prompt,
        (state) => {
          updateChatMessage(modelId, buildModelContent(state.reasoning, state.content));
        },
        knowledge,
        analysisModel
      );

      if (finalState.knowledgeFailed) {
        setKnowledgeHint(finalState.knowledgeFailed);
      }
      recordKnowledgeSources(modelId, finalState.knowledgeSources);

      const finalAnswer = appendDisclaimer(finalState.content);
      const finalContent = buildModelContent(finalState.reasoning, finalAnswer);
      const finalMessages: ChatMessage[] = [
        userMsg,
        withKnowledgeSources({
          id: modelId,
          role: 'model',
          content: finalContent,
          timestamp: new Date(),
        }, finalState.knowledgeSources),
      ];

      setChatHistory(finalMessages);
      setActiveChartParams(nextChartParams);
      setSessionAnalysisModel(analysisModel);

      if (modelType === ModelType.BAZI) {
        const snapshot = getSessionInitialAnalysisSnapshot(nextChartParams);
        setBaziInitialAnalysis(snapshot.initialAnalysis?.content ?? '');
        setKlineUnlocked(Boolean(snapshot.initialAnalysis?.content));
      }

      if (isLoggedIn) {
        if (activeSessionId) {
          await replaceMessagesInDb(activeSessionId, toPersistedMessages(finalMessages));
          await updateSessionInDb(activeSessionId, { chartParams: nextChartParams });
        } else {
          const sessionTitle = `${MODEL_LABELS[modelType] || modelType} - ${bundle.question || String(activeChartParams.name || new Date().toLocaleDateString('zh-CN'))}`;
          const newSessionId = await saveSessionToDb(
            modelType,
            sessionTitle,
            nextChartParams,
            chartData,
            activeCase?.id
          );
          if (newSessionId) {
            setActiveSessionId(newSessionId);
            await saveMessagesToDb(newSessionId, toPersistedMessages(finalMessages));
          }
        }
        fetchSessions();
        fetchUserProfile();
        if (activeCase) {
          const detailRes = await fetch(`/api/cases/${activeCase.id}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            setActiveCase(detail);
          }
        }
      } else if (activeSessionId && activeCase) {
        updateGuestCaseSession(activeSessionId, (session) => ({
          ...session,
          chartParams: nextChartParams,
          messages: finalMessages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp.toISOString(),
            knowledgeSources: msg.knowledgeSources,
          })),
          updatedAt: new Date().toISOString(),
        }));
        refreshGuestActiveCase(activeCase.id);
      }
    } catch (err: any) {
      setError(err.message || '重新分析失败，请稍后重试');
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const handleRegenerateMessage = async (messageId: string) => {
    if (!chartData || isTyping) return;
    if (isLoggedIn && userQuota !== null && userQuota <= 0) {
      setError('您的提问额度已用完');
      return;
    }

    const targetIndex = chatHistory.findIndex((msg) => msg.id === messageId);
    if (targetIndex < 0 || chatHistory[targetIndex]?.role !== 'model') return;
    const targetMessage = chatHistory[targetIndex];

    let userIndex = -1;
    for (let idx = targetIndex - 1; idx >= 0; idx -= 1) {
      if (chatHistory[idx].role === 'user') {
        userIndex = idx;
        break;
      }
    }
    if (userIndex < 0) return;

    const isInitialResponse = userIndex === 0;
    const lockedModel = sessionAnalysisModel ?? DEFAULT_ANALYSIS_MODEL;

    setError('');
    setKnowledgeHint(null);
    setIsTyping(true);

    try {
      let prompt = '';
      let knowledgeQuery = '';
      let nextMessagesBase: ChatMessage[] = [];

      if (isInitialResponse) {
        const bundle = buildInitialAnalysisBundle(
          modelType,
          chartData,
          activeChartParams,
          chatHistory
        );
        clearChatSession();
        await startQimenChat(bundle.systemInstruction);
        prompt = bundle.prompt;
        knowledgeQuery = bundle.knowledgeQuery || bundle.question;
        nextMessagesBase = [
          {
            id: chatHistory[0]?.id || 'regen-u',
            role: 'user',
            content: bundle.userContent,
            timestamp: chatHistory[0]?.timestamp || new Date(),
          },
        ];
      } else {
        const prefixHistory = chatHistory.slice(0, userIndex);
        restoreChatSession(
          buildSystemInstruction(modelType, chartData, activeChartParams),
          prefixHistory.map((msg) => ({ role: msg.role, content: msg.content }))
        );
        prompt = chatHistory[userIndex].content;
        knowledgeQuery = prompt;
        nextMessagesBase = [...prefixHistory, chatHistory[userIndex]];
      }

      const placeholder: ChatMessage = {
        id: messageId,
        role: 'model',
        content: '',
        timestamp: new Date(),
      };
      setChatHistory([...nextMessagesBase, placeholder]);

      const knowledge = useKnowledge && supportsKnowledge
        ? {
            enabled: true,
            board: knowledgeBoardMap[modelType] || 'bazi',
            query: knowledgeQuery,
          }
        : undefined;

      const finalState = await sendMessageToDeepseekStream(
        prompt,
        (state) => {
          updateChatMessage(messageId, buildModelContent(state.reasoning, state.content));
        },
        knowledge,
        lockedModel
      );

      if (finalState.knowledgeFailed) {
        setKnowledgeHint(finalState.knowledgeFailed);
      }
      recordKnowledgeSources(messageId, finalState.knowledgeSources);

      const finalAnswer = appendDisclaimer(finalState.content);
      const finalContent = buildModelContent(finalState.reasoning, finalAnswer);
      const finalMessages: ChatMessage[] = [
        ...nextMessagesBase,
        withKnowledgeSources({
          ...placeholder,
          content: finalContent,
          timestamp: new Date(),
        }, finalState.knowledgeSources),
      ];
      const nextVersionState = (() => {
        const existingEntries = messageVersionMap[messageId]?.entries ?? [
          buildMessageVersionEntry(messageId, targetMessage.content, targetMessage.timestamp),
        ];
        const latestEntry = buildMessageVersionEntry(messageId, finalContent);
        return {
          entries: [...existingEntries, latestEntry],
          activeId: latestEntry.id,
        };
      })();

      setChatHistory(finalMessages);
      setMessageVersionMap((current) => ({
        ...current,
        [messageId]: nextVersionState,
      }));
      setOpenVersionMenuId(null);

      if (isLoggedIn) {
        await replaceMessagesInDb(activeSessionId, toPersistedMessages(finalMessages));
        fetchSessions();
        fetchUserProfile();
      } else if (activeSessionId && activeCase) {
        updateGuestCaseSessionMessages(activeSessionId, finalMessages);
        refreshGuestActiveCase(activeCase.id);
      }
    } catch (err: any) {
      setError(err.message || '重生成失败，请稍后重试');
    } finally {
      setIsTyping(false);
    }
  };

  const handleStartEditUserMessage = useCallback((messageId: string, content: string) => {
    if (isTyping) return;
    setOpenVersionMenuId(null);
    setEditingUserMessageId(messageId);
    setEditingUserMessageDraft(content);
  }, [isTyping]);

  const handleCancelEditUserMessage = useCallback(() => {
    setEditingUserMessageId(null);
    setEditingUserMessageDraft('');
  }, []);

  const handleSubmitEditedUserMessage = async (messageId: string) => {
    if (!chartData || isTyping) return;
    const editedContent = editingUserMessageDraft.trim();
    if (!editedContent) {
      setError('问题不能为空');
      return;
    }
    if (isLoggedIn && userQuota !== null && userQuota <= 0) {
      setError('您的提问额度已用完');
      return;
    }

    const userIndex = chatHistory.findIndex((msg) => msg.id === messageId);
    if (userIndex < 0 || chatHistory[userIndex]?.role !== 'user') return;

    const modelIndex = chatHistory.findIndex((msg, index) => index > userIndex && msg.role === 'model');
    const targetModelMessage = modelIndex >= 0 ? chatHistory[modelIndex] : null;
    const lockedModel = sessionAnalysisModel ?? DEFAULT_ANALYSIS_MODEL;
    const editedUserMessage: ChatMessage = {
      ...chatHistory[userIndex],
      content: editedContent,
      timestamp: new Date(),
    };

    setError('');
    setKnowledgeHint(null);
    setIsTyping(true);
    setEditingUserMessageId(null);
    setEditingUserMessageDraft('');

    try {
      let prompt = '';
      let knowledgeQuery = '';
      let nextMessagesBase: ChatMessage[] = [];
      let nextChartParams = activeChartParams;

      if (userIndex === 0) {
        const editedHistory = chatHistory.map((msg, index) =>
          index === userIndex ? editedUserMessage : msg
        );
        const bundle = buildInitialAnalysisBundle(
          modelType,
          chartData,
          activeChartParams,
          editedHistory
        );
        nextChartParams = {
          ...activeChartParams,
          question: bundle.question,
          analysisModel: lockedModel,
        };
        clearChatSession();
        await startQimenChat(bundle.systemInstruction);
        prompt = bundle.prompt;
        knowledgeQuery = bundle.knowledgeQuery || bundle.question || editedContent;
        nextMessagesBase = [editedUserMessage];
        setActiveChartParams(nextChartParams);
        setSessionAnalysisModel(lockedModel);
      } else {
        const prefixHistory = chatHistory.slice(0, userIndex);
        restoreChatSession(
          buildSystemInstruction(modelType, chartData, activeChartParams),
          prefixHistory.map((msg) => ({ role: msg.role, content: msg.content }))
        );
        prompt = editedContent;
        knowledgeQuery = editedContent;
        nextMessagesBase = [...prefixHistory, editedUserMessage];
      }

      const replyId = targetModelMessage?.id ?? `${messageId}-edited-model`;
      const placeholder: ChatMessage = {
        id: replyId,
        role: 'model',
        content: '',
        timestamp: new Date(),
      };
      setChatHistory([...nextMessagesBase, placeholder]);

      const knowledge = useKnowledge && supportsKnowledge
        ? {
            enabled: true,
            board: knowledgeBoardMap[modelType] || 'bazi',
            query: knowledgeQuery,
          }
        : undefined;

      const finalState = await sendMessageToDeepseekStream(
        prompt,
        (state) => {
          updateChatMessage(replyId, buildModelContent(state.reasoning, state.content));
        },
        knowledge,
        lockedModel
      );

      if (finalState.knowledgeFailed) {
        setKnowledgeHint(finalState.knowledgeFailed);
      }
      recordKnowledgeSources(replyId, finalState.knowledgeSources);

      const finalAnswer = appendDisclaimer(finalState.content);
      const finalContent = buildModelContent(finalState.reasoning, finalAnswer);
      const finalMessages: ChatMessage[] = [
        ...nextMessagesBase,
        withKnowledgeSources({
          ...placeholder,
          content: finalContent,
          timestamp: new Date(),
        }, finalState.knowledgeSources),
      ];

      setChatHistory(finalMessages);
      setOpenVersionMenuId(null);

      if (targetModelMessage) {
        const nextVersionState = (() => {
          const existingEntries = messageVersionMap[replyId]?.entries ?? [
            buildMessageVersionEntry(replyId, targetModelMessage.content, targetModelMessage.timestamp),
          ];
          const latestEntry = buildMessageVersionEntry(replyId, finalContent);
          return {
            entries: [...existingEntries, latestEntry],
            activeId: latestEntry.id,
          };
        })();

        setMessageVersionMap((current) => ({
          ...current,
          [replyId]: nextVersionState,
        }));
      }

      if (isLoggedIn) {
        await replaceMessagesInDb(activeSessionId, toPersistedMessages(finalMessages));
        if (userIndex === 0) {
          await updateSessionInDb(activeSessionId, { chartParams: nextChartParams });
        }
        fetchSessions();
        fetchUserProfile();
      } else if (activeSessionId && activeCase) {
        updateGuestCaseSession(activeSessionId, (session) => ({
          ...session,
          chartParams: userIndex === 0 ? nextChartParams : session.chartParams,
          messages: finalMessages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp.toISOString(),
            knowledgeSources: msg.knowledgeSources,
          })),
          updatedAt: new Date().toISOString(),
        }));
        refreshGuestActiveCase(activeCase.id);
      }
    } catch (err: any) {
      setError(err.message || '修改问题失败，请稍后重试');
    } finally {
      setIsTyping(false);
    }
  };

  const sendFollowUpMessage = async (
    rawMessage: string,
    options?: {
      bypassGuestLimit?: boolean;
      sessionIdOverride?: string;
      caseIdOverride?: string;
      guestFollowUpCountOverride?: number;
    }
  ) => {
    const outgoingMessage = rawMessage.trim();
    if (!outgoingMessage) return;
    if (requireLoginIfGuestModeDisabled()) return;

    const effectiveGuestFollowUpCount = options?.guestFollowUpCountOverride ?? guestFollowUpCount;
    if (!isLoggedIn && !options?.bypassGuestLimit && effectiveGuestFollowUpCount >= 1) {
      setShowAuth(true);
      return;
    }
    if (isLoggedIn && userQuota !== null && userQuota <= 0) {
      setError('您的提问额度已用完');
      return;
    }

    let sessionId = options?.sessionIdOverride ?? activeSessionId;
    const caseId = options?.caseIdOverride ?? activeCase?.id ?? null;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: outgoingMessage,
      timestamp: new Date(),
    };
    const modelId = (Date.now() + 1).toString();

    setChatHistory((prev) => [
      ...prev,
      userMsg,
      { id: modelId, role: 'model', content: '', timestamp: new Date() },
    ]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const knowledge = useKnowledge && supportsKnowledge
        ? {
            enabled: true,
            board: knowledgeBoardMap[modelType] || 'bazi',
            query: outgoingMessage,
          }
        : undefined;

      const finalState = await sendMessageToDeepseekStream(
        outgoingMessage,
        (state) => {
          updateChatMessage(modelId, buildModelContent(state.reasoning, state.content));
        },
        knowledge,
        analysisModel
      );
      if (finalState.knowledgeFailed) {
        setKnowledgeHint(finalState.knowledgeFailed);
      }
      recordKnowledgeSources(modelId, finalState.knowledgeSources);

      const finalAnswer = appendDisclaimer(finalState.content);
      const finalContent = buildModelContent(finalState.reasoning, finalAnswer);

      if (isLoggedIn) {
        if (!sessionId && chartData) {
          const sessionTitle = `${MODEL_LABELS[modelType] || modelType} - ${outgoingMessage.slice(0, 20) || String(activeChartParams.name || new Date().toLocaleDateString('zh-CN'))}`;
          const nextChartParams = {
            ...activeChartParams,
            question: outgoingMessage,
            analysisModel,
          } as Record<string, unknown>;
          sessionId = await saveSessionToDb(
            modelType,
            sessionTitle,
            nextChartParams,
            chartData,
            activeCase?.id
          );
          if (sessionId) {
            setActiveSessionId(sessionId);
            setActiveChartParams(nextChartParams);
            setSessionAnalysisModel(analysisModel);
          }
        }
        updateChatMessage(modelId, finalContent);
        await saveMessagesToDb(sessionId, [
          { role: 'user', content: outgoingMessage },
          { role: 'model', content: finalContent, knowledgeSources: finalState.knowledgeSources },
        ]);
        fetchUserProfile();
      } else {
        const nextGuestFollowUpCount = effectiveGuestFollowUpCount + 1;
        localStorage.setItem('guestFollowUpCount', String(nextGuestFollowUpCount));
        setGuestFollowUpCount(nextGuestFollowUpCount);
        setChatHistory((prev) => {
          const next = prev.map((msg) =>
            msg.id === modelId ? { ...msg, content: finalContent, knowledgeSources: finalState.knowledgeSources } : msg
          );
          if (sessionId) {
            updateGuestCaseSessionMessages(sessionId, next, nextGuestFollowUpCount);
          } else if (activeCase && chartData) {
            const guestSessionId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const now = new Date().toISOString();
            saveGuestCaseSession({
              id: guestSessionId,
              caseId: activeCase.id,
              modelType,
              title: `${MODEL_LABELS[modelType] || modelType} - ${outgoingMessage.slice(0, 20) || activeCase.title}`,
              chartParams: {
                ...activeChartParams,
                question: outgoingMessage,
                analysisModel,
              },
              chartData,
              messages: next.map((msg) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp.toISOString(),
                knowledgeSources: msg.knowledgeSources,
              })),
              guestFollowUpCount: nextGuestFollowUpCount,
              createdAt: now,
              updatedAt: now,
            });
            sessionId = guestSessionId;
            setActiveSessionId(guestSessionId);
          }
          return next;
        });
        if (caseId) {
          refreshGuestActiveCase(caseId);
        }
      }
    } catch (err: any) {
      const message = err?.message?.trim?.() ? err.message.trim() : '请求失败，请稍后重试。';
      setChatHistory((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'model', content: `⚠️ ${message}`, timestamp: new Date() },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    await sendFollowUpMessage(inputMessage);
  };

  const handleFortuneDateChange = async (targetDate: Date) => {
    if (loading || isTyping) return;
    const value = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}T00:00`;
    setTimeMode('custom');
    setCustomDate(value);
    await handleCalculate({ targetDate });
  };

  const handleFortuneCaseChange = (caseId: string) => {
    autoFortuneChartKeyRef.current = '';
    setFortuneCaseId(caseId);
    setChartData(null);
    setStep('input');
    setChatHistory([]);
    clearChatSession();
  };

  const handleOpenDailyFortuneDate = (targetDate: Date) => {
    const value = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}T00:00`;
    autoFortuneChartKeyRef.current = '';
    setModelType(ModelType.DAILY_FORTUNE);
    setTimeMode('custom');
    setCustomDate(value);
    setChartData(null);
    setStep('input');
    setChatHistory([]);
    clearChatSession();
    if (typeof window !== 'undefined' && window.location.pathname !== '/daily') {
      window.history.pushState(null, '', '/daily');
    }
  };

  const handleFortuneSuggestedAsk = async (message: string) => {
    requestSectionScroll('chat');
    await sendFollowUpMessage(message);
  };

  useEffect(() => {
    const isFortuneReading = modelType === ModelType.DAILY_FORTUNE || modelType === ModelType.MONTHLY_FORTUNE;
    if (!isFortuneReading || step !== 'input' || !fortuneCaseId || loading || isTyping) return;
    if (authStatus === 'loading') return;
    if (!isLoggedIn && !guestModeEnabled) return;
    const targetDate = timeMode === 'custom' && customDate ? new Date(customDate) : new Date();
    if (Number.isNaN(targetDate.getTime())) return;
    const keyDate = modelType === ModelType.MONTHLY_FORTUNE
      ? `${targetDate.getFullYear()}-${targetDate.getMonth() + 1}`
      : `${targetDate.getFullYear()}-${targetDate.getMonth() + 1}-${targetDate.getDate()}`;
    const key = `${modelType}:${fortuneCaseId}:${keyDate}`;
    if (autoFortuneChartKeyRef.current === key) return;
    autoFortuneChartKeyRef.current = key;
    handleCalculate({ targetDate });
  }, [modelType, step, fortuneCaseId, loading, isTyping, timeMode, customDate, authStatus, isLoggedIn, guestModeEnabled]);

  const toggleLine = (idx: number) => {
    const newLines = [...manualLines];
    newLines[idx] = newLines[idx] === 1 ? 0 : 1;
    setManualLines(newLines);
  };

  const toggleManualMovingLine = (idx: number) => {
    setManualMovingLines((prev) => {
      if (modelType === ModelType.MEIHUA) {
        return prev.map((_, lineIdx) => lineIdx === idx);
      }
      return prev.map((item, lineIdx) => (lineIdx === idx ? !item : item));
    });
  };
  
  const getLineLabel = (lineValue: number, isMoving: boolean) => {
     if (lineValue === 1) {
       return isMoving ? '老阳' : '少阳';
     }
     return isMoving ? '老阴' : '少阴';
  };

  const isNearShiChenBoundary = (value: string) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const isOddHour = hours % 2 === 1;
    return isOddHour ? minutes <= 30 : minutes >= 30;
  };

  const clampFloatingOrbPos = (x: number, y: number, size: number) => {
    const padding = 8;
    const maxX = window.innerWidth - size - padding;
    const maxY = window.innerHeight - size - padding;
    return {
      x: Math.min(Math.max(padding, x), Math.max(padding, maxX)),
      y: Math.min(Math.max(padding, y), Math.max(padding, maxY)),
    };
  };

  const clampKlinePos = (x: number, y: number) => clampFloatingOrbPos(x, y, 74);

  const clampProfessionalPos = (x: number, y: number) => clampFloatingOrbPos(x, y, 68);

  const handleKlinePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!klinePos) return;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    klineDragRef.current = {
      offsetX: event.clientX - klinePos.x,
      offsetY: event.clientY - klinePos.y,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const handleKlinePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!klineDragRef.current) return;
    const dx = Math.abs(event.clientX - klineDragRef.current.startX);
    const dy = Math.abs(event.clientY - klineDragRef.current.startY);
    const nextX = event.clientX - klineDragRef.current.offsetX;
    const nextY = event.clientY - klineDragRef.current.offsetY;
    const clamped = clampKlinePos(nextX, nextY);
    setKlinePos(clamped);
    if (dx > 3 || dy > 3) {
      klineDragRef.current.moved = true;
    }
  };

  const handleKlinePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!klineDragRef.current) return;
    const moved = klineDragRef.current.moved;
    klineDragRef.current = null;
    const target = event.currentTarget;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    if (!moved && !isTyping) {
      handleOpenKline();
    }
  };

  const openProfessionalModal = useCallback(() => {
    resetProfessionalComposer();
    setProfessionalSelectedProject(PROFESSIONAL_FEATURE_JOINT);
    setProfessionalModalOpen(false);
  }, [resetProfessionalComposer]);

  const openProfessionalFeature = useCallback((feature: string) => {
    resetProfessionalComposer();
    setWorkspaceView('divination');
    setProfessionalSelectedProject(feature);
    setProfessionalModalOpen(false);
    setHasSelectedModel(true);
    setModelType(ModelType.BAZI);
    setStep('input');
    setChartData(null);
    setChatHistory([]);
    clearChatSession();
    setActiveCase(null);
    setActiveSessionId(null);
    setError('');
  }, [resetProfessionalComposer]);

  const handleProfessionalPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!professionalPos) return;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    professionalDragRef.current = {
      offsetX: event.clientX - professionalPos.x,
      offsetY: event.clientY - professionalPos.y,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const handleProfessionalPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!professionalDragRef.current) return;
    const dx = Math.abs(event.clientX - professionalDragRef.current.startX);
    const dy = Math.abs(event.clientY - professionalDragRef.current.startY);
    const nextX = event.clientX - professionalDragRef.current.offsetX;
    const nextY = event.clientY - professionalDragRef.current.offsetY;
    const clamped = clampProfessionalPos(nextX, nextY);
    setProfessionalPos(clamped);
    if (dx > 3 || dy > 3) {
      professionalDragRef.current.moved = true;
    }
  };

  const handleProfessionalPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!professionalDragRef.current) return;
    const moved = professionalDragRef.current.moved;
    professionalDragRef.current = null;
    const target = event.currentTarget;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    if (!moved) {
      openProfessionalModal();
    }
  };

  const buildKlinePrompt = (data: BaziResponse, analysisText: string) => {
    const panText = formatBaziPrompt(data);
    const dayunLines = data.dayun_info.big.map((name, idx) => {
      const start = data.dayun_info.big_start_year?.[idx];
      const end = data.dayun_info.big_end_year?.[idx];
      const yearList: string[] = [];
      if (Number.isFinite(start) && Number.isFinite(end)) {
        for (let y = start; y <= end; y += 1) {
          yearList.push(`${y}(${getGanzhiYear(y)})`);
        }
      }
      return `- ${name} ${start ?? '—'}-${end ?? '—'}: ${yearList.join('，')}`;
    });

    return [
      "你是输出JSON的引擎，只能输出一段严格JSON，不得输出任何解释、Markdown、标点或多余文字。",
      "如果无法严格输出JSON，请输出空JSON：{}。",
      "",
      "【前序分析要点】",
      analysisText || '（无）',
      "",
      "【完整排盘信息】",
      panText.trim(),
      "",
      "【大运与流年列表】",
      dayunLines.join('\n'),
      "",
      "评分要求：",
      "1) 对每一个大运（共7步，从第一步大运开始依次到第七步）给出“财运/事业/爱情/健康”四项评分，满分100分。",
      "2) 对每一个流年（共70个）给出同样四项评分，满分100分。",
      "3) 先给大运打分，严格依据前文分析的做功逻辑（功神、废神、贼神、捕神）、干支关系等盲派理论。",
      "4) 再给流年打分，遵守：好大运里的好流年会更好；好大运里的坏流年也不会特别坏；正常大运里的好坏流年都正常；坏大运里的好流年也不会特别好；坏大运里的坏流年会更坏。",
      "5) 总体打分要尊重事实的情况，能看出起伏情况。",
      "6) 每一个大运/流年生成一个四字左右的主线tag，避免使用专业八字术语，使用通俗易懂的表达。请记住虽然只让你分析了70年，但不代表用户只有70年，所以避免在最后一年出现类似“完美谢幕”的说法。",
      "7) 输出必须是严格JSON，必须能被JSON.parse解析。",
      "8) 按年份顺序输出liunian数组，逐年输出对象，不要省略或合并。",
      "9) 仅允许使用双引号，禁止尾随逗号。",
      "10) 数字只能是0-100的整数。",
      "",
      "输出模板（字段名必须一致，数组长度必须严格满足）：",
      "{\"schema_version\":\"kline_v1\",\"dayun\":[{\"name\":\"甲子\",\"start_year\":1990,\"end_year\":1999,\"scores\":{\"wealth\":78,\"career\":72,\"love\":65,\"health\":82},\"tag\":\"事业起势\"}],\"liunian\":[{\"year\":1990,\"scores\":{\"wealth\":66,\"career\":68,\"love\":62,\"health\":75},\"tag\":\"稳中求进\"}]}",
      "",
      "请确保dayun长度为7，liunian长度为70，年份与大运范围一致。",
    ].join('\n');
  };

  const buildKlinePromptStrict = (data: BaziResponse) => {
    const panText = formatBaziPrompt(data);
    const dayunLines = data.dayun_info.big.map((name, idx) => {
      const start = data.dayun_info.big_start_year?.[idx];
      const end = data.dayun_info.big_end_year?.[idx];
      const yearList: string[] = [];
      if (Number.isFinite(start) && Number.isFinite(end)) {
        for (let y = start; y <= end; y += 1) {
          yearList.push(`${y}(${getGanzhiYear(y)})`);
        }
      }
      return `- ${name} ${start ?? '—'}-${end ?? '—'}: ${yearList.join('，')}`;
    });

    return [
      "只输出严格JSON，不要解释，不要Markdown，不要空行。",
      "禁止尾随逗号，只能使用英文双引号。",
      "数值必须是0-100整数。",
      "",
      "【排盘信息】",
      panText.trim(),
      "",
      "【大运与流年列表】",
      dayunLines.join('\n'),
      "",
      "输出模板（字段名必须一致，长度必须满足）：",
      "{\"schema_version\":\"kline_v1\",\"dayun\":[{\"name\":\"甲子\",\"start_year\":1990,\"end_year\":1999,\"scores\":{\"wealth\":78,\"career\":72,\"love\":65,\"health\":82},\"tag\":\"事业起势\"}],\"liunian\":[{\"year\":1990,\"scores\":{\"wealth\":66,\"career\":68,\"love\":62,\"health\":75},\"tag\":\"稳中求进\"}]}",
      "",
      "dayun长度必须为7，liunian长度必须为70。",
    ].join('\n');
  };

  const buildKlineSystemInstruction = () => [
    '你是专业八字趋势评分与JSON生成引擎。',
    '任务是基于八字排盘、初始化分析、大运与流年信息，生成七步大运与七十年流年的趋势评分。',
    '必须严格遵守用户消息中的JSON格式要求，只输出可被JSON.parse解析的JSON。',
  ].join('\n');

  const parseKlineResult = (raw: string) => {
    const trimmed = raw.trim();
    const tryParse = (value: string) => JSON.parse(value) as KlineResult;
    try {
      return tryParse(trimmed);
    } catch {
      const startIdx = trimmed.indexOf('{');
      const endIdx = trimmed.lastIndexOf('}');
      if (startIdx >= 0 && endIdx > startIdx) {
        return tryParse(trimmed.slice(startIdx, endIdx + 1));
      }
      throw new Error('无法解析AI返回的评分结果');
    }
  };

  const sanitizeKlineJson = (raw: string) => {
    let text = raw.trim();
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx >= 0 && endIdx > startIdx) {
      text = text.slice(startIdx, endIdx + 1);
    }
    text = text
      .replace(/[，、]/g, ',')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, '"');
    text = text.replace(/,\s*([}\]])/g, '$1');
    text = text.replace(/:\s*([+-]?\d+)(\.\d+)?/g, (match) => match);
    return text;
  };

  const buildKlineRepairPrompt = (raw: string) => {
    return [
      "你是JSON修复器，只能输出严格JSON，不得输出任何解释或多余字符。",
      "请将以下文本修复为合法JSON，字段保持不变，数组长度不变，禁止新增字段：",
      "",
      raw,
    ].join('\n');
  };

  const normalizeKlineResult = (result: KlineResult): KlineResult => {
    const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
    const normalizeScores = (scores: KlineScores): KlineScores => ({
      wealth: clampScore(scores.wealth),
      career: clampScore(scores.career),
      love: clampScore(scores.love),
      health: clampScore(scores.health),
    });
    if (!Array.isArray(result.dayun) || !Array.isArray(result.liunian)) {
      throw new Error('K线结果缺少必要数组字段');
    }
    return {
      schema_version: 'kline_v1',
      dayun: result.dayun.slice(0, 7).map((item) => ({
        ...item,
        scores: normalizeScores(item.scores),
        tag: (item.tag || '').slice(0, 8),
      })),
      liunian: result.liunian.slice(0, 70).map((item) => ({
        ...item,
        scores: normalizeScores(item.scores),
        tag: (item.tag || '').slice(0, 8),
      })),
    };
  };

  const persistKlineToCase = async (targetCase: CaseDetail, result: KlineResult | null) => {
    if (isLoggedIn) {
      const detail = await saveCaseKlineInDb(targetCase.id, result);
      if (detail) {
        await hydrateCasesForModel(targetCase.modelType);
        setActiveCase(detail);
      }
      return;
    }

    const nextCase: CaseItem = {
      id: targetCase.id,
      modelType: targetCase.modelType,
      title: targetCase.title,
      chartParams: targetCase.chartParams,
      chartData: targetCase.chartData,
      klineData: result,
      initialAnalysisData: targetCase.initialAnalysisData,
      createdAt: targetCase.createdAt,
      updatedAt: new Date().toISOString(),
    };
    saveGuestCase(nextCase);
    refreshGuestActiveCase(targetCase.id);
  };

  const handleRunKline = async (forceRegenerate = false) => {
    if (modelType !== ModelType.BAZI || !chartData || !activeCase || activeCase.modelType !== ModelType.BAZI) return;
    if (klineStatus === 'analyzing') return;
    if (!forceRegenerate && klineResult) {
      setKlineModalOpen(true);
      setKlineStatus('ready');
      return;
    }

    setKlineModalOpen(true);
    setKlineStatus('analyzing');
    setIsKlineRunning(true);
    setKlineError('');
    setKlineSelected(null);
    setKlineProgress(0);
    setKlineYearProgress(0);
    klineYearProgressRef.current = 0;
    try {
      const initializationAnalysis = await resolveKlineInitializationAnalysis(activeCase);
      if (!initializationAnalysis) {
        throw new Error('K线初始化失败，请先完成一次八字分析');
      }
      setBaziInitialAnalysis(initializationAnalysis);

      const prompt = buildKlinePrompt(chartData as BaziResponse, initializationAnalysis);
      await startQimenChat(buildKlineSystemInstruction());
      const finalState = await sendMessageToDeepseekStream(prompt, (state) => {
        const matches = state.content.match(/"year"\s*:\s*\d{4}/g) || [];
        const years = new Set(matches.map((m) => m.replace(/[^0-9]/g, '')));
        const count = Math.min(70, years.size);
        if (count !== klineYearProgressRef.current) {
          klineYearProgressRef.current = count;
          setKlineYearProgress(count);
          setKlineProgress(Math.min(99, Math.round((count / 70) * 100)));
        }
      }, undefined, KLINE_CHAT_MODEL);
      let parsed: KlineResult | null = null;
      try {
        parsed = parseKlineResult(finalState.content);
      } catch {
        try {
          parsed = parseKlineResult(sanitizeKlineJson(finalState.content));
        } catch {
          try {
            const repairPrompt = buildKlineRepairPrompt(finalState.content);
            const repaired = await sendMessageToDeepseekStream(repairPrompt, () => {}, undefined, KLINE_CHAT_MODEL);
            parsed = parseKlineResult(sanitizeKlineJson(repaired.content));
          } catch {
            const strictPrompt = buildKlinePromptStrict(chartData as BaziResponse);
            const retryState = await sendMessageToDeepseekStream(strictPrompt, () => {}, undefined, KLINE_CHAT_MODEL);
            parsed = parseKlineResult(sanitizeKlineJson(retryState.content));
          }
        }
      }
      const normalized = normalizeKlineResult(parsed as KlineResult);
      setKlineResult(normalized);
      setKlineProgress(100);
      setKlineYearProgress(70);
      klineYearProgressRef.current = 70;
      setKlineStatus('ready');
      await persistKlineToCase(activeCase, normalized);
    } catch (err: any) {
      setKlineStatus('error');
      setKlineError(err.message || 'K线分析失败，请稍后重试');
      setKlineProgress(0);
      setKlineYearProgress(0);
      klineYearProgressRef.current = 0;
    } finally {
      setIsKlineRunning(false);
    }
  };

  const handleOpenKline = async () => {
    if (klineResult) {
      setKlineModalOpen(true);
      return;
    }
    await handleRunKline(false);
  };

  const handleSaveKline = () => {
    if (!klineResult) return;
    const filename = `kline-${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(klineResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ignore clipboard errors
    }
  };

  const getMessageVersionLabel = (index: number) => {
    if (index === 0) return '初版';
    return `重生成 ${index}`;
  };

  const formatVersionTime = (value: string) =>
    new Date(value).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

  const scoreAverage = (scores: KlineScores) =>
    Math.round(((scores.wealth + scores.career + scores.love + scores.health) / 4) * 10) / 10;

  // --- Render Helpers ---
  const isLifeReading = modelType === ModelType.BAZI || modelType === ModelType.ZIWEI;
  const isFortuneReading = modelType === ModelType.DAILY_FORTUNE || modelType === ModelType.MONTHLY_FORTUNE;
  // Only Bazi and Ziwei use location for True Solar Time
  const showLocation = modelType === ModelType.BAZI || modelType === ModelType.ZIWEI || modelType === ModelType.QIMEN;
  const showBornYear = modelType === ModelType.MEIHUA || modelType === ModelType.LIUYAO;
  const showStandardTimeInput = !isLifeReading && !isLiupanModeModel(modelType);
  const showSolarTimeReminder = showLocation && customDate && isNearShiChenBoundary(customDate);

  const userRole = (authSession?.user as Record<string, unknown> | undefined)?.role as string | undefined;
  const desktopHistoryOffset = sidebarCollapsed ? DESKTOP_PANEL_COLLAPSED_OFFSET : DESKTOP_PANEL_EXPANDED_OFFSET;
  const desktopNavOffset = !isCompactLayout ? 292 : 0;
  const desktopWorkPaddingLeft = desktopNavOffset;
  const desktopWorkPaddingRight = isLoggedIn && !isCompactLayout && workspaceView === 'divination' ? desktopHistoryOffset : 0;
  const currentModuleLabel =
    professionalSelectedProject === PROFESSIONAL_FEATURE_JOINT ? '八字+紫微联合分析' :
    professionalSelectedProject === PROFESSIONAL_FEATURE_BAZI_COMPAT ? '八字合盘' :
    modelType === ModelType.BAZI ? '四柱八字' :
    modelType === ModelType.ZIWEI ? '紫微斗数' :
    modelType === ModelType.DAILY_FORTUNE ? '每日运势' :
    modelType === ModelType.MONTHLY_FORTUNE ? '每月运势' :
    modelType === ModelType.QIMEN ? '奇门遁甲' :
    modelType === ModelType.LIUYAO ? '六爻纳甲' :
    modelType === ModelType.MEIHUA ? '梅花易数' :
    modelType === ModelType.DALIUREN ? '大六壬' :
    modelType === ModelType.TAIYI ? '太乙神数' :
    modelType === ModelType.XIAOLIUREN ? '小六壬' :
    modelType === ModelType.ALMANAC ? '黄历/择日' :
    MODEL_LABELS[modelType] || '排盘';
  const currentWorkspaceLabel = professionalSelectedProject ? '进阶功能' : isCaseModel ? '命理库' : isFortuneReading ? '命理运势' : modelType === ModelType.ALMANAC ? '择日工具' : '占卜排盘';
  const currentCaseInitialAnalysis = activeCase
    ? normalizeInitialAnalysisData(activeCase.initialAnalysisData)
    : null;
  const currentInitialAnalysisStatus = initialAnalysisBusy
    ? '生成中'
    : currentCaseInitialAnalysis
      ? '已生成'
      : '未生成';

  if (showAdminPanel && isLoggedIn && userRole === 'admin') {
    return <AdminPanel onBack={() => setShowAdminPanel(false)} />;
  }

  if (showAuth && !isLoggedIn) {
    return (
      <AuthForm
        onSuccess={() => { setShowAuth(false); fetchSessions(); fetchUserProfile(); }}
        onSkip={() => setShowAuth(false)}
        registrationEnabled={registrationEnabled}
        registrationClosedContact={siteSettings.registrationClosedContact}
        guestModeEnabled={guestModeEnabled}
      />
    );
  }

  if (showWelcome && !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 to-amber-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-8 max-w-sm w-full text-center space-y-5">
          <div className="text-4xl">🔮</div>
          <h2 className="text-xl font-bold text-stone-800">元分 · 智解</h2>
          <p className="whitespace-pre-line text-sm leading-7 text-stone-500">
            {registrationEnabled ? welcomeIntroText : `${welcomeIntroText}\n${registrationClosedMessage}`}
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => { setShowWelcome(false); sessionStorage.setItem('welcomeDismissed', '1'); setShowAuth(true); }}
              className="w-full py-2.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition text-sm"
            >
              {authEntryLabel}
            </button>
            {guestModeEnabled && (
              <button
                type="button"
                onClick={() => { setShowWelcome(false); sessionStorage.setItem('welcomeDismissed', '1'); }}
                className="w-full py-2.5 rounded-lg border border-stone-300 text-stone-600 font-medium hover:bg-stone-50 transition text-sm"
              >
                访客模式
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const renderModuleNavigation = (mobile = false) => (
    <nav
      className={`${mobile ? 'mb-4' : 'h-[calc(100vh-112px)] w-[260px]'} glass-panel-soft flex flex-col rounded-2xl border border-stone-100/80 p-4 shadow-sm`}
      aria-label="功能导航"
    >
      <div className="mb-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-400">功能</div>
        <div className="mt-1 text-lg font-bold text-stone-800">元分 · 智解</div>
      </div>

      <div className={`${mobile ? 'grid gap-3 md:grid-cols-3' : 'min-h-0 flex-1 overflow-y-auto pr-1 space-y-4'}`}>
        <div className="space-y-2">
          <div className="px-2 text-xs font-bold tracking-[0.18em] text-stone-400">命理运势</div>
          {[
            [ModelType.BAZI, '四柱八字'],
            [ModelType.ZIWEI, '紫微斗数'],
            [ModelType.DAILY_FORTUNE, '每日运势'],
            [ModelType.MONTHLY_FORTUNE, '每月运势'],
          ].map(([type, label]) => {
            const selected = modelType === type && !professionalSelectedProject;
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  handleModelChange(type as ModelType);
                  if (mobile) setActiveCompactPanel(null);
                }}
                className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${
                  selected
                    ? 'glass-panel-dark border-transparent text-amber-200 shadow-sm'
                    : 'border-stone-100 bg-white/60 text-stone-700 hover:bg-white hover:text-stone-900'
                }`}
              >
                <span>{label}</span>
                <span className={selected ? 'text-amber-200' : 'text-stone-300'}>›</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="px-2 text-xs font-bold tracking-[0.18em] text-stone-400">占卜预测</div>
          {[
            [ModelType.QIMEN, '奇门遁甲'],
            [ModelType.LIUYAO, '六爻纳甲'],
            [ModelType.MEIHUA, '梅花易数'],
            [ModelType.DALIUREN, '大六壬'],
            [ModelType.TAIYI, '太乙神数'],
            [ModelType.XIAOLIUREN, '小六壬'],
          ].map(([type, label]) => {
            const selected = modelType === type && !professionalSelectedProject;
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  handleModelChange(type as ModelType);
                  if (mobile) setActiveCompactPanel(null);
                }}
                className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${
                  selected
                    ? 'glass-panel-dark border-transparent text-amber-200 shadow-sm'
                    : 'border-stone-100 bg-white/60 text-stone-700 hover:bg-white hover:text-stone-900'
                }`}
              >
                <span>{label}</span>
                <span className={selected ? 'text-amber-200' : 'text-stone-300'}>›</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="px-2 text-xs font-bold tracking-[0.18em] text-stone-400">择日工具</div>
          {[
            [ModelType.ALMANAC, '黄历/择日'],
          ].map(([type, label]) => {
            const selected = modelType === type && !professionalSelectedProject;
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  handleModelChange(type as ModelType);
                  if (mobile) setActiveCompactPanel(null);
                }}
                className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${
                  selected
                    ? 'glass-panel-dark border-transparent text-amber-200 shadow-sm'
                    : 'border-stone-100 bg-white/60 text-stone-700 hover:bg-white hover:text-stone-900'
                }`}
              >
                <span>{label}</span>
                <span className={selected ? 'text-amber-200' : 'text-stone-300'}>›</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="px-2 text-xs font-bold tracking-[0.18em] text-stone-400">进阶功能</div>
          {[
            [PROFESSIONAL_FEATURE_JOINT, '八字+紫微联合分析'],
            [PROFESSIONAL_FEATURE_BAZI_COMPAT, '八字合盘'],
          ].map(([feature, label]) => {
            const selected = professionalSelectedProject === feature;
            return (
              <button
                key={feature}
                type="button"
                onClick={() => {
                  openProfessionalFeature(feature);
                  if (mobile) setActiveCompactPanel(null);
                }}
                className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${
                  selected
                    ? 'glass-panel-dark border-transparent text-amber-200 shadow-sm'
                    : 'border-stone-100 bg-white/60 text-stone-700 hover:bg-white hover:text-stone-900'
                }`}
              >
                <span>{label}</span>
                <span className={selected ? 'text-amber-200' : 'text-stone-300'}>›</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="px-2 text-xs font-bold tracking-[0.18em] text-stone-400">个人工作区</div>
          {[
            ['records', '命理记录'],
            ['chat', '新聊天'],
            ['settings', '设置'],
          ].map(([view, label]) => {
            const selected = workspaceView === view;
            return (
              <button
                key={view}
                type="button"
                onClick={() => {
                  navigateWorkspace(view as Exclude<WorkspaceView, 'divination'>);
                  if (mobile) setActiveCompactPanel(null);
                }}
                className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition ${
                  selected
                    ? 'glass-panel-dark border-transparent text-amber-200 shadow-sm'
                    : 'border-stone-100 bg-white/60 text-stone-700 hover:bg-white hover:text-stone-900'
                }`}
              >
                <span>{label}</span>
                <span className={selected ? 'text-amber-200' : 'text-stone-300'}>›</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );

  const renderMobileBottomNav = () => (
    <nav className="fixed inset-x-3 bottom-3 z-20 rounded-2xl border border-stone-100 bg-white/86 p-2 shadow-lg shadow-stone-900/10 backdrop-blur-xl xl:hidden" aria-label="移动端主导航">
      <div className="grid grid-cols-5 gap-1">
        {[
          { id: ModelType.BAZI, label: '八字', action: () => handleModelChange(ModelType.BAZI), active: modelType === ModelType.BAZI && workspaceView === 'divination' },
          { id: ModelType.DAILY_FORTUNE, label: '日运', action: () => handleModelChange(ModelType.DAILY_FORTUNE), active: modelType === ModelType.DAILY_FORTUNE && workspaceView === 'divination' },
          { id: 'records-bottom', label: '记录', action: () => navigateWorkspace('records'), active: workspaceView === 'records' },
          { id: 'chat-bottom', label: '聊天', action: () => navigateWorkspace('chat'), active: workspaceView === 'chat' },
          { id: 'more-bottom', label: '更多', action: () => setActiveCompactPanel((current) => (current === 'more' ? null : 'more')), active: activeCompactPanel === 'more' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.action}
            className={`rounded-2xl px-2 py-2 text-xs font-bold transition ${
              item.active ? 'bg-stone-900 text-amber-200 shadow-sm' : 'text-stone-500 hover:bg-white/70 hover:text-stone-900'
            }`}
          >
            {item.id === 'more-bottom' && <span className="block text-base leading-none">+</span>}
            <span className="block">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );

  const getRecordCategory = (item: SessionItem): 'life' | 'forecast' | 'fortune' | 'tool' | 'chat' => {
    if (item.modelType === 'chat') return 'chat';
    if ([ModelType.BAZI, ModelType.ZIWEI].includes(item.modelType as ModelType)) return 'life';
    if ([ModelType.DAILY_FORTUNE, ModelType.MONTHLY_FORTUNE].includes(item.modelType as ModelType)) return 'fortune';
    if (item.modelType === ModelType.ALMANAC) return 'tool';
    return 'forecast';
  };

  const recordFilterOptions: Array<{ key: typeof recordsFilter; label: string; description: string }> = [
    { key: 'all', label: '全部', description: '所有 AI 记录' },
    { key: 'life', label: '命理', description: '八字、紫微' },
    { key: 'forecast', label: '占卜', description: '奇门、六爻等' },
    { key: 'fortune', label: '运势', description: '日运、月运' },
    { key: 'tool', label: '择日', description: '黄历择日' },
    { key: 'chat', label: '聊天', description: '独立问答' },
  ];

  const getRecordTime = (item: SessionItem) => {
    const raw = item.updatedAt || item.createdAt;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? new Date(0) : date;
  };

  const scopedRecords = savedSessions.filter((item) => {
    if (recordsScope === 'archived') return Boolean(item.isArchived);
    if (recordsScope === 'pinned') return Boolean(item.isPinned) && !item.isArchived;
    return !item.isArchived;
  });

  const filteredRecords = scopedRecords
    .filter((item) => {
      if (recordsFilter !== 'all' && getRecordCategory(item) !== recordsFilter) return false;
      const term = recordsSearch.trim().toLowerCase();
      if (!term) return true;
      return (
        item.title.toLowerCase().includes(term) ||
        (MODEL_LABELS[item.modelType] || item.modelType).toLowerCase().includes(term) ||
        (item.isPinned ? '置顶' : '').includes(term) ||
        (item.isArchived ? '归档' : '').includes(term)
      );
    })
    .sort((a, b) => {
      if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
      return getRecordTime(b).getTime() - getRecordTime(a).getTime();
    });

  const recordGroups = filteredRecords.reduce<Array<{ label: string; items: SessionItem[] }>>((groups, item) => {
    const date = getRecordTime(item);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    let label = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    if (date >= today) label = '今天';
    else if (date >= yesterday) label = '昨天';
    else if (date >= weekAgo) label = '近7天';

    const existing = groups.find((group) => group.label === label);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
    return groups;
  }, []);

  const recordCounts = recordFilterOptions.reduce<Record<string, number>>((counts, option) => {
    counts[option.key] = option.key === 'all'
      ? scopedRecords.length
      : scopedRecords.filter((item) => getRecordCategory(item) === option.key).length;
    return counts;
  }, {});
  const recordScopeCounts = {
    active: savedSessions.filter((item) => !item.isArchived).length,
    pinned: savedSessions.filter((item) => item.isPinned && !item.isArchived).length,
    archived: savedSessions.filter((item) => item.isArchived).length,
  };
  const selectedRecord = filteredRecords.find((item) => item.id === activeSessionId) || filteredRecords[0] || null;
  const latestRecord = savedSessions
    .slice()
    .sort((a, b) => getRecordTime(b).getTime() - getRecordTime(a).getTime())[0] || null;
  const getRecordCategoryLabel = (item: SessionItem) => (
    recordFilterOptions.find((option) => option.key === getRecordCategory(item))?.label || '记录'
  );
  const getRecordMessageCount = (item: SessionItem) => item._count?.messages ?? 0;
  const handleExportRecords = (records: SessionItem[], filenamePrefix: string) => {
    if (!records.length || typeof window === 'undefined') return;
    const payload = {
      app: '元分 · 智解',
      type: 'divination_sessions',
      exportedAt: new Date().toISOString(),
      count: records.length,
      records: records.map((item) => ({
        id: item.id,
        title: item.title,
        modelType: item.modelType,
        category: getRecordCategoryLabel(item),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        isPinned: Boolean(item.isPinned),
        isArchived: Boolean(item.isArchived),
        messageCount: getRecordMessageCount(item),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const formatSessionDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatRecordAge = (item: SessionItem) => {
    const date = getRecordTime(item);
    const diff = Date.now() - date.getTime();
    if (!Number.isFinite(diff) || diff < 0) return formatSessionDate(item.updatedAt || item.createdAt);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚更新';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
    return formatSessionDate(item.updatedAt || item.createdAt);
  };

  const renderRecordsWorkspace = () => (
    <div className="glass-panel rounded-2xl p-5 md:p-7">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-stone-100 pb-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">个人工作区</div>
          <div className="mt-1 text-2xl font-bold text-stone-800">命理记录</div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleExportRecords(filteredRecords, 'zhijie-records-filtered')}
            disabled={filteredRecords.length === 0}
            className="rounded-full border border-stone-100 bg-white/70 px-3 py-2 text-xs font-semibold text-stone-500 transition hover:bg-white hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            导出筛选
          </button>
          <button
            type="button"
            onClick={() => handleExportRecords(savedSessions, 'zhijie-records-all')}
            disabled={savedSessions.length === 0}
            className="rounded-full border border-stone-100 bg-white/70 px-3 py-2 text-xs font-semibold text-stone-500 transition hover:bg-white hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            导出全部
          </button>
          <button
            type="button"
            onClick={() => handleModelChange(ModelType.BAZI)}
            className="glass-cta rounded-2xl px-4 py-2.5 text-sm font-semibold text-amber-300 hover:brightness-105 transition"
          >
            新建排盘
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-stone-100 bg-white/55 p-2">
        {[
          ['active', '当前记录', recordScopeCounts.active],
          ['pinned', '置顶', recordScopeCounts.pinned],
          ['archived', '归档', recordScopeCounts.archived],
        ].map(([scope, label, count]) => {
          const selected = recordsScope === scope;
          return (
            <button
              key={scope}
              type="button"
              onClick={() => setRecordsScope(scope as typeof recordsScope)}
              className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
                selected
                  ? 'glass-panel-dark text-amber-200'
                  : 'bg-white/70 text-stone-500 hover:bg-white hover:text-stone-800'
              }`}
            >
              {label}
              <span className={`ml-2 text-xs ${selected ? 'text-amber-100/80' : 'text-stone-400'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {recordFilterOptions.map((option) => {
          const selected = recordsFilter === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setRecordsFilter(option.key)}
              className={`rounded-full border px-3 py-2 text-sm font-bold transition ${
                selected
                  ? 'glass-panel-dark border-transparent text-amber-100 shadow-sm'
                  : 'border-stone-100 bg-white/70 text-stone-600 hover:bg-white'
              }`}
            >
              {option.label}
              <span className={`ml-2 text-xs ${selected ? 'text-amber-200' : 'text-stone-400'}`}>{recordCounts[option.key] || 0}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-5">
        <input
          value={recordsSearch}
          onChange={(event) => setRecordsSearch(event.target.value)}
          placeholder="搜索记录名称或类型"
          className="glass-input w-full rounded-2xl border border-stone-100 px-4 py-3 text-sm outline-none"
        />
      </div>

      {!isLoggedIn && (
        <div className="glass-banner mb-5 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm text-amber-800">
          登录后可查看和管理云端记录。
        </div>
      )}

      {sessionsLoading || authStatus === 'loading' ? (
        <div className="glass-panel-soft rounded-[28px] border border-white/60 px-5 py-10 text-center text-sm text-stone-500">
          正在读取记录...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="glass-panel-soft rounded-[28px] border border-white/60 px-5 py-14 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-white/70 bg-white/65 text-2xl text-stone-400">
            录
          </div>
          <div className="mt-5 text-base font-bold text-stone-700">暂无记录</div>
          <div className="mt-2 text-sm text-stone-500">完成 AI 对话后，记录会显示在这里。</div>
          <button
            type="button"
            onClick={() => handleModelChange(ModelType.BAZI)}
            className="glass-cta mt-6 rounded-2xl px-5 py-2.5 text-sm font-semibold text-amber-300 hover:brightness-105 transition"
          >
            新建排盘
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-5">
            {recordGroups.map((group) => (
              <section key={group.label} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="text-xs font-bold tracking-[0.18em] text-stone-400">{group.label}</div>
                  <div className="text-xs text-stone-400">{group.items.length} 条</div>
                </div>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const selected = activeSessionId === item.id;
                    const category = getRecordCategoryLabel(item);
                    const messageCount = getRecordMessageCount(item);
                    return (
                      <div
                        key={item.id}
                        className={`group rounded-[22px] border px-4 py-3 transition ${
                          selected
                            ? 'glass-panel-dark border-transparent text-amber-100'
                            : 'glass-panel-soft border-white/60 text-stone-700 hover:bg-white/75'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => handleOpenRecordWorkspaceSession(item.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-base font-bold">{item.title}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                                selected ? 'bg-white/10 text-amber-100' : 'bg-white/70 text-stone-500'
                              }`}>
                                {MODEL_LABELS[item.modelType] || item.modelType}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                                selected ? 'bg-white/10 text-amber-100/80' : 'bg-stone-50 text-stone-400'
                              }`}>
                                {category}
                              </span>
                              {item.isPinned && (
                                <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                                  selected ? 'bg-white/10 text-amber-100/80' : 'bg-amber-50 text-amber-700'
                                }`}>
                                  置顶
                                </span>
                              )}
                              {item.isArchived && (
                                <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                                  selected ? 'bg-white/10 text-amber-100/70' : 'bg-stone-100 text-stone-500'
                                }`}>
                                  归档
                                </span>
                              )}
                            </div>
                            <div className={`mt-1 text-xs ${selected ? 'text-amber-100/75' : 'text-stone-500'}`}>
                              更新：{formatRecordAge(item)} · {messageCount} 条消息
                            </div>
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleUpdateSessionFlags(item.id, { isPinned: !item.isPinned })}
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                item.isPinned
                                  ? selected
                                    ? 'border-amber-200/40 text-amber-100 hover:bg-white/10'
                                    : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : selected
                                    ? 'border-amber-200/30 text-amber-100/80 hover:bg-white/10'
                                    : 'border-stone-200 text-stone-500 hover:border-amber-200 hover:text-amber-700'
                              }`}
                            >
                              {item.isPinned ? '取消置顶' : '置顶'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleUpdateSessionFlags(item.id, { isArchived: !item.isArchived })}
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                selected
                                  ? 'border-stone-200/30 text-amber-100/80 hover:bg-white/10'
                                  : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-white/70'
                              }`}
                            >
                              {item.isArchived ? '取消归档' : '归档'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenRecordWorkspaceSession(item.id)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                selected
                                  ? 'border-amber-200/40 text-amber-100 hover:bg-white/10'
                                  : 'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-white/70'
                              }`}
                            >
                              打开
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteSession(item.id)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                selected
                                  ? 'border-red-200/40 text-red-100 hover:bg-red-500/10'
                                  : 'border-red-200 text-red-500 hover:border-red-300 hover:text-red-600'
                              }`}
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <aside className="hidden">
            <div className="glass-panel-soft rounded-[28px] border border-white/60 p-5">
              <div className="text-xs font-bold tracking-[0.18em] text-stone-400">记录概览</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/60 bg-white/60 px-3 py-3">
                  <div className="text-[11px] text-stone-400">总记录</div>
                  <div className="mt-1 text-xl font-bold text-stone-800">{savedSessions.length}</div>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/60 px-3 py-3">
                  <div className="text-[11px] text-stone-400">当前筛选</div>
                  <div className="mt-1 text-xl font-bold text-stone-800">{filteredRecords.length}</div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {recordFilterOptions.filter((option) => option.key !== 'all').map((option) => {
                  const count = recordCounts[option.key] || 0;
                  const ratio = savedSessions.length ? Math.round((count / savedSessions.length) * 100) : 0;
                  return (
                    <div key={option.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-stone-500">
                        <span>{option.label}</span>
                        <span>{count} · {ratio}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full rounded-full bg-amber-400/80" style={{ width: `${ratio}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel-soft rounded-[28px] border border-white/60 p-5">
              <div className="text-xs font-bold tracking-[0.18em] text-stone-400">当前记录</div>
              {selectedRecord ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="text-lg font-bold leading-7 text-stone-800">{selectedRecord.title}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/70 bg-white/70 px-2.5 py-1 text-xs font-semibold text-stone-600">
                        {MODEL_LABELS[selectedRecord.modelType] || selectedRecord.modelType}
                      </span>
                      <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {getRecordCategoryLabel(selectedRecord)}
                      </span>
                      {selectedRecord.isPinned && (
                        <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          置顶
                        </span>
                      )}
                      {selectedRecord.isArchived && (
                        <span className="rounded-full border border-stone-200 bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-500">
                          归档
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 rounded-2xl border border-white/60 bg-white/58 px-3 py-3 text-xs leading-6 text-stone-500">
                    <div>创建：{formatSessionDate(selectedRecord.createdAt)}</div>
                    <div>更新：{formatSessionDate(selectedRecord.updatedAt || selectedRecord.createdAt)}</div>
                    <div>消息：{getRecordMessageCount(selectedRecord)} 条</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleUpdateSessionFlags(selectedRecord.id, { isPinned: !selectedRecord.isPinned })}
                      className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                    >
                      {selectedRecord.isPinned ? '取消置顶' : '置顶'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleUpdateSessionFlags(selectedRecord.id, { isArchived: !selectedRecord.isArchived })}
                      className="rounded-2xl border border-stone-200 bg-white/60 px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-white"
                    >
                      {selectedRecord.isArchived ? '取消归档' : '归档'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenRecordWorkspaceSession(selectedRecord.id)}
                      className="glass-cta flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold text-amber-300 hover:brightness-105 transition"
                    >
                      打开记录
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteSession(selectedRecord.id)}
                      className="rounded-2xl border border-red-200 bg-red-50/60 px-4 py-2.5 text-sm font-semibold text-red-500 transition hover:border-red-300 hover:text-red-600"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm text-stone-400">请选择一条记录。</div>
              )}
            </div>

            {latestRecord && (
              <div className="glass-panel-soft rounded-[28px] border border-white/60 p-5 text-sm leading-7 text-stone-600">
                <div className="text-xs font-bold tracking-[0.18em] text-stone-400">最近更新</div>
                <div className="mt-3 font-bold text-stone-800">{latestRecord.title}</div>
                <div className="text-xs text-stone-500">{formatRecordAge(latestRecord)}</div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );

  const standaloneSelectedCases = standaloneSelectedCaseIds
    .map((id) => standaloneCaseOptions.find((item) => item.id === id))
    .filter((item): item is CaseItem => Boolean(item));
  const standaloneAvailableCaseOptions = standaloneCaseOptions.filter((item) => !standaloneSelectedCaseIds.includes(item.id));

  const renderChatWorkspace = () => (
    <div className="glass-panel flex h-[calc(100vh-128px)] min-h-[620px] flex-col overflow-hidden rounded-[32px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-6 py-4 md:px-8">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">个人工作区</div>
          <div className="mt-1 text-2xl font-bold text-stone-800">新聊天</div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex flex-wrap items-center gap-2 rounded-full border border-stone-200 bg-white/65 px-2 py-1">
            <span className="pl-1 text-xs font-semibold text-stone-500">引用命例</span>
            <select
              value={standaloneCaseSelectValue}
              onChange={(event) => setStandaloneCaseSelectValue(event.target.value)}
              className="max-w-[180px] rounded-full border border-stone-200 bg-white/80 px-2.5 py-1 text-xs font-semibold text-stone-600 outline-none disabled:opacity-45"
              disabled={standaloneAvailableCaseOptions.length === 0}
            >
              <option value="">{standaloneAvailableCaseOptions.length ? '选择命例' : '暂无命例'}</option>
              {standaloneAvailableCaseOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {getCaseModelDisplayLabel(item.modelType)} · {getCaseDisplayName(item)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddStandaloneCaseReference}
              disabled={!standaloneCaseSelectValue}
              className="rounded-full bg-stone-900 px-2.5 py-1 text-xs font-semibold text-amber-200 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
            >
              添加
            </button>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={standaloneChatUseKnowledge}
            onClick={() => setStandaloneChatUseKnowledge((current) => !current)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              standaloneChatUseKnowledge
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-stone-200 bg-white/60 text-stone-500'
            }`}
          >
            参考古籍：{standaloneChatUseKnowledge ? '开' : '关'}
          </button>
          <select
            value={standaloneChatKnowledgeBoard}
            onChange={(event) => setStandaloneChatKnowledgeBoard(event.target.value as 'bazi' | 'qimen')}
            disabled={!standaloneChatUseKnowledge}
            className="rounded-full border border-stone-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-stone-600 outline-none disabled:opacity-45"
          >
            <option value="bazi">四柱八字</option>
            <option value="qimen">奇门遁甲</option>
          </select>
        </div>
      </div>
      {standaloneSelectedCases.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100/80 bg-white/42 px-6 py-3 md:px-8">
          <span className="text-xs font-semibold text-stone-400">已引用</span>
          {standaloneSelectedCases.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50/80 px-3 py-1.5 text-xs font-semibold text-stone-700"
            >
              <span className="text-amber-700">{getCaseModelDisplayLabel(item.modelType)}</span>
              <span>{getCaseDisplayName(item)}</span>
              <button
                type="button"
                onClick={() => handleRemoveStandaloneCaseReference(item.id)}
                className="text-stone-400 transition hover:text-stone-700"
                aria-label={`移除${getCaseDisplayName(item)}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="glass-chat-bg glass-scrollbar flex-1 overflow-y-auto px-4 py-5 md:px-8">
        {standaloneChatMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="text-xl font-bold text-stone-700">今天想问什么？</div>
            <div className="mt-2 max-w-lg text-sm leading-7 text-stone-500">
              可直接提问，也可以先进入排盘结果页，让问题自动携带盘面上下文。
            </div>
            <div className="mt-7 grid w-full max-w-3xl gap-2 md:grid-cols-2">
              {[
                '结合最近运势，今天适合推进什么？',
                '帮我把当前问题拆成可行动的建议',
                '参考古籍解释一个盘面判断',
                '把结论整理成简洁要点',
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setStandaloneChatInput(prompt)}
                  className="rounded-2xl border border-white/65 bg-white/58 px-4 py-3 text-left text-sm text-stone-600 transition hover:bg-white/85 hover:text-stone-900"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-5">
            {standaloneChatMessages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 text-xs font-bold text-stone-500">
                    解
                  </div>
                )}
                <div className={`max-w-[86%] rounded-[22px] px-4 py-3 text-sm leading-7 shadow-sm ${
                  msg.role === 'user'
                    ? 'rounded-tr-md bg-stone-900 text-white'
                    : 'rounded-tl-md border border-white/65 bg-white/72 text-stone-800'
                }`}>
                  <MarkdownContent content={msg.content} />
                  {msg.role === 'model' && (
                    <KnowledgeSourceSummaryPanel sources={msg.knowledgeSources || messageSourceMap[msg.id]} />
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-xs font-bold text-amber-200">
                    我
                  </div>
                )}
              </div>
            ))}
            {standaloneChatLoading && (
              <div className="inline-flex rounded-full border border-white/65 bg-white/70 px-3 py-1.5 text-xs text-stone-500">
                正在回复...
              </div>
            )}
          </div>
        )}
      </div>

      {standaloneChatError && (
        <div className="border-t border-red-100 bg-red-50/70 px-4 py-2 text-xs text-red-600">
          {standaloneChatError}
        </div>
      )}
      <form onSubmit={handleStandaloneChatSubmit} className="border-t border-white/60 bg-white/60 p-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-end gap-3 rounded-[26px] border border-white/70 bg-white/72 p-2 shadow-sm">
          <textarea
            value={standaloneChatInput}
            onChange={(event) => setStandaloneChatInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleStandaloneChatSubmit(event as unknown as React.FormEvent<HTMLFormElement>);
              }
            }}
            placeholder="输入你的问题..."
            rows={1}
            className="max-h-36 min-h-12 min-w-0 flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-6 text-stone-800 outline-none placeholder:text-stone-400"
          />
          <button
            type="submit"
            disabled={!standaloneChatInput.trim() || standaloneChatLoading}
            className="glass-cta h-12 rounded-2xl px-5 text-sm font-semibold text-amber-300 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );

  const renderSettingsWorkspace = () => (
    <div className="glass-panel overflow-hidden rounded-[32px]">
      <div className="border-b border-stone-100 px-6 py-5 md:px-8">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">个人工作区</div>
        <div className="mt-1 text-2xl font-bold text-stone-800">设置</div>
      </div>

      <div className="grid min-h-[520px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-stone-100 bg-white/35 p-3 lg:border-b-0 lg:border-r">
          <div className="flex gap-2 overflow-x-auto lg:block lg:space-y-1">
            {SETTINGS_WORKSPACE_TABS.map((tab) => {
              const selected = settingsWorkspaceTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSettingsWorkspaceTabChange(tab.id)}
                  className={`flex min-w-[142px] items-center gap-3 rounded-2xl px-3 py-3 text-left transition lg:w-full ${
                    selected
                      ? 'bg-stone-200/70 text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:bg-white/70 hover:text-stone-800'
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                    selected ? 'bg-white/75 text-stone-800' : 'bg-white/45 text-stone-400'
                  }`}>
                    {tab.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{tab.label}</span>
                    <span className={`block truncate text-[11px] ${selected ? 'text-stone-500' : 'text-stone-400'}`}>
                      {tab.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 p-5 md:p-7">
          {settingsWorkspaceTab === 'profile' && (
            <div className="space-y-5">
              <div>
                <div className="text-lg font-bold text-stone-800">账户信息</div>
                <div className="mt-1 text-sm text-stone-500">查看当前登录账户与 AI 解读额度。</div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/65 bg-white/60 p-4">
                  <div className="text-xs text-stone-400">昵称</div>
                  <div className="mt-2 truncate text-base font-bold text-stone-800">{authSession?.user?.name || '未登录'}</div>
                </div>
                <div className="rounded-2xl border border-white/65 bg-white/60 p-4">
                  <div className="text-xs text-stone-400">邮箱</div>
                  <div className="mt-2 truncate text-base font-bold text-stone-800">{authSession?.user?.email || '未登录'}</div>
                </div>
                <div className="rounded-2xl border border-white/65 bg-white/60 p-4">
                  <div className="text-xs text-stone-400">剩余额度</div>
                  <div className="mt-2 text-base font-bold text-stone-800">{userQuota ?? '-'}</div>
                </div>
              </div>
              <div className="rounded-3xl border border-white/65 bg-white/55 p-5">
                <div className="text-sm font-bold text-stone-700">使用规则</div>
                <div className="mt-3 grid gap-3 text-sm leading-7 text-stone-600 md:grid-cols-2">
                  <div className="rounded-2xl border border-stone-100 bg-white/55 p-4">排盘浏览不会扣除额度。</div>
                  <div className="rounded-2xl border border-stone-100 bg-white/55 p-4">只有主动发起 AI 解读或追问时消耗额度。</div>
                </div>
              </div>
            </div>
          )}

          {settingsWorkspaceTab === 'general' && (
            <div className="space-y-5">
              <div>
                <div className="text-lg font-bold text-stone-800">常规偏好</div>
                <div className="mt-1 text-sm text-stone-500">保留简洁默认设置，避免干扰排盘和问答。</div>
              </div>
              <div className="divide-y divide-stone-100 overflow-hidden rounded-3xl border border-white/65 bg-white/58">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <div className="text-sm font-bold text-stone-700">默认入口</div>
                    <div className="mt-1 text-xs text-stone-400">进入网站后优先显示四柱八字。</div>
                  </div>
                  <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600">四柱八字</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <div className="text-sm font-bold text-stone-700">历史记录</div>
                    <div className="mt-1 text-xs text-stone-400">只保存发生过 AI 对话的会话。</div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">已启用</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <div className="text-sm font-bold text-stone-700">知识参考</div>
                    <div className="mt-1 text-xs text-stone-400">支持在八字、奇门等问答中参考古籍资料。</div>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">手动控制</span>
                </div>
              </div>
            </div>
          )}

          {settingsWorkspaceTab === 'charts' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-stone-800">我的命盘</div>
                  <div className="mt-1 text-sm text-stone-500">集中查看八字和紫微命例，日运、月运会优先使用这里的八字命例。</div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleModelChange(ModelType.BAZI)}
                    className="glass-chip rounded-2xl px-4 py-2 text-sm font-semibold text-stone-600 hover:text-stone-900"
                  >
                    新增八字
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModelChange(ModelType.ZIWEI)}
                    className="glass-chip rounded-2xl px-4 py-2 text-sm font-semibold text-stone-600 hover:text-stone-900"
                  >
                    新增紫微
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ['全部命例', standaloneCaseOptions.length],
                  ['八字命例', standaloneCaseOptions.filter((item) => item.modelType === ModelType.BAZI).length],
                  ['紫微命例', standaloneCaseOptions.filter((item) => item.modelType === ModelType.ZIWEI).length],
                ].map(([label, count]) => (
                  <div key={label} className="rounded-2xl border border-white/65 bg-white/60 p-4">
                    <div className="text-xs text-stone-400">{label}</div>
                    <div className="mt-2 text-2xl font-bold text-stone-800">{count}</div>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/65 bg-white/55">
                {standaloneCaseOptions.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <div className="text-base font-bold text-stone-700">暂无命例</div>
                    <div className="mt-2 text-sm text-stone-500">先新增八字或紫微命例，再使用运势和联合分析。</div>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {standaloneCaseOptions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          handleModelChange(item.modelType as ModelType);
                          setTimeout(() => void loadCaseDetail(item.id), 80);
                        }}
                        className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-white/70"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-bold text-stone-800">{getCaseDisplayName(item)}</span>
                            <span className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              {getCaseModelDisplayLabel(item.modelType)}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-stone-400">
                            更新：{formatSessionDate(item.updatedAt || item.createdAt)}
                          </div>
                        </div>
                        <span className="rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs font-semibold text-stone-500">
                          打开
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {settingsWorkspaceTab === 'knowledge' && (
            <div className="space-y-5">
              <div>
                <div className="text-lg font-bold text-stone-800">知识参考</div>
                <div className="mt-1 text-sm text-stone-500">控制问答是否参考内置资料。开关只影响 AI 提问，不影响排盘。</div>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                {KNOWLEDGE_REFERENCE_BOARDS.map((board) => {
                  const active = board.status === '已接入';
                  return (
                    <div
                      key={board.id}
                      className={`rounded-3xl border p-5 ${
                        active
                          ? 'border-emerald-100 bg-emerald-50/45'
                          : 'border-stone-200 bg-white/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-stone-800">{board.title}</div>
                          <div className="mt-1 text-xs leading-6 text-stone-500">{board.description}</div>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          active ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'
                        }`}>
                          {board.status}
                        </span>
                      </div>
                      <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">索引</div>
                      <div className="mt-1 truncate rounded-2xl border border-white/70 bg-white/62 px-3 py-2 text-xs font-medium text-stone-500">
                        {board.file}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {board.coverage.map((item) => (
                          <span key={item} className="rounded-full border border-white/70 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-stone-600">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="divide-y divide-stone-100 overflow-hidden rounded-3xl border border-white/65 bg-white/58">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <div className="text-sm font-bold text-stone-700">排盘问答参考古籍</div>
                    <div className="mt-1 text-xs text-stone-400">八字、奇门等支持携带内置资料片段。</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={useKnowledge}
                    onClick={() => setUseKnowledge((current) => !current)}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                      useKnowledge ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {useKnowledge ? '已开启' : '已关闭'}
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <div className="text-sm font-bold text-stone-700">独立聊天参考资料</div>
                    <div className="mt-1 text-xs text-stone-400">新聊天中可选择四柱八字或奇门遁甲资料。</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={standaloneChatUseKnowledge}
                    onClick={() => setStandaloneChatUseKnowledge((current) => !current)}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                      standaloneChatUseKnowledge ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {standaloneChatUseKnowledge ? '已开启' : '已关闭'}
                  </button>
                </div>
                <div className="px-5 py-4">
                  <div className="text-sm font-bold text-stone-700">默认资料方向</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      ['bazi', '四柱八字'],
                      ['qimen', '奇门遁甲'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setStandaloneChatKnowledgeBoard(value as 'bazi' | 'qimen')}
                        className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                          standaloneChatKnowledgeBoard === value
                            ? 'glass-panel-dark border-transparent text-amber-200'
                            : 'border-stone-200 bg-white/65 text-stone-600 hover:bg-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="px-5 py-4">
                  <div className="text-sm font-bold text-stone-700">引用展示规则</div>
                  <div className="mt-3 grid gap-3 text-sm leading-7 text-stone-600 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/65 bg-white/56 p-4">
                      <div className="font-bold text-stone-700">检索</div>
                      <div className="mt-1 text-xs leading-6 text-stone-500">AI 提问时按问题和盘面摘要检索资料片段。</div>
                    </div>
                    <div className="rounded-2xl border border-white/65 bg-white/56 p-4">
                      <div className="font-bold text-stone-700">注入</div>
                      <div className="mt-1 text-xs leading-6 text-stone-500">只把高相关片段作为参考上下文，不改变本地排盘结果。</div>
                    </div>
                    <div className="rounded-2xl border border-white/65 bg-white/56 p-4">
                      <div className="font-bold text-stone-700">来源</div>
                      <div className="mt-1 text-xs leading-6 text-stone-500">回答下方会显示资料标题、来源和相关度，便于核对。</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {settingsWorkspaceTab === 'help' && (
            <div className="space-y-5">
              <div>
                <div className="text-lg font-bold text-stone-800">帮助</div>
                <div className="mt-1 text-sm text-stone-500">常见使用规则和记录逻辑。</div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ['排盘是否消耗额度？', '不消耗。只有主动请求 AI 解读、重新分析或追问时才消耗额度。'],
                  ['为什么记录里没有刚看的盘？', '只浏览排盘不会保存历史；发生 AI 对话后才会进入记录。'],
                  ['日运和月运如何选择命例？', '它们会读取已保存的八字命例，可在页面顶部切换命主。'],
                  ['如何让回答带盘面？', '在排盘结果页直接提问，系统会自动携带当前盘面上下文。'],
                ].map(([title, content]) => (
                  <div key={title} className="rounded-3xl border border-white/65 bg-white/58 p-5">
                    <div className="text-sm font-bold text-stone-800">{title}</div>
                    <div className="mt-2 text-sm leading-7 text-stone-500">{content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {settingsWorkspaceTab === 'security' && (
            <div className="space-y-5">
              <div>
                <div className="text-lg font-bold text-stone-800">安全</div>
                <div className="mt-1 text-sm text-stone-500">管理登录状态、密码与账号。</div>
              </div>
              {!isLoggedIn ? (
                <div className="rounded-3xl border border-white/65 bg-white/58 p-5">
                  <div className="text-sm font-bold text-stone-700">尚未登录</div>
                  <div className="mt-1 text-sm text-stone-500">登录后可同步记录并使用账户管理。</div>
                  <button
                    type="button"
                    onClick={() => setShowAuth(true)}
                    className="glass-cta mt-4 rounded-2xl px-4 py-2.5 text-sm font-semibold text-amber-300"
                  >
                    登录 / 注册
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-stone-100 overflow-hidden rounded-3xl border border-white/65 bg-white/58">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <div className="text-sm font-bold text-stone-700">修改密码</div>
                      <div className="mt-1 text-xs text-stone-400">定期更新密码以保护账户。</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowChangePassword(true)}
                      className="glass-chip rounded-2xl px-4 py-2.5 text-sm font-semibold text-stone-600 hover:text-stone-900"
                    >
                      修改密码
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <div className="text-sm font-bold text-stone-700">退出登录</div>
                      <div className="mt-1 text-xs text-stone-400">退出当前浏览器上的登录状态。</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="glass-chip rounded-2xl px-4 py-2.5 text-sm font-semibold text-stone-600 hover:text-stone-900"
                    >
                      退出
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <div className="text-sm font-bold text-red-600">注销账号</div>
                      <div className="mt-1 text-xs text-stone-400">永久删除账号前请确认已备份需要的信息。</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAccountSettings(true)}
                      className="rounded-2xl border border-red-200 bg-red-50/60 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50"
                    >
                      注销账号
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );

  const renderProfessionalWorkspace = () => (
    <div className="space-y-5 animate-fade-in border-t border-stone-100 pt-6">
      {professionalSelectedProject === PROFESSIONAL_FEATURE_JOINT && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-stone-700">八字 + 紫微联合分析</div>
              <div className="mt-1 text-sm text-stone-500">
                可直接选已有命例，也可新建联合命例。首次分析默认做全盘解读。
              </div>
            </div>
            <button
              type="button"
              onClick={() => openProfessionalFeature(PROFESSIONAL_FEATURE_JOINT)}
              className="glass-chip rounded-full px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700"
            >
              重置
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setProfessionalMode('existing')}
              className={`flex-1 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                professionalMode === 'existing'
                  ? 'glass-panel-dark border-transparent text-amber-200'
                  : 'glass-chip text-stone-600'
              }`}
            >
              选择已有命例
            </button>
            <button
              type="button"
              onClick={() => setProfessionalMode('new')}
              className={`flex-1 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                professionalMode === 'new'
                  ? 'glass-panel-dark border-transparent text-amber-200'
                  : 'glass-chip text-stone-600'
              }`}
            >
              新建联合命例
            </button>
          </div>

          {professionalMode === 'existing' && (
            <div className="space-y-4">
              <div className="glass-panel-soft rounded-[28px] border border-white/60 p-4">
                <div className="text-sm font-bold text-stone-700">已有命例</div>
                <div className="mt-4 max-h-[52vh] overflow-y-auto overscroll-contain pr-1">
                  <div className="grid gap-3 md:grid-cols-2">
                    {professionalCasesLoading && (
                      <div className="col-span-full text-sm text-stone-400">正在读取命例...</div>
                    )}
                    {!professionalCasesLoading && professionalCaseOptions.length === 0 && (
                      <div className="col-span-full rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-400">
                        暂无可用命例，请切换到“新建联合命例”。
                      </div>
                    )}
                    {professionalCaseOptions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setProfessionalSelectedCaseId(item.id)}
                        className={`rounded-[24px] border px-4 py-3 text-left transition ${
                          professionalSelectedCaseId === item.id
                            ? 'glass-panel-dark border-transparent text-amber-200'
                            : 'glass-panel bg-white/70 border-white/60 text-stone-700 hover:bg-white/85'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold">{item.title}</div>
                            {getCaseSexLabel(item.chartParams) && (
                              <div className={`mt-1 text-xs ${professionalSelectedCaseId === item.id ? 'text-amber-100/80' : 'text-stone-500'}`}>
                                {getCaseSexLabel(item.chartParams)}
                              </div>
                            )}
                            <div className={`mt-1 text-xs ${professionalSelectedCaseId === item.id ? 'text-amber-100/80' : 'text-stone-500'}`}>
                              四柱：{getCasePillarsPreview(item.modelType, item.chartData) || '未获取'}
                            </div>
                          </div>
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] ${
                            professionalSelectedCaseId === item.id
                              ? 'border-amber-200/30 text-amber-100'
                              : 'border-stone-200 text-stone-500'
                          }`}>
                            {item.modelType === ModelType.BAZI ? '八字' : '紫微'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleRunJointProfessionalFromExisting()}
                disabled={professionalBusy || !professionalSelectedCaseId}
                className={`glass-cta w-full rounded-2xl py-3.5 font-bold text-amber-300 transition ${
                  professionalBusy || !professionalSelectedCaseId ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-105'
                }`}
              >
                {professionalBusy ? '联合分析启动中...' : '开始联合分析'}
              </button>
            </div>
          )}

          {professionalMode === 'new' && (
            <div className="glass-panel-soft rounded-[28px] border border-white/60 p-5 md:p-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="block text-sm font-semibold text-stone-700">姓名（可选）</span>
                  <input
                    type="text"
                    value={professionalName}
                    onChange={(event) => setProfessionalName(event.target.value)}
                    className="glass-input mt-2 w-full rounded-2xl p-3 outline-none"
                    placeholder="请输入姓名"
                  />
                </label>
                <div>
                  <span className="block text-sm font-semibold text-stone-700">性别</span>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setProfessionalGender(0)}
                      className={`flex-1 rounded-2xl border py-2.5 transition ${professionalGender === 0 ? 'glass-panel-dark border-transparent text-amber-200' : 'glass-chip text-stone-600'}`}
                    >
                      男
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfessionalGender(1)}
                      className={`flex-1 rounded-2xl border py-2.5 transition ${professionalGender === 1 ? 'glass-panel-dark border-transparent text-amber-200' : 'glass-chip text-stone-600'}`}
                    >
                      女
                    </button>
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="block text-sm font-semibold text-stone-700">出生时间</span>
                <input
                  type="datetime-local"
                  value={professionalCustomDate}
                  onChange={(event) => setProfessionalCustomDate(event.target.value)}
                  className="glass-input mt-2 w-full rounded-2xl p-3 outline-none"
                />
              </label>

              <LocationSelector
                province={professionalProvince}
                city={professionalCity}
                setProvince={setProfessionalProvince}
                setCity={setProfessionalCity}
              />

              <button
                type="button"
                onClick={() => void handleRunJointProfessionalFromNew()}
                disabled={professionalBusy || !professionalCustomDate}
                className={`glass-cta w-full rounded-2xl py-3.5 font-bold text-amber-300 transition ${
                  professionalBusy || !professionalCustomDate ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-105'
                }`}
              >
                {professionalBusy ? '双盘排盘中...' : '排盘并开始联合分析'}
              </button>
            </div>
          )}
        </div>
      )}

      {professionalSelectedProject === PROFESSIONAL_FEATURE_BAZI_COMPAT && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-stone-700">八字合盘分析</div>
              <div className="mt-1 text-sm text-stone-500">
                为两位命例分别载入八字命盘，再结合关系标签做全盘合盘分析。
              </div>
            </div>
            <button
              type="button"
              onClick={() => openProfessionalFeature(PROFESSIONAL_FEATURE_BAZI_COMPAT)}
              className="glass-chip rounded-full px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700"
            >
              重置
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { key: 'A', label: '甲', state: compatPersonA, setState: setCompatPersonA },
              { key: 'B', label: '乙', state: compatPersonB, setState: setCompatPersonB },
            ].map((person) => (
              <div key={person.key} className="glass-panel-soft rounded-[28px] border border-white/60 p-5 space-y-4">
                <div>
                  <div className="text-sm font-bold text-stone-700">{person.label}方命例</div>
                  <div className="mt-1 text-xs text-stone-500">可直接选已有八字命例，也可新建一个八字命例。</div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => person.setState((current) => ({ ...current, mode: 'existing' }))}
                    className={`flex-1 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                      person.state.mode === 'existing'
                        ? 'glass-panel-dark border-transparent text-amber-200'
                        : 'glass-chip text-stone-600'
                    }`}
                  >
                    已有命例
                  </button>
                  <button
                    type="button"
                    onClick={() => person.setState((current) => ({ ...current, mode: 'new' }))}
                    className={`flex-1 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                      person.state.mode === 'new'
                        ? 'glass-panel-dark border-transparent text-amber-200'
                        : 'glass-chip text-stone-600'
                    }`}
                  >
                    新建命例
                  </button>
                </div>

                {person.state.mode === 'existing' ? (
                  <div className="max-h-[40vh] overflow-y-auto overscroll-contain pr-1">
                    <div className="space-y-2">
                      {professionalCasesLoading && (
                        <div className="text-sm text-stone-400">正在读取命例...</div>
                      )}
                      {!professionalCasesLoading && professionalCaseOptions.filter((item) => item.modelType === ModelType.BAZI).length === 0 && (
                        <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-400">
                          暂无八字命例，请切换到“新建命例”。
                        </div>
                      )}
                      {professionalCaseOptions
                        .filter((item) => item.modelType === ModelType.BAZI)
                        .map((item) => (
                          <button
                            key={`${person.key}-${item.id}`}
                            type="button"
                            onClick={() => person.setState((current) => ({ ...current, selectedCaseId: item.id }))}
                            className={`w-full rounded-[22px] border px-4 py-3 text-left transition ${
                              person.state.selectedCaseId === item.id
                                ? 'glass-panel-dark border-transparent text-amber-200'
                                : 'glass-panel bg-white/70 border-white/60 text-stone-700 hover:bg-white/85'
                            }`}
                          >
                            <div className="text-sm font-bold">{item.title}</div>
                            {getCaseSexLabel(item.chartParams) && (
                              <div className={`mt-1 text-xs ${person.state.selectedCaseId === item.id ? 'text-amber-100/80' : 'text-stone-500'}`}>
                                {getCaseSexLabel(item.chartParams)}
                              </div>
                            )}
                            <div className={`mt-1 text-xs ${person.state.selectedCaseId === item.id ? 'text-amber-100/80' : 'text-stone-500'}`}>
                              四柱：{getCasePillarsPreview(item.modelType, item.chartData) || '未获取'}
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="block">
                      <span className="block text-sm font-semibold text-stone-700">姓名（可选）</span>
                      <input
                        type="text"
                        value={person.state.name}
                        onChange={(event) => person.setState((current) => ({ ...current, name: event.target.value }))}
                        className="glass-input mt-2 w-full rounded-2xl p-3 outline-none"
                        placeholder="请输入姓名"
                      />
                    </label>

                    <div>
                      <span className="block text-sm font-semibold text-stone-700">性别</span>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => person.setState((current) => ({ ...current, gender: 0 }))}
                          className={`flex-1 rounded-2xl border py-2.5 transition ${person.state.gender === 0 ? 'glass-panel-dark border-transparent text-amber-200' : 'glass-chip text-stone-600'}`}
                        >
                          男
                        </button>
                        <button
                          type="button"
                          onClick={() => person.setState((current) => ({ ...current, gender: 1 }))}
                          className={`flex-1 rounded-2xl border py-2.5 transition ${person.state.gender === 1 ? 'glass-panel-dark border-transparent text-amber-200' : 'glass-chip text-stone-600'}`}
                        >
                          女
                        </button>
                      </div>
                    </div>

                    <label className="block">
                      <span className="block text-sm font-semibold text-stone-700">出生时间</span>
                      <input
                        type="datetime-local"
                        value={person.state.customDate}
                        onChange={(event) => person.setState((current) => ({ ...current, customDate: event.target.value }))}
                        className="glass-input mt-2 w-full rounded-2xl p-3 outline-none"
                      />
                    </label>

                    <LocationSelector
                      province={person.state.province}
                      city={person.state.city}
                      setProvince={(value) => person.setState((current) => ({ ...current, province: value }))}
                      setCity={(value) => person.setState((current) => ({ ...current, city: value }))}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void handleRunBaziCompatibilityProfessional()}
            disabled={professionalBusy}
            className={`glass-cta w-full rounded-2xl py-3.5 font-bold text-amber-300 transition ${
              professionalBusy ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-105'
            }`}
          >
            {professionalBusy ? '合盘准备中...' : '开始八字合盘分析'}
          </button>
        </div>
      )}

      {professionalResultSummary && (
        <div className="glass-panel-soft rounded-[26px] border border-white/60 px-4 py-4">
          <div className="text-sm font-bold text-stone-700">已载入主界面</div>
          <div className="mt-2 text-sm leading-7 text-stone-600">
            {professionalResultSummary}...
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="app-shell min-h-screen flex flex-col text-stone-800 font-serif">
      {/* Header */}
      <header className="glass-topbar text-stone-100 py-4 px-4 border-b border-amber-500/40 sticky top-0 z-20">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-wider">元分 · 智解</h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5 md:gap-2">
            <button
              type="button"
              onClick={() => setShowUpdates(true)}
              className="text-[10px] px-2 py-1 rounded border border-amber-500/60 text-amber-300 hover:text-amber-200 hover:border-amber-400 transition"
            >
              功能介绍
            </button>
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => setShowUserMenu(true)}
                className="text-[10px] px-2 py-1 rounded border border-stone-600/60 text-stone-300 hover:text-white hover:border-stone-400 transition"
              >
                {authSession?.user?.name || '用户'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuth(true)}
                className="text-[10px] px-2 py-1 rounded border border-amber-500/60 text-amber-300 hover:text-amber-200 hover:border-amber-400 transition"
              >
                {authEntryLabel}
              </button>
            )}
          </div>
        </div>
      </header>

      {showUpdates && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden overscroll-contain bg-black/42 px-4 py-6 backdrop-blur-md"
          onClick={() => setShowUpdates(false)}
        >
          <div
            className="glass-panel flex max-h-[86vh] w-full max-w-lg flex-col overflow-hidden rounded-[30px] border border-white/55 shadow-[0_28px_80px_rgba(0,0,0,0.22)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-start justify-between gap-4 px-6 py-5 border-b border-white/50 bg-white/12">
              <div>
                <div className="text-base font-bold text-stone-800">{siteSettings.announcementTitle || '功能介绍'}</div>
                <div className="mt-1 text-xs text-stone-500 tracking-[0.08em]">更新于 {siteSettings.announcementUpdatedAt}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowUpdates(false)}
                className="glass-chip shrink-0 rounded-full px-3 py-1.5 text-sm text-stone-500 hover:text-stone-700 hover:bg-white/70 transition"
              >
                关闭
              </button>
            </div>
            <div className="glass-scrollbar flex-1 space-y-3 overflow-y-auto overscroll-contain px-6 py-5 text-sm leading-7 text-stone-700">
              {siteSettings.announcementItems.map((item, idx) => (
                <div key={idx} className="glass-panel-soft flex items-start gap-3 rounded-2xl px-4 py-3 border border-white/55">
                  <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/90 text-[11px] font-bold text-white shadow-[0_0_18px_rgba(251,191,36,0.32)]">
                    {idx + 1}
                  </span>
                  <span className="flex-1">{item}</span>
                </div>
              ))}
              {siteSettings.announcementContent && (
                <div className="glass-panel-soft rounded-2xl border border-white/55 px-4 py-4 whitespace-pre-wrap leading-7">
                  {siteSettings.announcementContent}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showUserMenu && isLoggedIn && (
        <UserMenuPopup
          email={authSession?.user?.email}
          name={authSession?.user?.name}
          quota={userQuota}
          isAdmin={userRole === 'admin'}
          onClose={() => setShowUserMenu(false)}
          onLogout={() => signOut()}
          onOpenAdmin={() => setShowAdminPanel(true)}
          onOpenChangePassword={() => setShowChangePassword(true)}
          onOpenDeleteAccount={() => setShowAccountSettings(true)}
        />
      )}

      {showChangePassword && isLoggedIn && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => setShowChangePassword(false)}
        />
      )}

      {showAccountSettings && isLoggedIn && (
        <AccountSettingsModal
          onClose={() => setShowAccountSettings(false)}
          onDeleted={() => { setShowAccountSettings(false); signOut(); }}
        />
      )}

      {isLoggedIn && workspaceView === 'divination' && (
        <div
          className={`xl:hidden fixed inset-x-0 top-[73px] bottom-0 z-30 ${activeCompactPanel ? 'pointer-events-auto' : 'pointer-events-none'}`}
          aria-hidden={!activeCompactPanel}
        >
          <div
            className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${activeCompactPanel ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setActiveCompactPanel(null)}
          />
          <div
            className={`absolute inset-y-0 right-0 w-[82vw] max-w-[340px] transform transition-transform duration-300 ease-out ${activeCompactPanel ? 'translate-x-0' : 'translate-x-full'}`}
          >
            {activeCompactPanel === 'history' ? (
              <SessionSidebar
                sessions={savedSessions}
                activeSessionId={activeSessionId}
                onSelect={(id) => {
                  setActiveCompactPanel(null);
                  handleLoadSession(id);
                }}
                onDelete={(id) => {
                  handleDeleteSession(id);
                }}
                onNewSession={() => {
                  setActiveCompactPanel(null);
                  handleReset();
                }}
                collapsed={false}
                onToggle={() => setActiveCompactPanel(null)}
                mobile
              />
            ) : (
              <div className="h-full overflow-y-auto border-l border-white/70 bg-white/86 p-4 shadow-[0_28px_80px_rgba(28,25,23,0.24)] backdrop-blur-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-base font-bold text-stone-800">更多功能</div>
                  <button
                    type="button"
                    onClick={() => setActiveCompactPanel(null)}
                    className="rounded-full border border-stone-200 px-3 py-1 text-sm text-stone-500"
                  >
                    关闭
                  </button>
                </div>
                {renderModuleNavigation(true)}
              </div>
            )}
          </div>
        </div>
      )}

      {renderMobileBottomNav()}

      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="hidden xl:block fixed left-3 top-[106px] z-10">
          {renderModuleNavigation(false)}
        </div>

        {isLoggedIn && workspaceView === 'divination' && (
          <div className="hidden xl:block fixed right-3 top-[106px] z-10">
            <SessionSidebar
              sessions={savedSessions}
              activeSessionId={activeSessionId}
              onSelect={handleLoadSession}
              onDelete={handleDeleteSession}
              onNewSession={handleReset}
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(prev => !prev)}
            />
          </div>
        )}

      <main
        className="flex-1 min-h-0 overflow-y-auto transition-[padding] duration-300"
        style={
          desktopWorkPaddingLeft || desktopWorkPaddingRight
            ? { paddingLeft: desktopWorkPaddingLeft, paddingRight: desktopWorkPaddingRight }
            : undefined
        }
      >
        <div className="mx-auto mt-6 w-full max-w-[1180px] px-3 pb-24 xl:pb-6">
        {workspaceView === 'records' && renderRecordsWorkspace()}
        {workspaceView === 'chat' && renderChatWorkspace()}
        {workspaceView === 'settings' && renderSettingsWorkspace()}
        {workspaceView === 'divination' && (
          <>
        {!isLoggedIn && guestModeEnabled && step === 'input' && (
          <div className="glass-banner bg-amber-50/70 border border-amber-200/80 text-amber-800 text-xs rounded-2xl px-4 py-3 mb-4 flex items-center gap-2">
            <span>访客模式：AI 解读剩余 {Math.max(0, GUEST_FORTUNE_LIMIT - guestFortuneCount)}/{GUEST_FORTUNE_LIMIT} 次，排盘不消耗次数</span>
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="underline font-medium hover:text-amber-900 ml-auto"
            >
              登录获取更多额度
            </button>
          </div>
        )}
        {isLoggedIn && userQuota !== null && userQuota <= 0 && step === 'input' && (
          <div className="glass-banner bg-red-50/70 border border-red-200/80 text-red-700 text-xs rounded-2xl px-4 py-3 mb-4">
            您的提问额度已用完，仍可排盘，但暂不能请求 AI 解读。
          </div>
        )}

        {error && <div className="glass-banner bg-red-50/72 border border-red-200/80 text-red-700 p-4 mb-6 rounded-2xl">{error}</div>}

        {/* Input Phase */}
        {step === 'input' && (
          <div className="glass-panel rounded-[24px] p-5 md:p-7">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-stone-100 pb-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">{currentWorkspaceLabel}</div>
                <div className="mt-1 text-2xl font-bold text-stone-800">{currentModuleLabel}</div>
              </div>
            </div>

            {hasSelectedModel && supportsKnowledge && !isCaseModel && !professionalSelectedProject && (
              <KnowledgeToggleCard
                useKnowledge={useKnowledge}
                onToggle={() => setUseKnowledge((prev) => !prev)}
              />
            )}

            {professionalSelectedProject ? renderProfessionalWorkspace() : hasSelectedModel && (isFortuneReading ? (
              <div className="space-y-5 animate-fade-in">
                {fortuneCaseOptions.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-stone-200 bg-white/60 px-4 py-5 text-sm leading-6 text-stone-500">
                    暂无八字命例。请先进入“四柱八字”新增命例，再查看每日或每月运势。
                  </div>
                )}

                {loading && (
                  <div className="rounded-2xl border border-stone-100 bg-white/70 px-5 py-12 text-center text-sm text-stone-500">
                    <div className="mx-auto mb-3 flex justify-center text-stone-500"><Spinner /></div>
                    正在生成运势面板...
                  </div>
                )}

                {!loading && chartData && (
                  <FortuneGrid
                    data={chartData as GenericTaibuResponse}
                    onDateChange={handleFortuneDateChange}
                    onOpenDailyDate={handleOpenDailyFortuneDate}
                    onAsk={handleFortuneSuggestedAsk}
                    isAsking={isTyping}
                    caseOptions={fortuneCaseOptions.map((item) => ({ id: item.id, title: item.title }))}
                    selectedCaseId={fortuneCaseId}
                    onCaseChange={handleFortuneCaseChange}
                  />
                )}
              </div>
            ) : isCaseModel ? (
              <div className="space-y-6 animate-fade-in border-t border-stone-100 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold text-stone-700">命例库</div>
                  </div>
                  <button
                    type="button"
                    onClick={beginCaseCreate}
                    className="glass-cta rounded-2xl px-4 py-2.5 text-sm font-semibold text-amber-300 hover:brightness-105 transition"
                  >
                    新增命例
                  </button>
                </div>

                {caseItems.length === 0 && !caseFormOpen && (
                  <div className="glass-panel-soft rounded-[28px] border border-white/60 px-5 py-10 text-center text-sm text-stone-500">
                    暂无已保存命例，点击右上角“新增命例”开始排盘并保存。
                  </div>
                )}

                {caseItems.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {caseItems.map((item) => {
                      const params = normalizeCaseChartParams(item.chartParams);
                      const pillarPreview = getCasePillarsPreview(item.modelType, item.chartData);
                      const sexLabel = getCaseSexLabel(item.chartParams);
                      const specialTags = getCaseSpecialTags(item.chartParams);
                      const datetimeText = buildCaseDateTimeValue(item.chartParams)
                        ? buildCaseDateTimeValue(item.chartParams).replace('T', ' ')
                        : '未填写出生时间';
                      const solarText = params.province && params.city
                        ? `真太阳时 · ${params.province}${params.city}`
                        : '';
                      return (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => loadCaseDetail(item.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              loadCaseDetail(item.id);
                            }
                          }}
                          className={`text-left rounded-[24px] border px-4 py-3.5 transition ${
                            activeCase?.id === item.id
                              ? 'glass-panel-dark border-transparent text-amber-200 shadow-[0_18px_40px_rgba(28,25,23,0.22)]'
                              : 'glass-panel-soft border-white/60 text-stone-700 hover:bg-white/75'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-bold">{item.title}</div>
                              {sexLabel && (
                                <div className={`mt-1 text-xs font-medium ${activeCase?.id === item.id ? 'text-amber-100/90' : 'text-stone-500'}`}>
                                  {sexLabel}
                                </div>
                              )}
                              {pillarPreview && (
                                <div className={`mt-1 text-xs font-medium ${activeCase?.id === item.id ? 'text-amber-100/90' : 'text-stone-600'}`}>
                                  四柱：{pillarPreview}
                                </div>
                              )}
                              <div className={`mt-1 text-xs ${activeCase?.id === item.id ? 'text-amber-100/80' : 'text-stone-500'}`}>
                                {datetimeText}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <span className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                activeCase?.id === item.id
                                  ? 'border-amber-200/30 text-amber-100'
                                  : 'border-stone-200 text-stone-500'
                              }`}>
                                {specialTags.includes(JOINT_CASE_TAG)
                                  ? JOINT_CASE_TAG
                                  : item.modelType === ModelType.BAZI
                                    ? '八字'
                                    : '紫微'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void beginCaseEditFromLibrary(item.id);
                                  }}
                                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                                    activeCase?.id === item.id
                                      ? 'border-amber-200/30 text-amber-100 hover:bg-white/10'
                                      : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-800'
                                  }`}
                                >
                                  修改
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleDeleteCaseFromLibrary(item.id);
                                  }}
                                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                                    activeCase?.id === item.id
                                      ? 'border-red-200/40 text-red-100 hover:bg-red-500/10'
                                      : 'border-red-200 text-red-500 hover:border-red-300 hover:text-red-600'
                                  }`}
                                >
                                  删除
                                </button>
                              </div>
                            </div>
                          </div>
                          {specialTags.length > 0 && !specialTags.includes(JOINT_CASE_TAG) && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {specialTags.map((tag) => (
                                <span
                                  key={`${item.id}-${tag}`}
                                  className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                    activeCase?.id === item.id
                                      ? 'border-amber-200/30 bg-white/10 text-amber-100'
                                      : 'border-amber-200/80 bg-amber-50/90 text-amber-700'
                                  }`}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {solarText && (
                            <div className={`mt-2 text-xs ${activeCase?.id === item.id ? 'text-amber-100/80' : 'text-stone-500'}`}>
                              {solarText}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {caseFormOpen && (
                  <div ref={caseFormRef} className="glass-panel-soft rounded-[28px] border border-white/60 p-5 md:p-6 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-base font-bold text-stone-700">
                          {editingCaseId ? '编辑命例' : '新增命例'}
                        </div>
                        <div className="text-xs text-stone-500">
                          支持公历、农历、四柱排盘；精确时间可选择真太阳时，快捷时辰不使用真太阳时。
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCaseFormOpen(false);
                          setEditingCaseId(null);
                          resetCaseFormInputs();
                        }}
                        className="text-sm text-stone-500 underline hover:text-stone-800"
                      >
                        取消
                      </button>
                    </div>

                    <LifeReadingForm
                      modelLabel={modelType === ModelType.BAZI ? '八字' : '紫微'}
                      name={name}
                      setName={setName}
                      gender={gender}
                      setGender={setGender}
                      calendarType={lifeCalendarType}
                      setCalendarType={setLifeCalendarType}
                      year={lifeYear}
                      setYear={setLifeYear}
                      month={lifeMonth}
                      setMonth={setLifeMonth}
                      day={lifeDay}
                      setDay={setLifeDay}
                      hour={lifeHour}
                      setHour={setLifeHour}
                      minute={lifeMinute}
                      setMinute={setLifeMinute}
                      timeInputMode={lifeTimeInputMode}
                      setTimeInputMode={setLifeTimeInputMode}
                      useTrueSolar={lifeUseTrueSolar}
                      setUseTrueSolar={setLifeUseTrueSolar}
                      isLeapMonth={lifeIsLeapMonth}
                      setIsLeapMonth={setLifeIsLeapMonth}
                      pillars={lifePillars}
                      setPillars={setLifePillars}
                      province={province}
                      setProvince={setProvince}
                      city={city}
                      setCity={setCity}
                      district={district}
                      setDistrict={setDistrict}
                    />

                    <button
                      type="button"
                      onClick={handleSaveCase}
                      disabled={loading || caseBusy}
                      className="glass-cta w-full hover:brightness-105 text-amber-300 font-bold py-4 rounded-2xl flex justify-center items-center gap-2 transition"
                    >
                      {loading || caseBusy ? <Spinner /> : '排盘并保存命例'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in border-t border-stone-100 pt-6">
              {/* Question (Divination) */}
              {!isLifeReading && !isFortuneReading && (
                <div>
                  <label className="block text-stone-700 font-bold mb-2">所求何事</label>
                  <textarea 
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={modelType === ModelType.QIMEN ? "例如：这次面试能过吗？" : "例如：近期财运如何？"}
                    className="glass-input w-full rounded-2xl p-3 outline-none min-h-[80px]"
                  />
                </div>
              )}

              {isLifeReading && (
                <LifeReadingForm
                  modelLabel={modelType === ModelType.BAZI ? '八字' : '紫微'}
                  name={name}
                  setName={setName}
                  gender={gender}
                  setGender={setGender}
                  calendarType={lifeCalendarType}
                  setCalendarType={setLifeCalendarType}
                  year={lifeYear}
                  setYear={setLifeYear}
                  month={lifeMonth}
                  setMonth={setLifeMonth}
                  day={lifeDay}
                  setDay={setLifeDay}
                  hour={lifeHour}
                  setHour={setLifeHour}
                  minute={lifeMinute}
                  setMinute={setLifeMinute}
                  timeInputMode={lifeTimeInputMode}
                  setTimeInputMode={setLifeTimeInputMode}
                  useTrueSolar={lifeUseTrueSolar}
                  setUseTrueSolar={setLifeUseTrueSolar}
                  isLeapMonth={lifeIsLeapMonth}
                  setIsLeapMonth={setLifeIsLeapMonth}
                  pillars={lifePillars}
                  setPillars={setLifePillars}
                  province={province}
                  setProvince={setProvince}
                  city={city}
                  setCity={setCity}
                  district={district}
                  setDistrict={setDistrict}
                />
              )}

              {isFortuneReading && (
                <div className="glass-panel-soft rounded-[28px] border border-white/60 p-4 md:p-5">
                  <label className="block text-stone-700 font-bold mb-2">选择八字命例</label>
                  {fortuneCaseOptions.length > 0 ? (
                    <select
                      value={fortuneCaseId}
                      onChange={(event) => setFortuneCaseId(event.target.value)}
                      className="glass-input glass-select w-full rounded-2xl p-3 text-sm outline-none"
                    >
                      {fortuneCaseOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-stone-200 bg-white/50 px-4 py-5 text-sm leading-6 text-stone-500">
                      暂无八字命例。请先进入“四柱八字”新增命例，再生成每日或每月运势。
                    </div>
                  )}
                </div>
              )}

              {/* Birth Year (Meihua & Liuyao) */}
              {!isLifeReading && !isFortuneReading && showBornYear && (
                 <div>
                   <label className="block text-stone-700 font-bold mb-2">出生年份（选填，用于起卦依据）</label>
                   <input 
                      type="number" 
                      value={birthYear} 
                      onChange={e => setBirthYear(e.target.value)} 
                      className="glass-input w-full rounded-2xl p-3" 
                      placeholder="可不填，例如: 1995"
                    />
                 </div>
              )}

              {!isLifeReading && <div className="grid md:grid-cols-2 gap-6">
                {/* Gender */}
                {!isFortuneReading && (
                <div>
                  <label className="block text-stone-700 font-bold mb-2">性别</label>
                  <div className="flex gap-4">
                    <button onClick={() => setGender(0)} className={`flex-1 py-2.5 rounded-2xl border transition ${gender === 0 ? 'glass-panel-dark text-amber-200 border-transparent' : 'glass-chip text-stone-600'}`}>男 (乾)</button>
                    <button onClick={() => setGender(1)} className={`flex-1 py-2.5 rounded-2xl border transition ${gender === 1 ? 'glass-panel-dark text-amber-200 border-transparent' : 'glass-chip text-stone-600'}`}>女 (坤)</button>
                  </div>
                </div>
                )}

                {/* Time Input for Standard Models (Qimen, Meihua, Bazi, Ziwei) */}
                {showStandardTimeInput && (
                  <div>
                    <label className="block text-stone-700 font-bold mb-2">
                      {isFortuneReading ? (modelType === ModelType.MONTHLY_FORTUNE ? '运势月份' : '运势日期') : modelType === ModelType.ALMANAC ? '择日日期' : '起盘时间'}
                    </label>
                    {!isLifeReading && (
                      <div className="flex gap-2 mb-2">
                        <button onClick={() => setTimeMode('now')} className={`flex-1 text-xs py-1.5 rounded-xl border transition ${timeMode === 'now' ? 'glass-panel-soft text-amber-800 border-amber-200/80' : 'glass-chip text-stone-600'}`}>即时</button>
                        <button onClick={() => setTimeMode('custom')} className={`flex-1 text-xs py-1.5 rounded-xl border transition ${timeMode === 'custom' ? 'glass-panel-soft text-amber-800 border-amber-200/80' : 'glass-chip text-stone-600'}`}>指定</button>
                      </div>
                    )}
                    {(timeMode === 'custom' || isLifeReading) && (
                      <input 
                        type="datetime-local" 
                        value={customDate} 
                        onChange={(e) => setCustomDate(e.target.value)} 
                        className="glass-input w-full rounded-2xl p-3"
                      />
                    )}
                    {showSolarTimeReminder && (
                      <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        当前时间接近时辰交界（前后30分钟），建议开启真太阳时（选择地区）。
                      </div>
                    )}
                    {timeMode === 'now' && !isLifeReading && (
                      <div className="text-stone-400 text-sm italic py-2">使用当前时间起卦</div>
                    )}
                  </div>
                )}
              </div>}

              {modelType === ModelType.QIMEN && (
                <div className="glass-panel-soft rounded-[28px] border border-white/60 p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-bold text-stone-700">专业版设置</div>
                      <div className="text-xs text-stone-500">非专业人士请使用默认设置</div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={qimenProEnabled}
                        onChange={(event) => setQimenProEnabled(event.target.checked)}
                        className="sr-only"
                      />
                      <GlowCheck checked={qimenProEnabled} sizeClass="h-4 w-4" />
                      <span>{qimenProEnabled ? '已开启' : '已关闭'}</span>
                    </label>
                  </div>

                  {!qimenProEnabled && (
                    <div className="text-xs text-stone-400 italic">
                      默认设置：拆补法转盘奇门。
                    </div>
                  )}

                  {qimenProEnabled && (
                    <div className="grid gap-4 animate-fade-in">
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">起局方法</label>
                        <select
                          value={qimenJuModel}
                          onChange={(e) => setQimenJuModel(parseInt(e.target.value, 10))}
                          className="glass-input glass-select w-full rounded-2xl p-3 text-sm outline-none"
                        >
                          <option value={0}>拆补法</option>
                          <option value={2}>茅山道人法</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* --- MEIHUA / LIUYAO SPECIFIC UI --- */}
              {(modelType === ModelType.MEIHUA || modelType === ModelType.LIUYAO) && (
                 <div className="glass-panel-soft bg-amber-50/55 p-4 rounded-[28px] border border-amber-100/80 mt-4">
                    <label className="block text-stone-700 font-bold mb-3">
                      {modelType === ModelType.MEIHUA ? '梅花起卦方式' : '六爻起卦方式'}
                    </label>
                    
                    {/* Mode Selector */}
                    <div className="flex flex-wrap gap-2 mb-4">
                       {(modelType === ModelType.MEIHUA ? MEIHUA_MODE_OPTIONS : LIUYAO_MODE_OPTIONS).map(([m, l]) => (
                          <button 
                            key={m} 
                            onClick={() => setLiuyaoMode(m as LiuyaoMode)}
                          className={`px-3 py-1.5 text-xs rounded-full border transition ${liuyaoMode === m ? 'glass-panel-dark text-amber-200 border-transparent' : 'glass-chip text-stone-600'}`}
                          >
                            {l}
                          </button>
                       ))}
                    </div>

                    {/* Dynamic Inputs */}
                    
                    {/* 1. Custom Time Input */}
                    {(liuyaoMode === LiuyaoMode.CUSTOM_TIME || liuyaoMode === LiuyaoMode.LIFETIME) && (
                       <div>
                         <label className="text-xs text-stone-500 block mb-1">
                           {liuyaoMode === LiuyaoMode.LIFETIME ? '选择出生时间' : '选择时间'}
                         </label>
                         <input 
                          type="datetime-local" 
                          value={customDate} 
                          onChange={(e) => setCustomDate(e.target.value)} 
                          className="glass-input w-full rounded-2xl p-3 text-sm"
                        />
                       </div>
                    )}

                    {/* 2. Manual Lines Generator */}
                    {liuyaoMode === LiuyaoMode.MANUAL && (
                       <div className="space-y-2">
                          <p className="text-xs text-stone-500 mb-2">
                            点击爻位切换阴阳；点击右侧圆圈设置变爻。{modelType === ModelType.MEIHUA ? '梅花易数必须且只能指定一个变爻。' : '六爻可按需要设置多个变爻。'}
                          </p>
                          <div className="flex flex-col-reverse gap-2 bg-white p-3 rounded border border-stone-200">
                             {manualLines.map((val, idx) => (
                                <div key={idx} className="flex items-center gap-3 rounded p-1 hover:bg-stone-50">
                                   <span className="text-xs text-stone-400 w-8">{(idx === 0) ? '初爻' : (idx === 5) ? '六爻' : `${idx+1}爻`}</span>
                                   <button
                                     type="button"
                                     onClick={() => toggleLine(idx)}
                                     className="flex flex-1 items-center justify-center rounded px-2 py-1"
                                   >
                                   <div className="flex-1 h-6 flex items-center justify-center relative">
                                      {/* Visual Representation */}
                                      {val === 1 ? (
                                        <div className={`w-full h-2 ${manualMovingLines[idx] ? 'bg-red-500' : 'bg-stone-800'}`}></div>
                                      ) : (
                                        <div className="w-full flex justify-between">
                                           <div className={`w-[40%] h-2 ${manualMovingLines[idx] ? 'bg-red-500' : 'bg-stone-800'}`}></div>
                                           <div className={`w-[40%] h-2 ${manualMovingLines[idx] ? 'bg-red-500' : 'bg-stone-800'}`}></div>
                                        </div>
                                      )}
                                   </div>
                                   </button>
                                   <button
                                     type="button"
                                     onClick={() => toggleManualMovingLine(idx)}
                                     aria-pressed={manualMovingLines[idx]}
                                     className="glass-chip flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-white/70"
                                     title={modelType === ModelType.MEIHUA ? '设置变爻（单选）' : '设置变爻'}
                                   >
                                     <GlowCheck
                                       checked={manualMovingLines[idx]}
                                       sizeClass="h-4 w-4"
                                       dotClass="h-1.5 w-1.5"
                                     />
                                   </button>
                                   <span className="text-xs w-12 text-right font-mono">{getLineLabel(val, manualMovingLines[idx])}</span>
                                </div>
                             ))}
                          </div>
                       </div>
                    )}

                    {/* 3. Number Inputs */}
                    {(liuyaoMode === LiuyaoMode.NUMBER || liuyaoMode === LiuyaoMode.SINGLE_NUM) && (
                       <div>
                          <label className="text-xs text-stone-500 block mb-1">
                            {liuyaoMode === LiuyaoMode.SINGLE_NUM ? '输入单个数字' : '输入数字'}
                          </label>
                          <input 
                            type="number" value={lyNum} onChange={e => setLyNum(e.target.value)}
                            placeholder="例如: 369" className="glass-input w-full rounded-2xl p-3"
                          />
                       </div>
                    )}
                    {liuyaoMode === LiuyaoMode.DOUBLE_NUM && (
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-stone-500 block mb-1">上卦数</label>
                            <input type="number" value={lyNumUp} onChange={e => setLyNumUp(e.target.value)} placeholder="例: 3" className="glass-input w-full rounded-2xl p-3"/>
                          </div>
                          <div>
                            <label className="text-xs text-stone-500 block mb-1">下卦数</label>
                            <input type="number" value={lyNumDown} onChange={e => setLyNumDown(e.target.value)} placeholder="例: 8" className="glass-input w-full rounded-2xl p-3"/>
                          </div>
                       </div>
                    )}

                    {/* Add Time Toggle (For Numbers) */}
                    {[LiuyaoMode.NUMBER, LiuyaoMode.SINGLE_NUM, LiuyaoMode.DOUBLE_NUM].includes(liuyaoMode) && (
                       <label htmlFor="yaoTime" className="mt-3 inline-flex items-center gap-2 cursor-pointer text-sm text-stone-600">
                          <input type="checkbox" id="yaoTime" checked={yaoAddTime} onChange={e => setYaoAddTime(e.target.checked)} className="sr-only" />
                          <GlowCheck checked={yaoAddTime} sizeClass="h-4 w-4" />
                          <span>加时辰起动爻</span>
                       </label>
                    )}

                 </div>
              )}

              {/* Location for True Solar Time (Bazi & Ziwei) */}
              {!isLifeReading && showLocation && (
                <LocationSelector 
                  province={province} 
                  setProvince={setProvince} 
                  city={city} 
                  setCity={setCity} 
                />
              )}

              <button 
                onClick={() => handleCalculate()} disabled={loading}
                className="glass-cta w-full hover:brightness-105 text-amber-300 font-bold py-4 rounded-2xl mt-4 flex justify-center items-center gap-2 transition"
              >
                {loading ? <Spinner /> : '开始排盘'}
              </button>

              {!isCaseModel && (
                <div className="glass-panel-soft rounded-[28px] border border-white/60 p-4 md:p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-bold text-stone-700">排盘记录</div>
                    <div className="text-xs text-stone-500">
                      {savedSessions.filter((item) => item.modelType === modelType).length
                        ? `共 ${savedSessions.filter((item) => item.modelType === modelType).length} 条`
                        : '暂无记录'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {savedSessions.filter((item) => item.modelType === modelType).slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleLoadSession(item.id)}
                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                          activeSessionId === item.id
                            ? 'glass-panel-dark border-transparent text-amber-200'
                            : 'border-white/60 bg-white/55 text-stone-700 hover:bg-white/80'
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{item.title}</span>
                        <span className={`ml-3 shrink-0 text-xs ${activeSessionId === item.id ? 'text-amber-100/75' : 'text-stone-400'}`}>
                          {new Date(item.createdAt).toLocaleString('zh-CN', { hour12: false })}
                        </span>
                      </button>
                    ))}
                    {savedSessions.filter((item) => item.modelType === modelType).length === 0 && (
                      <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-5 text-center text-sm text-stone-400">
                        完成排盘并发起解读后，会在这里显示记录。
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            ))}
          </div>
        )}

        {/* Result Phase */}
        {step === 'chart' && chartData && (
          <div className="animate-fade-in space-y-6">
            {!isLoggedIn && guestModeEnabled && (
              <div className="glass-banner bg-amber-50/72 border border-amber-200/80 text-amber-800 text-xs rounded-2xl px-4 py-3 flex items-center gap-2">
                <span>访客模式：AI 解读剩余 {Math.max(0, GUEST_FORTUNE_LIMIT - guestFortuneCount)}/{GUEST_FORTUNE_LIMIT} 次 · 追问本轮 {Math.max(0, 1 - guestFollowUpCount)}/1 次</span>
                <button
                  type="button"
                  onClick={() => setShowAuth(true)}
                  className="underline font-medium hover:text-amber-900 ml-auto"
                >
                  登录获取更多额度
                </button>
              </div>
            )}
            <div ref={reportChartRef} className="space-y-4">
              <div className="glass-panel flex justify-between items-center p-4 rounded-[26px]">
                 <span className="font-bold text-stone-700">
                  {isFortuneReading ? '运势面板' : (MODEL_LABELS[modelType] || '排盘结果')}
                 </span>
                 <button data-report-ignore="true" onClick={handleReset} className="text-sm text-stone-500 hover:text-stone-800 underline">返回</button>
              </div>

              {/* Visualization Components */}
              {activeProfessionalFeature === PROFESSIONAL_FEATURE_JOINT && isJointChartData(chartData) ? (
                <div className="glass-panel-soft rounded-[28px] border border-white/60 p-5 md:p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-stone-700">八字 + 紫微联合分析</div>
                      <div className="mt-1 text-xs text-stone-500">
                        已同步载入两套命盘，后续追问会以联合命盘为基础进行解读。
                      </div>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-amber-50/90 px-3 py-1 text-xs font-semibold text-amber-700">
                      进阶功能
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="glass-panel rounded-[24px] border border-white/60 p-4">
                      <div className="text-sm font-bold text-stone-700">八字命盘</div>
                      <div className="mt-2 text-xs text-stone-500">
                        四柱：{getCasePillarsPreview(ModelType.BAZI, chartData.baziChartData) || '未获取'}
                      </div>
                      <div className="mt-3 text-xs leading-6 text-stone-600">
                        {chartData.baziChartData.base_info?.gongli || '出生信息已同步'}
                      </div>
                    </div>
                    <div className="glass-panel rounded-[24px] border border-white/60 p-4">
                      <div className="text-sm font-bold text-stone-700">紫微命盘</div>
                      <div className="mt-2 text-xs text-stone-500">
                        四柱：{getCasePillarsPreview(ModelType.ZIWEI, chartData.ziweiChartData) || '未获取'}
                      </div>
                      <div className="mt-3 text-xs leading-6 text-stone-600">
                        {chartData.ziweiChartData.base_info?.gongli || '出生信息已同步'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeProfessionalFeature === PROFESSIONAL_FEATURE_BAZI_COMPAT && isBaziCompatibilityChartData(chartData) ? (
                <div className="glass-panel-soft rounded-[28px] border border-white/60 p-5 md:p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-stone-700">八字合盘分析</div>
                      <div className="mt-1 text-xs text-stone-500">
                        已同步载入两人的八字命盘，后续追问会以合盘结果为基础进行解读。
                      </div>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-amber-50/90 px-3 py-1 text-xs font-semibold text-amber-700">
                      Beta
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="glass-panel rounded-[24px] border border-white/60 p-4">
                      <div className="text-sm font-bold text-stone-700">{chartData.personAName}</div>
                      <div className="mt-2 text-xs text-stone-500">
                        四柱：{getCasePillarsPreview(ModelType.BAZI, chartData.personAChartData) || '未获取'}
                      </div>
                      <div className="mt-3 text-xs leading-6 text-stone-600">
                        {chartData.personAChartData.base_info?.gongli || '出生信息已同步'}
                      </div>
                    </div>
                    <div className="glass-panel rounded-[24px] border border-white/60 p-4">
                      <div className="text-sm font-bold text-stone-700">{chartData.personBName}</div>
                      <div className="mt-2 text-xs text-stone-500">
                        四柱：{getCasePillarsPreview(ModelType.BAZI, chartData.personBChartData) || '未获取'}
                      </div>
                      <div className="mt-3 text-xs leading-6 text-stone-600">
                        {chartData.personBChartData.base_info?.gongli || '出生信息已同步'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {modelType === ModelType.QIMEN && <QimenGrid data={chartData} />}
                  {modelType === ModelType.BAZI && <BaziGrid data={chartData} />}
                  {modelType === ModelType.ZIWEI && <ZiweiGrid data={chartData} />}
                  {modelType === ModelType.MEIHUA && <MeihuaGrid data={chartData} />}
                  {modelType === ModelType.LIUYAO && <LiuyaoGrid data={chartData} />}
                  {[ModelType.DAILY_FORTUNE, ModelType.MONTHLY_FORTUNE].includes(modelType) && (
                    <FortuneGrid
                      data={chartData as GenericTaibuResponse}
                      onDateChange={handleFortuneDateChange}
                      onOpenDailyDate={handleOpenDailyFortuneDate}
                      onAsk={handleFortuneSuggestedAsk}
                      isAsking={isTyping}
                      caseOptions={fortuneCaseOptions.map((item) => ({ id: item.id, title: item.title }))}
                      selectedCaseId={fortuneCaseId}
                      onCaseChange={handleFortuneCaseChange}
                    />
                  )}
                  {[
                    ModelType.DALIUREN,
                    ModelType.TAIYI,
                    ModelType.XIAOLIUREN,
                    ModelType.ALMANAC,
                  ].includes(modelType) && (
                    <GenericTaibuGrid data={chartData as GenericTaibuResponse} title={MODEL_LABELS[modelType]} />
                  )}
                </>
              )}
            </div>

            {isCaseModel && activeCase && (
              <div ref={caseDetailRef} className="glass-panel-soft rounded-[30px] border border-white/60 p-5 md:p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold text-stone-700">{activeCase.title}</div>
                    {getCaseSexLabel(activeCase.chartParams) && (
                      <div className="mt-1 text-sm text-stone-500">{getCaseSexLabel(activeCase.chartParams)}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={beginCaseEdit}
                      className="rounded-full border border-stone-200 px-3 py-1.5 text-sm text-stone-600 hover:border-stone-300 hover:text-stone-800"
                    >
                      编辑命例
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteCase}
                      className="rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-500 hover:border-red-300 hover:text-red-600"
                    >
                      删除命例
                    </button>
                  </div>
                </div>

                {getCaseDisplayRelations(activeCase.id, activeCase.relations || []).length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-bold text-stone-700">关系标签</div>
                    <div className="flex flex-wrap gap-2">
                      {getCaseDisplayRelations(activeCase.id, activeCase.relations || []).map((relation) => (
                        <div key={relation.id} className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCaseRelationId((current) => current === relation.id ? null : relation.id)}
                            className={`glass-chip rounded-full border px-3 py-1.5 text-xs transition ${
                              selectedCaseRelationId === relation.id
                                ? 'border-amber-200 bg-amber-50/70 text-amber-700'
                                : 'border-white/60 text-stone-600 hover:text-stone-800'
                            }`}
                            title="点选后可编辑"
                          >
                            {relation.label}
                          </button>
                          {selectedCaseRelationId === relation.id && (
                            <button
                              type="button"
                              onClick={() => openCaseRelationEditor(relation.id)}
                              className="glass-chip flex h-8 w-8 items-center justify-center rounded-full border border-white/60 text-stone-600 hover:text-stone-800"
                              title="修改关系标签"
                            >
                              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3.5 13.8 3 17l3.2-.5 8.3-8.3-2.7-2.7-8.3 8.3Z" />
                                <path d="m10.9 4.8 2.7 2.7" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {supportsKnowledge && (
                  <KnowledgeToggleCard
                    useKnowledge={useKnowledge}
                    onToggle={() => setUseKnowledge((prev) => !prev)}
                    className=""
                  />
                )}

                <div className="glass-panel-soft rounded-[26px] border border-white/60 p-4 md:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-stone-700">初始化分析</div>
                      <div className="mt-1 text-xs text-stone-500">
                        命例级基线分析，后续新会话会默认读取这份上下文。
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {currentCaseInitialAnalysis && (
                        <button
                          type="button"
                          onClick={() => setShowInitialAnalysisModal(true)}
                          className="glass-chip rounded-full px-3 py-1.5 text-xs text-stone-600 hover:text-stone-800"
                        >
                          查看初始化分析
                        </button>
                      )}
                      {!currentCaseInitialAnalysis && (
                        <button
                          type="button"
                          onClick={() => void handleRegenerateCaseInitialAnalysis()}
                          disabled={initialAnalysisBusy || loading || isTyping}
                          className={`rounded-full px-3 py-1.5 text-xs transition ${
                            initialAnalysisBusy || loading || isTyping
                              ? 'glass-chip text-stone-300 cursor-not-allowed'
                              : 'glass-panel-dark text-amber-200 hover:brightness-105'
                          }`}
                        >
                          生成初始化分析
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="glass-panel rounded-[22px] border border-white/60 px-4 py-3">
                      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">状态</div>
                      <div className="mt-2 text-base font-bold text-stone-700">{currentInitialAnalysisStatus}</div>
                    </div>
                    <div className="glass-panel rounded-[22px] border border-white/60 px-4 py-3">
                      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">更新时间</div>
                      <div className="mt-2 text-sm font-medium text-stone-600">
                        {currentCaseInitialAnalysis
                          ? new Date(currentCaseInitialAnalysis.generatedAt).toLocaleString('zh-CN', { hour12: false })
                          : '暂无'}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-stone-700 font-bold mb-2">想咨询的问题 (可选)</label>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={modelType === ModelType.BAZI ? '例如：事业发展方向如何？' : '例如：未来几年整体运势如何？'}
                    className="glass-input w-full rounded-2xl p-3 outline-none min-h-[88px]"
                  />
                  <button
                    type="button"
                    onClick={handleStartCaseAnalysis}
                    disabled={loading || isTyping}
                    className="glass-cta mt-4 w-full rounded-2xl py-3.5 font-bold text-amber-300 hover:brightness-105 transition flex items-center justify-center gap-2"
                  >
                    {loading || isTyping ? <Spinner /> : (!isLoggedIn && activeCase.sessions.length > 0 ? '继续分析' : '开始分析')}
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-bold text-stone-700">历史分析会话</div>
                    <div className="text-xs text-stone-500">
                      {activeCase.sessions.length ? `共 ${activeCase.sessions.length} 条` : '暂无分析记录'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {activeCase.sessions.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-5 text-sm text-stone-400 text-center">
                        这个命例还没有分析记录。
                      </div>
                    )}
                    {activeCase.sessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => {
                          if (isLoggedIn) {
                            handleLoadSession(session.id);
                          } else {
                            handleLoadGuestCaseSession(session.id);
                          }
                        }}
                        className={`group flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                          activeSessionId === session.id
                            ? 'glass-panel-dark border-transparent text-amber-200'
                            : 'glass-panel border-white/60 bg-white/70 text-stone-700 hover:bg-white/85'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold">{session.title}</div>
                          <div className={`mt-1 text-xs ${activeSessionId === session.id ? 'text-amber-100/75' : 'text-stone-500'}`}>
                            {new Date(session.updatedAt).toLocaleString('zh-CN', { hour12: false })}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (confirmCaseSessionDeleteId === session.id) {
                              handleDeleteCaseSessionEntry(session.id);
                              setConfirmCaseSessionDeleteId(null);
                            } else {
                              setConfirmCaseSessionDeleteId(session.id);
                              setTimeout(() => setConfirmCaseSessionDeleteId((current) => (current === session.id ? null : current)), 3000);
                            }
                          }}
                          className={`flex-shrink-0 rounded-lg p-1.5 transition-colors ${
                            confirmCaseSessionDeleteId === session.id
                              ? 'bg-red-50 text-red-500'
                              : activeSessionId === session.id
                                ? 'text-amber-100/75 hover:text-red-200'
                                : 'text-stone-300 opacity-0 group-hover:opacity-100 hover:text-red-400'
                          }`}
                          title={confirmCaseSessionDeleteId === session.id ? '再次点击确认删除' : '删除'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                            <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 000 1.5h.31l.461 6.15A1.5 1.5 0 005.02 13h5.96a1.5 1.5 0 001.499-1.35l.46-6.15h.311a.75.75 0 000-1.5H11v-.75A1.75 1.75 0 009.25 1.5h-2.5A1.75 1.75 0 005 3.25zm1.5 0a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V4h-3v-.75z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {chartData && !chatHistory.length && !isTyping && !isCaseModel && !isFortuneReading && (
              <div className="glass-panel-soft rounded-[28px] border border-white/60 p-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-bold text-stone-800">需要进一步解读？</div>
                    <div className="mt-1 text-sm text-stone-500">
                      排盘已完成。点击后会把当前盘面与问题一起发送给 AI，并消耗一次额度。
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRerunAnalysis()}
                    disabled={loading || isTyping}
                    className="glass-cta rounded-2xl px-5 py-3 text-sm font-bold text-amber-300 disabled:opacity-50"
                  >
                    {loading || isTyping ? <Spinner /> : '询问 AI 解读'}
                  </button>
                </div>
              </div>
            )}

            {/* Chat */}
            {(chatHistory.length > 0 || isTyping) && (
            <div ref={chatPanelRef} className="glass-panel rounded-[30px] overflow-hidden flex flex-col h-[600px]">
               <div className="glass-panel-soft px-4 py-3 border-b border-white/50 flex justify-between items-center">
                 <h3 className="font-bold text-stone-700 flex items-center gap-2"><TaijiIcon className="w-5 h-5" /> {activeProfessionalFeature === PROFESSIONAL_FEATURE_JOINT ? '联合解读' : activeProfessionalFeature === PROFESSIONAL_FEATURE_BAZI_COMPAT ? '合盘解读' : '大师解读'}</h3>
                 <div className="flex items-center gap-3">
                   <button
                     type="button"
                     onClick={handleRequestRerunAnalysis}
                     disabled={!chartData || isTyping || loading}
                     title={
                       !chartData
                         ? '暂无可重新分析的排盘内容'
                         : isTyping || loading
                           ? 'AI 正在输出，请稍候'
                           : '基于当前排盘信息和原始问题重新分析'
                     }
                     className={`text-sm font-medium ${
                       !chartData || isTyping || loading
                         ? 'text-stone-300 cursor-not-allowed'
                         : 'text-stone-500 hover:text-stone-800'
                     }`}
                   >
                     重新分析
                   </button>
                   <button
                     onClick={handleGenerateReport}
                     disabled={!chatHistory.length || isTyping || isGeneratingReport}
                     title={
                       !chatHistory.length
                         ? '暂无对话内容'
                         : isTyping
                           ? 'AI 正在输出，请稍候'
                           : isGeneratingReport
                             ? '正在生成排盘截图，请稍候'
                             : '生成对话报告（可保存为 PDF）'
                     }
                     className={`flex items-center gap-2 text-sm font-medium ${
                       !chatHistory.length || isTyping || isGeneratingReport
                         ? 'text-stone-300 cursor-not-allowed'
                         : 'text-stone-500 hover:text-stone-800'
                     }`}
                   >
                     <ReportIcon />
                     {isGeneratingReport ? '生成中...' : '生成报告'}
                   </button>
                 </div>
               </div>
               <div
                 ref={chatScrollRef}
                 onScroll={syncAutoScrollState}
                 className="glass-chat-bg glass-scrollbar flex-1 overflow-y-auto p-4 space-y-6"
               >
                 {knowledgeHint && (
                   <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 flex items-center gap-2">
                     <span>⚠️ 知识库检索失败，本次回答未使用参考资料。{knowledgeHint !== '知识库检索失败' && `（${knowledgeHint}）`}</span>
                     <button type="button" onClick={() => setKnowledgeHint(null)} className="ml-auto text-amber-600 hover:text-amber-900 shrink-0">关闭</button>
                   </div>
                 )}
                 {chatHistory.map((msg) => {
                   const parsed = msg.role === 'model' ? parseModelContent(msg.content) : null;
                   const copyText = msg.role === 'model' && parsed ? parsed.answer : msg.content;
                   const versionState = messageVersionMap[msg.id];
                   const hasVersionHistory = (versionState?.entries.length ?? 0) > 1;
                   const isEditingUserMessage = msg.role === 'user' && editingUserMessageId === msg.id;
                   return (
                   <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`group max-w-[90%] rounded-[24px] p-4 shadow-sm relative backdrop-blur-xl ${msg.role === 'user' ? 'glass-panel-dark text-white' : 'glass-panel-soft text-stone-800'}`}>
                        {msg.role === 'user' && !isEditingUserMessage ? (
                          <div className="flex items-end gap-3">
                            <div className="min-w-0 flex-1">
                              <MarkdownContent content={msg.content} className="text-sm leading-relaxed" />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleStartEditUserMessage(msg.id, msg.content)}
                              disabled={isTyping}
                              title="修改已发送的问题并重新运行该条"
                              className={`group/action shrink-0 self-center rounded-full border p-2 text-[11px] shadow-sm transition ${
                                isTyping
                                  ? 'border-white/10 bg-white/5 text-white/35 cursor-not-allowed'
                                  : 'border-white/20 bg-white/10 text-white/75 hover:border-white/35 hover:bg-white/15 hover:text-white'
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <EditIcon className="h-3.5 w-3.5" />
                                <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/action:max-w-16 group-hover/action:opacity-100">
                                  修改问题
                                </span>
                              </span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm leading-relaxed">
                            {isEditingUserMessage ? (
                              <div className="space-y-3">
                                <textarea
                                  value={editingUserMessageDraft}
                                  onChange={(event) => setEditingUserMessageDraft(event.target.value)}
                                  className="min-h-[96px] w-full rounded-2xl border border-white/25 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/50"
                                  placeholder="修改后重新提交"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={handleCancelEditUserMessage}
                                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80 transition hover:bg-white/15"
                                  >
                                    取消
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleSubmitEditedUserMessage(msg.id)}
                                    disabled={isTyping}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                      isTyping
                                        ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                        : 'bg-white text-stone-800 hover:bg-amber-50'
                                    }`}
                                  >
                                    提交
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <MarkdownContent content={msg.role === 'model' && parsed ? parsed.answer : msg.content} />
                            )}
                          </div>
                        )}
                        {msg.role === 'model' && (
                          <KnowledgeSourceSummaryPanel sources={msg.knowledgeSources || messageSourceMap[msg.id]} />
                        )}
                        {msg.role === 'model' && (
                          <div className="mt-4 flex justify-end">
                            <div className="relative flex items-center gap-2">
                              {hasVersionHistory && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenVersionMenuId((current) => (current === msg.id ? null : msg.id));
                                    }}
                                    title="切换历史生成记录"
                                    className="group/action flex items-center gap-1.5 rounded-full border border-white/55 bg-white/60 px-2.5 py-1 text-[11px] text-stone-500 shadow-sm transition hover:border-amber-200 hover:bg-white/80 hover:text-stone-800"
                                  >
                                    <HistoryIcon className="h-3.5 w-3.5" />
                                    <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/action:max-w-20 group-hover/action:opacity-100">
                                      历史版本
                                    </span>
                                  </button>
                                  {openVersionMenuId === msg.id && (
                                    <div className="absolute bottom-full right-0 z-20 mb-2 min-w-[176px] rounded-2xl border border-white/70 bg-white/88 p-2 shadow-[0_18px_50px_rgba(120,113,108,0.22)] backdrop-blur-xl">
                                      <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-[0.18em] text-stone-400">
                                        生成记录
                                      </div>
                                      <div className="space-y-1">
                                        {versionState?.entries.map((entry, index) => {
                                          const active = versionState.activeId === entry.id;
                                          return (
                                            <button
                                              key={entry.id}
                                              type="button"
                                              onClick={() => void applyMessageVersion(msg.id, entry.id)}
                                              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition ${
                                                active
                                                  ? 'bg-stone-900 text-white'
                                                  : 'text-stone-600 hover:bg-stone-100/90 hover:text-stone-900'
                                              }`}
                                            >
                                              <span>{getMessageVersionLabel(index)}</span>
                                              <span className={`${active ? 'text-stone-200' : 'text-stone-400'}`}>
                                                {formatVersionTime(entry.createdAt)}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRegenerateMessage(msg.id)}
                                disabled={isTyping}
                                title="从当前回复处重新生成，后续对话会被替换"
                                className={`group/action flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] shadow-sm transition ${
                                  isTyping
                                    ? 'border-stone-200/90 bg-white/45 text-stone-300 cursor-not-allowed'
                                    : 'border-white/55 bg-white/60 text-stone-500 hover:border-amber-200 hover:bg-white/80 hover:text-stone-800'
                                }`}
                              >
                                <RefreshIcon className="h-3.5 w-3.5" />
                                <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/action:max-w-16 group-hover/action:opacity-100">
                                  重新生成
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await handleCopyText(copyText);
                                  setCopiedMessageId(msg.id);
                                  window.setTimeout(() => {
                                    setCopiedMessageId((current) => (current === msg.id ? null : current));
                                  }, 1200);
                                }}
                                title="复制当前回复"
                                className="group/action flex items-center gap-1.5 rounded-full border border-white/55 bg-white/60 px-2.5 py-1 text-[11px] text-stone-500 shadow-sm transition hover:border-amber-200 hover:bg-white/80 hover:text-stone-800"
                              >
                                <CopyIcon className="h-3.5 w-3.5" />
                                <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/action:max-w-16 group-hover/action:opacity-100">
                                  {copiedMessageId === msg.id ? '已复制' : '复制'}
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
                     </div>
                   </div>
                 )})}
                 {isTyping && <div className="text-stone-400 text-sm p-4 animate-pulse">大师正在思考...</div>}
                 <div ref={chatEndRef} />
               </div>
               <div className="glass-panel-soft p-4 border-t border-white/50 flex gap-2">
                 <input
                   type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                   placeholder={isKlineRunning ? "K线运行中，暂不可发送" : (isLoggedIn && userQuota !== null && userQuota <= 0) ? "额度已用完" : (!isLoggedIn && !guestModeEnabled) ? "需要登录后才能使用" : (!isLoggedIn && guestFollowUpCount >= 1) ? "访客追问次数已用完，请登录" : "追问..."} disabled={isTyping || isKlineRunning || (isLoggedIn && userQuota !== null && userQuota <= 0)}
                   className="glass-input flex-1 rounded-2xl px-4 py-2"
                 />
                 <button onClick={handleSendMessage} disabled={isTyping || isKlineRunning || !inputMessage.trim() || (isLoggedIn && userQuota !== null && userQuota <= 0)} className="glass-cta text-amber-300 p-3 rounded-2xl hover:brightness-105 disabled:opacity-50 disabled:hover:brightness-100 transition"><SendIcon /></button>
              </div>
            </div>
            )}
          </div>
        )}
          </>
        )}
        </div>
      </main>
      </div>{/* end flex wrapper */}

      {showInitialAnalysisModal && currentCaseInitialAnalysis && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/42 backdrop-blur-md px-4 py-6"
          onClick={() => setShowInitialAnalysisModal(false)}
        >
          <div
            className="glass-panel w-full max-w-3xl max-h-[86vh] overflow-hidden rounded-[32px] border border-white/55 shadow-[0_30px_90px_rgba(0,0,0,0.24)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="glass-panel-soft border-b border-white/50 px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-stone-800">初始化分析</div>
                  <div className="mt-1 text-xs text-stone-500">
                    生成于 {new Date(currentCaseInitialAnalysis.generatedAt).toLocaleString('zh-CN', { hour12: false })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInitialAnalysisRegenerateConfirm(true)}
                    disabled={initialAnalysisBusy || loading || isTyping}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      initialAnalysisBusy || loading || isTyping
                        ? 'glass-chip text-stone-300 cursor-not-allowed'
                        : 'glass-chip text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    {initialAnalysisBusy ? '生成中...' : '重新生成'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInitialAnalysisModal(false)}
                    className="glass-chip rounded-full px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
            <div className="glass-chat-bg max-h-[calc(86vh-108px)] overflow-y-auto px-6 py-5">
              <div className="glass-panel-soft rounded-[28px] border border-white/60 px-5 py-5">
                <MarkdownContent content={currentCaseInitialAnalysis.content} className="text-sm leading-7 text-stone-700" />
              </div>
            </div>
          </div>
        </div>
      )}

      {showRerunConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/42 backdrop-blur-md px-4"
          onClick={() => setShowRerunConfirm(false)}
        >
          <div
            className="glass-panel w-full max-w-md rounded-[30px] border border-white/55 shadow-[0_28px_80px_rgba(0,0,0,0.22)] overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="glass-panel-soft border-b border-white/50 px-6 py-5">
              <div className="text-lg font-bold text-stone-800">重新分析</div>
              <div className="mt-1 text-sm text-stone-500">
                基于当前排盘信息和原始问题重新分析，会覆盖当前会话内容。
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="glass-panel-soft rounded-[24px] border border-white/60 px-4 py-4 text-sm leading-6 text-stone-600">
                当前会话中的已有首轮分析内容会被新的分析结果替换，后续追问上下文也会随之更新。
              </div>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRerunConfirm(false)}
                  className="glass-chip rounded-2xl px-4 py-2 text-sm text-stone-600 hover:text-stone-800"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleRerunAnalysis}
                  className="glass-panel-dark rounded-2xl px-4 py-2 text-sm text-amber-200 hover:brightness-105"
                >
                  确认重新分析
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInitialAnalysisRegenerateConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/42 backdrop-blur-md px-4"
          onClick={() => setShowInitialAnalysisRegenerateConfirm(false)}
        >
          <div
            className="glass-panel w-full max-w-md overflow-hidden rounded-[30px] border border-white/55 shadow-[0_28px_80px_rgba(0,0,0,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="glass-panel-soft border-b border-white/50 px-6 py-5">
              <div className="text-lg font-bold text-stone-800">重新生成初始化分析</div>
              <div className="mt-1 text-sm text-stone-500">
                初始化分析结果是该命例下其他会话的分析依据，如初始化分析无误，不建议重新生成。
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="glass-panel-soft rounded-[24px] border border-white/60 px-4 py-4 text-sm leading-6 text-stone-600">
                重新生成后，后续新开的会话会以新的初始化分析作为命例基线；已有历史会话仍保留各自的基线快照。
              </div>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInitialAnalysisRegenerateConfirm(false)}
                  className="glass-chip rounded-2xl px-4 py-2 text-sm text-stone-600 hover:text-stone-800"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInitialAnalysisRegenerateConfirm(false);
                    void handleRegenerateCaseInitialAnalysis();
                  }}
                  className="glass-panel-dark rounded-2xl px-4 py-2 text-sm text-amber-200 hover:brightness-105"
                >
                  确认重新生成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {false && professionalModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/42 backdrop-blur-md px-4 py-6"
          onClick={() => setProfessionalModalOpen(false)}
        >
          <div
            className="glass-panel flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-white/60 shadow-[0_30px_90px_rgba(0,0,0,0.24)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="glass-panel-soft border-b border-white/50 px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-stone-800">进阶功能</div>
                  <div className="mt-1 text-sm text-stone-500">更新、更专业的 VIP 功能强先体验</div>
                </div>
                <button
                  type="button"
                  onClick={() => setProfessionalModalOpen(false)}
                  className="glass-chip rounded-full px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700"
                >
                  关闭
                </button>
              </div>
            </div>

            <div className="glass-chat-bg flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6 md:py-5">
              {!professionalSelectedProject && (
                <div className="grid gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setProfessionalSelectedProject(PROFESSIONAL_FEATURE_JOINT)}
                    className="glass-panel-soft rounded-[28px] border border-white/60 p-5 text-left transition hover:bg-white/75"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-base font-bold text-stone-700">八字 + 紫微联合分析</div>
                      <span className="rounded-full border border-amber-200 bg-amber-50/90 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                        首发
                      </span>
                    </div>
                    <div className="mt-3 text-sm leading-7 text-stone-600">
                      同步读取八字与紫微两套命盘，交叉印证后给出整合判断，适合做全局命例诊断。
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfessionalSelectedProject(PROFESSIONAL_FEATURE_BAZI_COMPAT)}
                    className="glass-panel-soft rounded-[28px] border border-white/60 p-5 text-left transition hover:bg-white/75"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-base font-bold text-stone-700">八字合盘分析</div>
                      <span className="rounded-full border border-white/70 bg-white/75 px-2.5 py-1 text-[11px] font-semibold text-stone-600">
                        Beta
                      </span>
                    </div>
                    <div className="mt-3 text-sm leading-7 text-stone-600">
                      读取两人的八字命盘，结合关系标签做合盘分析，适合观察匹配度、冲突点与相处建议。
                    </div>
                  </button>
                </div>
              )}

              {professionalSelectedProject === PROFESSIONAL_FEATURE_JOINT && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-bold text-stone-700">八字 + 紫微联合分析</div>
                      <div className="mt-1 text-xs text-stone-500">
                        可直接选已有命例，也可新建联合命例。首次分析默认做全盘解读。
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={resetProfessionalComposer}
                      className="glass-chip rounded-full px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700"
                    >
                      重新选择
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setProfessionalMode('existing')}
                      className={`flex-1 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                        professionalMode === 'existing'
                          ? 'glass-panel-dark border-transparent text-amber-200'
                          : 'glass-chip text-stone-600'
                      }`}
                    >
                      选择已有命例
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfessionalMode('new')}
                      className={`flex-1 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                        professionalMode === 'new'
                          ? 'glass-panel-dark border-transparent text-amber-200'
                          : 'glass-chip text-stone-600'
                      }`}
                    >
                      新建联合命例
                    </button>
                  </div>

                  {professionalMode === 'existing' && (
                    <div className="space-y-4">
                      <div className="glass-panel-soft rounded-[28px] border border-white/60 p-4">
                        <div className="text-sm font-bold text-stone-700">已有命例</div>
                        <div className="mt-4 max-h-[44vh] overflow-y-auto overscroll-contain pr-1">
                          <div className="grid gap-3 md:grid-cols-2">
                          {professionalCasesLoading && (
                            <div className="col-span-full text-sm text-stone-400">正在读取命例...</div>
                          )}
                          {!professionalCasesLoading && professionalCaseOptions.length === 0 && (
                            <div className="col-span-full rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-400">
                              暂无可用命例，请切换到“新建联合命例”。
                            </div>
                          )}
                          {professionalCaseOptions.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setProfessionalSelectedCaseId(item.id)}
                              className={`rounded-[24px] border px-4 py-3 text-left transition ${
                                professionalSelectedCaseId === item.id
                                  ? 'glass-panel-dark border-transparent text-amber-200'
                                  : 'glass-panel bg-white/70 border-white/60 text-stone-700 hover:bg-white/85'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-bold">{item.title}</div>
                                  {getCaseSexLabel(item.chartParams) && (
                                    <div className={`mt-1 text-xs ${professionalSelectedCaseId === item.id ? 'text-amber-100/80' : 'text-stone-500'}`}>
                                      {getCaseSexLabel(item.chartParams)}
                                    </div>
                                  )}
                                  <div className={`mt-1 text-xs ${professionalSelectedCaseId === item.id ? 'text-amber-100/80' : 'text-stone-500'}`}>
                                    四柱：{getCasePillarsPreview(item.modelType, item.chartData) || '未获取'}
                                  </div>
                                </div>
                                <span className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                  professionalSelectedCaseId === item.id
                                    ? 'border-amber-200/30 text-amber-100'
                                    : 'border-stone-200 text-stone-500'
                                }`}>
                                  {item.modelType === ModelType.BAZI ? '八字' : '紫微'}
                                </span>
                              </div>
                            </button>
                          ))}
                          </div>
                        </div>
                      </div>
                      <div className="sticky bottom-0 z-10 -mx-1 rounded-[24px] bg-[linear-gradient(180deg,rgba(248,250,252,0),rgba(255,255,255,0.85)_18%,rgba(255,255,255,0.94))] px-1 pb-1 pt-3">
                        <button
                          type="button"
                          onClick={() => void handleRunJointProfessionalFromExisting()}
                          disabled={professionalBusy || !professionalSelectedCaseId}
                          className={`glass-cta w-full rounded-2xl py-3.5 font-bold text-amber-300 transition ${
                            professionalBusy || !professionalSelectedCaseId ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-105'
                          }`}
                        >
                          {professionalBusy ? '联合分析启动中...' : '开始联合分析'}
                        </button>
                      </div>
                    </div>
                  )}

                  {professionalMode === 'new' && (
                    <div className="glass-panel-soft rounded-[28px] border border-white/60 p-5 md:p-6 space-y-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className="block text-sm font-semibold text-stone-700">姓名（可选）</span>
                          <input
                            type="text"
                            value={professionalName}
                            onChange={(event) => setProfessionalName(event.target.value)}
                            className="glass-input mt-2 w-full rounded-2xl p-3 outline-none"
                            placeholder="请输入姓名"
                          />
                        </label>
                        <div>
                          <span className="block text-sm font-semibold text-stone-700">性别</span>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setProfessionalGender(0)}
                              className={`flex-1 rounded-2xl border py-2.5 transition ${professionalGender === 0 ? 'glass-panel-dark border-transparent text-amber-200' : 'glass-chip text-stone-600'}`}
                            >
                              男
                            </button>
                            <button
                              type="button"
                              onClick={() => setProfessionalGender(1)}
                              className={`flex-1 rounded-2xl border py-2.5 transition ${professionalGender === 1 ? 'glass-panel-dark border-transparent text-amber-200' : 'glass-chip text-stone-600'}`}
                            >
                              女
                            </button>
                          </div>
                        </div>
                      </div>

                      <label className="block">
                        <span className="block text-sm font-semibold text-stone-700">出生时间</span>
                        <input
                          type="datetime-local"
                          value={professionalCustomDate}
                          onChange={(event) => setProfessionalCustomDate(event.target.value)}
                          className="glass-input mt-2 w-full rounded-2xl p-3 outline-none"
                        />
                      </label>

                      <LocationSelector
                        province={professionalProvince}
                        city={professionalCity}
                        setProvince={setProfessionalProvince}
                        setCity={setProfessionalCity}
                      />

                      <button
                        type="button"
                        onClick={() => void handleRunJointProfessionalFromNew()}
                        disabled={professionalBusy || !professionalCustomDate}
                        className={`glass-cta w-full rounded-2xl py-3.5 font-bold text-amber-300 transition ${
                          professionalBusy || !professionalCustomDate ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-105'
                        }`}
                      >
                        {professionalBusy ? '双盘排盘中...' : '排盘并开始联合分析'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {professionalSelectedProject === PROFESSIONAL_FEATURE_BAZI_COMPAT && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-bold text-stone-700">八字合盘分析</div>
                      <div className="mt-1 text-xs text-stone-500">
                        为两位命例分别载入八字命盘，再结合关系标签做全盘合盘分析。
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={resetProfessionalComposer}
                      className="glass-chip rounded-full px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700"
                    >
                      重新选择
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      { key: 'A', label: '甲', state: compatPersonA, setState: setCompatPersonA },
                      { key: 'B', label: '乙', state: compatPersonB, setState: setCompatPersonB },
                    ].map((person) => (
                      <div key={person.key} className="glass-panel-soft rounded-[28px] border border-white/60 p-5 space-y-4">
                        <div>
                          <div className="text-sm font-bold text-stone-700">{person.label}方命例</div>
                          <div className="mt-1 text-xs text-stone-500">可直接选已有八字命例，也可新建一个八字命例。</div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => person.setState((current) => ({ ...current, mode: 'existing' }))}
                            className={`flex-1 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                              person.state.mode === 'existing'
                                ? 'glass-panel-dark border-transparent text-amber-200'
                                : 'glass-chip text-stone-600'
                            }`}
                          >
                            已有命例
                          </button>
                          <button
                            type="button"
                            onClick={() => person.setState((current) => ({ ...current, mode: 'new' }))}
                            className={`flex-1 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                              person.state.mode === 'new'
                                ? 'glass-panel-dark border-transparent text-amber-200'
                                : 'glass-chip text-stone-600'
                            }`}
                          >
                            新建命例
                          </button>
                        </div>

                        {person.state.mode === 'existing' ? (
                          <div className="max-h-[34vh] overflow-y-auto overscroll-contain pr-1">
                            <div className="space-y-2">
                              {professionalCasesLoading && (
                                <div className="text-sm text-stone-400">正在读取命例...</div>
                              )}
                              {!professionalCasesLoading && professionalCaseOptions.filter((item) => item.modelType === ModelType.BAZI).length === 0 && (
                                <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-400">
                                  暂无八字命例，请切换到“新建命例”。
                                </div>
                              )}
                              {professionalCaseOptions
                                .filter((item) => item.modelType === ModelType.BAZI)
                                .map((item) => (
                                  <button
                                    key={`${person.key}-${item.id}`}
                                    type="button"
                                    onClick={() => person.setState((current) => ({ ...current, selectedCaseId: item.id }))}
                                    className={`w-full rounded-[22px] border px-4 py-3 text-left transition ${
                                      person.state.selectedCaseId === item.id
                                        ? 'glass-panel-dark border-transparent text-amber-200'
                                        : 'glass-panel bg-white/70 border-white/60 text-stone-700 hover:bg-white/85'
                                    }`}
                                  >
                                    <div className="text-sm font-bold">{item.title}</div>
                                    {getCaseSexLabel(item.chartParams) && (
                                      <div className={`mt-1 text-xs ${person.state.selectedCaseId === item.id ? 'text-amber-100/80' : 'text-stone-500'}`}>
                                        {getCaseSexLabel(item.chartParams)}
                                      </div>
                                    )}
                                    <div className={`mt-1 text-xs ${person.state.selectedCaseId === item.id ? 'text-amber-100/80' : 'text-stone-500'}`}>
                                      四柱：{getCasePillarsPreview(item.modelType, item.chartData) || '未获取'}
                                    </div>
                                  </button>
                                ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <label className="block">
                              <span className="block text-sm font-semibold text-stone-700">姓名（可选）</span>
                              <input
                                type="text"
                                value={person.state.name}
                                onChange={(event) => person.setState((current) => ({ ...current, name: event.target.value }))}
                                className="glass-input mt-2 w-full rounded-2xl p-3 outline-none"
                                placeholder="请输入姓名"
                              />
                            </label>

                            <div>
                              <span className="block text-sm font-semibold text-stone-700">性别</span>
                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => person.setState((current) => ({ ...current, gender: 0 }))}
                                  className={`flex-1 rounded-2xl border py-2.5 transition ${person.state.gender === 0 ? 'glass-panel-dark border-transparent text-amber-200' : 'glass-chip text-stone-600'}`}
                                >
                                  男
                                </button>
                                <button
                                  type="button"
                                  onClick={() => person.setState((current) => ({ ...current, gender: 1 }))}
                                  className={`flex-1 rounded-2xl border py-2.5 transition ${person.state.gender === 1 ? 'glass-panel-dark border-transparent text-amber-200' : 'glass-chip text-stone-600'}`}
                                >
                                  女
                                </button>
                              </div>
                            </div>

                            <label className="block">
                              <span className="block text-sm font-semibold text-stone-700">出生时间</span>
                              <input
                                type="datetime-local"
                                value={person.state.customDate}
                                onChange={(event) => person.setState((current) => ({ ...current, customDate: event.target.value }))}
                                className="glass-input mt-2 w-full rounded-2xl p-3 outline-none"
                              />
                            </label>

                            <LocationSelector
                              province={person.state.province}
                              city={person.state.city}
                              setProvince={(value) => person.setState((current) => ({ ...current, province: value }))}
                              setCity={(value) => person.setState((current) => ({ ...current, city: value }))}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="sticky bottom-0 z-10 -mx-1 rounded-[24px] bg-[linear-gradient(180deg,rgba(248,250,252,0),rgba(255,255,255,0.85)_18%,rgba(255,255,255,0.94))] px-1 pb-1 pt-3">
                    <button
                      type="button"
                      onClick={() => void handleRunBaziCompatibilityProfessional()}
                      disabled={professionalBusy}
                      className={`glass-cta w-full rounded-2xl py-3.5 font-bold text-amber-300 transition ${
                        professionalBusy ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-105'
                      }`}
                    >
                      {professionalBusy ? '合盘准备中...' : '开始八字合盘分析'}
                    </button>
                  </div>
                </div>
              )}

                  {professionalResultSummary && (
                    <div className="glass-panel-soft rounded-[26px] border border-white/60 px-4 py-4">
                      <div className="text-sm font-bold text-stone-700">已载入主界面</div>
                      <div className="mt-2 text-sm leading-7 text-stone-600">
                        {professionalResultSummary}...
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setProfessionalModalOpen(false)}
                          className="glass-panel-dark rounded-full px-4 py-2 text-xs text-amber-200 hover:brightness-105"
                        >
                          查看当前结果
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
        )}

      {compatRelationModalOpen && pendingCompatibilityData && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/42 backdrop-blur-md px-4 py-6"
          onClick={() => setCompatRelationModalOpen(false)}
        >
          <div
            className="glass-panel flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-white/60 shadow-[0_30px_90px_rgba(0,0,0,0.24)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="glass-panel-soft border-b border-white/50 px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-stone-800">关系标签</div>
                  <div className="mt-1 text-sm text-stone-500">
                    可选填写双方关系，系统会将标签保存到两人的命例中。
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCompatRelationModalOpen(false)}
                  className="glass-chip rounded-full px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700"
                >
                  关闭
                </button>
              </div>
            </div>

            <div className="glass-chat-bg flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6 md:py-5 space-y-4">
              {compatRelationDrafts.some((draft) => draft.id || draft.labelAToB.trim() || draft.labelBToA.trim()) && (
                <div className="rounded-[22px] border border-amber-200/70 bg-amber-50/65 px-4 py-3 text-sm leading-7 text-amber-800">
                  已读取这两位命例之间的已有关系标签。请确认关系是否正确；如需调整，可直接修改后再开始分析。
                </div>
              )}

              {compatRelationDrafts.map((draft, index) => (
                <div key={draft.id || index} className="glass-panel-soft rounded-[24px] border border-white/60 p-4 space-y-4">
                  <div className="text-sm font-bold text-stone-700">关系 {index + 1}</div>
                  <label className="block">
                    <span className="block text-sm font-semibold text-stone-700">
                      {pendingCompatibilityData.personAName}是{pendingCompatibilityData.personBName}的：
                    </span>
                    <input
                      type="text"
                      value={draft.labelAToB}
                      onChange={(event) => {
                        const value = event.target.value;
                        setCompatRelationDrafts((current) => current.map((item, itemIndex) => (
                          itemIndex === index ? { ...item, labelAToB: value } : item
                        )));
                      }}
                      className="glass-input mt-2 w-full rounded-2xl p-3 outline-none"
                      placeholder="可留空"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-semibold text-stone-700">
                      {pendingCompatibilityData.personBName}是{pendingCompatibilityData.personAName}的：
                    </span>
                    <input
                      type="text"
                      value={draft.labelBToA}
                      onChange={(event) => {
                        const value = event.target.value;
                        setCompatRelationDrafts((current) => current.map((item, itemIndex) => (
                          itemIndex === index ? { ...item, labelBToA: value } : item
                        )));
                      }}
                      className="glass-input mt-2 w-full rounded-2xl p-3 outline-none"
                      placeholder="可留空"
                    />
                  </label>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setCompatRelationDrafts((current) => [...current, { labelAToB: '', labelBToA: '' }])}
                className="glass-chip rounded-full px-4 py-2 text-sm text-stone-600 hover:text-stone-800"
              >
                再增加一条关系
              </button>
            </div>

            <div className="glass-panel-soft border-t border-white/50 px-4 py-4 md:px-6">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => void handleConfirmCompatibilityRelations(true)}
                  className="glass-chip rounded-full px-4 py-2 text-sm text-stone-600 hover:text-stone-800"
                >
                  {compatRelationDrafts.some((draft) => draft.id || draft.labelAToB.trim() || draft.labelBToA.trim())
                    ? '保持当前标签并开始分析'
                    : '跳过并开始分析'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmCompatibilityRelations(false)}
                  className="glass-panel-dark rounded-full px-4 py-2 text-sm text-amber-200 hover:brightness-105"
                >
                  保存并开始分析
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingCaseRelationId && activeCase?.relations && (
        (() => {
          const editingRelation = activeCase.relations.find((item) => item.id === editingCaseRelationId);
          if (!editingRelation) return null;
          return (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/42 backdrop-blur-md px-4 py-6"
              onClick={() => {
                setEditingCaseRelationId(null);
                setCaseRelationEditDraft({ labelAToB: '', labelBToA: '' });
              }}
            >
              <div
                className="glass-panel flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-white/60 shadow-[0_30px_90px_rgba(0,0,0,0.24)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="glass-panel-soft border-b border-white/50 px-6 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-stone-800">修改关系标签</div>
                      <div className="mt-1 text-sm text-stone-500">可修改双方关系描述，也可直接删除这条标签。</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCaseRelationId(null);
                        setCaseRelationEditDraft({ labelAToB: '', labelBToA: '' });
                      }}
                      className="glass-chip rounded-full px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700"
                    >
                      关闭
                    </button>
                  </div>
                </div>

                <div className="glass-chat-bg flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6 md:py-5 space-y-4">
                  <label className="block">
                    <span className="block text-sm font-semibold text-stone-700">
                      {editingRelation.caseATitle || '甲'}是{editingRelation.caseBTitle || '乙'}的：
                    </span>
                    <input
                      type="text"
                      value={caseRelationEditDraft.labelAToB}
                      onChange={(event) => setCaseRelationEditDraft((current) => ({ ...current, labelAToB: event.target.value }))}
                      className="glass-input mt-2 w-full rounded-2xl p-3 outline-none"
                      placeholder="可留空"
                    />
                  </label>

                  <label className="block">
                    <span className="block text-sm font-semibold text-stone-700">
                      {editingRelation.caseBTitle || '乙'}是{editingRelation.caseATitle || '甲'}的：
                    </span>
                    <input
                      type="text"
                      value={caseRelationEditDraft.labelBToA}
                      onChange={(event) => setCaseRelationEditDraft((current) => ({ ...current, labelBToA: event.target.value }))}
                      className="glass-input mt-2 w-full rounded-2xl p-3 outline-none"
                      placeholder="可留空"
                    />
                  </label>
                </div>

                <div className="glass-panel-soft border-t border-white/50 px-4 py-4 md:px-6">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void handleDeleteCaseRelation(editingCaseRelationId)}
                      className="glass-chip rounded-full px-4 py-2 text-sm text-red-500 hover:text-red-600"
                    >
                      删除标签
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveCaseRelationEdit()}
                      className="glass-panel-dark rounded-full px-4 py-2 text-sm text-amber-200 hover:brightness-105"
                    >
                      保存修改
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* K线浮球 */}
      {modelType === ModelType.BAZI && step === 'chart' && klinePos && !activeProfessionalFeature && (
        <div className="fixed z-40 select-none" style={{ left: klinePos.x, top: klinePos.y }}>
          <button
            type="button"
            onPointerDown={handleKlinePointerDown}
            onPointerMove={handleKlinePointerMove}
            onPointerUp={handleKlinePointerUp}
            onPointerCancel={handleKlinePointerUp}
            title={isTyping ? '请等待ai运行完毕' : '人生K线'}
            disabled={isTyping}
            className={`group relative h-[74px] w-[74px] rounded-full border font-bold transition cursor-grab active:cursor-grabbing backdrop-blur-[18px] ${
              isTyping
                ? 'border-white/35 bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.32),rgba(255,247,224,0.18)_52%,rgba(245,158,11,0.08)_100%)] text-stone-400 shadow-[0_18px_42px_rgba(231,229,228,0.16)] cursor-not-allowed'
                : 'border-amber-100/45 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.34),rgba(255,247,224,0.22)_42%,rgba(252,211,77,0.12)_72%,rgba(245,158,11,0.08)_100%)] text-stone-700 shadow-[0_18px_46px_rgba(245,158,11,0.12)] hover:scale-[1.03] hover:border-amber-100/65'
            }`}
          >
            <span className="absolute inset-0 rounded-full bg-white/6" />
            <span className="absolute inset-[2px] rounded-full border border-white/22 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]" />
            <span className="absolute inset-[8px] rounded-full border border-amber-100/25 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),rgba(255,255,255,0.05)_58%,rgba(255,255,255,0.01)_100%)]" />
            <span className="pointer-events-none absolute inset-x-4 top-2.5 h-4 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.01))] blur-[1.5px] opacity-90" />
            <span className="relative z-10 flex h-full w-full flex-col items-center justify-center leading-none">
              <span className="text-[10px] font-medium tracking-[0.28em] text-stone-600/70">人生</span>
              <span className="mt-1 text-[23px] font-semibold tracking-[-0.03em] text-stone-700/90">K线</span>
            </span>
          </button>
        </div>
      )}

      {/* K线弹窗 */}
      {klineModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/42 backdrop-blur-md px-4 py-6">
          <div className="glass-panel relative isolate flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(250,250,249,0.72))] shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(248,250,252,0.64))]" />
            <div className="pointer-events-none absolute left-[-8%] top-[-6%] -z-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(253,230,138,0.12),rgba(255,255,255,0)_70%)] blur-2xl" />
            <div className="pointer-events-none absolute bottom-[-10%] right-[-4%] -z-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(226,232,240,0.16),rgba(255,255,255,0)_70%)] blur-3xl" />
            <div className="glass-panel-soft relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(252,252,251,0.64))] px-6 py-4">
              <div>
                <div className="text-sm font-bold text-stone-800">人生K线</div>
                <div className="text-[11px] text-stone-500">当前八字命例的七步大运与七十流年运势曲线</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/60 bg-white/55 px-3 py-1 text-[11px] text-stone-600">
                  {klineStatus === 'analyzing'
                    ? '状态：推演中'
                    : klineResult
                      ? '状态：已生成'
                      : '状态：未生成'}
                </span>
                {klineResult && (
                  <button
                    type="button"
                    onClick={handleSaveKline}
                    className="glass-chip text-xs px-3 py-1 rounded-full text-stone-600 hover:text-stone-800"
                  >
                    保存到本地
                  </button>
                )}
                {activeCase?.modelType === ModelType.BAZI && (
                  <button
                    type="button"
                    onClick={() => void handleRunKline(true)}
                    disabled={klineStatus === 'analyzing'}
                    className="glass-panel-dark text-xs px-3 py-1 rounded-full text-amber-200 hover:brightness-105 disabled:opacity-60"
                  >
                    重新生成
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setKlineModalOpen(false)}
                  className="glass-chip text-xs px-3 py-1 rounded-full text-stone-500 hover:text-stone-700"
                >
                  关闭
                </button>
              </div>
            </div>

            <div className="relative z-10 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.54),rgba(248,250,252,0.42))] p-6">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.04))]" />
              <div className="relative z-10">
              {klineStatus === 'idle' && !klineResult && (
                <div className="glass-panel-soft h-[360px] rounded-[30px] border border-dashed border-amber-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.74),rgba(255,250,240,0.54))] flex flex-col items-center justify-center text-stone-500 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-100/80 text-amber-700 flex items-center justify-center shadow-[0_12px_35px_rgba(245,158,11,0.22)]">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 3h18v18H3V3zm4 12l3-3 4 4 5-5" />
                    </svg>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-sm font-bold text-stone-700">什么是“人生K线”？</div>
                    <div className="text-xs text-stone-500 max-w-md">
                      基于你的四柱八字盘和已完成的AI解读，进一步对七步大运与七十个流年进行评分与主线标签总结，并绘制人生运势曲线。
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRunKline(false)}
                    className="glass-panel-dark text-xs px-4 py-2 rounded-full text-amber-300 hover:brightness-105"
                  >
                    推求K线
                  </button>
                </div>
              )}

              {klineStatus === 'analyzing' && (
                <div className="glass-panel-soft h-[360px] rounded-[30px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.74),rgba(255,250,240,0.48))] flex flex-col items-center justify-center text-stone-600 space-y-4">
                  <div className="flex items-center gap-3 text-lg font-semibold">
                    <span className="inline-flex h-6 w-6 animate-spin rounded-full border-2 border-amber-500/40 border-t-amber-600"></span>
                    AI正在分析，请勿刷新界面……
                  </div>
                  <div className="text-xs text-stone-400">
                    正在推演第 {Math.min(70, Math.max(0, klineYearProgress))} 年 / 70 年
                  </div>
                  <div className="w-full max-w-md h-2 rounded-full bg-white/60 overflow-hidden border border-white/60">
                    <div
                      className="h-2 bg-[linear-gradient(90deg,rgba(245,158,11,0.8),rgba(217,119,6,0.95))] transition-all"
                      style={{ width: `${klineProgress}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-stone-400">分析时间约 3～5 分钟，卡顿属于正常现象，请耐心等待～</div>
                </div>
              )}

              {klineStatus === 'error' && (
                <div className="glass-panel-soft h-[360px] rounded-[30px] border border-red-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(254,242,242,0.56))] flex flex-col items-center justify-center text-red-600">
                  <div className="text-sm font-semibold mb-2">K线分析失败</div>
                  <div className="text-xs text-red-500">{klineError}</div>
                  <button
                    type="button"
                    onClick={() => void handleRunKline(true)}
                    className="mt-4 text-xs px-3 py-1 rounded-full border border-red-200 text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    重新分析
                  </button>
                </div>
              )}

              {klineStatus === 'ready' && klineResult && (
                <div className="space-y-6">
                  <div className="glass-panel-soft flex flex-wrap items-center justify-between gap-4 rounded-[26px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(250,250,249,0.56))] px-4 py-3">
                    <div className="text-xs text-stone-500">横坐标为年份，纵坐标为分数（0-100）</div>
                    <div className="flex items-center gap-3 text-xs text-stone-500">
                      <span className="font-medium text-stone-600">缩放</span>
                      <input
                        type="range"
                        min={0.6}
                        max={2}
                        step={0.1}
                        value={klineZoom}
                        onChange={(e) => setKlineZoom(parseFloat(e.target.value))}
                        className="accent-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
                    <label className={`flex items-center gap-2 cursor-pointer rounded-full border px-3 py-1.5 backdrop-blur-md ${klineSeries.overall ? 'border-amber-200 bg-amber-50/85 text-stone-700 shadow-[0_10px_25px_rgba(245,158,11,0.08)]' : 'border-white/70 bg-white/55'}`}>
                      <input
                        type="checkbox"
                        checked={klineSeries.overall}
                        onChange={(e) => setKlineSeries((prev) => ({ ...prev, overall: e.target.checked }))}
                        className="sr-only"
                      />
                      <GlowCheck checked={klineSeries.overall} sizeClass="h-3.5 w-3.5" dotClass="h-1 w-1" />
                      <span className="text-stone-700">总体趋势</span>
                      <span className="inline-block h-2 w-6 rounded-full bg-amber-700"></span>
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer rounded-full border px-3 py-1.5 backdrop-blur-md ${klineSeries.wealth ? 'border-amber-200 bg-amber-50/85 text-stone-700 shadow-[0_10px_25px_rgba(245,158,11,0.08)]' : 'border-white/70 bg-white/55'}`}>
                      <input
                        type="checkbox"
                        checked={klineSeries.wealth}
                        onChange={(e) => setKlineSeries((prev) => ({ ...prev, wealth: e.target.checked }))}
                        className="sr-only"
                      />
                      <GlowCheck checked={klineSeries.wealth} sizeClass="h-3.5 w-3.5" dotClass="h-1 w-1" />
                      <span>财富</span>
                      <span className="inline-block h-2 w-6 rounded-full bg-yellow-500"></span>
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer rounded-full border px-3 py-1.5 backdrop-blur-md ${klineSeries.love ? 'border-amber-200 bg-amber-50/85 text-stone-700 shadow-[0_10px_25px_rgba(245,158,11,0.08)]' : 'border-white/70 bg-white/55'}`}>
                      <input
                        type="checkbox"
                        checked={klineSeries.love}
                        onChange={(e) => setKlineSeries((prev) => ({ ...prev, love: e.target.checked }))}
                        className="sr-only"
                      />
                      <GlowCheck checked={klineSeries.love} sizeClass="h-3.5 w-3.5" dotClass="h-1 w-1" />
                      <span>感情</span>
                      <span className="inline-block h-2 w-6 rounded-full bg-pink-400"></span>
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer rounded-full border px-3 py-1.5 backdrop-blur-md ${klineSeries.career ? 'border-amber-200 bg-amber-50/85 text-stone-700 shadow-[0_10px_25px_rgba(245,158,11,0.08)]' : 'border-white/70 bg-white/55'}`}>
                      <input
                        type="checkbox"
                        checked={klineSeries.career}
                        onChange={(e) => setKlineSeries((prev) => ({ ...prev, career: e.target.checked }))}
                        className="sr-only"
                      />
                      <GlowCheck checked={klineSeries.career} sizeClass="h-3.5 w-3.5" dotClass="h-1 w-1" />
                      <span>事业</span>
                      <span className="inline-block h-2 w-6 rounded-full bg-blue-500"></span>
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer rounded-full border px-3 py-1.5 backdrop-blur-md ${klineSeries.health ? 'border-amber-200 bg-amber-50/85 text-stone-700 shadow-[0_10px_25px_rgba(245,158,11,0.08)]' : 'border-white/70 bg-white/55'}`}>
                      <input
                        type="checkbox"
                        checked={klineSeries.health}
                        onChange={(e) => setKlineSeries((prev) => ({ ...prev, health: e.target.checked }))}
                        className="sr-only"
                      />
                      <GlowCheck checked={klineSeries.health} sizeClass="h-3.5 w-3.5" dotClass="h-1 w-1" />
                      <span>健康</span>
                      <span className="inline-block h-2 w-6 rounded-full bg-emerald-700"></span>
                    </label>
                  </div>

                  <div className="relative overflow-hidden rounded-[28px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(250,250,249,0.62))] shadow-[0_20px_60px_rgba(120,113,108,0.16)] backdrop-blur-xl">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.06))]" />
                    <div className="pointer-events-none absolute -left-16 top-10 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(253,230,138,0.08),rgba(255,255,255,0)_72%)] blur-2xl" />
                    <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(254,243,199,0.06),rgba(255,255,255,0)_72%)] blur-2xl" />
                    <div className="relative z-10 overflow-x-auto">
                      {(() => {
                        const liunianSorted = [...klineResult.liunian].sort((a, b) => a.year - b.year).slice(0, 70);
                        const dayunSorted = [...klineResult.dayun].sort((a, b) => a.start_year - b.start_year).slice(0, 7);
                        const years = liunianSorted.map(item => item.year);
                        const minYear = Math.min(...years);
                        const maxYear = Math.max(...years);
                        const totalYears = maxYear - minYear + 1;
                        const yearWidth = 18 * klineZoom;
                        const chartHeight = 240;
                        const padding = { top: 20, right: 30, bottom: 34, left: 44 };
                        const width = totalYears * yearWidth + padding.left + padding.right;
                        const height = chartHeight + padding.top + padding.bottom;
                        const axisY = padding.top + chartHeight;
                        const yScale = (score: number) =>
                          padding.top + (100 - Math.min(100, Math.max(0, score))) / 100 * chartHeight;
                        const xScale = (year: number) =>
                          padding.left + (year - minYear) * yearWidth + yearWidth / 2;
                        const buildLinePoints = (getter: (scores: KlineScores) => number) =>
                          liunianSorted
                            .map((item) => `${xScale(item.year)},${yScale(getter(item.scores))}`)
                            .join(' ');

                        const linePoints = buildLinePoints(scoreAverage);
                        const wealthPoints = buildLinePoints((s) => s.wealth);
                        const lovePoints = buildLinePoints((s) => s.love);
                        const careerPoints = buildLinePoints((s) => s.career);
                        const healthPoints = buildLinePoints((s) => s.health);
                        return (
                          <svg width={width} height={height} className="bg-transparent">
                            {/* Y axis grid */}
                            {[0, 20, 40, 60, 80, 100].map((tick) => (
                              <g key={tick}>
                                <line
                                  x1={padding.left}
                                  y1={yScale(tick)}
                                  x2={width - padding.right}
                                  y2={yScale(tick)}
                                  stroke="rgba(148,163,184,0.18)"
                                  strokeWidth="1"
                                />
                                <text
                                  x={padding.left - 8}
                                  y={yScale(tick) + 4}
                                  fontSize="10"
                                  fill="#94a3b8"
                                  textAnchor="end"
                                >
                                  {tick}
                                </text>
                              </g>
                            ))}

                            {/* X axis baseline */}
                            <line
                              x1={padding.left}
                              y1={axisY}
                              x2={width - padding.right}
                              y2={axisY}
                              stroke="rgba(148,163,184,0.3)"
                              strokeWidth="1"
                            />

                            {/* Dayun bars (behind line) */}
                            {dayunSorted.map((item, idx) => {
                              const startX = padding.left + (item.start_year - minYear) * yearWidth;
                              const endX = padding.left + (item.end_year - minYear + 1) * yearWidth;
                              const avg = scoreAverage(item.scores);
                              const barTop = yScale(avg);
                              const barHeight = padding.top + chartHeight - barTop;
                              return (
                                <g key={`${item.name}-${idx}`}>
                                  <rect
                                    x={startX}
                                    y={barTop}
                                    width={endX - startX}
                                    height={barHeight}
                                    fill="rgba(255,251,235,0.72)"
                                    stroke="rgba(253,230,138,0.75)"
                                    strokeWidth="1"
                                    opacity="0.95"
                                    onClick={() => setKlineSelected({ kind: 'dayun', start_year: item.start_year })}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  <text
                                    x={(startX + endX) / 2}
                                    y={barTop + barHeight / 2}
                                    fontSize="11"
                                    fontWeight="600"
                                    fill="#92400e"
                                    textAnchor="middle"
                                  >
                                    {item.tag}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Liunian lines */}
                            {klineSeries.wealth && (
                              <polyline
                                points={wealthPoints}
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="2"
                              />
                            )}
                            {klineSeries.love && (
                              <polyline
                                points={lovePoints}
                                fill="none"
                                stroke="#f472b6"
                                strokeWidth="2"
                              />
                            )}
                            {klineSeries.career && (
                              <polyline
                                points={careerPoints}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="2"
                              />
                            )}
                            {klineSeries.health && (
                              <polyline
                                points={healthPoints}
                                fill="none"
                                stroke="#047857"
                                strokeWidth="2"
                              />
                            )}
                            {klineSeries.overall && (
                              <polyline
                                points={linePoints}
                                fill="none"
                                stroke="#b45309"
                                strokeWidth="2.5"
                              />
                            )}
                            {klineSeries.overall && liunianSorted.map((item, idx) => {
                              const avg = scoreAverage(item.scores);
                              const cx = xScale(item.year);
                              const cy = yScale(avg);
                              return (
                                <g key={`${item.year}-${idx}`}>
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={3}
                                    fill="#b45309"
                                    onClick={() => setKlineSelected({ kind: 'liunian', year: item.year })}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  <text
                                    x={cx}
                                    y={cy - 8}
                                    fontSize="9"
                                    fill="#92400e"
                                    textAnchor="middle"
                                    transform={`rotate(-45 ${cx} ${cy - 8})`}
                                  >
                                    {item.tag}
                                  </text>
                                </g>
                              );
                            })}

                            {/* X axis labels */}
                            {Array.from({ length: totalYears }, (_, idx) => {
                              const year = minYear + idx;
                              const x = padding.left + idx * yearWidth + yearWidth / 2;
                              const showLabel = totalYears <= 40 || idx % 2 === 0;
                              if (!showLabel) return null;
                              return (
                                <text
                                  key={year}
                                  x={x}
                                  y={axisY + 12}
                                  fontSize="9"
                                  fill="#64748b"
                                  textAnchor="end"
                                  dominantBaseline="middle"
                                  transform={`rotate(-45 ${x} ${axisY + 12})`}
                                >
                                  {year}
                                </text>
                              );
                            })}
                          </svg>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="glass-panel-soft rounded-[28px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(248,250,252,0.5))] shadow-[0_18px_55px_rgba(120,113,108,0.14)] p-4 backdrop-blur-xl">
                    {!klineSelected && (
                      <div className="text-xs text-stone-500">点击大运柱或流年点，可查看单项评分。</div>
                    )}
                    {klineSelected && klineResult && (() => {
                      const selectedItem = klineSelected.kind === 'dayun'
                        ? klineResult.dayun.find((entry) => entry.start_year === klineSelected.start_year)
                        : klineResult.liunian.find((entry) => entry.year === klineSelected.year);
                      if (!selectedItem) return <div className="text-xs text-stone-500">未找到对应年份数据。</div>;

                      const renderScoreOverview = (scores: KlineScores) => {
                        const avg = scoreAverage(scores);
                        return (
                          <div className="relative rounded-[24px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(248,250,252,0.48))] px-4 py-6 backdrop-blur-md">
                            <div className="grid grid-cols-2 gap-6 text-center text-xs font-semibold">
                              <div className="space-y-1">
                                <div className="text-lg font-bold text-yellow-600">{scores.wealth}</div>
                                <div className="text-yellow-600">财富</div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-lg font-bold text-blue-600">{scores.career}</div>
                                <div className="text-blue-600">事业</div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-lg font-bold text-pink-500">{scores.love}</div>
                                <div className="text-pink-500">感情</div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-lg font-bold text-emerald-600">{scores.health}</div>
                                <div className="text-emerald-600">健康</div>
                              </div>
                            </div>
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full border border-white/80 bg-white/82 shadow-[0_14px_30px_rgba(16,185,129,0.14)] backdrop-blur-md">
                                <div className="text-[10px] text-stone-400">平均分</div>
                                <div className="text-lg font-bold text-emerald-700">{avg}</div>
                              </div>
                            </div>
                          </div>
                        );
                      };

                      if (klineSelected.kind === 'liunian') {
                        const liunianItem = selectedItem as KlineLiunianItem;
                        const relatedDayun = klineResult.dayun.find((entry) =>
                          liunianItem.year >= entry.start_year && liunianItem.year <= entry.end_year
                        );
                        return (
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="glass-panel-soft rounded-[26px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(248,250,252,0.48))] p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-bold text-stone-800">流年透视</div>
                                  <div className="text-[11px] text-stone-500">流年解读</div>
                                </div>
                                <div className="text-xl font-bold text-stone-800">
                                  {liunianItem.year}
                                </div>
                              </div>
                              <div className="rounded-[22px] border border-amber-100/80 bg-amber-50/75 px-4 py-3 text-sm font-bold text-stone-800 shadow-[0_10px_25px_rgba(245,158,11,0.08)]">
                                {liunianItem.tag}
                              </div>
                              {renderScoreOverview(liunianItem.scores)}
                            </div>

                            <div className="glass-panel-soft rounded-[26px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(248,250,252,0.48))] p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-bold text-stone-800">大运周期</div>
                                  <div className="text-[11px] text-stone-500">十年周期</div>
                                </div>
                                <div className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                                  {relatedDayun ? relatedDayun.name : '未知'}
                                </div>
                              </div>
                              {relatedDayun ? (
                                <>
                                  <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="rounded-[20px] border border-white/65 bg-white/55 px-3 py-2">
                                      <div className="text-[10px] text-stone-500">大运关键词</div>
                                      <div className="text-sm font-bold text-stone-800">{relatedDayun.tag}</div>
                                    </div>
                                    <div className="rounded-[20px] border border-white/65 bg-white/55 px-3 py-2">
                                      <div className="text-[10px] text-stone-500">周期跨度</div>
                                      <div className="text-sm font-bold text-stone-800">
                                        {relatedDayun.start_year} - {relatedDayun.end_year}
                                      </div>
                                    </div>
                                  </div>
                                  {renderScoreOverview(relatedDayun.scores)}
                                </>
                              ) : (
                                <div className="text-xs text-stone-500">未找到对应大运。</div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      const dayunItem = selectedItem as KlineDayunItem;
                      const trendYears = klineResult.liunian.filter((entry) =>
                        entry.year >= dayunItem.start_year && entry.year <= dayunItem.end_year
                      );
                      const trendWidth = 420;
                      const trendHeight = 160;
                      const pad = { top: 16, right: 20, bottom: 24, left: 32 };
                      const seriesList: Array<{ key: SeriesKey; color: string; getter: (s: KlineScores) => number }> = [
                        { key: 'overall', color: '#b45309', getter: scoreAverage },
                        { key: 'wealth', color: '#f59e0b', getter: (s) => s.wealth },
                        { key: 'career', color: '#3b82f6', getter: (s) => s.career },
                        { key: 'love', color: '#f472b6', getter: (s) => s.love },
                        { key: 'health', color: '#047857', getter: (s) => s.health },
                      ];
                      const activeSeries = seriesList.filter((series) => klineSeries[series.key]);
                      const fallbackSeries = activeSeries.length ? activeSeries : [seriesList[0]];
                      const allValues = trendYears.flatMap((entry) =>
                        fallbackSeries.map((series) => series.getter(entry.scores))
                      );
                      const rawMin = Math.min(...allValues);
                      const rawMax = Math.max(...allValues);
                      const range = Math.max(6, rawMax - rawMin);
                      const trendMin = Math.floor((rawMin - range * 0.15) / 5) * 5;
                      const trendMax = Math.ceil((rawMax + range * 0.15) / 5) * 5;
                      const clampMin = Math.max(0, trendMin);
                      const clampMax = Math.min(100, trendMax);
                      const trendX = (idx: number) =>
                        pad.left + (idx / Math.max(1, trendYears.length - 1)) * (trendWidth - pad.left - pad.right);
                      const trendY = (value: number) => {
                        const ratio = (value - clampMin) / Math.max(1, clampMax - clampMin);
                        return pad.top + (1 - ratio) * (trendHeight - pad.top - pad.bottom);
                      };
                      const buildTrendLine = (getter: (s: KlineScores) => number) =>
                        trendYears.map((entry, idx) => `${trendX(idx)},${trendY(getter(entry.scores))}`).join(' ');
                      const yTicks = 4;
                      const tickValues = Array.from({ length: yTicks + 1 }, (_, idx) =>
                        Math.round(clampMin + ((clampMax - clampMin) * idx) / yTicks)
                      );

                      return (
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="glass-panel-soft rounded-[26px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(248,250,252,0.48))] p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-bold text-stone-800">十年趋势细节</div>
                                  <div className="text-[11px] text-stone-500">十年趋势</div>
                              </div>
                              <div className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                                {dayunItem.start_year}-{dayunItem.end_year}
                              </div>
                            </div>
                            <div className="rounded-[22px] border border-white/65 bg-white/55 p-3 backdrop-blur-md">
                              <svg width="100%" height={trendHeight} viewBox={`0 0 ${trendWidth} ${trendHeight}`}>
                                {tickValues.map((value) => (
                                  <g key={`trend-tick-${value}`}>
                                    <line
                                      x1={pad.left}
                                      y1={trendY(value)}
                                      x2={trendWidth - pad.right}
                                      y2={trendY(value)}
                                      stroke="#e2e8f0"
                                      strokeWidth="1"
                                    />
                                    <text
                                      x={pad.left - 6}
                                      y={trendY(value) + 4}
                                      fontSize="9"
                                      fill="#94a3b8"
                                      textAnchor="end"
                                    >
                                      {value}
                                    </text>
                                  </g>
                                ))}
                                <line
                                  x1={pad.left}
                                  y1={trendHeight - pad.bottom}
                                  x2={trendWidth - pad.right}
                                  y2={trendHeight - pad.bottom}
                                  stroke="#e2e8f0"
                                  strokeWidth="1"
                                />
                                {trendYears.map((entry, idx) => (
                                  <text
                                    key={`trend-year-${entry.year}`}
                                    x={trendX(idx)}
                                    y={trendHeight - 6}
                                    fontSize="8"
                                    fill="#94a3b8"
                                    textAnchor="middle"
                                  >
                                    {entry.year}
                                  </text>
                                ))}
                                {fallbackSeries.map((series) => (
                                  <polyline
                                    key={`trend-line-${series.key}`}
                                    points={buildTrendLine(series.getter)}
                                    fill="none"
                                    stroke={series.color}
                                    strokeWidth={series.key === 'overall' ? 2.5 : 2}
                                  />
                                ))}
                                {fallbackSeries.map((series) =>
                                  trendYears.map((entry, idx) => (
                                    <circle
                                      key={`trend-point-${series.key}-${entry.year}`}
                                      cx={trendX(idx)}
                                      cy={trendY(series.getter(entry.scores))}
                                      r={2.5}
                                      fill={series.color}
                                    />
                                  ))
                                )}
                              </svg>
                            </div>
                          </div>

                          <div className="glass-panel-soft rounded-[26px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(248,250,252,0.48))] p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-bold text-stone-800">大运周期</div>
                                  <div className="text-[11px] text-stone-500">十年周期</div>
                              </div>
                              <div className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                                {dayunItem.name}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="rounded-[20px] border border-white/65 bg-white/55 px-3 py-2">
                                <div className="text-[10px] text-stone-500">大运关键词</div>
                                <div className="text-sm font-bold text-stone-800">{dayunItem.tag}</div>
                              </div>
                              <div className="rounded-[20px] border border-white/65 bg-white/55 px-3 py-2">
                                <div className="text-[10px] text-stone-500">周期跨度</div>
                                <div className="text-sm font-bold text-stone-800">
                                  {dayunItem.start_year} - {dayunItem.end_year}
                                </div>
                              </div>
                            </div>
                            {renderScoreOverview(dayunItem.scores)}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="text-[11px] text-stone-400 text-center">{KLINE_DEV_NOTE}</div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
