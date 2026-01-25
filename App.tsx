
'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import updates from './data/updates.json';

// Services
import { 
  fetchQimen, fetchBazi, fetchZiwei, fetchMeihua, fetchLiuyao,
  formatQimenPrompt, formatBaziPrompt, formatZiweiPrompt, formatMeihuaPrompt, formatLiuyaoPrompt 
} from './services/apiService';
import { startQimenChat, sendMessageToDeepseekStream, clearChatSession } from './services/deepseekService';

// Types
import { ModelType, LiuyaoMode, BaziResponse } from './types';

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

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const getGanzhiYear = (year: number) => {
  const baseYear = 1984; // 1984 is 甲子
  const offset = ((year - baseYear) % 60 + 60) % 60;
  const stem = STEMS[offset % 10];
  const branch = BRANCHES[offset % 12];
  return `${stem}${branch}`;
};

const App: React.FC = () => {
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [useKnowledge, setUseKnowledge] = useState(true);
  const [showUpdates, setShowUpdates] = useState(false);
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

  const updateChatMessage = (id: string, content: string) => {
    setChatHistory(prev =>
      prev.map(msg => (msg.id === id ? { ...msg, content } : msg))
    );
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
      const contentHtml = escapeHtml(displayText).replace(/\n/g, '<br/>');
      const reasoningHtml = reasoningText ? escapeHtml(reasoningText).replace(/\n/g, '<br/>') : '';

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

    if ('srcdoc' in frame) {
      frame.srcdoc = reportHtml;
    } else if (frame.contentWindow) {
      frame.contentWindow.document.open();
      frame.contentWindow.document.write(reportHtml);
      frame.contentWindow.document.close();
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
    // Optionally keep name/city for UX
  };

  const handleCalculate = async () => {
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
            "2. 核心分析：寻找做功方式 请根据以下逻辑分析八字的能量耗散与效率： 日干意向：日干有无合（合财/官）、有无生（生食伤），这是日干追求目标的体现 。 主位动作：日支是否参与刑、冲、克、穿、合、墓。若日支不做功，再看有无禄神和比劫做功 。 成党成势：分析干支是否成党，成功者往往有势，通过强方制掉弱方来做功 。 做功类型：判定是制用、化用、生用还是合用结构 。",
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
      updateChatMessage(modelId, buildModelContent(finalState.reasoning, finalAnswer));
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
      "你是精通盲派八字的大师，现在需要作为“人生K线”评分引擎。",
      "以下给出完整排盘信息与前序分析，请你严格依据前序分析中的做功逻辑、干支关系细节、体用宾主等标准进行评分。",
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
      "1) 对每一个大运（共8步，从第一步大运开始依次到第八步）给出“财运/事业/爱情/健康”四项评分，满分10分。",
      "2) 对每一个流年（共80个）给出同样四项评分，满分10分。",
      "3) 先给大运打分，严格依据前文分析的做功逻辑（功神、废神、贼神、捕神）、干支关系等盲派理论。",
      "4) 再给流年打分，遵守：好大运里的好流年会更好；好大运里的坏流年也不会特别坏；正常大运里的好坏流年都正常；坏大运里的好流年也不会特别好；坏大运里的坏流年会更坏。",
      "5) 总体打分在尊重事实的情况下，稍微宽松一些，给用户一定情绪价值。",
      "6) 每一个大运/流年生成一个四字左右的主线tag，避免使用专业八字术语，使用通俗易懂的表达。",
      "7) 输出必须是严格JSON，不得包含Markdown，不得包含多余说明。",
      "8) 按年份顺序输出liunian数组，逐年输出对象，不要省略或合并。",
      "9) 使用如下模板（字段名必须一致）：",
      "",
      "{",
      "  \"schema_version\": \"kline_v1\",",
      "  \"dayun\": [",
      "    {\"name\":\"甲子\",\"start_year\":1990,\"end_year\":1999,\"scores\":{\"wealth\":7,\"career\":6,\"love\":5,\"health\":8},\"tag\":\"事业起势\"}",
      "  ],",
      "  \"liunian\": [",
      "    {\"year\":1990,\"scores\":{\"wealth\":6,\"career\":6,\"love\":5,\"health\":7},\"tag\":\"稳中求进\"}",
      "  ]",
      "}",
      "",
      "请确保dayun长度为8，liunian长度为80，年份与大运范围一致。",
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

  const persistKlineResult = (result: KlineResult) => {
    if (modelType !== ModelType.BAZI || !chartData) return;
    const key = getKlineStorageKey(chartData as BaziResponse);
    localStorage.setItem(key, JSON.stringify(result));
  };

  const handleRunKline = async () => {
    if (modelType !== ModelType.BAZI || !chartData) return;
    if (klineStatus === 'analyzing') return;
    setKlineStatus('analyzing');
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
        const count = Math.min(80, years.size);
        if (count !== klineYearProgressRef.current) {
          klineYearProgressRef.current = count;
          setKlineYearProgress(count);
          setKlineProgress(Math.min(99, Math.round((count / 80) * 100)));
        }
      }, undefined, 'deepseek-chat');
      const parsed = parseKlineResult(finalState.content);
      setKlineResult(parsed);
      setKlineProgress(100);
      setKlineYearProgress(80);
      klineYearProgressRef.current = 80;
      setKlineStatus('ready');
      persistKlineResult(parsed);
    } catch (err: any) {
      setKlineStatus('error');
      setKlineError(err.message || 'K线分析失败，请稍后重试');
      setKlineProgress(0);
      setKlineYearProgress(0);
      klineYearProgressRef.current = 0;
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

  return (
    <div className="min-h-screen pb-6 bg-[#fcfcfc] text-stone-800 font-serif">
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

      <main className="max-w-4xl mx-auto px-2 mt-6">
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
                            强力推荐
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
                   placeholder="追问..." disabled={isTyping}
                   className="flex-1 border border-stone-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none"
                 />
                 <button onClick={handleSendMessage} disabled={isTyping || !inputMessage.trim()} className="bg-stone-900 text-amber-500 p-2 rounded-lg hover:bg-stone-800"><SendIcon /></button>
               </div>
            </div>
          </div>
        )}
      </main>

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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100 bg-stone-50">
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

            <div className="p-5">
              {klineStatus === 'idle' && !klineResult && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 text-sm text-stone-700">
                    <div className="font-bold text-stone-800 mb-2">什么是“人生K线”？</div>
                    <div className="text-xs leading-relaxed text-stone-600">
                      基于你的四柱八字盘和已完成的AI解读，进一步对八个大运与八十个流年进行“财运 / 事业 / 爱情 / 健康”评分与主线标签总结，并绘制人生运势曲线。
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleRunKline}
                      className="text-xs px-4 py-2 rounded-full bg-stone-900 text-amber-400 hover:bg-stone-800"
                    >
                      推求K线
                    </button>
                  </div>
                </div>
              )}

              {klineStatus === 'analyzing' && (
                <div className="h-[360px] flex flex-col items-center justify-center text-stone-600 space-y-4">
                  <div className="flex items-center gap-3 text-lg font-semibold">
                    <span className="inline-flex h-6 w-6 animate-spin rounded-full border-2 border-amber-500/40 border-t-amber-600"></span>
                    AI正在分析，请勿退出界面……
                  </div>
                  <div className="text-xs text-stone-400">
                    正在推演第 {Math.min(80, Math.max(0, klineYearProgress))} 年 / 80 年
                  </div>
                  <div className="w-full max-w-md h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-2 bg-amber-400 transition-all"
                      style={{ width: `${klineProgress}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-stone-400">大约 8 步大运 + 80 年流年</div>
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-stone-500">横坐标为年份，纵坐标为分数（0-10）</div>
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <span>缩放</span>
                      <input
                        type="range"
                        min={0.6}
                        max={2}
                        step={0.1}
                        value={klineZoom}
                        onChange={(e) => setKlineZoom(parseFloat(e.target.value))}
                      />
                    </div>
                  </div>

                  {(() => {
                    const liunianSorted = [...klineResult.liunian].sort((a, b) => a.year - b.year).slice(0, 80);
                    const dayunSorted = [...klineResult.dayun].sort((a, b) => a.start_year - b.start_year).slice(0, 8);
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
                      padding.top + (10 - Math.min(10, Math.max(0, score))) / 10 * chartHeight;
                    const xScale = (year: number) =>
                      padding.left + (year - minYear) * yearWidth + yearWidth / 2;
                    const linePoints = liunianSorted
                      .map((item) => {
                        const avg = scoreAverage(item.scores);
                        return `${xScale(item.year)},${yScale(avg)}`;
                      })
                      .join(' ');
                    return (
                      <div className="border border-stone-100 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <svg width={width} height={height} className="bg-white">
                            {/* Y axis grid */}
                            {[0, 2, 4, 6, 8, 10].map((tick) => (
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

                            {/* Liunian line */}
                            <polyline
                              points={linePoints}
                              fill="none"
                              stroke="#b45309"
                              strokeWidth="2"
                            />
                            {liunianSorted.map((item, idx) => {
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
                        </div>
                      </div>
                    );
                  })()}

                  <div className="rounded-lg border border-stone-100 bg-stone-50 p-4 text-xs text-stone-600">
                    {!klineSelected && <div>点击大运柱或流年点，可查看单项评分。</div>}
                    {klineSelected && klineResult && (() => {
                      const item = klineSelected.kind === 'dayun'
                        ? klineResult.dayun.find((entry) => entry.start_year === klineSelected.start_year)
                        : klineResult.liunian.find((entry) => entry.year === klineSelected.year);
                      if (!item) return <div>未找到对应年份数据。</div>;
                      const title = klineSelected.kind === 'dayun'
                        ? `${(item as KlineDayunItem).name} ${(item as KlineDayunItem).start_year}-${(item as KlineDayunItem).end_year}`
                        : `${(item as KlineLiunianItem).year} (${getGanzhiYear((item as KlineLiunianItem).year)})`;
                      const scores = item.scores;
                      return (
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-stone-700">{title}</div>
                          <div>主线：{item.tag}</div>
                          <div>财运：{scores.wealth} / 事业：{scores.career} / 爱情：{scores.love} / 健康：{scores.health}</div>
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
