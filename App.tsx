
'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Services
import { 
  fetchQimen, fetchBazi, fetchZiwei, fetchMeihua, fetchLiuyao,
  formatQimenPrompt, formatBaziPrompt, formatZiweiPrompt, formatMeihuaPrompt, formatLiuyaoPrompt 
} from './services/apiService';
import { startQimenChat, sendMessageToDeepseek, clearChatSession } from './services/deepseekService';

// Types
import { ModelType, LiuyaoMode } from './types';

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
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>);

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  // --- Reset when model changes ---
  const handleModelChange = (type: ModelType) => {
    setModelType(type);
    handleReset();
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

      // --- API Calls & Prompt Gen ---
      switch (modelType) {
        case ModelType.QIMEN:
          resultData = await fetchQimen({ ...baseParams, question });
          prompt = formatQimenPrompt(resultData, question);
          systemInstruction = "你是精通奇门遁甲的大师。请基于排盘，用通俗专业语言解答用户疑惑。关注用神、时令、吉凶。";
          break;
        case ModelType.BAZI:
          resultData = await fetchBazi(baseParams);
          prompt = formatBaziPrompt(resultData);
          systemInstruction = "你是资深八字命理师。请基于八字命盘，分析命造格局、性格、运势。语气温和客观。";
          break;
        case ModelType.ZIWEI:
          resultData = await fetchZiwei(baseParams);
          prompt = formatZiweiPrompt(resultData);
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
      const userContent = (modelType === ModelType.BAZI || modelType === ModelType.ZIWEI) 
        ? `请分析我的命盘: ${baseParams.year}年${baseParams.month}月...` 
        : `问题: ${question}`;

      setChatHistory([{ id: 'init-u', role: 'user', content: userContent, timestamp: new Date() }]);
      setIsTyping(true);
      
      const response = await sendMessageToDeepseek(prompt);
      
      setChatHistory(prev => [...prev, {
        id: 'init-m', role: 'model', content: response, timestamp: new Date()
      }]);

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
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: inputMessage, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const responseText = await sendMessageToDeepseek(inputMessage);
      setChatHistory(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', content: responseText, timestamp: new Date() }]);
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

  // --- Render Helpers ---
  const isLifeReading = modelType === ModelType.BAZI || modelType === ModelType.ZIWEI;
  // Only Bazi and Ziwei use location for True Solar Time
  const showLocation = modelType === ModelType.BAZI || modelType === ModelType.ZIWEI;
  const showBornYear = modelType === ModelType.MEIHUA || modelType === ModelType.LIUYAO;

  return (
    <div className="min-h-screen pb-6 bg-[#fcfcfc] text-stone-800 font-serif">
      {/* Header */}
      <header className="bg-stone-900 text-stone-100 py-4 px-4 shadow-lg border-b-4 border-amber-700 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold tracking-wider">元分 · 智解</h1>
          <div className="text-[10px] bg-stone-800 px-2 py-1 rounded text-stone-400">DeepSeek R1 Powered</div>
        </div>
      </header>

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
                    <span className="font-normal normal-case text-stone-300">- 求测具体事项吉凶 (Divination)</span>
                  </div>
                  <div className="flex gap-2">
                    {[
                      [ModelType.QIMEN, '奇门遁甲'], 
                      [ModelType.MEIHUA, '梅花易数'],
                      [ModelType.LIUYAO, '六爻纳甲']
                    ].map(([type, label]) => (
                      <button
                        key={type}
                        onClick={() => handleModelChange(type as ModelType)}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg border transition-all ${
                          modelType === type 
                            ? 'bg-stone-800 text-amber-500 border-stone-800 shadow-md transform -translate-y-0.5' 
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-white hover:border-stone-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
               </div>

               {/* 2. Destiny Group */}
               <div>
                  <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span>📜 命理运势</span>
                    <span className="font-normal normal-case text-stone-300">- 观测人生大运趋势 (Destiny)</span>
                  </div>
                  <div className="flex gap-2">
                    {[
                      [ModelType.BAZI, '四柱八字'], 
                      [ModelType.ZIWEI, '紫微斗数']
                    ].map(([type, label]) => (
                      <button
                        key={type}
                        onClick={() => handleModelChange(type as ModelType)}
                        className={`flex-1 py-3 text-sm font-bold rounded-lg border transition-all ${
                          modelType === type 
                            ? 'bg-stone-800 text-amber-500 border-stone-800 shadow-md transform -translate-y-0.5' 
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-white hover:border-stone-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
               </div>
            </div>

            <div className="space-y-6 animate-fade-in border-t border-stone-100 pt-6">
              {/* Question (Divination Only) */}
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
                    {timeMode === 'now' && !isLifeReading && (
                      <div className="text-stone-400 text-sm italic py-2">使用当前时间起卦</div>
                    )}
                  </div>
                )}
              </div>

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
                 <button onClick={() => setChatHistory([])} className="text-stone-400 hover:text-red-500"><TrashIcon /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#f9fafb]">
                 {chatHistory.map((msg) => (
                   <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[90%] rounded-lg p-4 shadow-sm ${msg.role === 'user' ? 'bg-stone-800 text-white' : 'bg-white border border-stone-100 text-stone-800'}`}>
                        <div className="markdown-body text-sm leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                     </div>
                   </div>
                 ))}
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
    </div>
  );
};

export default App;
