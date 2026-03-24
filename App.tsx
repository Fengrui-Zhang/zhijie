
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSession, signOut } from 'next-auth/react';
import updates from './data/updates.json';
import {
  ANALYSIS_MODEL_OPTIONS,
  DEFAULT_ANALYSIS_MODEL,
  DOUBAO_SEED_PRO_MODEL,
  type AnalysisModel,
  type ChatModel,
  isAnalysisModel,
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
import { deriveInitialAnalysisFromSession } from './lib/initial-analysis';

// Services
import { 
  fetchQimen, fetchBazi, fetchZiwei, fetchMeihua, fetchLiuyao,
  formatQimenPrompt, formatBaziPrompt, formatZiweiPrompt, formatMeihuaPrompt, formatLiuyaoPrompt 
} from './services/apiService';
import { startQimenChat, sendMessageToDeepseekStream, clearChatSession, restoreChatSession } from './services/deepseekService';

// Auth & Session Components
import AuthForm from './components/AuthForm';
import SessionSidebar, { type SessionItem } from './components/SessionSidebar';
import AdminPanel from '@/components/AdminPanel';
import AccountSettingsModal from '@/components/AccountSettingsModal';
import UserMenuPopup from './components/UserMenuPopup';
import ChangePasswordModal from './components/ChangePasswordModal';

// Types
import {
  ModelType,
  LiuyaoMode,
  BaziResponse,
  QimenResponse,
  ZiweiResponse,
  MeihuaResponse,
  LiuyaoResponse,
} from './types';

// Components
import QimenGrid from './components/QimenGrid';
import BaziGrid from './components/BaziGrid';
import ZiweiGrid from './components/ZiweiGrid';
import MeihuaGrid from './components/MeihuaGrid';
import LiuyaoGrid from './components/LiuyaoGrid';
import LocationSelector from './components/LocationSelector';
import NoteSidebar, { NoteIcon } from './components/NoteSidebar';

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
const ANALYSIS_MODEL_STORAGE_KEY = 'analysis-model:v1';
const GUEST_CASES_STORAGE_KEY = 'guest-divination-cases:v1';
const GUEST_CASE_SESSIONS_STORAGE_KEY = 'guest-divination-case-sessions:v1';
const DESKTOP_PANEL_EXPANDED_OFFSET = 320;
const DESKTOP_PANEL_COLLAPSED_OFFSET = 72;
const KLINE_CHAT_MODEL: ChatModel = DOUBAO_SEED_PRO_MODEL;
const NAVIGATION_STATE_MARKER = '__zhijieNav';

const isNavigationScreen = (value: unknown): value is NavigationScreen =>
  value === 'input' || value === 'chart' || value === 'case' || value === 'session';

const isAppHistoryState = (value: unknown): value is AppHistoryState => {
  if (!value || typeof value !== 'object') return false;
  const input = value as Record<string, unknown>;
  if (input[NAVIGATION_STATE_MARKER] !== true) return false;
  if (typeof input.index !== 'number') return false;
  const snapshot = input.snapshot;
  if (!snapshot || typeof snapshot !== 'object') return false;
  const candidate = snapshot as Record<string, unknown>;
  return Object.values(ModelType).includes(candidate.modelType as ModelType)
    && isNavigationScreen(candidate.screen);
};

const buildNavigationUrl = (snapshot: NavigationSnapshot) => {
  const params = new URLSearchParams();
  params.set('model', snapshot.modelType);
  if (snapshot.screen !== 'input') {
    params.set('view', snapshot.screen);
  }
  if (snapshot.caseId) {
    params.set('case', snapshot.caseId);
  }
  if (snapshot.sessionId) {
    params.set('session', snapshot.sessionId);
  }
  if (snapshot.klineOpen) {
    params.set('kline', '1');
  }
  const query = params.toString();
  return query ? `?${query}` : window.location.pathname;
};

const parseNavigationSnapshotFromLocation = (): NavigationSnapshot | null => {
  const params = new URLSearchParams(window.location.search);
  const model = params.get('model');
  if (!Object.values(ModelType).includes(model as ModelType)) {
    return null;
  }

  const view = params.get('view');
  const screen: NavigationScreen = isNavigationScreen(view) ? view : 'input';
  const caseId = params.get('case');
  const sessionId = params.get('session');
  return {
    modelType: model as ModelType,
    screen,
    caseId: caseId || null,
    sessionId: sessionId || null,
    klineOpen: params.get('kline') === '1',
  };
};

const buildNavigationKey = (snapshot: NavigationSnapshot) =>
  JSON.stringify({
    modelType: snapshot.modelType,
    screen: snapshot.screen,
    caseId: snapshot.caseId || null,
    sessionId: snapshot.sessionId || null,
    klineOpen: snapshot.klineOpen === true,
  });

const buildModelContent = (reasoning: string, answer: string) => {
  if (reasoning.trim()) {
    return `${THINKING_START}\n${reasoning}\n${THINKING_END}\n\n${answer}`;
  }
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
}

type PersistedChatMessage = {
  role: string;
  content: string;
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
  modelType: CaseModelType;
  title: string;
  chartParams: Record<string, unknown>;
  chartData: unknown;
  messages: Array<{
    id: string;
    role: 'user' | 'model';
    content: string;
    timestamp: string;
  }>;
  guestFollowUpCount: number;
  createdAt: string;
  updatedAt: string;
};

type NavigationScreen = 'input' | 'chart' | 'case' | 'session';

type NavigationTransientSnapshot = {
  chartData: unknown;
  chatHistory: Array<{
    id: string;
    role: 'user' | 'model';
    content: string;
    timestamp: string;
  }>;
  activeChartParams: Record<string, unknown>;
  question: string;
  analysisModel: AnalysisModel;
  sessionAnalysisModel: AnalysisModel | null;
  baziInitialAnalysis: string;
};

type NavigationSnapshot = {
  modelType: ModelType;
  screen: NavigationScreen;
  caseId?: string | null;
  sessionId?: string | null;
  klineOpen?: boolean;
  transient?: NavigationTransientSnapshot | null;
};

type AppHistoryState = {
  __zhijieNav: true;
  index: number;
  snapshot: NavigationSnapshot;
};

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
  qimen: '奇门遁甲',
  bazi: '四柱八字',
  ziwei: '紫微斗数',
  meihua: '梅花易数',
  liuyao: '六爻纳甲',
};

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
    baseAnalysisModel: initialAnalysis.model,
    baseAnalysisGeneratedAt: initialAnalysis.generatedAt,
    isInitialAnalysisSession,
  };
};

const buildSystemInstruction = (
  mType: ModelType,
  cData: unknown,
  chartParams?: Record<string, unknown>
): string => {
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

  return {
    question,
    prompt: formatLiuyaoPrompt(cData as LiuyaoResponse, question),
    systemInstruction: "你是六爻纳甲预测专家。请基于卦象、六亲、世应、六神及神煞空亡，详细推断吉凶、应期及建议。",
    knowledgeQuery: question,
    userContent: buildInitialUserContent(mType, chartParams, question),
  };
};

