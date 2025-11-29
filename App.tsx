import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from './components/GlassCard';
import { ActionItem } from './components/ActionItem';
import { InsertZone } from './components/InsertZone';
import { MacroVisualizer } from './components/MacroVisualizer';
import { Macro, ActionType, MacroAction, LoopMode } from './types';
import { generateMacroFromPrompt } from './services/geminiService';
import { 
  Plus, 
  Play, 
  Bot, 
  Download, 
  Settings2, 
  AlertCircle,
  Cpu,
  Zap,
  X,
  StopCircle,
  Eye,
  Copy,
  ClipboardPaste,
  Trash2,
  Sparkles,
  Command,
  Share,
  MoreHorizontal,
  ChevronDown
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'lumina_macro_config';

const DEFAULT_MACRO: Macro = {
  id: 'default-1',
  name: '新建宏配置',
  triggerKey: 'f1',
  loopMode: LoopMode.ONCE,
  actions: [],
  releaseActions: []
};

// Simulated AI steps for visual feedback
const AI_STEPS = [
  "正在理解您的需求...",
  "分析按下与松开逻辑...",
  "生成时间轴序列...",
  "处理松开时的清理动作...",
  "优化动作间隔...",
  "即将完成配置..."
];

function App() {
  const [macros, setMacros] = useState<Macro[]>([]);
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null);
  
  // 'main' or 'release' view
  const [editView, setEditView] = useState<'main' | 'release'>('main');
  
  // AI Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStepIndex, setAiStepIndex] = useState(0);
  const [aiError, setAiError] = useState<string | null>(null);

  // Visualization State
  const [showVisualizer, setShowVisualizer] = useState(false);

  // Manual Import State (Fallback)
  const [showManualImport, setShowManualImport] = useState(false);
  const [manualImportJson, setManualImportJson] = useState('');

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: Ensure releaseActions exists
        const migrated = parsed.map((m: any) => ({
          ...m,
          releaseActions: m.releaseActions || []
        }));
        setMacros(migrated);
        if (migrated.length > 0) setSelectedMacroId(migrated[0].id);
      } catch (e) {
        console.error("Failed to parse saved macros", e);
        setMacros([DEFAULT_MACRO]);
        setSelectedMacroId(DEFAULT_MACRO.id);
      }
    } else {
      setMacros([DEFAULT_MACRO]);
      setSelectedMacroId(DEFAULT_MACRO.id);
    }
  }, []);

  const selectedMacro = macros.find(m => m.id === selectedMacroId);
  const currentActionList = selectedMacro ? (editView === 'main' ? selectedMacro.actions : selectedMacro.releaseActions) : [];

  // Auto-save effect
  useEffect(() => {
    if (macros.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(macros));
    }
  }, [macros]);

  const handleDownloadConfig = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(macros, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "macro_config.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleCopyConfig = () => {
    const json = JSON.stringify(macros, null, 2);
    navigator.clipboard.writeText(json).then(() => {
        alert("配置 JSON 已复制到剪贴板！\n请粘贴到 macro_config.json 文件中。");
    }).catch(err => {
        alert("复制失败，请手动导出。");
    });
  };

  const processImport = (jsonString: string) => {
      if (!jsonString || !jsonString.trim()) {
        alert("内容为空！");
        return;
      }
      
      let parsed;
      try {
        parsed = JSON.parse(jsonString);
      } catch (e) {
        alert("导入失败：内容不是有效的 JSON 格式。");
        return;
      }
      
      if (!Array.isArray(parsed)) {
        alert("JSON 格式错误：根节点必须是数组 (Macro[])");
        return;
      }

      try {
        const validatedMacros: Macro[] = parsed.map((m: any, idx: number) => {
          if (!m.id || !m.name || !m.triggerKey || !Array.isArray(m.actions)) {
             throw new Error(`第 ${idx + 1} 个宏配置缺少必要字段 (id, name, triggerKey, actions)`);
          }
          return {
            ...m,
            releaseActions: Array.isArray(m.releaseActions) ? m.releaseActions : [] 
          };
        });

        setMacros(validatedMacros);
        if (validatedMacros.length > 0) {
          setSelectedMacroId(validatedMacros[0].id);
        }
        
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(validatedMacros));
        
        alert(`成功导入 ${validatedMacros.length} 个宏配置！`);
        setShowManualImport(false);
        setManualImportJson('');
      } catch (e: any) {
        alert(`导入数据校验失败: ${e.message}`);
      }
  };

  const handleImportFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      processImport(clipboardText);
    } catch (e) {
      console.warn("Clipboard read failed, falling back to manual input", e);
      setShowManualImport(true);
    }
  };

  const addMacro = () => {
    const newMacro = { 
      ...DEFAULT_MACRO, 
      id: Math.random().toString(36).substr(2, 9),
      name: `宏配置 ${macros.length + 1}`,
      releaseActions: []
    };
    const newMacros = [...macros, newMacro];
    setMacros(newMacros);
    setSelectedMacroId(newMacro.id);
    setEditView('main');
  };

  const deleteMacro = (id: string) => {
    const newMacros = macros.filter(m => m.id !== id);
    setMacros(newMacros);
    
    if (selectedMacroId === id) {
       if (newMacros.length > 0) {
         setSelectedMacroId(newMacros[0].id);
       } else {
         setSelectedMacroId(null);
       }
    }

    if (newMacros.length === 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
    }
  };

  const updateMacro = (id: string, updates: Partial<Macro>) => {
    const newMacros = macros.map(m => m.id === id ? { ...m, ...updates } : m);
    setMacros(newMacros);
  };

  const createNewAction = (type: ActionType): MacroAction => ({
      id: Math.random().toString(36).substr(2, 9),
      type,
      button: 'left',
      actionState: 'click',
      duration: 100,
      x: 0, 
      y: 0,
      absolute: false,
      key: '',
      scrollAmount: type === ActionType.SCROLL ? 1 : 0
  });

  // Insert Action at specific index
  const insertActionAt = (index: number, type: ActionType) => {
    if (!selectedMacroId) return;
    const macro = macros.find(m => m.id === selectedMacroId);
    if (!macro) return;
    
    const newAction = createNewAction(type);
    const listKey = editView === 'main' ? 'actions' : 'releaseActions';
    const currentList = [...macro[listKey]];
    
    currentList.splice(index, 0, newAction);
    
    updateMacro(selectedMacroId, { [listKey]: currentList });
  };

  const updateAction = (actionId: string, updates: Partial<MacroAction>) => {
    if (!selectedMacroId) return;
    const macro = macros.find(m => m.id === selectedMacroId);
    if (macro) {
      const listKey = editView === 'main' ? 'actions' : 'releaseActions';
      const newActions = macro[listKey].map(a => a.id === actionId ? { ...a, ...updates } : a);
      updateMacro(selectedMacroId, { [listKey]: newActions });
    }
  };

  const removeAction = (actionId: string) => {
    if (!selectedMacroId) return;
    const macro = macros.find(m => m.id === selectedMacroId);
    if (macro) {
       const listKey = editView === 'main' ? 'actions' : 'releaseActions';
       const newActions = macro[listKey].filter(a => a.id !== actionId);
       updateMacro(selectedMacroId, { [listKey]: newActions });
    }
  };
  
  const handleAiGenerate = async () => {
    if (!process.env.API_KEY) {
      setAiError("未配置 API Key，请检查环境变量。");
      return;
    }
    if (!selectedMacroId) return;
    
    setAiLoading(true);
    setAiError(null);
    setAiStepIndex(0);

    const stepInterval = setInterval(() => {
      setAiStepIndex(prev => Math.min(prev + 1, AI_STEPS.length - 1));
    }, 800);

    try {
      const { mainActions, releaseActions } = await generateMacroFromPrompt(aiPrompt);
      const macro = macros.find(m => m.id === selectedMacroId);
      
      if (macro) {
        // AI appends to end for now
        const newActions = [...macro.actions, ...mainActions];
        const newReleaseActions = [...macro.releaseActions, ...releaseActions];
        
        updateMacro(selectedMacroId, { 
          actions: newActions,
          releaseActions: newReleaseActions
        });

        setShowAiModal(false);
        setAiPrompt('');
        
        if (mainActions.length === 0 && releaseActions.length > 0) {
          setEditView('release');
        } else {
          setEditView('main');
        }
      }
    } catch (err) {
      console.error(err);
      setAiError("生成失败，模型可能过载。请稍后重试。");
    } finally {
      clearInterval(stepInterval);
      setAiLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden text-slate-700 select-none">
      
      {/* Sidebar */}
      <aside className="w-80 h-full p-4 flex flex-col gap-4 relative z-10 bg-black/10 backdrop-blur-2xl border-r border-white/5">
        <div className="flex items-center gap-3 px-2 pt-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Command size={16} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight drop-shadow-sm">Lumina</h1>
            <p className="text-[10px] text-indigo-200 font-medium tracking-widest uppercase opacity-80">Macro Studio</p>
          </div>
        </div>

        <GlassCard className="flex-1 flex flex-col overflow-hidden !bg-white/5 !border-white/10" intensity="low">
          <div className="p-3 border-b border-white/10 flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-300 pl-1">配置文件</span>
            <button onClick={addMacro} className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/90 transition-all active:scale-95 shadow-sm">
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {macros.map(macro => (
              <div 
                key={macro.id}
                onClick={() => setSelectedMacroId(macro.id)}
                className={`group relative p-2.5 rounded-lg cursor-pointer transition-all border ${
                  selectedMacroId === macro.id 
                    ? 'bg-white/95 border-white shadow-md text-slate-900' 
                    : 'bg-transparent border-transparent hover:bg-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`font-medium text-sm truncate ${selectedMacroId === macro.id ? 'font-semibold' : ''}`}>
                    {macro.name}
                  </span>
                </div>
                {selectedMacroId === macro.id && (
                  <div className="flex items-center gap-2 mt-1.5 animate-in fade-in slide-in-from-left-1 duration-200">
                     <span className="text-[10px] font-bold font-mono bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-200/50">
                      {macro.triggerKey.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {macro.actions.length} 动作
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Global Save / Download Actions - Apple Style */}
        <div className="space-y-3">
          <GlassCard intensity="low" className="p-2.5 !bg-white/10 !border-white/20 shadow-inner">
            <div className="grid grid-cols-3 gap-2">
              <button 
                  onClick={handleDownloadConfig}
                  className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 transition-all group text-indigo-50 hover:text-white shadow-sm active:scale-95"
                  title="导出配置 (JSON)"
              >
                  <Share size={16} strokeWidth={2} className="opacity-90 group-hover:opacity-100 transition-opacity" />
                  <span className="text-[10px] font-bold opacity-90 group-hover:opacity-100">导出</span>
              </button>
              
              <button 
                  onClick={handleCopyConfig}
                  className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 transition-all group text-indigo-50 hover:text-white shadow-sm active:scale-95"
                  title="复制配置到剪贴板"
              >
                  <Copy size={16} strokeWidth={2} className="opacity-90 group-hover:opacity-100 transition-opacity" />
                  <span className="text-[10px] font-bold opacity-90 group-hover:opacity-100">复制</span>
              </button>

              <button 
                  onClick={handleImportFromClipboard}
                  className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 transition-all group text-indigo-50 hover:text-white shadow-sm active:scale-95"
                  title="从剪贴板导入"
              >
                  <ClipboardPaste size={16} strokeWidth={2} className="opacity-90 group-hover:opacity-100 transition-opacity" />
                  <span className="text-[10px] font-bold opacity-90 group-hover:opacity-100">导入</span>
              </button>
            </div>
          </GlassCard>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 h-full overflow-hidden flex flex-col gap-4 relative z-10">
        
        {selectedMacro ? (
          <>
            {/* Header / Toolbar - Redesigned Apple Style */}
            <GlassCard className="px-6 py-4 flex justify-between items-center shrink-0 shadow-lg" intensity="high">
              
              {/* Left: Title & Metadata */}
              <div className="flex items-center gap-5">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-2.5 rounded-full text-slate-600 ring-1 ring-slate-200/60 shadow-inner">
                  <Settings2 size={20} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-1">
                  {/* Name Input - Enhanced for visibility */}
                  <input 
                    type="text" 
                    value={selectedMacro.name}
                    onChange={(e) => updateMacro(selectedMacro.id, { name: e.target.value })}
                    className="bg-transparent hover:bg-slate-100/50 focus:bg-white border border-transparent focus:border-indigo-100/50 rounded-lg px-2 py-0.5 -ml-2 text-lg font-semibold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder-slate-400 min-w-[200px]"
                    placeholder="未命名配置"
                    spellCheck={false}
                  />
                  
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-2 group cursor-pointer hover:bg-slate-100/50 rounded-md px-1.5 py-0.5 -ml-1.5 transition-colors">
                      <span className="opacity-60 font-medium">触发键</span>
                      <input 
                        type="text"
                        value={selectedMacro.triggerKey}
                        onChange={(e) => updateMacro(selectedMacro.id, { triggerKey: e.target.value })}
                        className="w-10 bg-slate-100 border border-slate-200 focus:bg-white text-center font-mono font-bold focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 outline-none uppercase rounded text-indigo-600 shadow-sm"
                        maxLength={5}
                        spellCheck={false}
                      />
                    </div>
                    
                    <span className="text-slate-300">|</span>
                    
                    {/* Loop Mode Select - Enhanced Visibility */}
                    <div className="relative group">
                      <select 
                        value={selectedMacro.loopMode}
                        onChange={(e) => updateMacro(selectedMacro.id, { loopMode: e.target.value as LoopMode })}
                        className="appearance-none bg-slate-100/80 hover:bg-slate-200/80 rounded-lg py-1.5 pl-3 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-colors cursor-pointer border border-transparent focus:bg-white focus:border-indigo-100"
                      >
                        <option value={LoopMode.ONCE}>单次执行 (Once)</option>
                        <option value={LoopMode.REPEAT}>按住重复 (Repeat)</option>
                        <option value={LoopMode.TOGGLE}>切换开关 (Toggle)</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-600 pointer-events-none transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right: Actions */}
              <div className="flex items-center gap-3">
                 {/* Delete (Subtle) */}
                 <button 
                  onClick={() => deleteMacro(selectedMacro.id)}
                  className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all hover:scale-105 active:scale-95"
                  title="删除"
                >
                  <Trash2 size={18} strokeWidth={1.5} />
                </button>
                
                <div className="h-6 w-px bg-slate-200 mx-1"></div>

                 {/* Preview */}
                 <button 
                  onClick={() => setShowVisualizer(true)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200/60 text-slate-600 rounded-full shadow-sm hover:shadow-md flex items-center gap-2 transition-all text-sm font-medium active:scale-[0.98]"
                >
                  <Eye size={16} strokeWidth={2} /> 预览
                </button>
                
                {/* AI Generate - Hero Button */}
                <button 
                  onClick={() => setShowAiModal(true)}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-full shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 transition-all text-sm font-medium border border-white/10 ring-1 ring-white/20"
                >
                  <Sparkles size={16} className="text-indigo-100" />
                  <span>AI 生成</span>
                </button>
              </div>
            </GlassCard>

            {/* Action Editor */}
            <div className="flex-1 flex gap-6 overflow-hidden">
              
              {/* Timeline */}
              <GlassCard className="flex-1 flex flex-col overflow-hidden bg-white/40 border-white/40 shadow-xl" intensity="high">
                {/* Timeline Tabs */}
                <div className="flex p-1.5 mx-4 mt-4 bg-slate-200/50 backdrop-blur-sm rounded-xl shrink-0 ring-1 ring-black/5">
                    <button 
                      onClick={() => { setEditView('main'); }}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${editView === 'main' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'}`}
                    >
                      <Play size={14} fill={editView === 'main' ? "currentColor" : "none"} /> 主循环
                    </button>
                    <button 
                      onClick={() => { setEditView('release'); }}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${editView === 'release' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'}`}
                    >
                      <StopCircle size={14} fill={editView === 'release' ? "currentColor" : "none"} /> 松开触发
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 custom-scrollbar pb-20 relative">
                  
                  {/* Empty State / Standard List */}
                  {currentActionList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                       
                       {/* 空状态：通过 relative + InsertZone(empty-state) 直接接管交互 */}
                       <div className="relative w-64 h-32 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center group bg-white/20">
                          
                          {/* 视觉部分：禁止点击，避免阻挡 InsertZone */}
                          <div className="pointer-events-none flex flex-col items-center justify-center">
                            <div className="p-3 bg-white/80 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                              <Plus size={24} className="text-indigo-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-500 group-hover:text-indigo-600">添加第一个动作</p>
                          </div>
                          
                          {/* 逻辑交互部分：全覆盖 */}
                          <InsertZone mode="empty-state" onInsert={(type) => insertActionAt(0, type)} />
                       </div>
                       
                       <p className="text-xs text-slate-400/80 font-medium tracking-wide">
                        {editView === 'main' 
                          ? "提示: 动作将按顺序执行" 
                          : "提示: 动作将在松开触发键时执行"}
                      </p>
                    </div>
                  ) : (
                    currentActionList.map((action, idx) => (
                      <React.Fragment key={action.id}>
                        {/* 如果是第一项，在前面加一个普通的 InsertZone 方便向前插入 */}
                        {idx === 0 && <InsertZone onInsert={(type) => insertActionAt(0, type)} />}
                        
                        <ActionItem 
                          action={action} 
                          index={idx}
                          totalCount={currentActionList.length}
                          onUpdate={updateAction}
                          onRemove={removeAction}
                        />
                        
                        {/* 这里的 InsertZone 负责 "Append" 或 "Insert After" */}
                        <InsertZone onInsert={(type) => insertActionAt(idx + 1, type)} />
                      </React.Fragment>
                    ))
                  )}
                  
                </div>
              </GlassCard>

            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/50">
            <GlassCard className="p-8 text-center" intensity="low">
              <Cpu size={48} className="mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-bold text-white">Lumina Macro Studio</h2>
              <p className="text-indigo-100 mt-2">请点击侧边栏 "+" 创建一个新的宏配置。</p>
            </GlassCard>
          </div>
        )}
      </main>

      {/* Manual Import Modal (Fallback) */}
      {showManualImport && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <GlassCard intensity="high" className="w-full max-w-lg p-6 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center">
               <h3 className="font-bold text-slate-800 text-lg">手动导入配置</h3>
               <button onClick={() => setShowManualImport(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="p-3 bg-amber-50 rounded-lg text-amber-700 text-sm flex items-start gap-2">
               <AlertCircle size={16} className="mt-0.5 shrink-0" />
               <p>由于浏览器安全策略限制，无法自动读取剪贴板。<br/>请在下方文本框中手动粘贴 (Ctrl+V) JSON 配置。</p>
            </div>

            <textarea 
              className="w-full h-48 bg-white border border-slate-200 rounded-lg p-3 text-xs font-mono focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none text-slate-600"
              placeholder='请在此处粘贴配置 JSON: [ { "id": "...", ... } ]'
              value={manualImportJson}
              onChange={e => setManualImportJson(e.target.value)}
            />
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowManualImport(false)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors text-sm"
              >
                取消
              </button>
              <button 
                onClick={() => processImport(manualImportJson)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md text-sm font-medium flex items-center gap-2"
                disabled={!manualImportJson.trim()}
              >
                <ClipboardPaste size={16} /> 确认导入
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Visualizer Modal */}
      {showVisualizer && selectedMacro && (
        <MacroVisualizer 
          actions={editView === 'main' ? selectedMacro.actions : selectedMacro.releaseActions} 
          onClose={() => setShowVisualizer(false)} 
        />
      )}

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200 ring-1 ring-white/20" intensity="high">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-violet-50/50 to-indigo-50/50">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Lumina AI</h2>
                    <p className="text-xs text-slate-500">Intelligent Macro Generation</p>
                  </div>
                </div>
                {!aiLoading && (
                  <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {aiLoading ? (
                 <div className="flex flex-col items-center justify-center py-10 space-y-4">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-4 border-violet-100"></div>
                      <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-violet-600">
                        <Bot size={24} className="animate-pulse"/>
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-slate-800 font-medium">正在生成配置...</h3>
                      <p className="text-sm text-slate-500 animate-pulse transition-all duration-300">
                        {AI_STEPS[aiStepIndex]}
                      </p>
                    </div>
                 </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    请用自然语言描述您的宏需求。AI 将自动解析按下、松开与时间间隔。<br/>
                  </p>
                  
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="例如：按住右键，每隔 0.5 秒点一次空格，持续 5 秒..."
                    className="w-full h-32 p-4 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm resize-none transition-all"
                  ></textarea>

                  {aiError && (
                    <div className="text-xs text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100 flex items-center gap-2">
                      <AlertCircle size={12} /> {aiError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowAiModal(false)}
                disabled={aiLoading}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors disabled:opacity-50 font-medium"
              >
                取消
              </button>
              <button 
                onClick={handleAiGenerate}
                disabled={aiLoading || !aiPrompt.trim()}
                className="px-6 py-2 text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white rounded-full transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
              >
                {aiLoading ? (
                  <>处理中...</>
                ) : (
                  <>
                    <Zap size={16} fill="currentColor" /> 开始生成
                  </>
                )}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

export default App;