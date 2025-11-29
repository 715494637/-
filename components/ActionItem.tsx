
import React from 'react';
import { MacroAction, ActionType } from '../types';
import { MousePointer2, Clock, Move, Keyboard, Trash2, ArrowUpFromLine, ArrowDownToLine, MousePointerClick, ScrollText } from 'lucide-react';

interface ActionItemProps {
  action: MacroAction;
  index: number;
  totalCount: number;
  onUpdate: (id: string, updates: Partial<MacroAction>) => void;
  onRemove: (id: string) => void;
}

export const ActionItem: React.FC<ActionItemProps> = ({ 
  action, 
  index, 
  onUpdate, 
  onRemove, 
}) => {
  
  const getIcon = () => {
    if (action.actionState === 'down') return <ArrowDownToLine size={16} className="text-orange-600" />;
    if (action.actionState === 'up') return <ArrowUpFromLine size={16} className="text-emerald-600" />;

    switch (action.type) {
      case ActionType.CLICK: return <MousePointer2 size={16} className="text-blue-600" />;
      case ActionType.DELAY: return <Clock size={16} className="text-amber-600" />;
      case ActionType.MOVE: return <Move size={16} className="text-emerald-600" />;
      case ActionType.KEY: return <Keyboard size={16} className="text-purple-600" />;
      case ActionType.SCROLL: return <ScrollText size={16} className="text-pink-600" />;
      default: return <MousePointer2 size={16} />;
    }
  };

  const getTypeLabel = () => {
    if (action.type === ActionType.DELAY) return '延时';
    if (action.type === ActionType.SCROLL) return '滚轮';
    if (action.type === ActionType.MOVE) return '移动';
    
    if (action.actionState === 'down') return '按住 (按下)';
    if (action.actionState === 'up') return '松开 (抬起)';
    if (action.type === ActionType.CLICK) return '点击';
    if (action.type === ActionType.KEY) return '按键';
    return action.type;
  };

  const renderStateToggle = () => {
    const currentState = action.actionState || 'click';
    return (
      <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 ml-auto shadow-sm">
        <button 
          title="点击 (按下并松开)"
          onClick={(e) => { e.stopPropagation(); onUpdate(action.id, { actionState: 'click' }); }}
          className={`p-1.5 rounded transition-all ${currentState === 'click' ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <MousePointerClick size={14} />
        </button>
        <button 
          title="按住 (只按下)"
          onClick={(e) => { e.stopPropagation(); onUpdate(action.id, { actionState: 'down' }); }}
          className={`p-1.5 rounded transition-all ${currentState === 'down' ? 'bg-white shadow-sm text-orange-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <ArrowDownToLine size={14} />
        </button>
        <button 
          title="松开 (只抬起)"
          onClick={(e) => { e.stopPropagation(); onUpdate(action.id, { actionState: 'up' }); }}
          className={`p-1.5 rounded transition-all ${currentState === 'up' ? 'bg-white shadow-sm text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <ArrowUpFromLine size={14} />
        </button>
      </div>
    );
  };

  const renderInputs = () => {
    // Inputs stop propagation so clicking inside them doesn't re-trigger focus logic unnecessarily
    const stopProp = (e: React.MouseEvent) => e.stopPropagation();
    
    // Shared input style: Solid white background to pop against the glass card
    const inputClass = "bg-white border border-slate-200 hover:border-slate-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all text-slate-700";

    switch (action.type) {
      case ActionType.CLICK:
        return (
          <>
            <select 
              value={action.button}
              onClick={stopProp}
              onChange={(e) => onUpdate(action.id, { button: e.target.value as any })}
              className={`${inputClass} px-2 py-1`}
            >
              <option value="left">左键</option>
              <option value="right">右键</option>
              <option value="middle">中键</option>
            </select>
            {renderStateToggle()}
          </>
        );
      case ActionType.DELAY:
        return (
          <div className="flex items-center gap-2" onClick={stopProp}>
            <input 
              type="number" 
              value={action.duration}
              onChange={(e) => onUpdate(action.id, { duration: parseInt(e.target.value) || 0 })}
              className={`${inputClass} w-20 px-2 py-1 text-center font-bold text-amber-600`}
            />
            <span className="text-xs text-gray-500 font-medium">毫秒 (ms)</span>
          </div>
        );
      case ActionType.MOVE:
        return (
          <div className="flex items-center gap-2" onClick={stopProp}>
            <span className="text-xs text-gray-500 font-bold">X</span>
            <input 
              type="number" 
              value={action.x}
              onChange={(e) => onUpdate(action.id, { x: parseInt(e.target.value) || 0 })}
              className={`${inputClass} w-16 px-2 py-1`}
            />
            <span className="text-xs text-gray-500 font-bold">Y</span>
            <input 
              type="number" 
              value={action.y}
              onChange={(e) => onUpdate(action.id, { y: parseInt(e.target.value) || 0 })}
              className={`${inputClass} w-16 px-2 py-1`}
            />
            <button 
              onClick={() => onUpdate(action.id, { absolute: !action.absolute })}
              className={`text-xs px-2 py-1 rounded-md border shadow-sm font-medium transition-colors ${action.absolute ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              {action.absolute ? '绝对坐标' : '相对移动'}
            </button>
          </div>
        );
      case ActionType.KEY:
        return (
          <>
           <input 
              type="text" 
              value={action.key}
              placeholder="按键"
              onClick={stopProp}
              onChange={(e) => onUpdate(action.id, { key: e.target.value })}
              className={`${inputClass} w-32 px-2 py-1 font-mono uppercase font-semibold`}
            />
            {renderStateToggle()}
          </>
        );
      case ActionType.SCROLL:
        return (
          <div className="flex items-center gap-2" onClick={stopProp}>
             <span className="text-xs text-gray-500">数值:</span>
             <input 
              type="number" 
              value={action.scrollAmount}
              onClick={stopProp}
              onChange={(e) => onUpdate(action.id, { scrollAmount: parseInt(e.target.value) || 0 })}
              className={`${inputClass} w-20 px-2 py-1 text-center`}
            />
            <span className="text-[10px] text-gray-400">(-向下 / +向上)</span>
          </div>
        );
    }
  };

  return (
    <div 
      className={`group relative flex items-center gap-3 p-3 border rounded-xl transition-all mb-0 shadow-sm select-none
      ${action.actionState === 'down' ? 'bg-orange-50/80 border-orange-200/60' : 
        action.actionState === 'up' ? 'bg-emerald-50/80 border-emerald-200/60' : 
        'bg-white/70 hover:bg-white/90 border-white/60 hover:shadow-md hover:scale-[1.005]'
      }`}
    >
      {/* Icon Box */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border bg-white shadow-sm border-slate-100`}>
        {getIcon()}
      </div>

      {/* Label */}
      <div className="flex flex-col w-20 shrink-0">
        <span className={`text-xs font-bold uppercase tracking-wider ${
           action.actionState === 'down' ? 'text-orange-600' : 
           action.actionState === 'up' ? 'text-emerald-600' : 
           'text-slate-700'
        }`}>
          {getTypeLabel()}
        </span>
        <span className="text-[10px] text-gray-400 font-mono">
          #{index + 1}
        </span>
      </div>

      {/* Controls */}
      <div className="flex-1 flex items-center gap-3">
        {renderInputs()}
      </div>

      {/* Delete Button (Restored) */}
      <button 
        onClick={(e) => { e.stopPropagation(); onRemove(action.id); }}
        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        title="删除此动作"
      >
        <Trash2 size={16} />
      </button>

    </div>
  );
};