const App: React.FC = () => {
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

  // --- Persistence State ---
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [savedSessions, setSavedSessions] = useState<SessionItem[]>([]);
  const [caseItems, setCaseItems] = useState<CaseItem[]>([]);
  const [activeCase, setActiveCase] = useState<CaseDetail | null>(null);
  const [caseFormOpen, setCaseFormOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [caseBusy, setCaseBusy] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [noteCollapsed, setNoteCollapsed] = useState(false);
  const [activeCompactPanel, setActiveCompactPanel] = useState<'history' | 'note' | null>(null);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteSaveState, setNoteSaveState] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle');
  const [analysisModel, setAnalysisModel] = useState<AnalysisModel>(DEFAULT_ANALYSIS_MODEL);
  const [activeChartParams, setActiveChartParams] = useState<Record<string, unknown>>({});
  const [sessionAnalysisModel, setSessionAnalysisModel] = useState<AnalysisModel | null>(null);

  // --- State ---
  const [modelType, setModelType] = useState<ModelType>(ModelType.QIMEN);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'chart'>('input');
  
  // Inputs
  const [name, setName] = useState('');
  const [question, setQuestion] = useState('');
  const [gender, setGender] = useState<number>(0); // 0 Male, 1 Female
  const [timeMode, setTimeMode] = useState<'now' | 'custom'>('now');
  const [customDate, setCustomDate] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [qimenProEnabled, setQimenProEnabled] = useState(false);
  const [qimenJuModel, setQimenJuModel] = useState(1);
  const [qimenPanModel, setQimenPanModel] = useState(1);
  const [qimenFeiPanModel, setQimenFeiPanModel] = useState(1);
  
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

  // Data
  const [chartData, setChartData] = useState<any | null>(null);
  const [error, setError] = useState<string>('');

  // Chat
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isKlineRunning, setIsKlineRunning] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const reportChartRef = useRef<HTMLDivElement>(null);
  const [useKnowledge, setUseKnowledge] = useState(true);
  const [showUpdates, setShowUpdates] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const supportsKnowledge = modelType === ModelType.QIMEN || modelType === ModelType.BAZI;
  const recommendedModels = new Set([ModelType.QIMEN, ModelType.BAZI]);
  const isCaseModel = isCaseModelType(modelType);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [messageVersionMap, setMessageVersionMap] = useState<Record<string, MessageVersionState>>({});
  const [openVersionMenuId, setOpenVersionMenuId] = useState<string | null>(null);
  const [showRerunConfirm, setShowRerunConfirm] = useState(false);
  const [initialAnalysisBusy, setInitialAnalysisBusy] = useState(false);
  const [knowledgeHint, setKnowledgeHint] = useState<string | null>(null);
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
  const noteHydratedRef = useRef(false);
  const noteLastSavedRef = useRef('');
  const noteSaveRunRef = useRef(0);
  const navigationReadyRef = useRef(false);
  const navigationRestoringRef = useRef(false);
  const navigationIndexRef = useRef(0);
  const navigationKeyRef = useRef('');
  const restoreNavigationSnapshotRef = useRef<(snapshot: NavigationSnapshot | null) => Promise<void>>(
    async () => {}
  );
  const buildNavigationSnapshotRef = useRef<() => NavigationSnapshot>(() => ({
    modelType: ModelType.QIMEN,
    screen: 'input',
  }));

  const syncAutoScrollState = useCallback(() => {
    const container = chatScrollRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 96;
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
  }, [chatHistory, openVersionMenuId]);

  useEffect(() => {
    try {
      const savedModel = localStorage.getItem(ANALYSIS_MODEL_STORAGE_KEY);
      if (isAnalysisModel(savedModel)) {
        setAnalysisModel(savedModel);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ANALYSIS_MODEL_STORAGE_KEY, analysisModel);
    } catch {
      // Ignore localStorage errors
    }
  }, [analysisModel]);

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
          isCaseModelType(item.modelType) &&
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

  const applyCaseChartParamsToForm = useCallback((chartParams: unknown) => {
    const params = normalizeCaseChartParams(chartParams);
    setName(params.name || '');
    setGender(params.sex ?? 0);
    setCustomDate(buildCaseDateTimeValue(params));
    setProvince(params.province || '');
    setCity(params.city || '');
    setTimeMode('custom');
  }, []);

  const resetCaseFormInputs = useCallback(() => {
    setName('');
    setGender(0);
    setCustomDate('');
    setProvince('');
    setCity('');
    setQuestion('');
  }, []);

  const getGuestCaseDetail = useCallback((caseId: string): CaseDetail | null => {
    const allCases = readGuestCases();
    const matchedCase = allCases.find((item) => item.id === caseId);
    if (!matchedCase) return null;

    const rawSessions = readGuestCaseSessions()
      .filter((item) => item.caseId === caseId)
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

    return {
      ...effectiveCase,
      sessions,
    };
  }, [modelType, readGuestCaseSessions, readGuestCases, writeGuestCases]);

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

  const loadCaseDetail = useCallback(async (caseId: string) => {
    if (!isCaseModel) return;

    if (!isLoggedIn) {
      const detail = getGuestCaseDetail(caseId);
      if (!detail) return;
      const storedSession = readGuestCaseSessions().find((item) => item.caseId === caseId);
      clearChatSession();
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
      return;
    }

    try {
      const res = await fetch(`/api/cases/${caseId}`);
      if (!res.ok) return;
      const data = await res.json();
      clearChatSession();
      setActiveCase(data);
      setChartData(data.chartData);
      setActiveChartParams((data.chartParams || {}) as Record<string, unknown>);
      setQuestion('');
      setChatHistory([]);
      setKnowledgeHint(null);
      setActiveSessionId(null);
      setSessionAnalysisModel(null);
      setStep('chart');
    } catch {
      // silently ignore
    }
  }, [getGuestCaseDetail, isCaseModel, isLoggedIn, readGuestCaseSessions]);

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
    if (!klineModalOpen) return;
    document.body.classList.add('overflow-hidden');
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [klineModalOpen]);

  // --- Session Persistence ---
  const fetchSessions = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json();
        setSavedSessions(data);
      }
    } catch {
      // silently ignore
    }
  }, [isLoggedIn]);

  const fetchNote = useCallback(async () => {
    if (!isLoggedIn) return;
    setNoteSaveState('loading');
    try {
      const res = await fetch('/api/note');
      if (!res.ok) throw new Error('笔记加载失败');
      const data = await res.json();
      const content = typeof data?.content === 'string' ? data.content : '';
      noteHydratedRef.current = true;
      noteLastSavedRef.current = content;
      setNoteContent(content);
      setNoteSaveState('idle');
    } catch {
      noteHydratedRef.current = true;
      setNoteSaveState('error');
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

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

  useEffect(() => {
    if (isLoggedIn) return;
    noteHydratedRef.current = false;
    noteLastSavedRef.current = '';
    noteSaveRunRef.current = 0;
    setNoteContent('');
    setNoteSaveState('idle');
    setActiveCompactPanel(null);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !noteHydratedRef.current) return;
    if (noteContent === noteLastSavedRef.current) return;

    const runId = ++noteSaveRunRef.current;
    const timer = window.setTimeout(async () => {
      setNoteSaveState('saving');
      try {
        const res = await fetch('/api/note', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: noteContent }),
        });

        if (!res.ok) throw new Error('笔记保存失败');
        const data = await res.json();
        if (noteSaveRunRef.current !== runId) return;

        const content = typeof data?.content === 'string' ? data.content : noteContent;
        noteLastSavedRef.current = content;
        setNoteSaveState('saved');
        window.setTimeout(() => {
          setNoteSaveState((current) => (current === 'saved' ? 'idle' : current));
        }, 1200);
      } catch {
        if (noteSaveRunRef.current === runId) {
          setNoteSaveState('error');
        }
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [isLoggedIn, noteContent]);

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
      })),
      guestFollowUpCount: nextFollowUpCount ?? item.guestFollowUpCount,
      updatedAt: new Date().toISOString(),
    }));
  }, [updateGuestCaseSession]);

  const deleteGuestCase = useCallback((caseId: string) => {
    const nextCases = readGuestCases().filter((item) => item.id !== caseId);
    const nextSessions = readGuestCaseSessions().filter((item) => item.caseId !== caseId);
    writeGuestCases(nextCases);
    writeGuestCaseSessions(nextSessions);
    setCaseItems(nextCases.filter((item) => item.modelType === modelType));
  }, [modelType, readGuestCaseSessions, readGuestCases, writeGuestCases, writeGuestCaseSessions]);

  const clearGuestCaseSessions = useCallback((caseId: string) => {
    const nextSessions = readGuestCaseSessions().filter((item) => item.caseId !== caseId);
    writeGuestCaseSessions(nextSessions);
  }, [readGuestCaseSessions, writeGuestCaseSessions]);

  const saveMessagesToDb = async (
    sessionId: string | null,
    messages: { role: string; content: string }[]
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
    payload: { title?: string; chartParams?: Record<string, unknown> }
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
      let effectiveChartData = data.chartData;
      let matchedCase: CaseDetail | null = null;

      if (isCaseModelType(data.modelType) && data.caseId) {
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
      setModelType(data.modelType as ModelType);
      setChartData(effectiveChartData);
      setActiveChartParams((data.chartParams || {}) as Record<string, unknown>);
      setStep('chart');
      setError('');
      setCaseFormOpen(false);
      setEditingCaseId(null);

      if (data.chartParams) {
        const p = data.chartParams as Record<string, unknown>;
        if (p.name) setName(p.name as string);
        if (p.question) setQuestion(p.question as string);
        if (isAnalysisModel(p.analysisModel)) {
          setAnalysisModel(p.analysisModel);
          setSessionAnalysisModel(p.analysisModel);
        } else {
          setSessionAnalysisModel(null);
        }
      } else {
        setSessionAnalysisModel(null);
      }

      const msgs: ChatMessage[] = (data.messages || []).map(
        (m: { id: string; role: string; content: string; createdAt: string }) => ({
          id: m.id,
          role: m.role as 'user' | 'model',
          content: m.content,
          timestamp: new Date(m.createdAt),
        })
      );
      resetMessageVersions();
      setChatHistory(msgs);

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

      setActiveCase(matchedCase);
    } catch {
      // silently ignore
    }
  };

  const handleLoadGuestCaseSession = (sessionId: string) => {
    const storedSession = readGuestCaseSessions().find((item) => item.id === sessionId);
    if (!storedSession) return;

    const detail = getGuestCaseDetail(storedSession.caseId);
    const effectiveChartData = detail?.chartData ?? storedSession.chartData;
    clearChatSession();
    setModelType(storedSession.modelType);
    setChartData(effectiveChartData);
    setActiveChartParams(storedSession.chartParams || {});
    setActiveSessionId(storedSession.id);
    setActiveCase(detail);
    setStep('chart');
    setError('');
    setCaseFormOpen(false);
    setEditingCaseId(null);
    setQuestion('');
    const storedAnalysisModel = isAnalysisModel(storedSession.chartParams?.analysisModel)
      ? storedSession.chartParams.analysisModel
      : null;
    setSessionAnalysisModel(storedAnalysisModel);
    if (storedAnalysisModel) {
      setAnalysisModel(storedAnalysisModel);
    }

    const msgs: ChatMessage[] = storedSession.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
    }));
    resetMessageVersions();
    setChatHistory(msgs);
    setGuestFollowUpCount(storedSession.guestFollowUpCount || 0);

    if (msgs.length > 0) {
      const systemInstruction = buildSystemInstruction(
        storedSession.modelType,
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
      const reasoningText = msg.role === 'model' && parsed?.reasoning ? parsed.reasoning : '';
      const timeText = msg.timestamp ? new Date(msg.timestamp).toLocaleString('zh-CN', { hour12: false }) : '';
      const roleLabel = msg.role === 'user' ? '用户' : '大师';
      const contentHtml = renderMarkdownToHtml(displayText);
      const reasoningHtml = reasoningText ? renderMarkdownToHtml(reasoningText) : '';

      return `
        <div class="msg ${msg.role}">
          <div class="msg-head">
            <div class="msg-role">${roleLabel}</div>
            <div class="msg-time">${escapeHtml(timeText)}</div>
          </div>
          ${reasoningHtml ? `<div class="msg-reasoning"><div class="tag">思考过程</div><div class="msg-text">${reasoningHtml}</div></div>` : ''}
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

  const knowledgeBoardMap: Record<ModelType, string> = {
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
      setQimenJuModel(1);
      setQimenPanModel(1);
      setQimenFeiPanModel(1);
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

  // --- Reset when model changes ---
  const handleModelChange = (type: ModelType) => {
    setModelType(type);
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

  const handleReset = () => {
    clearViewState();
  };

  const beginCaseCreate = () => {
    setEditingCaseId(null);
    setCaseFormOpen(true);
    resetCaseFormInputs();
    setError('');
  };

  const beginCaseEdit = () => {
    if (!activeCase) return;
    setEditingCaseId(activeCase.id);
    setCaseFormOpen(true);
    applyCaseChartParamsToForm(activeCase.chartParams);
    setError('');
    setStep('input');
  };

  const refreshGuestActiveCase = useCallback((caseId: string) => {
    const detail = getGuestCaseDetail(caseId);
    setActiveCase(detail);
    if (detail) {
      setChartData(detail.chartData);
    }
  }, [getGuestCaseDetail]);

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

  const handleSaveCase = async () => {
    if (!isCaseModelType(modelType)) return;
    if (!customDate) {
      setError('请选择出生日期');
      return;
    }

    try {
      const date = new Date(customDate);
      const chartParams = {
        name: name || '',
        sex: gender,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hours: date.getHours(),
        minute: date.getMinutes(),
        province: province || '',
        city: city || '',
      };
      const shouldReuseExistingChart = Boolean(
        editingCaseId &&
        activeCase &&
        activeCase.chartData &&
        isSameCaseChartIdentity(activeCase.chartParams, chartParams)
      );

      if (!isLoggedIn && !shouldReuseExistingChart && guestFortuneCount >= 3) {
        setError('');
        setShowAuth(true);
        return;
      }

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
        if (!shouldReuseExistingChart) {
          const newCount = guestFortuneCount + 1;
          localStorage.setItem('guestFortuneCount', String(newCount));
          setGuestFortuneCount(newCount);
          setGuestFollowUpCount(0);
          localStorage.setItem('guestFollowUpCount', '0');
        } else {
          const currentGuestSession = readGuestCaseSessions().find((item) => item.caseId === caseId);
          const nextFollowUpCount = currentGuestSession?.guestFollowUpCount || 0;
          setGuestFollowUpCount(nextFollowUpCount);
          localStorage.setItem('guestFollowUpCount', String(nextFollowUpCount));
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
    } catch (err: any) {
      setError(err.message || '排盘失败，请稍后重试');
    } finally {
      setLoading(false);
      setCaseBusy(false);
    }
  };

  const buildInitialAnalysisDataPayload = (
    content: string,
    model: AnalysisModel
  ): InitialAnalysisData => ({
    content: content.trim(),
    model,
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
      analysisModel: initialAnalysis.model,
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
    setSessionAnalysisModel(initialAnalysis.model);
    setAnalysisModel(initialAnalysis.model);
    setQuestion('');
    setKnowledgeHint(null);
    setStep('chart');
    setShowInitialAnalysisModal(false);

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
      }

      const knowledge = useKnowledge && supportsKnowledge
        ? {
            enabled: true,
            board: knowledgeBoardMap[targetCase.modelType],
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

      const cleanContent = stripDisclaimer(finalState.content);
      const initialAnalysis = buildInitialAnalysisDataPayload(cleanContent, analysisModel);
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

      const knowledge = useKnowledge && supportsKnowledge
        ? {
            enabled: true,
            board: knowledgeBoardMap[targetCase.modelType],
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

      const finalAnswer = appendDisclaimer(finalState.content);
      const finalContent = buildModelContent(finalState.reasoning, finalAnswer);
      const finalModelMessage: ChatMessage = {
        id: modelId,
        role: 'model',
        content: finalContent,
        timestamp: new Date(),
      };
      const finalMessages = [userMsg, finalModelMessage];
      setChatHistory(finalMessages);

      if (targetCase.modelType === ModelType.BAZI) {
        setBaziInitialAnalysis(baseAnalysis.content);
        setKlineUnlocked(true);
      }

      if (isLoggedIn) {
        await saveMessagesToDb(currentSessionId, [
          { role: 'user', content: userContent },
          { role: 'model', content: finalContent },
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
    if (isLoggedIn && userQuota !== null && userQuota <= 0) {
      setError('您的提问额度已用完');
      return;
    }

    const existingGuestSession = !isLoggedIn
      ? readGuestCaseSessions().find((item) => item.caseId === activeCase.id)
      : null;

    if (!isLoggedIn && existingGuestSession) {
      handleLoadGuestCaseSession(existingGuestSession.id);
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

  const handleCalculate = async () => {
    if (!isLoggedIn) {
      if (guestFortuneCount >= 3) {
        setError('');
        setShowAuth(true);
        return;
      }
    }
    if (isLoggedIn && userQuota !== null && userQuota <= 0) {
      setError('您的提问额度已用完');
      return;
    }

    // Validation
    const isDivination = [ModelType.QIMEN, ModelType.MEIHUA, ModelType.LIUYAO].includes(modelType);
    
    if (isDivination && !question.trim()) {
      setError("请输入您的问题");
      return;
    }
    if ((modelType === ModelType.BAZI || modelType === ModelType.ZIWEI) && (!customDate && timeMode === 'custom')) {
      setError("请选择出生日期");
      return;
    }
    if ((modelType === ModelType.MEIHUA || modelType === ModelType.LIUYAO) && !birthYear) {
      setError("请输入您的出生年份");
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
      let date = new Date();
      if (isLiupanModeModel(modelType) && requiresLiupanDate(liuyaoMode) && customDate) {
         date = new Date(customDate);
      } else if (isLiupanModeModel(modelType) && liuyaoMode === LiuyaoMode.AUTO) {
         date = new Date();
      } else if ((timeMode === 'custom' || isLifeReading) && customDate) {
         date = new Date(customDate);
      }

      const baseParams: any = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hours: date.getHours(),
        minute: date.getMinutes(),
        sex: gender,
        name: name || '某人',
        born_year: birthYear ? parseInt(birthYear) : undefined,
        province: province,
        city: city,
        pan_model: isLiupanModeModel(modelType) ? liuyaoMode : undefined,
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
      let prompt = "";
      let systemInstruction = "";
      let knowledgeQuery = "";

      // --- API Calls & Prompt Gen ---
      switch (modelType) {
        case ModelType.QIMEN:
          {
            const qimenZhen = (province && city) ? 1 : 2;
            const qimenParams = {
              ...baseParams,
              question,
              zhen: qimenZhen,
              ju_model: qimenProEnabled ? qimenJuModel : 1,
              pan_model: qimenProEnabled ? qimenPanModel : undefined,
              fei_pan_model: qimenProEnabled && qimenPanModel === 0 ? qimenFeiPanModel : undefined,
            };
            resultData = await fetchQimen(qimenParams);
          }
          prompt = formatQimenPrompt(resultData, question);
          systemInstruction = "你是精通奇门遁甲的大师。请基于排盘，用通俗专业语言解答用户疑惑。关注用神、时令、吉凶。";
          break;
        case ModelType.BAZI:
          resultData = await fetchBazi(baseParams);
          {
            const analysisBundle = buildLifeReadingAnalysisBundle(ModelType.BAZI, resultData, question);
            prompt = analysisBundle.prompt;
            knowledgeQuery = analysisBundle.knowledgeQuery;
            systemInstruction = analysisBundle.systemInstruction;
          }
          break;
        case ModelType.ZIWEI:
          resultData = await fetchZiwei(baseParams);
          {
            const analysisBundle = buildLifeReadingAnalysisBundle(ModelType.ZIWEI, resultData, question);
            prompt = analysisBundle.prompt;
            knowledgeQuery = analysisBundle.knowledgeQuery;
            systemInstruction = analysisBundle.systemInstruction;
          }
          break;
        case ModelType.MEIHUA:
          resultData = await fetchMeihua(baseParams);
          prompt = formatMeihuaPrompt(resultData, question);
          systemInstruction = "你是梅花易数占卜师。请基于本卦、互卦、变卦及动爻，直断吉凶成败。";
          break;
        case ModelType.LIUYAO:
          resultData = await fetchLiuyao(baseParams);
          prompt = formatLiuyaoPrompt(resultData, question);
          systemInstruction = "你是六爻纳甲预测专家。请基于卦象、六亲、世应、六神及神煞空亡，详细推断吉凶、应期及建议。";
          break;
      }

      setChartData(resultData);
      setStep('chart');

      // --- Save session to DB immediately (before AI streaming) ---
      const sessionTitle = `${MODEL_LABELS[modelType] || modelType} - ${question.trim().slice(0, 20) || name || new Date().toLocaleDateString('zh-CN')}`;
      const sessionChartParams = { ...baseParams, question, timeMode, analysisModel } as Record<string, unknown>;
      const newSessionId = await saveSessionToDb(
        modelType,
        sessionTitle,
        sessionChartParams,
        resultData
      );
      if (newSessionId) setActiveSessionId(newSessionId);
      setActiveChartParams(sessionChartParams);
      setSessionAnalysisModel(analysisModel);

      // --- AI Chat Init ---
      await startQimenChat(systemInstruction);

      const userContent = buildInitialUserContent(
        modelType,
        baseParams as Record<string, unknown>,
        question
      );

      resetMessageVersions();
      setChatHistory([{ id: 'init-u', role: 'user', content: userContent, timestamp: new Date() }]);
      setIsTyping(true);

      const modelId = 'init-m';
      setChatHistory(prev => [
        ...prev,
        { id: modelId, role: 'model', content: '', timestamp: new Date() }
      ]);

      const knowledgeQueryText = (() => {
        if (knowledgeQuery) return knowledgeQuery;
        if (modelType === ModelType.QIMEN) return question.trim();
        return question.trim() ? question : prompt;
      })();
      const knowledge = useKnowledge && supportsKnowledge
        ? {
            enabled: true,
            board: knowledgeBoardMap[modelType],
            query: knowledgeQueryText,
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
      const finalAnswer = appendDisclaimer(finalState.content);
      updateChatMessage(modelId, buildModelContent(finalState.reasoning, finalAnswer));
      if (modelType === ModelType.BAZI) {
        setBaziInitialAnalysis(stripDisclaimer(finalState.content));
        setKlineUnlocked(true);
      }

      // --- Save messages to DB ---
      if (newSessionId) {
        const finalContent = buildModelContent(finalState.reasoning, finalAnswer);
        await saveMessagesToDb(newSessionId, [
          { role: 'user', content: userContent },
          { role: 'model', content: finalContent },
        ]);
      }

      if (!isLoggedIn) {
        const newCount = guestFortuneCount + 1;
        localStorage.setItem('guestFortuneCount', String(newCount));
        setGuestFortuneCount(newCount);
      } else {
        fetchUserProfile();
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Operation failed.");
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const toPersistedMessages = (messages: ChatMessage[]): PersistedChatMessage[] =>
    messages.map((msg) => ({ role: msg.role, content: msg.content }));

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
            board: knowledgeBoardMap[modelType],
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
      setActiveChartParams(nextChartParams);
      setSessionAnalysisModel(analysisModel);

      if (modelType === ModelType.BAZI) {
        const snapshot = getSessionInitialAnalysisSnapshot(nextChartParams);
        setBaziInitialAnalysis(snapshot.initialAnalysis?.content ?? '');
        setKlineUnlocked(Boolean(snapshot.initialAnalysis?.content));
      }

      if (isLoggedIn) {
        await replaceMessagesInDb(activeSessionId, toPersistedMessages(finalMessages));
        await updateSessionInDb(activeSessionId, { chartParams: nextChartParams });
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
            board: knowledgeBoardMap[modelType],
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

      const finalAnswer = appendDisclaimer(finalState.content);
      const finalContent = buildModelContent(finalState.reasoning, finalAnswer);
      const finalMessages: ChatMessage[] = [
        ...nextMessagesBase,
        {
          ...placeholder,
          content: finalContent,
          timestamp: new Date(),
        },
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

    const effectiveGuestFollowUpCount = options?.guestFollowUpCountOverride ?? guestFollowUpCount;
    if (!isLoggedIn && !options?.bypassGuestLimit && effectiveGuestFollowUpCount >= 1) {
      setShowAuth(true);
      return;
    }
    if (isLoggedIn && userQuota !== null && userQuota <= 0) {
      setError('您的提问额度已用完');
      return;
    }

    const sessionId = options?.sessionIdOverride ?? activeSessionId;
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
            board: knowledgeBoardMap[modelType],
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

      const finalAnswer = appendDisclaimer(finalState.content);
      const finalContent = buildModelContent(finalState.reasoning, finalAnswer);

      if (isLoggedIn) {
        updateChatMessage(modelId, finalContent);
        await saveMessagesToDb(sessionId, [
          { role: 'user', content: outgoingMessage },
          { role: 'model', content: finalContent },
        ]);
        fetchUserProfile();
      } else {
        const nextGuestFollowUpCount = effectiveGuestFollowUpCount + 1;
        localStorage.setItem('guestFollowUpCount', String(nextGuestFollowUpCount));
        setGuestFollowUpCount(nextGuestFollowUpCount);
        setChatHistory((prev) => {
          const next = prev.map((msg) =>
            msg.id === modelId ? { ...msg, content: finalContent } : msg
          );
          if (sessionId) {
            updateGuestCaseSessionMessages(sessionId, next, nextGuestFollowUpCount);
          }
          return next;
        });
        if (caseId) {
          refreshGuestActiveCase(caseId);
        }
      }
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'model', content: '⚠️ 网络错误，请重试。', timestamp: new Date() },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    await sendFollowUpMessage(inputMessage);
  };

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

  const clampKlinePos = (x: number, y: number) => {
    const size = 56;
    const padding = 8;
    const maxX = window.innerWidth - size - padding;
    const maxY = window.innerHeight - size - padding;
    return {
      x: Math.min(Math.max(padding, x), Math.max(padding, maxX)),
      y: Math.min(Math.max(padding, y), Math.max(padding, maxY)),
    };
  };

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
      // const finalState = await sendMessageToDeepseekStream(prompt, onKlineDelta, undefined, 'deepseek-chat');
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
            // const repaired = await sendMessageToDeepseekStream(repairPrompt, () => {}, undefined, 'deepseek-chat');
            const repaired = await sendMessageToDeepseekStream(repairPrompt, () => {}, undefined, KLINE_CHAT_MODEL);
            parsed = parseKlineResult(sanitizeKlineJson(repaired.content));
          } catch {
            const strictPrompt = buildKlinePromptStrict(chartData as BaziResponse);
            // const retryState = await sendMessageToDeepseekStream(strictPrompt, () => {}, undefined, 'deepseek-chat');
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

  const buildTransientNavigationSnapshot = useCallback((): NavigationTransientSnapshot | null => {
    if (step !== 'chart' || activeCase || activeSessionId || !chartData) {
      return null;
    }

    return {
      chartData,
      chatHistory: chatHistory.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      })),
      activeChartParams,
      question,
      analysisModel,
      sessionAnalysisModel,
      baziInitialAnalysis,
    };
  }, [
    activeCase,
    activeChartParams,
    activeSessionId,
    analysisModel,
    baziInitialAnalysis,
    chartData,
    chatHistory,
    question,
    sessionAnalysisModel,
    step,
  ]);

  const buildNavigationSnapshot = useCallback((): NavigationSnapshot => {
    const klineOpen = modelType === ModelType.BAZI && klineModalOpen;

    if (step === 'input') {
      return {
        modelType,
        screen: 'input',
      };
    }

    if (activeSessionId) {
      return {
        modelType,
        screen: 'session',
        caseId: activeCase?.id ?? null,
        sessionId: activeSessionId,
        klineOpen,
      };
    }

    if (activeCase?.id && isCaseModelType(modelType)) {
      return {
        modelType,
        screen: 'case',
        caseId: activeCase.id,
        klineOpen,
      };
    }

    return {
      modelType,
      screen: 'chart',
      klineOpen,
      transient: buildTransientNavigationSnapshot(),
    };
  }, [activeCase?.id, activeSessionId, buildTransientNavigationSnapshot, klineModalOpen, modelType, step]);

  const restoreTransientNavigationSnapshot = useCallback((
    targetModelType: ModelType,
    transient: NavigationTransientSnapshot
  ) => {
    clearChatSession();
    setModelType(targetModelType);
    setChartData(transient.chartData);
    setActiveChartParams(transient.activeChartParams || {});
    setActiveSessionId(null);
    setActiveCase(null);
    setStep('chart');
    setQuestion(transient.question || '');
    setKnowledgeHint(null);
    resetMessageVersions();
    const restoredMessages: ChatMessage[] = transient.chatHistory.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
    }));
    setChatHistory(restoredMessages);
    setAnalysisModel(transient.analysisModel);
    setSessionAnalysisModel(transient.sessionAnalysisModel);
    setBaziInitialAnalysis(transient.baziInitialAnalysis || '');
    if (targetModelType === ModelType.BAZI) {
      setKlineUnlocked(Boolean(transient.baziInitialAnalysis));
    } else {
      setKlineUnlocked(false);
    }

    if (restoredMessages.length > 0) {
      const systemInstruction = buildSystemInstruction(
        targetModelType,
        transient.chartData,
        transient.activeChartParams || {}
      );
      restoreChatSession(
        systemInstruction,
        restoredMessages.map((msg) => ({ role: msg.role, content: msg.content }))
      );
    }
  }, []);

  const restoreNavigationSnapshot = useCallback(async (snapshot: NavigationSnapshot | null) => {
    if (!snapshot) return;

    navigationRestoringRef.current = true;

    try {
      setKlineModalOpen(false);

      if (snapshot.screen === 'input') {
        setModelType(snapshot.modelType);
        clearViewState({ clearInputs: false });
        if (snapshot.modelType === ModelType.BAZI || snapshot.modelType === ModelType.ZIWEI) {
          setTimeMode('custom');
        } else {
          setTimeMode('now');
        }
        return;
      }

      if (snapshot.screen === 'session' && snapshot.sessionId) {
        if (isLoggedIn) {
          await handleLoadSession(snapshot.sessionId);
        } else {
          handleLoadGuestCaseSession(snapshot.sessionId);
        }
      } else if (snapshot.screen === 'case' && snapshot.caseId) {
        setModelType(snapshot.modelType);
        await loadCaseDetail(snapshot.caseId);
      } else if (snapshot.screen === 'chart' && snapshot.transient) {
        restoreTransientNavigationSnapshot(snapshot.modelType, snapshot.transient);
      } else {
        setModelType(snapshot.modelType);
        clearViewState({ clearInputs: false });
      }

      if (snapshot.klineOpen && snapshot.modelType === ModelType.BAZI) {
        setKlineModalOpen(true);
      }
    } finally {
      window.setTimeout(() => {
        navigationRestoringRef.current = false;
      }, 0);
    }
  }, [
    clearViewState,
    handleLoadGuestCaseSession,
    handleLoadSession,
    isLoggedIn,
    loadCaseDetail,
    restoreTransientNavigationSnapshot,
  ]);

  const handleNavigationBack = useCallback(() => {
    const state = window.history.state;
    if (isAppHistoryState(state) && state.index > 0) {
      window.history.back();
      return;
    }

    clearViewState({ clearInputs: false });
  }, [clearViewState]);

  const handleCloseKlineModal = useCallback(() => {
    const state = window.history.state;
    if (isAppHistoryState(state) && state.index > 0 && state.snapshot?.klineOpen) {
      window.history.back();
      return;
    }
    setKlineModalOpen(false);
  }, []);

  buildNavigationSnapshotRef.current = buildNavigationSnapshot;
  restoreNavigationSnapshotRef.current = restoreNavigationSnapshot;

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const snapshot = isAppHistoryState(event.state)
        ? event.state.snapshot
        : parseNavigationSnapshotFromLocation();
      if (isAppHistoryState(event.state)) {
        navigationIndexRef.current = event.state.index;
      }
      void restoreNavigationSnapshotRef.current(snapshot);
    };

    const initialSnapshot =
      parseNavigationSnapshotFromLocation() || buildNavigationSnapshotRef.current();
    const initialState = window.history.state;
    if (isAppHistoryState(initialState)) {
      navigationIndexRef.current = initialState.index;
    } else {
      navigationIndexRef.current = 0;
      window.history.replaceState(
        {
          [NAVIGATION_STATE_MARKER]: true,
          index: 0,
          snapshot: initialSnapshot,
        } satisfies AppHistoryState,
        '',
        buildNavigationUrl(initialSnapshot)
      );
    }

    navigationKeyRef.current = buildNavigationKey(initialSnapshot);
    navigationReadyRef.current = true;

    const shouldRestoreFromUrl =
      initialSnapshot.screen !== 'input' ||
      initialSnapshot.modelType !== modelType;
    if (shouldRestoreFromUrl) {
      void restoreNavigationSnapshotRef.current(initialSnapshot);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!navigationReadyRef.current || navigationRestoringRef.current) return;

    const snapshot = buildNavigationSnapshot();
    const key = buildNavigationKey(snapshot);
    const currentState = window.history.state;

    if (!navigationKeyRef.current) {
      navigationKeyRef.current = key;
      window.history.replaceState(
        {
          [NAVIGATION_STATE_MARKER]: true,
          index: navigationIndexRef.current,
          snapshot,
        } satisfies AppHistoryState,
        '',
        buildNavigationUrl(snapshot)
      );
      return;
    }

    if (key !== navigationKeyRef.current) {
      navigationIndexRef.current += 1;
      navigationKeyRef.current = key;
      window.history.pushState(
        {
          [NAVIGATION_STATE_MARKER]: true,
          index: navigationIndexRef.current,
          snapshot,
        } satisfies AppHistoryState,
        '',
        buildNavigationUrl(snapshot)
      );
      return;
    }

    const nextIndex = isAppHistoryState(currentState) ? currentState.index : navigationIndexRef.current;
    navigationIndexRef.current = nextIndex;
    window.history.replaceState(
      {
        [NAVIGATION_STATE_MARKER]: true,
        index: nextIndex,
        snapshot,
      } satisfies AppHistoryState,
      '',
      buildNavigationUrl(snapshot)
    );
  }, [buildNavigationSnapshot]);

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
  // Only Bazi and Ziwei use location for True Solar Time
  const showLocation = modelType === ModelType.BAZI || modelType === ModelType.ZIWEI || modelType === ModelType.QIMEN;
  const showBornYear = modelType === ModelType.MEIHUA || modelType === ModelType.LIUYAO;
  const showSolarTimeReminder = showLocation && customDate && isNearShiChenBoundary(customDate);

  const userRole = (authSession?.user as Record<string, unknown> | undefined)?.role as string | undefined;
  const desktopHistoryOffset = sidebarCollapsed ? DESKTOP_PANEL_COLLAPSED_OFFSET : DESKTOP_PANEL_EXPANDED_OFFSET;
  const desktopNoteOffset = noteCollapsed ? DESKTOP_PANEL_COLLAPSED_OFFSET : DESKTOP_PANEL_EXPANDED_OFFSET;
  const desktopWorkPaddingLeft = isLoggedIn && !isCompactLayout ? desktopHistoryOffset : 0;
  const desktopWorkPaddingRight = isLoggedIn && !isCompactLayout ? desktopNoteOffset : 0;
  const currentCaseInitialAnalysis = activeCase
    ? normalizeInitialAnalysisData(activeCase.initialAnalysisData)
    : null;
  const currentInitialAnalysisModelLabel = currentCaseInitialAnalysis
    ? ANALYSIS_MODEL_OPTIONS.find((option) => option.value === currentCaseInitialAnalysis.model)?.label
      ?? currentCaseInitialAnalysis.model
    : '';
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
      />
    );
  }

  if (showWelcome && !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 to-amber-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-8 max-w-sm w-full text-center space-y-5">
          <div className="text-4xl">🔮</div>
          <h2 className="text-xl font-bold text-stone-800">元分 · 智解</h2>
          <p className="text-sm text-stone-500">登录后享受完整功能与30次免费提问额度<br/>访客仅可排盘3次，每次排盘后可追问1次</p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => { setShowWelcome(false); sessionStorage.setItem('welcomeDismissed', '1'); setShowAuth(true); }}
              className="w-full py-2.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition text-sm"
            >
              登录 / 注册
            </button>
            <button
              type="button"
              onClick={() => { setShowWelcome(false); sessionStorage.setItem('welcomeDismissed', '1'); }}
              className="w-full py-2.5 rounded-lg border border-stone-300 text-stone-600 font-medium hover:bg-stone-50 transition text-sm"
            >
              访客模式
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen flex flex-col text-stone-800 font-serif">
      {/* Header */}
      <header className="glass-topbar text-stone-100 py-4 px-4 border-b border-amber-500/40 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold tracking-wider">元分 · 智解</h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5 md:gap-2">
            <label className="flex max-w-[128px] items-center gap-1.5 rounded border border-stone-700/70 bg-stone-800/90 px-2 py-1 text-[10px] text-stone-300">
              <select
                value={analysisModel}
                onChange={(e) => {
                  if (isAnalysisModel(e.target.value)) {
                    setAnalysisModel(e.target.value);
                  }
                }}
                className="min-w-0 bg-transparent text-stone-100 outline-none"
              >
                {ANALYSIS_MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-stone-900 text-stone-100">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setShowUpdates(true)}
              className="text-[10px] px-2 py-1 rounded border border-amber-500/60 text-amber-300 hover:text-amber-200 hover:border-amber-400 transition"
            >
              新增功能
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
                登录 / 注册
              </button>
            )}
          </div>
        </div>
      </header>

      {showUpdates && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/42 backdrop-blur-md px-4"
          onClick={() => setShowUpdates(false)}
        >
          <div
            className="glass-panel w-full max-w-lg rounded-[30px] border border-white/55 shadow-[0_28px_80px_rgba(0,0,0,0.22)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-white/50 bg-white/12">
              <div>
                <div className="text-base font-bold text-stone-800">{updates.title}</div>
                <div className="mt-1 text-xs text-stone-500 tracking-[0.08em]">更新于 {updates.updated_at}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowUpdates(false)}
                className="glass-chip shrink-0 rounded-full px-3 py-1.5 text-sm text-stone-500 hover:text-stone-700 hover:bg-white/70 transition"
              >
                关闭
              </button>
            </div>
            <div className="px-6 py-5 space-y-3 text-sm leading-7 text-stone-700">
              {updates.items.map((item, idx) => (
                <div key={idx} className="glass-panel-soft flex items-start gap-3 rounded-2xl px-4 py-3 border border-white/55">
                  <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/90 text-[11px] font-bold text-white shadow-[0_0_18px_rgba(251,191,36,0.32)]">
                    {idx + 1}
                  </span>
                  <span className="flex-1">{item}</span>
                </div>
              ))}
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

      {isLoggedIn && (
        <div
          className="xl:hidden fixed left-3 top-[106px] z-20 flex flex-col gap-2"
        >
          <button
            type="button"
            onClick={() => setActiveCompactPanel((current) => (current === 'history' ? null : 'history'))}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border backdrop-blur-xl shadow-[0_18px_50px_rgba(28,25,23,0.16)] transition ${
              activeCompactPanel === 'history'
                ? 'border-amber-200/80 bg-amber-50/90 text-amber-800'
                : 'border-white/70 bg-white/62 text-stone-600'
            }`}
            title="历史记录"
          >
            <SessionIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveCompactPanel((current) => (current === 'note' ? null : 'note'))}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border backdrop-blur-xl shadow-[0_18px_50px_rgba(28,25,23,0.16)] transition ${
              activeCompactPanel === 'note'
                ? 'border-amber-200/80 bg-amber-50/90 text-amber-800'
                : 'border-white/70 bg-white/62 text-stone-600'
            }`}
            title="笔记"
          >
            <NoteIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {isLoggedIn && (
        <div
          className={`xl:hidden fixed inset-x-0 top-[73px] bottom-0 z-30 ${activeCompactPanel ? 'pointer-events-auto' : 'pointer-events-none'}`}
          aria-hidden={!activeCompactPanel}
        >
          <div
            className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${activeCompactPanel ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setActiveCompactPanel(null)}
          />
          <div
            className={`absolute inset-y-0 left-0 w-[82vw] max-w-[340px] transform transition-transform duration-300 ease-out ${activeCompactPanel === 'history' ? 'translate-x-0' : '-translate-x-full'}`}
          >
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
          </div>
          <div
            className={`absolute inset-y-0 right-0 w-[82vw] max-w-[340px] transform transition-transform duration-300 ease-out ${activeCompactPanel === 'note' ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <NoteSidebar
              content={noteContent}
              onChange={setNoteContent}
              saveState={noteSaveState}
              collapsed={false}
              onToggle={() => setActiveCompactPanel(null)}
              mobile
            />
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        {isLoggedIn && (
          <div className="hidden xl:block fixed left-3 top-[106px] z-10">
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

        {isLoggedIn && (
          <div className="hidden xl:block fixed right-3 top-[106px] z-10">
            <NoteSidebar
              content={noteContent}
              onChange={setNoteContent}
              saveState={noteSaveState}
              collapsed={noteCollapsed}
              onToggle={() => setNoteCollapsed((prev) => !prev)}
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
        <div className="mx-auto mt-6 w-full max-w-4xl px-2 pb-6">
        {!isLoggedIn && step === 'input' && (
          <div className="glass-banner bg-amber-50/70 border border-amber-200/80 text-amber-800 text-xs rounded-2xl px-4 py-3 mb-4 flex items-center gap-2">
            <span>访客模式：排盘剩余 {Math.max(0, 3 - guestFortuneCount)}/3 次</span>
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
            您的提问额度已用完，无法继续提问。
          </div>
        )}

        {error && <div className="glass-banner bg-red-50/72 border border-red-200/80 text-red-700 p-4 mb-6 rounded-2xl">{error}</div>}

        {/* Input Phase */}
        {step === 'input' && (
          <div className="glass-panel p-6 md:p-8 rounded-[32px]">
            
            {/* Categorized Model Selector */}
            <div className="mb-8 space-y-4">
               {/* 1. Divination Group */}
               <div className="glass-panel-soft rounded-[24px] p-3.5 md:p-4">
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <div className="glass-chip flex h-9 w-9 items-center justify-center rounded-xl">
                      <TaijiIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-500 uppercase tracking-[0.22em]">占卜预测</div>
                      <div className="text-[13px] text-stone-400">求测具体事项吉凶</div>
                    </div>
                  </div>
                  <div className="grid gap-2.5 md:grid-cols-3">
                    {[
                      [ModelType.QIMEN, '奇门遁甲'], 
                      [ModelType.MEIHUA, '梅花易数'],
                      [ModelType.LIUYAO, '六爻纳甲']
                    ].map(([type, label]) => {
                      const isRecommended = recommendedModels.has(type as ModelType);
                      return (
                      <button
                        key={type}
                        onClick={() => handleModelChange(type as ModelType)}
                        className={`group relative overflow-hidden py-4 text-sm font-bold rounded-[20px] border transition-all duration-300 ${isRecommended ? 'ring-1 ring-amber-300/70' : ''} ${
                          modelType === type 
                            ? 'glass-panel-dark text-amber-300 border-transparent shadow-[0_20px_40px_rgba(28,25,23,0.2)] -translate-y-0.5' 
                            : 'glass-chip text-stone-700 border-white/60 hover:bg-white/70 hover:border-stone-200/90 hover:-translate-y-0.5'
                        }`}
                      >
                        <span className={`pointer-events-none absolute inset-x-0 top-0 h-px ${modelType === type ? 'bg-white/50' : 'bg-white/80'}`}></span>
                        <span className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ${modelType === type ? 'opacity-100 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_52%)]' : 'group-hover:opacity-100 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.36),transparent_60%)]'}`}></span>
                        {label}
                        {isRecommended && (
                          <span className="absolute right-2.5 top-2.5 bg-amber-500/95 text-white text-[10px] px-2.5 py-0.5 rounded-full shadow-[0_10px_20px_rgba(245,158,11,0.24)]">
                            推荐
                          </span>
                        )}
                      </button>
                    );
                    })}
                  </div>
               </div>

               {/* 2. Destiny Group */}
               <div className="glass-panel-soft rounded-[24px] p-3.5 md:p-4">
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <div className="glass-chip flex h-9 w-9 items-center justify-center rounded-xl text-base">📜</div>
                    <div>
                      <div className="text-xs font-bold text-stone-500 uppercase tracking-[0.22em]">命理运势</div>
                      <div className="text-[13px] text-stone-400">观测人生大运趋势</div>
                    </div>
                  </div>
                  <div className="grid gap-2.5 md:grid-cols-2">
                    {[
                      [ModelType.BAZI, '四柱八字（盲派）'], 
                      [ModelType.ZIWEI, '紫微斗数']
                    ].map(([type, label]) => {
                      const isRecommended = recommendedModels.has(type as ModelType);
                      return (
                      <button
                        key={type}
                        onClick={() => handleModelChange(type as ModelType)}
                        className={`group relative overflow-hidden py-4 text-sm font-bold rounded-[20px] border transition-all duration-300 ${isRecommended ? 'ring-1 ring-amber-300/70' : ''} ${
                          modelType === type 
                            ? 'glass-panel-dark text-amber-300 border-transparent shadow-[0_20px_40px_rgba(28,25,23,0.2)] -translate-y-0.5' 
                            : 'glass-chip text-stone-700 border-white/60 hover:bg-white/70 hover:border-stone-200/90 hover:-translate-y-0.5'
                        }`}
                      >
                        <span className={`pointer-events-none absolute inset-x-0 top-0 h-px ${modelType === type ? 'bg-white/50' : 'bg-white/80'}`}></span>
                        <span className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ${modelType === type ? 'opacity-100 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_52%)]' : 'group-hover:opacity-100 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.36),transparent_60%)]'}`}></span>
                        {label}
                        {isRecommended && type === ModelType.BAZI && (
                          <span className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
                            <span className="bg-amber-500/95 text-white text-[10px] px-2.5 py-0.5 rounded-full shadow-[0_10px_20px_rgba(245,158,11,0.24)]">
                              推荐
                            </span>
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full border shadow-[0_10px_20px_rgba(28,25,23,0.16)] ${
                              modelType === type
                                ? 'border-white/35 bg-white/14 text-amber-100'
                                : 'border-amber-200/80 bg-white/78 text-amber-700'
                            }`}>
                              K线
                            </span>
                          </span>
                        )}
                      </button>
                    );
                    })}
                  </div>
               </div>
            </div>

            {supportsKnowledge && !isCaseModel && (
              <KnowledgeToggleCard
                useKnowledge={useKnowledge}
                onToggle={() => setUseKnowledge((prev) => !prev)}
              />
            )}

            {isCaseModel ? (
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
                      const datetimeText = buildCaseDateTimeValue(item.chartParams)
                        ? buildCaseDateTimeValue(item.chartParams).replace('T', ' ')
                        : '未填写出生时间';
                      const solarText = params.province && params.city
                        ? `真太阳时 · ${params.province}${params.city}`
                        : '';
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => loadCaseDetail(item.id)}
                          className={`text-left rounded-[24px] border px-4 py-3.5 transition ${
                            activeCase?.id === item.id
                              ? 'glass-panel-dark border-transparent text-amber-200 shadow-[0_18px_40px_rgba(28,25,23,0.22)]'
                              : 'glass-panel-soft border-white/60 text-stone-700 hover:bg-white/75'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-bold">{item.title}</div>
                              {pillarPreview && (
                                <div className={`mt-1 text-xs font-medium ${activeCase?.id === item.id ? 'text-amber-100/90' : 'text-stone-600'}`}>
                                  四柱：{pillarPreview}
                                </div>
                              )}
                              <div className={`mt-1 text-xs ${activeCase?.id === item.id ? 'text-amber-100/80' : 'text-stone-500'}`}>
                                {datetimeText}
                              </div>
                            </div>
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${
                              activeCase?.id === item.id
                                ? 'border-amber-200/30 text-amber-100'
                                : 'border-stone-200 text-stone-500'
                            }`}>
                              {item.modelType === ModelType.BAZI ? '八字' : '紫微'}
                            </span>
                          </div>
                          {solarText && (
                            <div className={`mt-2 text-xs ${activeCase?.id === item.id ? 'text-amber-100/80' : 'text-stone-500'}`}>
                              {solarText}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {caseFormOpen && (
                  <div className="glass-panel-soft rounded-[28px] border border-white/60 p-5 md:p-6 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-base font-bold text-stone-700">
                          {editingCaseId ? '编辑命例' : '新增命例'}
                        </div>
                        <div className="text-xs text-stone-500">
                          选择地区即按真太阳时排盘；不选择地区则按普通时间排盘。
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

                    <div>
                      <label className="block text-stone-700 font-bold mb-2">姓名 (可选)</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="glass-input w-full rounded-2xl p-3"
                        placeholder="张三"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-stone-700 font-bold mb-2">性别</label>
                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => setGender(0)}
                            className={`flex-1 py-2.5 rounded-2xl border transition ${gender === 0 ? 'glass-panel-dark text-amber-200 border-transparent' : 'glass-chip text-stone-600'}`}
                          >
                            男 (乾)
                          </button>
                          <button
                            type="button"
                            onClick={() => setGender(1)}
                            className={`flex-1 py-2.5 rounded-2xl border transition ${gender === 1 ? 'glass-panel-dark text-amber-200 border-transparent' : 'glass-chip text-stone-600'}`}
                          >
                            女 (坤)
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-stone-700 font-bold mb-2">出生时间 (阳历)</label>
                        <input
                          type="datetime-local"
                          value={customDate}
                          onChange={(e) => setCustomDate(e.target.value)}
                          className="glass-input w-full rounded-2xl p-3"
                        />
                        {showSolarTimeReminder && (
                          <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                            当前时间接近时辰交界（前后30分钟），建议选择地区启用真太阳时。
                          </div>
                        )}
                      </div>
                    </div>

                    <LocationSelector
                      province={province}
                      setProvince={setProvince}
                      city={city}
                      setCity={setCity}
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
              {!isLifeReading && (
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

              {/* Name (Life Reading Only) */}
              {isLifeReading && (
                 <div>
                   <label className="block text-stone-700 font-bold mb-2">姓名 (可选)</label>
                   <input type="text" value={name} onChange={e => setName(e.target.value)} className="glass-input w-full rounded-2xl p-3" placeholder="张三"/>
                 </div>
              )}

              {/* Birth Year (Meihua & Liuyao) */}
              {showBornYear && (
                 <div>
                   <label className="block text-stone-700 font-bold mb-2">出生年份 (用于起卦依据)</label>
                   <input 
                      type="number" 
                      value={birthYear} 
                      onChange={e => setBirthYear(e.target.value)} 
                      className="glass-input w-full rounded-2xl p-3" 
                      placeholder="例如: 1995"
                    />
                 </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* Gender */}
                <div>
                  <label className="block text-stone-700 font-bold mb-2">性别</label>
                  <div className="flex gap-4">
                    <button onClick={() => setGender(0)} className={`flex-1 py-2.5 rounded-2xl border transition ${gender === 0 ? 'glass-panel-dark text-amber-200 border-transparent' : 'glass-chip text-stone-600'}`}>男 (乾)</button>
                    <button onClick={() => setGender(1)} className={`flex-1 py-2.5 rounded-2xl border transition ${gender === 1 ? 'glass-panel-dark text-amber-200 border-transparent' : 'glass-chip text-stone-600'}`}>女 (坤)</button>
                  </div>
                </div>

                {/* Time Input for Standard Models (Qimen, Meihua, Bazi, Ziwei) */}
                {modelType !== ModelType.LIUYAO && modelType !== ModelType.MEIHUA && (
                  <div>
                    <label className="block text-stone-700 font-bold mb-2">
                      {isLifeReading ? "出生时间 (阳历)" : "起卦时间"}
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
              </div>

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
                      默认设置：起局方法为置闰法，盘类型为转盘奇门。
                    </div>
                  )}

                  {qimenProEnabled && (
                    <div className="grid md:grid-cols-2 gap-4 animate-fade-in">
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">起局方法</label>
                        <select
                          value={qimenJuModel}
                          onChange={(e) => setQimenJuModel(parseInt(e.target.value, 10))}
                          className="glass-input glass-select w-full rounded-2xl p-3 text-sm outline-none"
                        >
                          <option value={0}>拆补法</option>
                          <option value={1}>置闰法</option>
                          <option value={2}>茅山道人法</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-stone-500 mb-1">盘类型</label>
                        <select
                          value={qimenPanModel}
                          onChange={(e) => setQimenPanModel(parseInt(e.target.value, 10))}
                          className="glass-input glass-select w-full rounded-2xl p-3 text-sm outline-none"
                        >
                          <option value={0}>飞盘奇门</option>
                          <option value={1}>转盘奇门</option>
                        </select>
                      </div>

                      {qimenPanModel === 0 && (
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">飞盘排法</label>
                          <select
                            value={qimenFeiPanModel}
                            onChange={(e) => setQimenFeiPanModel(parseInt(e.target.value, 10))}
                            className="glass-input glass-select w-full rounded-2xl p-3 text-sm outline-none"
                          >
                            <option value={1}>全部顺排</option>
                            <option value={2}>阴顺阳逆</option>
                          </select>
                        </div>
                      )}
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
              {showLocation && (
                <LocationSelector 
                  province={province} 
                  setProvince={setProvince} 
                  city={city} 
                  setCity={setCity} 
                />
              )}

              <button 
                onClick={handleCalculate} disabled={loading}
                className="glass-cta w-full hover:brightness-105 text-amber-300 font-bold py-4 rounded-2xl mt-4 flex justify-center items-center gap-2 transition"
              >
                {loading ? <Spinner /> : '开始排盘'}
              </button>
              </div>
            )}
          </div>
        )}

        {/* Result Phase */}
        {step === 'chart' && chartData && (
          <div className="animate-fade-in space-y-6">
            {!isLoggedIn && (
              <div className="glass-banner bg-amber-50/72 border border-amber-200/80 text-amber-800 text-xs rounded-2xl px-4 py-3 flex items-center gap-2">
                <span>访客模式：排盘剩余 {Math.max(0, 3 - guestFortuneCount)}/3 次 · 追问本轮 {Math.max(0, 1 - guestFollowUpCount)}/1 次</span>
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
                  {modelType === ModelType.QIMEN ? '奇门排盘' : 
                   modelType === ModelType.BAZI ? '八字命盘' : 
                   modelType === ModelType.ZIWEI ? '紫微斗数' : 
                   modelType === ModelType.MEIHUA ? '梅花易数' : '六爻纳甲'}
                 </span>
                 <button data-report-ignore="true" onClick={handleNavigationBack} className="text-sm text-stone-500 hover:text-stone-800 underline">返回</button>
              </div>

              {/* Visualization Components */}
              {modelType === ModelType.QIMEN && <QimenGrid data={chartData} />}
              {modelType === ModelType.BAZI && <BaziGrid data={chartData} />}
              {modelType === ModelType.ZIWEI && <ZiweiGrid data={chartData} />}
              {modelType === ModelType.MEIHUA && <MeihuaGrid data={chartData} />}
              {modelType === ModelType.LIUYAO && <LiuyaoGrid data={chartData} />}
            </div>

            {isCaseModel && activeCase && (
              <div className="glass-panel-soft rounded-[30px] border border-white/60 p-5 md:p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-bold text-stone-700">{activeCase.title}</div>
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
                        {currentCaseInitialAnalysis ? '重新生成初始化分析' : '生成初始化分析'}
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="glass-panel rounded-[22px] border border-white/60 px-4 py-3">
                      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">状态</div>
                      <div className="mt-2 text-base font-bold text-stone-700">{currentInitialAnalysisStatus}</div>
                    </div>
                    <div className="glass-panel rounded-[22px] border border-white/60 px-4 py-3">
                      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">模型</div>
                      <div className="mt-2 text-base font-bold text-stone-700">
                        {currentInitialAnalysisModelLabel || '尚未生成'}
                      </div>
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
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => {
                          if (isLoggedIn) {
                            handleLoadSession(session.id);
                          } else {
                            handleLoadGuestCaseSession(session.id);
                          }
                        }}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          activeSessionId === session.id
                            ? 'glass-panel-dark border-transparent text-amber-200'
                            : 'glass-panel bg-white/70 text-stone-700 border-white/60 hover:bg-white/85'
                        }`}
                      >
                        <div className="text-sm font-semibold">{session.title}</div>
                        <div className={`mt-1 text-xs ${activeSessionId === session.id ? 'text-amber-100/75' : 'text-stone-500'}`}>
                          {new Date(session.updatedAt).toLocaleString('zh-CN', { hour12: false })}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Chat */}
            {(!isCaseModel || chatHistory.length > 0) && (
            <div className="glass-panel rounded-[30px] overflow-hidden flex flex-col h-[600px]">
               <div className="glass-panel-soft px-4 py-3 border-b border-white/50 flex justify-between items-center">
                 <h3 className="font-bold text-stone-700 flex items-center gap-2"><TaijiIcon className="w-5 h-5" /> 大师解读</h3>
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
                   return (
                   <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`group max-w-[90%] rounded-[24px] p-4 shadow-sm relative backdrop-blur-xl ${msg.role === 'user' ? 'glass-panel-dark text-white' : 'glass-panel-soft text-stone-800'}`}>
                        {msg.role === 'model' && parsed?.reasoning && (
                          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
                            <div className="mb-1 font-semibold">思考过程</div>
                            <div className="markdown-body text-xs leading-relaxed">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.reasoning}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                        <div className="markdown-body text-sm leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.role === 'model' && parsed ? parsed.answer : msg.content}
                          </ReactMarkdown>
                        </div>
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
                   placeholder={isKlineRunning ? "K线运行中，暂不可发送" : (isLoggedIn && userQuota !== null && userQuota <= 0) ? "额度已用完" : (!isLoggedIn && guestFollowUpCount >= 1) ? "访客追问次数已用完，请登录" : "追问..."} disabled={isTyping || isKlineRunning || (isLoggedIn && userQuota !== null && userQuota <= 0)}
                   className="glass-input flex-1 rounded-2xl px-4 py-2"
                 />
                 <button onClick={handleSendMessage} disabled={isTyping || isKlineRunning || !inputMessage.trim() || (isLoggedIn && userQuota !== null && userQuota <= 0)} className="glass-cta text-amber-300 p-3 rounded-2xl hover:brightness-105 disabled:opacity-50 disabled:hover:brightness-100 transition"><SendIcon /></button>
              </div>
            </div>
            )}
          </div>
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
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                    <span className="rounded-full border border-white/60 bg-white/55 px-2.5 py-1">
                      {currentInitialAnalysisModelLabel}
                    </span>
                    <span>生成于 {new Date(currentCaseInitialAnalysis.generatedAt).toLocaleString('zh-CN', { hour12: false })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                <div className="markdown-body text-sm leading-7 text-stone-700">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {currentCaseInitialAnalysis.content}
                  </ReactMarkdown>
                </div>
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

      {/* K线浮球 */}
      {modelType === ModelType.BAZI && step === 'chart' && klinePos && (
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
          <div className="glass-panel w-full max-w-6xl max-h-[90vh] rounded-[32px] border border-white/55 overflow-hidden flex flex-col shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
            <div className="glass-panel-soft flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/50 bg-[radial-gradient(circle_at_top_left,rgba(255,245,220,0.88),rgba(255,255,255,0.52)_55%,rgba(255,255,255,0.2)_100%)]">
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
                  onClick={handleCloseKlineModal}
                  className="glass-chip text-xs px-3 py-1 rounded-full text-stone-500 hover:text-stone-700"
                >
                  关闭
                </button>
              </div>
            </div>

            <div className="glass-chat-bg p-6 overflow-y-auto">
              {klineStatus === 'idle' && !klineResult && (
                <div className="glass-panel-soft rounded-[30px] border border-dashed border-amber-200/70 bg-[radial-gradient(circle_at_top,rgba(255,248,225,0.92),rgba(255,255,255,0.48)_62%,rgba(255,255,255,0.16)_100%)] h-[360px] flex flex-col items-center justify-center text-stone-500 space-y-4">
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
                <div className="glass-panel-soft h-[360px] rounded-[30px] border border-white/60 bg-[radial-gradient(circle_at_top,rgba(255,247,214,0.82),rgba(255,255,255,0.42)_60%,rgba(255,255,255,0.14)_100%)] flex flex-col items-center justify-center text-stone-600 space-y-4">
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
                <div className="glass-panel-soft h-[360px] rounded-[30px] border border-red-200/70 bg-[radial-gradient(circle_at_top,rgba(254,242,242,0.95),rgba(255,255,255,0.52)_60%,rgba(255,255,255,0.2)_100%)] flex flex-col items-center justify-center text-red-600">
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
                  <div className="glass-panel-soft flex flex-wrap items-center justify-between gap-4 rounded-[26px] border border-white/60 bg-[radial-gradient(circle_at_top_left,rgba(255,247,214,0.55),rgba(255,255,255,0.55)_42%,rgba(255,255,255,0.24)_100%)] px-4 py-3">
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

                  <div className="relative overflow-hidden rounded-[28px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(255,251,235,0.52))] shadow-[0_20px_60px_rgba(120,113,108,0.16)] backdrop-blur-xl">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,248,225,0.88),rgba(255,255,255,0.2)_38%,rgba(255,255,255,0.08)_100%)]" />
                    <div className="overflow-x-auto">
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
                                  <div className="text-[11px] text-stone-500">YEARLY INSIGHT</div>
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
                                  <div className="text-[11px] text-stone-500">DECADE CYCLE</div>
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
                                <div className="text-[11px] text-stone-500">DECADE TREND</div>
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
                                <div className="text-[11px] text-stone-500">DECADE CYCLE</div>
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
      )}
    </div>
  );
};

export default App;
