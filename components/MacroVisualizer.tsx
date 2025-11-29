
import React, { useState, useEffect, useRef } from 'react';
import { MacroAction, ActionType } from '../types';
import { Play, RotateCcw, X, ChevronUp, ChevronDown } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface MacroVisualizerProps {
  actions: MacroAction[];
  onClose: () => void;
}

// Expanded Keyboard Layout (TKL Style - Main + Arrows + Nav)
// Tighter gaps for compactness
const KEYBOARD_BLOCKS = {
  main: [
    [
      { w: 1, k: 'ESC' }, { w: 1, k: 'F1' }, { w: 1, k: 'F2' }, { w: 1, k: 'F3' }, { w: 1, k: 'F4' },
      { w: 1, k: 'F5' }, { w: 1, k: 'F6' }, { w: 1, k: 'F7' }, { w: 1, k: 'F8' },
      { w: 1, k: 'F9' }, { w: 1, k: 'F10' }, { w: 1, k: 'F11' }, { w: 1, k: 'F12' }
    ],
    [
      { w: 1, k: '`' }, { w: 1, k: '1' }, { w: 1, k: '2' }, { w: 1, k: '3' }, { w: 1, k: '4' },
      { w: 1, k: '5' }, { w: 1, k: '6' }, { w: 1, k: '7' }, { w: 1, k: '8' }, { w: 1, k: '9' },
      { w: 1, k: '0' }, { w: 1, k: '-' }, { w: 1, k: '=' }, { w: 2, k: 'BACKSPACE' }
    ],
    [
      { w: 1.5, k: 'TAB' }, { w: 1, k: 'Q' }, { w: 1, k: 'W' }, { w: 1, k: 'E' }, { w: 1, k: 'R' },
      { w: 1, k: 'T' }, { w: 1, k: 'Y' }, { w: 1, k: 'U' }, { w: 1, k: 'I' }, { w: 1, k: 'O' },
      { w: 1, k: 'P' }, { w: 1, k: '[' }, { w: 1, k: ']' }, { w: 1.5, k: '\\' }
    ],
    [
      { w: 1.8, k: 'CAPS' }, { w: 1, k: 'A' }, { w: 1, k: 'S' }, { w: 1, k: 'D' }, { w: 1, k: 'F' },
      { w: 1, k: 'G' }, { w: 1, k: 'H' }, { w: 1, k: 'J' }, { w: 1, k: 'K' }, { w: 1, k: 'L' },
      { w: 1, k: ';' }, { w: 1, k: "'" }, { w: 2.2, k: 'ENTER' }
    ],
    [
      { w: 2.3, k: 'SHIFT' }, { w: 1, k: 'Z' }, { w: 1, k: 'X' }, { w: 1, k: 'C' }, { w: 1, k: 'V' },
      { w: 1, k: 'B' }, { w: 1, k: 'N' }, { w: 1, k: 'M' }, { w: 1, k: ',' }, { w: 1, k: '.' },
      { w: 1, k: '/' }, { w: 2.7, k: 'SHIFT' }
    ],
    [
      { w: 1.5, k: 'CTRL' }, { w: 1.5, k: 'WIN' }, { w: 1.5, k: 'ALT' }, 
      { w: 6.2, k: 'SPACE' }, 
      { w: 1.5, k: 'ALT' }, { w: 1.5, k: 'FN' }, { w: 1.5, k: 'CTRL' }
    ]
  ],
  nav: [
    [ { w: 1, k: 'INS' }, { w: 1, k: 'HOME' }, { w: 1, k: 'PGUP' } ],
    [ { w: 1, k: 'DEL' }, { w: 1, k: 'END' }, { w: 1, k: 'PGDN' } ]
  ],
  arrows: [
    [ { w: 1, k: '' }, { w: 1, k: 'UP' }, { w: 1, k: '' } ],
    [ { w: 1, k: 'LEFT' }, { w: 1, k: 'DOWN' }, { w: 1, k: 'RIGHT' } ]
  ]
};

