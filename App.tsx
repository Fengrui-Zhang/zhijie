
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSession, signOut } from 'next-auth/react';
import updates from './data/updates.json';

// Services
import { 
  fetchQimen, fetchBazi, fetchZiwei, fetchMeihua, fetchLiuyao,
  formatQimenPrompt, formatBaziPrompt, formatZiweiPrompt, formatMeihuaPrompt, formatLiuyaoPrompt 
} from './services/apiService';
import { startQimenChat, sendMessageToDeepseekStream, clearChatSession, restoreChatSession } from './services/deepseekService';

// Auth & Session Components
import AuthForm from './components/AuthForm';
import SessionSidebar, { type SessionItem } from './components/SessionSidebar';
import AdminPanel from './components/AdminPanel';
import AccountSettingsModal from './components/AccountSettingsModal';
import UserMenuPopup from './components/UserMenuPopup';

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

// --- Icons ---
const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
const SendIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>);
const ReportIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25V6.75A2.25 2.25 0 0017.25 4.5H6.75A2.25 2.25 0 004.5 6.75v10.5A2.25 2.25 0 006.75 19.5h4.5m4.5-5.25v5.25m0 0l-2.25-2.25m2.25 2.25l2.25-2.25M8.25 9h7.5M8.25 12h4.5" /></svg>);

const THINKING_START = '[[THINKING]]';
const THINKING_END = '[[/THINKING]]';
const DISCLAIMER_TEXT = 'AI 命理分析仅供娱乐，请大家切勿过分当真。命运掌握在自己手中，要相信科学，理性看待。';
const KLINE_DEV_NOTE = 'K线功能尚处于开发阶段，仅供娱乐';
const KLINE_STORAGE_PREFIX = 'bazi-kline-v1:';

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

  const closeList = () => {
    if (listType) {
      html += `</${listType}>`;
      listType = null;
    }
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
      } else {
        closeList();
        inCodeBlock = true;
        html += '<pre class="code-block"><code>';
      }
      continue;
    }

    if (inCodeBlock) {
      html += `${escapeHtml(line)}\n`;
      continue;
    }

    if (!trimmed) {
      closeList();
      html += '<div class="gap"></div>';
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      const content = inlineFormat(escapeHtml(headingMatch[2]));
      html += `<h${level}>${content}</h${level}>`;
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      closeList();
      const content = inlineFormat(escapeHtml(quoteMatch[1]));
      html += `<blockquote>${content}</blockquote>`;
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
      continue;
    }

    closeList();
    html += `<p>${inlineFormat(escapeHtml(line))}</p>`;
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

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

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

const buildSystemInstruction = (mType: ModelType, cData: unknown): string => {
  switch (mType) {
    case ModelType.QIMEN:
      return `你是精通奇门遁甲的大师。请基于排盘，用通俗专业语言解答用户疑惑。关注用神、时令、吉凶。\n\n${formatQimenPrompt(cData as any, '')}`;
    case ModelType.BAZI:
      return `你是一位深谙段建业盲派命理体系的算命专家。\n\n${formatBaziPrompt(cData as any)}`;
    case ModelType.ZIWEI:
      return `你是紫微斗数专家。请基于十二宫位星曜，分析命主天赋与人生轨迹。\n\n${formatZiweiPrompt(cData as any)}`;
    case ModelType.MEIHUA:
      return `你是梅花易数占卜师。请基于本卦、互卦、变卦及动爻，直断吉凶成败。\n\n${formatMeihuaPrompt(cData as any, '')}`;
    case ModelType.LIUYAO:
      return `你是六爻纳甲预测专家。请基于卦象、六亲、世应、六神及神煞空亡，详细推断吉凶、应期及建议。\n\n${formatLiuyaoPrompt(cData as any, '')}`;
    default:
      return '';
  }
};