// Normalize Action Keys to Visualizer Keys
const normalizeKey = (k: string) => {
  if (!k) return '';
  const u = k.toUpperCase();
  if (u === ' ') return 'SPACE';
  if (u === 'CONTROL') return 'CTRL';
  if (u === 'RETURN') return 'ENTER';
  if (u === 'ESCAPE') return 'ESC';
  if (u === 'DELETE') return 'DEL'; 
  if (u === 'INSERT') return 'INS';
  if (u === 'ARROWUP') return 'UP';
  if (u === 'ARROWDOWN') return 'DOWN';
  if (u === 'ARROWLEFT') return 'LEFT';
  if (u === 'ARROWRIGHT') return 'RIGHT';
  if (u === 'PAGEUP') return 'PGUP';
  if (u === 'PAGEDOWN') return 'PGDN';
  return u;
};

interface KeyCapProps {
  k: string;
  w: number;
  active: boolean;
}

const KeyCap: React.FC<KeyCapProps> = ({ k, w, active }) => {
  // Use REM for sizing to allow easy global scaling
  const widthRem = w * 1.6; 

  return (
    <div 
      className={`
        h-8 rounded flex items-center justify-center font-bold text-[9px] transition-all duration-75 shadow-[0_2px_0_0_rgba(0,0,0,0.15)] border select-none
        ${active 
          ? 'bg-cyan-500 border-cyan-400 text-white shadow-[0_0_15px_2px_rgba(34,211,238,0.6)] scale-[0.98] translate-y-[2px] z-10' 
          : 'bg-slate-50 border-slate-300 text-slate-600 shadow-[0_2px_0_0_#cbd5e1]'}
      `}
      style={{ 
        width: `${widthRem}rem`, 
      }}
    >
      {k}
    </div>
  );
};

export const MacroVisualizer: React.FC<MacroVisualizerProps> = ({ actions, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [activeMouseBtns, setActiveMouseBtns] = useState<Set<string>>(new Set());
  
  const [scrollState, setScrollState] = useState<'up' | 'down' | null>(null);

  const isPlayingRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const reset = () => {
    stop();
    setCurrentIndex(-1);
    setActiveKeys(new Set());
    setActiveMouseBtns(new Set());
    setScrollState(null);
  };

  const stop = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setScrollState(null);
  };

  const play = () => {
    if (isPlayingRef.current) return;
    
    reset();
    isPlayingRef.current = true;
    setIsPlaying(true);
    
    const runStep = (index: number) => {
      if (!isPlayingRef.current) return;
      
      if (index >= actions.length) {
        setIsPlaying(false);
        isPlayingRef.current = false;
        return;
      }

      const action = actions[index];
      setCurrentIndex(index);
      setScrollState(null);

      if (action.type === ActionType.KEY) {
        const keyName = normalizeKey(action.key || '');
        setActiveKeys(prev => {
          const next = new Set(prev);
          if (action.actionState === 'down') next.add(keyName);
          else if (action.actionState === 'up') next.delete(keyName);
          else {
            next.add(keyName);
            const t = setTimeout(() => setActiveKeys(curr => {
                const n = new Set(curr);
                n.delete(keyName);
                return n;
            }), 200);
            timeoutsRef.current.push(t);
          }
          return next;
        });
      } else if (action.type === ActionType.CLICK) {
        setActiveMouseBtns(prev => {
          const next = new Set(prev);
          const btn = action.button || 'left';
          if (action.actionState === 'down') next.add(btn);
          else if (action.actionState === 'up') next.delete(btn);
          else {
            next.add(btn);
            const t = setTimeout(() => setActiveMouseBtns(curr => {
                const n = new Set(curr);
                n.delete(btn);
                return n;
            }), 200);
            timeoutsRef.current.push(t);
          }
          return next;
        });
      } else if (action.type === ActionType.SCROLL) {
         const amt = action.scrollAmount || 0;
         if (amt !== 0) {
            setScrollState(amt > 0 ? 'up' : 'down');
            const t = setTimeout(() => setScrollState(null), 300);
            timeoutsRef.current.push(t);
         }
      }

      let stepDuration = 500; 
      if (action.type === ActionType.DELAY) {
        stepDuration = Math.max(100, (action.duration || 0)); 
      }

      const t = setTimeout(() => runStep(index + 1), stepDuration);
      timeoutsRef.current.push(t);
    };

    runStep(0);
  };

  useEffect(() => {
    return () => stop();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      {/* Container */}
      <GlassCard intensity="high" className="w-auto h-auto max-w-[98vw] max-h-[95vh] flex flex-col overflow-hidden shadow-2xl ring-1 ring-white/50">
        
        {/* Header */}
        <div className="p-3 border-b border-white/30 bg-white/40 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3 text-indigo-800">
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              <Play size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-none">宏模拟器 (Preview)</h2>
              <p className="text-[10px] text-indigo-600/60 mt-0.5">实时动作与硬件状态</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden bg-slate-50/50 min-h-0">
          
          {/* Left: Sequence List */}
          <div className="w-[240px] border-r border-white/30 bg-white/20 flex flex-col shrink-0 hidden md:flex">
            <div className="p-2.5 border-b border-white/20 text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-white/30">
              动作时间轴
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
              {actions.map((action, idx) => (
                <div 
                  key={action.id}
                  id={`action-${idx}`}
                  className={`p-2 rounded-lg border transition-all duration-300 flex items-center justify-between ${
                    idx === currentIndex 
                      ? 'bg-white shadow-md border-blue-300 ring-1 ring-blue-100' 
                      : 'bg-white/40 border-transparent hover:bg-white/60 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold w-4 text-right ${idx === currentIndex ? 'text-blue-600' : 'text-slate-400'}`}>
                      {idx + 1}
                    </span>
                    <div>
                      <div className={`text-[11px] font-bold leading-tight ${idx === currentIndex ? 'text-slate-800' : 'text-slate-600'}`}>
                         {action.type === 'DELAY' ? '等待 (Delay)' :
                          action.type === 'SCROLL' ? '滚轮 (Scroll)' :
                          action.type === 'MOVE' ? '移动 (Move)' :
                          action.type === 'KEY' ? `按键 [${action.key?.toUpperCase()}]` : `鼠标 ${action.button?.toUpperCase()}`}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono leading-tight">
                        {action.type === 'DELAY' ? `${action.duration}ms` : 
                         action.type === 'CLICK' ? `${action.actionState === 'down' ? '按下 HOLD' : action.actionState === 'up' ? '松开 RELEASE' : '点击 CLICK'}` :
                         action.type === 'KEY' ? `${action.actionState === 'down' ? '按下 HOLD' : action.actionState === 'up' ? '松开 RELEASE' : '点击 CLICK'}` :
                         action.type === 'SCROLL' ? `${action.scrollAmount && action.scrollAmount > 0 ? 'UP 向上' : 'DOWN 向下'}` : ''}
                      </div>
                    </div>
                  </div>
                  {idx === currentIndex && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                  )}
                </div>
              ))}
              {actions.length === 0 && <p className="text-slate-400 text-center py-10 text-xs">暂无动作</p>}
            </div>
          </div>

          {/* Right: Visual Stage */}
          <div className="flex-1 relative flex flex-col p-4 bg-[#f1f5f9] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none"></div>

            {/* Hardware Visualization Wrapper - Scaled to fit */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full">
              
              {/* Layout: Keyboard and Mouse side by side */}
              {/* Responsive Scale: Tiny on mobile, smaller on tablet, full on desktop */}
              <div className="flex items-end gap-4 origin-center scale-[0.55] sm:scale-[0.7] md:scale-[0.85] lg:scale-100 transition-transform">
                
                {/* Virtual Keyboard Group */}
                <div className="bg-slate-300/50 p-2 rounded-xl shadow-xl border border-white/50 backdrop-blur-sm">
                  <div className="flex gap-3">
                    
                    {/* Main Block */}
                    <div className="flex flex-col gap-1">
                      {KEYBOARD_BLOCKS.main.map((row, rIdx) => (
                        <div key={rIdx} className="flex gap-1">
                          {row.map((item, kIdx) => <KeyCap key={kIdx} k={item.k} w={item.w} active={activeKeys.has(item.k)} />)}
                        </div>
                      ))}
                    </div>

                    {/* Middle Block (Nav + Arrows) */}
                    <div className="flex flex-col justify-between">
                       {/* Nav Cluster */}
                       <div className="flex flex-col gap-1">
                          {KEYBOARD_BLOCKS.nav.map((row, rIdx) => (
                            <div key={rIdx} className="flex gap-1">
                              {row.map((item, kIdx) => <KeyCap key={kIdx} k={item.k} w={item.w} active={activeKeys.has(item.k)} />)}
                            </div>
                          ))}
                       </div>
                       
                       {/* Arrows Cluster */}
                       <div className="flex flex-col gap-1 mt-4">
                          {KEYBOARD_BLOCKS.arrows.map((row, rIdx) => (
                            <div key={rIdx} className="flex gap-1">
                              {row.map((item, kIdx) => item.k ? <KeyCap key={kIdx} k={item.k} w={item.w} active={activeKeys.has(item.k)} /> : <div key={kIdx} style={{width: `${item.w * 1.6}rem`}} />)}
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                </div>

                {/* Virtual Mouse */}
                <div className="relative w-24 h-40 rounded-[3rem] bg-gradient-to-b from-white to-slate-100 border border-slate-200 shadow-xl shrink-0 select-none flex flex-col mb-4">
                   {/* Left Button */}
                   <div className={`absolute top-0 left-0 w-1/2 h-16 rounded-tl-[3rem] border-r border-slate-200 border-b transition-all duration-100 ${
                     activeMouseBtns.has('left') ? 'bg-cyan-500 shadow-[inset_0_2px_15px_rgba(34,211,238,0.5)]' : 'bg-white hover:bg-slate-50'
                   }`}></div>
                   
                   {/* Right Button */}
                   <div className={`absolute top-0 right-0 w-1/2 h-16 rounded-tr-[3rem] border-b border-slate-200 transition-all duration-100 ${
                     activeMouseBtns.has('right') ? 'bg-cyan-500 shadow-[inset_0_2px_15px_rgba(34,211,238,0.5)]' : 'bg-white hover:bg-slate-50'
                   }`}></div>
                   
                   {/* Scroll Wheel */}
                   <div className={`absolute top-6 left-1/2 -translate-x-1/2 w-6 h-10 rounded-full border border-slate-300 z-20 flex flex-col items-center justify-center overflow-hidden transition-all duration-200 ${
                     activeMouseBtns.has('middle') ? 'bg-cyan-600 border-cyan-700 scale-95' : 'bg-slate-100 shadow-inner'
                   }`}>
                     <div className={`w-1 h-full bg-slate-300 flex flex-col gap-1 items-center py-1 ${scrollState ? 'opacity-0' : 'opacity-100'}`}>
                        {[1,2,3,4].map(i => <div key={i} className="w-3 h-0.5 bg-slate-400/50 rounded-full"></div>)}
                     </div>
                     {scrollState === 'up' && <ChevronUp size={14} className="text-white animate-bounce drop-shadow-md" strokeWidth={4} />}
                     {scrollState === 'down' && <ChevronDown size={14} className="text-white animate-bounce drop-shadow-md" strokeWidth={4} />}
                   </div>

                   {/* Mouse Body Glow */}
                   <div className="mt-auto mb-4 mx-auto text-[8px] font-bold text-slate-300 tracking-widest uppercase">Lumina</div>
                </div>
              </div>

              {/* Control Bar */}
              <div className="flex justify-center gap-4 mt-4 sm:mt-8">
                <button 
                  onClick={isPlaying ? stop : play}
                  className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${
                    isPlaying 
                      ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50' 
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:brightness-110'
                  }`}
                >
                  {isPlaying ? '暂停模拟' : '开始运行'}
                </button>
                <button 
                  onClick={reset} 
                  className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-md transition-all active:scale-95"
                  title="重置"
                >
                  <RotateCcw size={20} />
                </button>
              </div>

            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