const App: React.FC = () => {
  const { data: authSession, status: authStatus, update: updateSession } = useSession();
  const isLoggedIn = authStatus === 'authenticated';
  const [showAuth, setShowAuth] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [userQuota, setUserQuota] = useState<number | null>(null);
  const [guestFortuneCount, setGuestFortuneCount] = useState(0);
  const [guestFollowUpCount, setGuestFollowUpCount] = useState(0);

  // --- Persistence State ---
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [savedSessions, setSavedSessions] = useState<SessionItem[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
  // Manual Lines: [line1, line2, ..., line6] where value is 0-3 (Young Yin, Young Yang, Old Yin, Old Yang)
  // Initialized to all Young Yin (0) or alternating for demo
  const [manualLines, setManualLines] = useState<number[]>([1,0,1,0,1,0]);
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
  const [isKlineRunning, setIsKlineRunning] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [useKnowledge, setUseKnowledge] = useState(true);
  const [showUpdates, setShowUpdates] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const supportsKnowledge = modelType === ModelType.QIMEN || modelType === ModelType.BAZI;
  const recommendedModels = new Set([ModelType.QIMEN, ModelType.BAZI]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [baziInitialAnalysis, setBaziInitialAnalysis] = useState('');
  const [klineUnlocked, setKlineUnlocked] = useState(false);
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  useEffect(() => {
    if (modelType !== ModelType.BAZI || !chartData) return;
    try {
      const key = getKlineStorageKey(chartData as BaziResponse);
      const cached = localStorage.getItem(key);
      if (!cached) return;
      const parsed = JSON.parse(cached) as KlineResult;
      if (parsed?.schema_version === 'kline_v1') {
        setKlineResult(parsed);
        setKlineStatus('ready');
        setKlineUnlocked(true);
      }
    } catch {
      // Ignore cache errors
    }
  }, [modelType, chartData]);

  useEffect(() => {
    if (klineStatus !== 'analyzing') return;
    setKlineProgress(0);
    setKlineYearProgress(0);
    klineYearProgressRef.current = 0;
  }, [klineStatus]);

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

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

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

  const saveSessionToDb = async (
    mType: string,
    title: string,
    chartParams: Record<string, unknown>,
    cData: unknown
  ): Promise<string | null> => {
    if (!isLoggedIn) return null;
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelType: mType, title, chartParams, chartData: cData }),
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

  const handleDeleteSession = async (id: string) => {
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      setSavedSessions(prev => prev.filter(s => s.id !== id));
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

      clearChatSession();
      setActiveSessionId(id);
      setModelType(data.modelType as ModelType);
      setChartData(data.chartData);
      setStep('chart');
      setError('');

      if (data.chartParams) {
        const p = data.chartParams as Record<string, unknown>;
        if (p.name) setName(p.name as string);
        if (p.question) setQuestion(p.question as string);
      }

      const msgs: ChatMessage[] = (data.messages || []).map(
        (m: { id: string; role: string; content: string; createdAt: string }) => ({
          id: m.id,
          role: m.role as 'user' | 'model',
          content: m.content,
          timestamp: new Date(m.createdAt),
        })
      );
      setChatHistory(msgs);

      if (msgs.length > 0) {
        const systemInstruction = buildSystemInstruction(data.modelType as ModelType, data.chartData);
        restoreChatSession(
          systemInstruction,
          msgs.map(m => ({ role: m.role, content: m.content }))
        );
      }

      if (data.modelType === 'bazi' && data.chartData) {
        const firstModelMsg = msgs.find(m => m.role === 'model');
        if (firstModelMsg) {
          const parsed = parseModelContent(firstModelMsg.content);
          setBaziInitialAnalysis(stripDisclaimer(parsed.answer));
          setKlineUnlocked(true);
        }
      }
    } catch {
      // silently ignore
    }
  };

  const updateChatMessage = (id: string, content: string) => {
    setChatHistory(prev =>
      prev.map(msg => (msg.id === id ? { ...msg, content } : msg))
    );
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

  const buildReportHtml = () => {
    const now = new Date();
    const nowText = now.toLocaleString('zh-CN', { hour12: false });
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

    const metaItems = [
      name ? `姓名：${name}` : '',
      question ? `提问：${question}` : '',
      `模型：${modelLabel}`,
      `生成时间：${nowText}`,
    ].filter(Boolean);

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

    const metaHtml = metaItems.map(item => `<div class="meta-item">${escapeHtml(item)}</div>`).join('');
    const chartInfoHtml = chartInfoLines.length
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
          <title>${escapeHtml(reportName)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: "Songti SC", "Noto Serif SC", "STSong", serif;
              color: #1c1917;
              background: #f8f5ef;
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
            .meta {
              margin-top: 16px;
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
              gap: 8px 16px;
              font-size: 13px;
              color: #44403c;
            }
            .meta-item {
              background: #fff7ed;
              border: 1px solid #fed7aa;
              padding: 8px 12px;
              border-radius: 10px;
            }
            .chart-info {
              margin-top: 14px;
              padding: 14px 16px;
              background: #fff;
              border-radius: 14px;
              border: 1px solid #e7e5e4;
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
              display: grid;
              gap: 16px;
            }
            .msg {
              background: #fff;
              border-radius: 16px;
              padding: 16px 18px;
              border: 1px solid #e7e5e4;
              position: relative;
            }
            .msg.user {
              border-color: #a8a29e;
              background: #1c1917;
              color: #fef3c7;
            }
            .msg.user .msg-time,
            .msg.user .msg-index {
              color: #fcd34d;
            }
            .msg-head {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              margin-bottom: 8px;
              color: #78716c;
            }
            .msg-role {
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .msg-text {
              font-size: 14px;
              line-height: 1.65;
            }
            .msg-text p {
              margin: 0 0 10px;
            }
            .msg-text p:last-child {
              margin-bottom: 0;
            }
            .msg-text ul,
            .msg-text ol {
              margin: 0 0 10px 18px;
              padding: 0;
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
            .gap {
              height: 8px;
            }
            .msg-reasoning {
              margin-bottom: 10px;
              padding: 10px 12px;
              border-radius: 12px;
              background: rgba(251, 191, 36, 0.15);
              border: 1px solid rgba(251, 191, 36, 0.4);
              color: #92400e;
              font-size: 12px;
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
              .page { padding: 0; }
              .header { border-radius: 0; }
              .msg { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="title">大师解读报告</div>
              <div class="subtitle">记录本次对话，便于随时回顾</div>
            </div>
            <div class="meta">${metaHtml}</div>
            ${chartInfoHtml}
            <div class="content">${messagesHtml}</div>
            <div class="footer">${escapeHtml(DISCLAIMER_TEXT)}</div>
          </div>
        </body>
      </html>
    `;
  };

  const handleGenerateReport = () => {
    if (!chatHistory.length) return;
    const reportHtml = buildReportHtml();
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

    const cleanup = () => {
      window.setTimeout(() => {
        frame.remove();
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

    const iframe = frame as HTMLIFrameElement & { srcdoc?: string };
    if (typeof iframe.srcdoc !== 'undefined') {
      iframe.srcdoc = reportHtml;
    } else {
      const win = iframe.contentWindow;
      if (win) {
        win.document.open();
        win.document.write(reportHtml);
        win.document.close();
      }
    }
  };

  const knowledgeBoardMap: Record<ModelType, string> = {
    [ModelType.QIMEN]: 'qimen',
    [ModelType.BAZI]: 'bazi',
    [ModelType.ZIWEI]: 'ziweidoushu',
    [ModelType.MEIHUA]: 'meihua',
    [ModelType.LIUYAO]: 'liuyao',
  };

  // --- Reset when model changes ---
  const handleModelChange = (type: ModelType) => {
    setModelType(type);
    handleReset();
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
    setStep('input');
    setChartData(null);
    setChatHistory([]);
    clearChatSession();
    setError('');
    setBirthYear('');
    setLiuyaoMode(LiuyaoMode.AUTO);
    setManualLines([1,0,1,0,1,0]);
    setLyNum('');
    setLyNumUp('');
    setLyNumDown('');
    setQimenProEnabled(false);
    setQimenJuModel(1);
    setQimenPanModel(1);
    setQimenFeiPanModel(1);
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

    // Liuyao Specific Validation
    if (modelType === ModelType.LIUYAO) {
      if ((liuyaoMode === LiuyaoMode.NUMBER || liuyaoMode === LiuyaoMode.SINGLE_NUM) && !lyNum) {
        setError("请输入数字");
        return;
      }
      if (liuyaoMode === LiuyaoMode.DOUBLE_NUM && (!lyNumUp || !lyNumDown)) {
        setError("请输入上卦和下卦的数字");
        return;
      }
      if (liuyaoMode === LiuyaoMode.CUSTOM_TIME && !customDate) {
         setError("请选择起卦时间");
         return;
      }
    }

    setLoading(true);
    setError('');
    setChartData(null);
    clearChatSession();
    setChatHistory([]);

    try {
      // Date logic
      let date = new Date();
      if (modelType === ModelType.LIUYAO && liuyaoMode === LiuyaoMode.CUSTOM_TIME && customDate) {
         date = new Date(customDate);
      } else if (modelType === ModelType.LIUYAO && liuyaoMode === LiuyaoMode.AUTO) {
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
        pan_model: modelType === ModelType.LIUYAO ? liuyaoMode : undefined,
      };

      // Augment params for Liuyao modes
      if (modelType === ModelType.LIUYAO) {
         if (liuyaoMode === LiuyaoMode.MANUAL) {
            baseParams.gua_yao1 = manualLines[0];
            baseParams.gua_yao2 = manualLines[1];
            baseParams.gua_yao3 = manualLines[2];
            baseParams.gua_yao4 = manualLines[3];
            baseParams.gua_yao5 = manualLines[4];
            baseParams.gua_yao6 = manualLines[5];
         }
         else if (liuyaoMode === LiuyaoMode.NUMBER || liuyaoMode === LiuyaoMode.SINGLE_NUM) {
            baseParams.number = parseInt(lyNum);
            baseParams.yao_add_time = yaoAddTime ? 1 : 0;
         }
         else if (liuyaoMode === LiuyaoMode.DOUBLE_NUM) {
            baseParams.number_up = parseInt(lyNumUp);
            baseParams.number_down = parseInt(lyNumDown);
            baseParams.yao_add_time = yaoAddTime ? 1 : 0;
         }
      }

      let resultData: any = null;
      let prompt = "";
      let systemInstruction = "";
      let knowledgeQuery = "";
      const defaultBaziQuestion = "请分析此命造的性格、事业、财运、婚姻，并给出未来5-10年的大致运势点评。";
      const now = new Date();
      const currentTimeText = `当前时间: ${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日${now.getHours()}时${now.getMinutes()}分`;

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
            const panText = formatBaziPrompt(resultData);
            const trimmedQuestion = question.trim();
            const finalQuestion = trimmedQuestion || defaultBaziQuestion;
            prompt = trimmedQuestion
              ? `用户问题：${trimmedQuestion}\n请结合命盘重点回答，必要时补充全盘背景。`
              : `用户问题：${finalQuestion}\n请结合命盘重点回答，必要时补充全盘背景。`;
            knowledgeQuery = trimmedQuestion ? trimmedQuestion : defaultBaziQuestion;
            systemInstruction = [
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
          }
          break;
        case ModelType.ZIWEI:
          resultData = await fetchZiwei(baseParams);
          prompt = `${formatZiweiPrompt(resultData)}\n${currentTimeText}`;
          systemInstruction = "你是紫微斗数专家。请基于十二宫位星曜，分析命主天赋与人生轨迹。";
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
      const newSessionId = await saveSessionToDb(
        modelType,
        sessionTitle,
        { ...baseParams, question, timeMode } as Record<string, unknown>,
        resultData
      );
      if (newSessionId) setActiveSessionId(newSessionId);

      // --- AI Chat Init ---
      await startQimenChat(systemInstruction);

      // Add user context
      const trimmedQuestion = question.trim();
      const userContent = modelType === ModelType.BAZI
        ? `请分析我的命盘: ${baseParams.year}年${baseParams.month}月...${trimmedQuestion ? `\n问题: ${trimmedQuestion}` : ''}`
        : modelType === ModelType.ZIWEI
          ? `请分析我的命盘: ${baseParams.year}年${baseParams.month}月...`
          : `问题: ${question}`;

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
        knowledge
      );
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

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    if (!isLoggedIn) {
      if (guestFollowUpCount >= 1) {
        setShowAuth(true);
        return;
      }
    }
    if (isLoggedIn && userQuota !== null && userQuota <= 0) {
      setError('您的提问额度已用完');
      return;
    }
    const outgoingMessage = inputMessage;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: outgoingMessage, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const modelId = (Date.now() + 1).toString();
      setChatHistory(prev => [...prev, { id: modelId, role: 'model', content: '', timestamp: new Date() }]);
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
        knowledge
      );
      const finalAnswer = appendDisclaimer(finalState.content);
      const finalContent = buildModelContent(finalState.reasoning, finalAnswer);
      updateChatMessage(modelId, finalContent);

      await saveMessagesToDb(activeSessionId, [
        { role: 'user', content: outgoingMessage },
        { role: 'model', content: finalContent },
      ]);

      if (!isLoggedIn) {
        const newCount = guestFollowUpCount + 1;
        localStorage.setItem('guestFollowUpCount', String(newCount));
        setGuestFollowUpCount(newCount);
      } else {
        fetchUserProfile();
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'model', content: "⚠️ 网络错误，请重试。", timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Helper for Manual Line Toggling
  const toggleLine = (idx: number) => {
    const newLines = [...manualLines];
    // Cycle: 0 -> 1 -> 2 -> 3 -> 0
    newLines[idx] = (newLines[idx] + 1) % 4;
    setManualLines(newLines);
  };
  
  const getLineLabel = (val: number) => {
     switch(val) {
       case 0: return '少阴 --';
       case 1: return '少阳 ━';
       case 2: return '老阴 X'; // Changing Yin
       case 3: return '老阳 O'; // Changing Yang
       default: return '';
     }
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

  const getKlineStorageKey = (data: BaziResponse) => {
    const base = data.base_info;
    const bazi = data.bazi_info.bazi.join('');
    const raw = `${base.name || '匿名'}-${base.gongli}-${bazi}`;
    return `${KLINE_STORAGE_PREFIX}${encodeURIComponent(raw)}`;
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

  const persistKlineResult = (result: KlineResult) => {
    if (modelType !== ModelType.BAZI || !chartData) return;
    const key = getKlineStorageKey(chartData as BaziResponse);
    localStorage.setItem(key, JSON.stringify(result));
  };

  const handleRunKline = async () => {
    if (modelType !== ModelType.BAZI || !chartData) return;
    if (klineStatus === 'analyzing') return;
    setKlineStatus('analyzing');
    setIsKlineRunning(true);
    setKlineError('');
    setKlineSelected(null);
    setKlineProgress(0);
    setKlineYearProgress(0);
    klineYearProgressRef.current = 0;
    try {
      const prompt = buildKlinePrompt(chartData as BaziResponse, baziInitialAnalysis);
      const finalState = await sendMessageToDeepseekStream(prompt, (state) => {
        const matches = state.content.match(/"year"\s*:\s*\d{4}/g) || [];
        const years = new Set(matches.map((m) => m.replace(/[^0-9]/g, '')));
        const count = Math.min(70, years.size);
        if (count !== klineYearProgressRef.current) {
          klineYearProgressRef.current = count;
          setKlineYearProgress(count);
          setKlineProgress(Math.min(99, Math.round((count / 70) * 100)));
        }
      }, undefined, 'deepseek-chat');
      let parsed: KlineResult | null = null;
      try {
        parsed = parseKlineResult(finalState.content);
      } catch {
        try {
          parsed = parseKlineResult(sanitizeKlineJson(finalState.content));
        } catch {
          try {
            const repairPrompt = buildKlineRepairPrompt(finalState.content);
            const repaired = await sendMessageToDeepseekStream(repairPrompt, () => {}, undefined, 'deepseek-chat');
            parsed = parseKlineResult(sanitizeKlineJson(repaired.content));
          } catch {
            const strictPrompt = buildKlinePromptStrict(chartData as BaziResponse);
            const retryState = await sendMessageToDeepseekStream(strictPrompt, () => {}, undefined, 'deepseek-chat');
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
      persistKlineResult(normalized);
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
    setKlineModalOpen(true);
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

  const scoreAverage = (scores: KlineScores) =>
    Math.round(((scores.wealth + scores.career + scores.love + scores.health) / 4) * 10) / 10;

  // --- Render Helpers ---
  const isLifeReading = modelType === ModelType.BAZI || modelType === ModelType.ZIWEI;
  // Only Bazi and Ziwei use location for True Solar Time
  const showLocation = modelType === ModelType.BAZI || modelType === ModelType.ZIWEI || modelType === ModelType.QIMEN;
  const showBornYear = modelType === ModelType.MEIHUA || modelType === ModelType.LIUYAO;
  const showSolarTimeReminder = showLocation && customDate && isNearShiChenBoundary(customDate);

  const userRole = (authSession?.user as Record<string, unknown> | undefined)?.role as string | undefined;

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
          <p className="text-sm text-stone-500">登录后享受完整功能与30次免费提问额度<br/>访客仅可排盘3次、追问1次</p>
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
    <div className="min-h-screen flex flex-col bg-[#fcfcfc] text-stone-800 font-serif">
      {/* Header */}
      <header className="bg-stone-900 text-stone-100 py-4 px-4 shadow-lg border-b-4 border-amber-700 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold tracking-wider">元分 · 智解</h1>
          <div className="flex items-center gap-2">
            <div className="text-[10px] bg-stone-800 px-2 py-1 rounded text-stone-400">DeepSeek R1 Powered</div>
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
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowUpdates(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-xl border border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
              <div>
                <div className="text-sm font-bold text-stone-800">{updates.title}</div>
                <div className="text-[11px] text-stone-500">更新于 {updates.updated_at}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowUpdates(false)}
                className="text-sm text-stone-400 hover:text-stone-600"
              >
                关闭
              </button>
            </div>
            <div className="px-4 py-3 space-y-2 text-sm text-stone-700">
              {updates.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                  <span>{item}</span>
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
          onOpenDeleteAccount={() => setShowAccountSettings(true)}
        />
      )}

      {showAccountSettings && isLoggedIn && (
        <AccountSettingsModal
          onClose={() => setShowAccountSettings(false)}
          onDeleted={() => { setShowAccountSettings(false); signOut(); }}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {isLoggedIn && (
          <SessionSidebar
            sessions={savedSessions}
            activeSessionId={activeSessionId}
            onSelect={handleLoadSession}
            onDelete={handleDeleteSession}
            onNewSession={handleReset}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(prev => !prev)}
          />
        )}

      <main className="flex-1 max-w-4xl mx-auto px-2 mt-6 pb-6 overflow-y-auto w-full">
        {!isLoggedIn && step === 'input' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
            <span>访客模式：排盘 {Math.max(0, 3 - guestFortuneCount)}/3 次 · 追问 {Math.max(0, 1 - guestFollowUpCount)}/1 次</span>
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
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 mb-4">
            您的提问额度已用完，无法继续提问。
          </div>
        )}

        {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">{error}</div>}

        {/* Input Phase */}
        {step === 'input' && (
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-stone-200">
            
            {/* Categorized Model Selector */}
            <div className="mb-8 space-y-4">
               {/* 1. Divination Group */}
               <div>
                  <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span>🔮 占卜预测</span>
                    <span className="font-normal normal-case text-stone-300">- 求测具体事项吉凶 </span>
                  </div>
                  <div className="flex gap-2">
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
                        className={`flex-1 py-3 text-sm font-bold rounded-lg border transition-all ${isRecommended ? 'relative ring-2 ring-amber-400/70' : ''} ${
                          modelType === type 
                            ? 'bg-stone-800 text-amber-500 border-stone-800 shadow-md transform -translate-y-0.5' 
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-white hover:border-stone-300'
                        }`}
                      >
                        {label}
                        {isRecommended && (
                          <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow">
                            强力推荐
                          </span>
                        )}
                      </button>
                    );
                    })}
                  </div>
               </div>

               {/* 2. Destiny Group */}
               <div>
                  <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span>📜 命理运势</span>
                    <span className="font-normal normal-case text-stone-300">- 观测人生大运趋势 </span>
                  </div>
                  <div className="flex gap-2">
                    {[
                      [ModelType.BAZI, '四柱八字（盲派）'], 
                      [ModelType.ZIWEI, '紫微斗数']
                    ].map(([type, label]) => {
                      const isRecommended = recommendedModels.has(type as ModelType);
                      return (
                      <button
                        key={type}
                        onClick={() => handleModelChange(type as ModelType)}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg border transition-all ${isRecommended ? 'relative ring-2 ring-amber-400/70' : ''} ${
                          modelType === type 
                            ? 'bg-stone-800 text-amber-500 border-stone-800 shadow-md transform -translate-y-0.5' 
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-white hover:border-stone-300'
                        }`}
                      >
                        {label}
                        {isRecommended && (
                          <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow">
                            强力推荐【人生K线上新】
                          </span>
                        )}
                      </button>
                    );
                    })}
                  </div>
               </div>
            </div>

            {supportsKnowledge && (
              <div className="mb-6 flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
                <div>
                  <div className="text-sm font-bold text-stone-700">参考古籍</div>
                  <div className="text-xs text-stone-500">检索并参考知识库资料</div>
                </div>
                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={useKnowledge}
                    onChange={(event) => setUseKnowledge(event.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>{useKnowledge ? '已开启' : '已关闭'}</span>
                </label>
              </div>
            )}

            <div className="space-y-6 animate-fade-in border-t border-stone-100 pt-6">
              {/* Question (Divination) */}
              {!isLifeReading && (
                <div>
                  <label className="block text-stone-700 font-bold mb-2">所求何事</label>
                  <textarea 
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={modelType === ModelType.QIMEN ? "例如：这次面试能过吗？" : "例如：近期财运如何？"}
                    className="w-full border border-stone-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 outline-none min-h-[80px]"
                  />
                </div>
              )}

              {/* Question (Bazi Optional) */}
              {modelType === ModelType.BAZI && (
                <div>
                  <label className="block text-stone-700 font-bold mb-2">想咨询的问题 (可选)</label>
                  <textarea 
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="例如：事业发展方向如何？"
                    className="w-full border border-stone-300 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 outline-none min-h-[80px]"
                  />
                </div>
              )}

              {/* Name (Life Reading Only) */}
              {isLifeReading && (
                 <div>
                   <label className="block text-stone-700 font-bold mb-2">姓名 (可选)</label>
                   <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-stone-300 rounded p-2" placeholder="张三"/>
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
                      className="w-full border border-stone-300 rounded p-2" 
                      placeholder="例如: 1995"
                    />
                 </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* Gender */}
                <div>
                  <label className="block text-stone-700 font-bold mb-2">性别</label>
                  <div className="flex gap-4">
                    <button onClick={() => setGender(0)} className={`flex-1 py-2 rounded-lg border ${gender === 0 ? 'bg-stone-800 text-white' : 'bg-white text-stone-600'}`}>男 (乾)</button>
                    <button onClick={() => setGender(1)} className={`flex-1 py-2 rounded-lg border ${gender === 1 ? 'bg-stone-800 text-white' : 'bg-white text-stone-600'}`}>女 (坤)</button>
                  </div>
                </div>

                {/* Time Input for Standard Models (Qimen, Meihua, Bazi, Ziwei) */}
                {modelType !== ModelType.LIUYAO && (
                  <div>
                    <label className="block text-stone-700 font-bold mb-2">
                      {isLifeReading ? "出生时间 (阳历)" : "起卦时间"}
                    </label>
                    {!isLifeReading && (
                      <div className="flex gap-2 mb-2">
                        <button onClick={() => setTimeMode('now')} className={`flex-1 text-xs py-1 rounded border ${timeMode === 'now' ? 'bg-amber-100 text-amber-800' : 'bg-white'}`}>即时</button>
                        <button onClick={() => setTimeMode('custom')} className={`flex-1 text-xs py-1 rounded border ${timeMode === 'custom' ? 'bg-amber-100 text-amber-800' : 'bg-white'}`}>指定</button>
                      </div>
                    )}
                    {(timeMode === 'custom' || isLifeReading) && (
                      <input 
                        type="datetime-local" 
                        value={customDate} 
                        onChange={(e) => setCustomDate(e.target.value)} 
                        className="w-full border border-stone-300 rounded p-2"
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
                <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-bold text-stone-700">专业版设置</div>
                      <div className="text-xs text-stone-500">非专业人士请使用默认设置</div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        checked={qimenProEnabled}
                        onChange={(event) => setQimenProEnabled(event.target.checked)}
                        className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                      />
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
                          className="w-full border border-stone-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
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
                          className="w-full border border-stone-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
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
                            className="w-full border border-stone-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
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

              {/* --- LIU YAO SPECIFIC UI --- */}
              {modelType === ModelType.LIUYAO && (
                 <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100 mt-4">
                    <label className="block text-stone-700 font-bold mb-3">六爻起卦方式</label>
                    
                    {/* Mode Selector */}
                    <div className="flex flex-wrap gap-2 mb-4">
                       {[
                         [LiuyaoMode.AUTO, '时间起卦'],
                         [LiuyaoMode.CUSTOM_TIME, '指定时间'],
                         [LiuyaoMode.MANUAL, '手动摇卦'],
                         [LiuyaoMode.NUMBER, '数字起卦'],
                         [LiuyaoMode.DOUBLE_NUM, '双数起卦']
                       ].map(([m, l]) => (
                          <button 
                            key={m} 
                            onClick={() => setLiuyaoMode(m as LiuyaoMode)}
                            className={`px-3 py-1.5 text-xs rounded-full border ${liuyaoMode === m ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-stone-600 border-stone-200'}`}
                          >
                            {l}
                          </button>
                       ))}
                    </div>

                    {/* Dynamic Inputs */}
                    
                    {/* 1. Custom Time Input */}
                    {liuyaoMode === LiuyaoMode.CUSTOM_TIME && (
                       <div>
                         <label className="text-xs text-stone-500 block mb-1">选择时间</label>
                         <input 
                          type="datetime-local" 
                          value={customDate} 
                          onChange={(e) => setCustomDate(e.target.value)} 
                          className="w-full border border-stone-300 rounded p-2 text-sm"
                        />
                       </div>
                    )}

                    {/* 2. Manual Lines Generator */}
                    {liuyaoMode === LiuyaoMode.MANUAL && (
                       <div className="space-y-2">
                          <p className="text-xs text-stone-500 mb-2">点击爻位切换状态 (初爻在下，六爻在上)</p>
                          <div className="flex flex-col-reverse gap-2 bg-white p-3 rounded border border-stone-200">
                             {manualLines.map((val, idx) => (
                                <div key={idx} onClick={() => toggleLine(idx)} className="flex items-center gap-3 cursor-pointer hover:bg-stone-50 p-1 rounded">
                                   <span className="text-xs text-stone-400 w-8">{(idx === 0) ? '初爻' : (idx === 5) ? '六爻' : `${idx+1}爻`}</span>
                                   <div className="flex-1 h-6 flex items-center justify-center relative">
                                      {/* Visual Representation */}
                                      {[1, 3].includes(val) ? (
                                        <div className={`w-full h-2 ${val === 3 ? 'bg-red-500 animate-pulse' : 'bg-stone-800'}`}></div> // Yang
                                      ) : (
                                        <div className="w-full flex justify-between">
                                           <div className={`w-[40%] h-2 ${val === 2 ? 'bg-red-500 animate-pulse' : 'bg-stone-800'}`}></div>
                                           <div className={`w-[40%] h-2 ${val === 2 ? 'bg-red-500 animate-pulse' : 'bg-stone-800'}`}></div>
                                        </div> // Yin
                                      )}
                                      {/* Marker for moving lines */}
                                      {[2, 3].includes(val) && <span className="absolute right-0 text-red-500 text-[10px]">●</span>}
                                   </div>
                                   <span className="text-xs w-12 text-right font-mono">{getLineLabel(val)}</span>
                                </div>
                             ))}
                          </div>
                       </div>
                    )}

                    {/* 3. Number Inputs */}
                    {(liuyaoMode === LiuyaoMode.NUMBER || liuyaoMode === LiuyaoMode.SINGLE_NUM) && (
                       <div>
                          <label className="text-xs text-stone-500 block mb-1">输入数字</label>
                          <input 
                            type="number" value={lyNum} onChange={e => setLyNum(e.target.value)}
                            placeholder="例如: 369" className="w-full border border-stone-300 rounded p-2"
                          />
                       </div>
                    )}
                    {liuyaoMode === LiuyaoMode.DOUBLE_NUM && (
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-stone-500 block mb-1">上卦数</label>
                            <input type="number" value={lyNumUp} onChange={e => setLyNumUp(e.target.value)} placeholder="例: 3" className="w-full border border-stone-300 rounded p-2"/>
                          </div>
                          <div>
                            <label className="text-xs text-stone-500 block mb-1">下卦数</label>
                            <input type="number" value={lyNumDown} onChange={e => setLyNumDown(e.target.value)} placeholder="例: 8" className="w-full border border-stone-300 rounded p-2"/>
                          </div>
                       </div>
                    )}

                    {/* Add Time Toggle (For Numbers) */}
                    {[LiuyaoMode.NUMBER, LiuyaoMode.SINGLE_NUM, LiuyaoMode.DOUBLE_NUM].includes(liuyaoMode) && (
                       <div className="mt-3 flex items-center gap-2">
                          <input type="checkbox" id="yaoTime" checked={yaoAddTime} onChange={e => setYaoAddTime(e.target.checked)} />
                          <label htmlFor="yaoTime" className="text-sm text-stone-600">加时辰起动爻</label>
                       </div>
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
                className="w-full bg-stone-900 hover:bg-stone-800 text-amber-500 font-bold py-4 rounded-lg shadow-md mt-4 flex justify-center items-center gap-2"
              >
                {loading ? <Spinner /> : '开始排盘'}
              </button>
            </div>
          </div>
        )}

        {/* Result Phase */}
        {step === 'chart' && chartData && (
          <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow border border-stone-200">
               <span className="font-bold text-stone-700">
                {modelType === ModelType.QIMEN ? '奇门排盘' : 
                 modelType === ModelType.BAZI ? '八字命盘' : 
                 modelType === ModelType.ZIWEI ? '紫微斗数' : 
                 modelType === ModelType.MEIHUA ? '梅花易数' : '六爻纳甲'}
               </span>
               <button onClick={handleReset} className="text-sm text-stone-500 hover:text-stone-800 underline">重置 / 返回</button>
            </div>

            {/* Visualization Components */}
            {modelType === ModelType.QIMEN && <QimenGrid data={chartData} />}
            {modelType === ModelType.BAZI && <BaziGrid data={chartData} />}
            {modelType === ModelType.ZIWEI && <ZiweiGrid data={chartData} />}
            {modelType === ModelType.MEIHUA && <MeihuaGrid data={chartData} />}
            {modelType === ModelType.LIUYAO && <LiuyaoGrid data={chartData} />}

            {/* Chat */}
            <div className="bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden flex flex-col h-[600px]">
               <div className="bg-stone-100 px-4 py-3 border-b border-stone-200 flex justify-between items-center">
                 <h3 className="font-bold text-stone-700 flex items-center gap-2"><span>🔮</span> 大师解读</h3>
                 <button
                   onClick={handleGenerateReport}
                   disabled={!chatHistory.length || isTyping}
                   title={
                     !chatHistory.length
                       ? '暂无对话内容'
                       : isTyping
                         ? 'AI 正在输出，请稍候'
                         : '生成对话报告（可保存为 PDF）'
                   }
                   className={`flex items-center gap-2 text-sm font-medium ${
                     !chatHistory.length || isTyping
                       ? 'text-stone-300 cursor-not-allowed'
                       : 'text-stone-500 hover:text-stone-800'
                   }`}
                 >
                   <ReportIcon />
                   生成报告
                 </button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#f9fafb]">
                 {chatHistory.map((msg) => {
                   const parsed = msg.role === 'model' ? parseModelContent(msg.content) : null;
                   const copyText = msg.role === 'model' && parsed ? parsed.answer : msg.content;
                   return (
                   <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[90%] rounded-lg p-4 shadow-sm relative ${msg.role === 'user' ? 'bg-stone-800 text-white' : 'bg-white border border-stone-100 text-stone-800'}`}>
                        {msg.role === 'model' && (
                          <button
                            type="button"
                            onClick={async () => {
                              await handleCopyText(copyText);
                              setCopiedMessageId(msg.id);
                              window.setTimeout(() => {
                                setCopiedMessageId((current) => (current === msg.id ? null : current));
                              }, 1200);
                            }}
                            className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full border transition border-stone-200 text-stone-500 hover:text-stone-700 hover:border-stone-300"
                          >
                            {copiedMessageId === msg.id ? '已复制' : '复制'}
                          </button>
                        )}
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
                     </div>
                   </div>
                 )})}
                 {isTyping && <div className="text-stone-400 text-sm p-4 animate-pulse">大师正在思考...</div>}
                 <div ref={chatEndRef} />
               </div>
               <div className="p-4 bg-white border-t border-stone-200 flex gap-2">
                 <input
                   type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                   placeholder={isKlineRunning ? "K线运行中，暂不可发送" : (isLoggedIn && userQuota !== null && userQuota <= 0) ? "额度已用完" : (!isLoggedIn && guestFollowUpCount >= 1) ? "访客追问次数已用完，请登录" : "追问..."} disabled={isTyping || isKlineRunning || (isLoggedIn && userQuota !== null && userQuota <= 0)}
                   className="flex-1 border border-stone-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none"
                 />
                 <button onClick={handleSendMessage} disabled={isTyping || isKlineRunning || !inputMessage.trim() || (isLoggedIn && userQuota !== null && userQuota <= 0)} className="bg-stone-900 text-amber-500 p-2 rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:hover:bg-stone-900"><SendIcon /></button>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>{/* end flex wrapper */}

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
            className={`relative h-14 w-14 rounded-full border-2 font-bold transition cursor-grab active:cursor-grabbing ${
              isTyping
                ? 'bg-stone-200 text-stone-400 border-stone-200 cursor-not-allowed'
                : 'bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-400 text-stone-900 border-yellow-100 shadow-2xl hover:scale-105'
            }`}
          >
            <span className="absolute inset-0 rounded-full ring-2 ring-yellow-100/70 animate-pulse"></span>
            <span className="relative z-10">K线</span>
          </button>
          {isTyping && (
            <div className="mt-2 text-[10px] text-stone-400 text-center">请等待ai运行完毕</div>
          )}
        </div>
      )}

      {/* K线弹窗 */}
      {klineModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-6xl max-h-[90vh] rounded-3xl bg-white shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-stone-100 bg-stone-50/60">
              <div>
                <div className="text-sm font-bold text-stone-800">人生K线</div>
                <div className="text-[11px] text-stone-500">四柱八字运势曲线（仅供娱乐）</div>
              </div>
              <div className="flex items-center gap-2">
                {klineResult && (
                  <button
                    type="button"
                    onClick={handleSaveKline}
                    className="text-xs px-3 py-1 rounded-full border border-stone-200 text-stone-600 hover:text-stone-800 hover:border-stone-300"
                  >
                    保存到本地
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setKlineModalOpen(false)}
                  className="text-xs px-3 py-1 rounded-full border border-stone-200 text-stone-500 hover:text-stone-700 hover:border-stone-300"
                >
                  关闭
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto">
              {klineStatus === 'idle' && !klineResult && (
                <div className="rounded-3xl border-2 border-dashed border-amber-100 bg-amber-50/50 h-[360px] flex flex-col items-center justify-center text-stone-500 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-100/70 text-amber-700 flex items-center justify-center">
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
                    onClick={handleRunKline}
                    className="text-xs px-4 py-2 rounded-full bg-stone-900 text-amber-400 hover:bg-stone-800"
                  >
                    推求K线
                  </button>
                </div>
              )}

              {klineStatus === 'analyzing' && (
                <div className="h-[360px] flex flex-col items-center justify-center text-stone-600 space-y-4">
                  <div className="flex items-center gap-3 text-lg font-semibold">
                    <span className="inline-flex h-6 w-6 animate-spin rounded-full border-2 border-amber-500/40 border-t-amber-600"></span>
                    AI正在分析，请勿刷新界面……
                  </div>
                  <div className="text-xs text-stone-400">
                    正在推演第 {Math.min(70, Math.max(0, klineYearProgress))} 年 / 70 年
                  </div>
                  <div className="w-full max-w-md h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-2 bg-amber-400 transition-all"
                      style={{ width: `${klineProgress}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-stone-400">分析时间约 3～5 分钟，卡顿属于正常现象，请耐心等待～</div>
                </div>
              )}

              {klineStatus === 'error' && (
                <div className="h-[360px] flex flex-col items-center justify-center text-red-600">
                  <div className="text-sm font-semibold mb-2">K线分析失败</div>
                  <div className="text-xs text-red-500">{klineError}</div>
                  <button
                    type="button"
                    onClick={handleRunKline}
                    className="mt-4 text-xs px-3 py-1 rounded-full border border-red-200 text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    重新分析
                  </button>
                </div>
              )}

              {klineStatus === 'ready' && klineResult && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-100 bg-stone-50/60 px-4 py-3">
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
                    <label className={`flex items-center gap-2 cursor-pointer rounded-full border px-3 py-1 ${klineSeries.overall ? 'border-amber-200 bg-amber-50 text-stone-700' : 'border-stone-200 bg-white'}`}>
                      <input
                        type="checkbox"
                        checked={klineSeries.overall}
                        onChange={(e) => setKlineSeries((prev) => ({ ...prev, overall: e.target.checked }))}
                        className="h-3.5 w-3.5 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-stone-700">总体趋势</span>
                      <span className="inline-block h-2 w-6 rounded-full bg-amber-700"></span>
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer rounded-full border px-3 py-1 ${klineSeries.wealth ? 'border-amber-200 bg-amber-50 text-stone-700' : 'border-stone-200 bg-white'}`}>
                      <input
                        type="checkbox"
                        checked={klineSeries.wealth}
                        onChange={(e) => setKlineSeries((prev) => ({ ...prev, wealth: e.target.checked }))}
                        className="h-3.5 w-3.5 rounded border-stone-300 text-yellow-500 focus:ring-yellow-500"
                      />
                      <span>财富</span>
                      <span className="inline-block h-2 w-6 rounded-full bg-yellow-500"></span>
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer rounded-full border px-3 py-1 ${klineSeries.love ? 'border-amber-200 bg-amber-50 text-stone-700' : 'border-stone-200 bg-white'}`}>
                      <input
                        type="checkbox"
                        checked={klineSeries.love}
                        onChange={(e) => setKlineSeries((prev) => ({ ...prev, love: e.target.checked }))}
                        className="h-3.5 w-3.5 rounded border-stone-300 text-pink-400 focus:ring-pink-400"
                      />
                      <span>感情</span>
                      <span className="inline-block h-2 w-6 rounded-full bg-pink-400"></span>
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer rounded-full border px-3 py-1 ${klineSeries.career ? 'border-amber-200 bg-amber-50 text-stone-700' : 'border-stone-200 bg-white'}`}>
                      <input
                        type="checkbox"
                        checked={klineSeries.career}
                        onChange={(e) => setKlineSeries((prev) => ({ ...prev, career: e.target.checked }))}
                        className="h-3.5 w-3.5 rounded border-stone-300 text-blue-500 focus:ring-blue-500"
                      />
                      <span>事业</span>
                      <span className="inline-block h-2 w-6 rounded-full bg-blue-500"></span>
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer rounded-full border px-3 py-1 ${klineSeries.health ? 'border-amber-200 bg-amber-50 text-stone-700' : 'border-stone-200 bg-white'}`}>
                      <input
                        type="checkbox"
                        checked={klineSeries.health}
                        onChange={(e) => setKlineSeries((prev) => ({ ...prev, health: e.target.checked }))}
                        className="h-3.5 w-3.5 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
                      />
                      <span>健康</span>
                      <span className="inline-block h-2 w-6 rounded-full bg-emerald-700"></span>
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-stone-100 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] overflow-hidden">
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
                          <svg width={width} height={height} className="bg-white">
                            {/* Y axis grid */}
                            {[0, 20, 40, 60, 80, 100].map((tick) => (
                              <g key={tick}>
                                <line
                                  x1={padding.left}
                                  y1={yScale(tick)}
                                  x2={width - padding.right}
                                  y2={yScale(tick)}
                                  stroke="#f1f5f9"
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
                              stroke="#e2e8f0"
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
                                    fill="#fffbeb"
                                    stroke="#fde68a"
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

                  <div className="rounded-2xl border border-stone-100 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-4">
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
                          <div className="relative rounded-2xl border border-stone-100 bg-stone-50 px-4 py-6">
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
                              <div className="h-20 w-20 rounded-full border-2 border-emerald-100 bg-white shadow-lg shadow-emerald-50 flex flex-col items-center justify-center">
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
                            <div className="rounded-2xl border border-stone-100 bg-white p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-bold text-stone-800">流年透视</div>
                                  <div className="text-[11px] text-stone-500">YEARLY INSIGHT</div>
                                </div>
                                <div className="text-xl font-bold text-stone-800">
                                  {liunianItem.year}
                                </div>
                              </div>
                              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm font-bold text-stone-800">
                                {liunianItem.tag}
                              </div>
                              {renderScoreOverview(liunianItem.scores)}
                            </div>

                            <div className="rounded-2xl border border-stone-100 bg-white p-4 space-y-3">
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
                                    <div className="rounded-2xl border border-stone-100 bg-stone-50 px-3 py-2">
                                      <div className="text-[10px] text-stone-500">大运关键词</div>
                                      <div className="text-sm font-bold text-stone-800">{relatedDayun.tag}</div>
                                    </div>
                                    <div className="rounded-2xl border border-stone-100 bg-stone-50 px-3 py-2">
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
                          <div className="rounded-2xl border border-stone-100 bg-white p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-bold text-stone-800">十年趋势细节</div>
                                <div className="text-[11px] text-stone-500">DECADE TREND</div>
                              </div>
                              <div className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                                {dayunItem.start_year}-{dayunItem.end_year}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3">
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

                          <div className="rounded-2xl border border-stone-100 bg-white p-4 space-y-3">
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
                              <div className="rounded-2xl border border-stone-100 bg-stone-50 px-3 py-2">
                                <div className="text-[10px] text-stone-500">大运关键词</div>
                                <div className="text-sm font-bold text-stone-800">{dayunItem.tag}</div>
                              </div>
                              <div className="rounded-2xl border border-stone-100 bg-stone-50 px-3 py-2">
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
