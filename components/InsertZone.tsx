
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, MousePointer2, Clock, Move, Keyboard, ScrollText } from 'lucide-react';
import { ActionType } from '../types';

interface InsertZoneProps {
  onInsert: (type: ActionType) => void;
  /** 
   * 'virtual' 模式用于空状态的大按钮，不渲染隐形线，
   * 而是作为一个不可见的控制器等待外部调用，或者作为填充容器 
   */
  mode?: 'line' | 'empty-state'; 
}

export const InsertZone: React.FC<InsertZoneProps> = ({ onInsert, mode = 'line' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  // 计算菜单位置并打开
  const handleOpenMenu = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡
    e.preventDefault();

    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      
      // 如果是 Empty State，菜单显示在盒子中间偏下；如果是 Line，显示在线下面
      const topOffset = mode === 'empty-state' ? rect.height / 2 + 20 : 8;

      setMenuPosition({
        top: rect.bottom + scrollY + (mode === 'empty-state' ? 0 : 8), 
        left: rect.left + rect.width / 2
      });
      setIsExpanded(true);
    }
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = () => {
      setIsExpanded(false);
    };

    if (isExpanded) {
      // 延迟绑定，防止触发点击时立即关闭
      requestAnimationFrame(() => {
         document.addEventListener('click', handleClickOutside);
      });
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isExpanded]);

  // 监听滚动关闭菜单
  useEffect(() => {
    if (isExpanded) {
      const handleScroll = () => setIsExpanded(false);
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [isExpanded]);

  const ActionBtn = ({ type, icon, label, color, onClick }: any) => (
    <button 
        onClick={(e) => { 
          e.stopPropagation(); 
          onClick(); 
        }}
        className="group/btn flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all hover:bg-white hover:shadow-lg hover:-translate-y-1 relative overflow-hidden active:scale-95"
    >
        <div className={`p-1.5 rounded-full bg-slate-50 group-hover/btn:bg-transparent transition-colors ${color}`}>
          {icon}
        </div>
        <span className="text-[10px] font-medium text-slate-500 mt-1 scale-90 group-hover/btn:scale-100 group-hover/btn:text-slate-800 transition-all">{label}</span>
    </button>
  );

  // 使用 Portal 将菜单渲染到 Body，确保置顶且不被裁剪
  const renderPortalMenu = () => {
    if (!isExpanded) return null;

    return createPortal(
      <div 
        className="absolute z-[9999] flex flex-col items-center"
        style={{ 
          top: menuPosition.top, 
          left: menuPosition.left,
          transform: 'translate(-50%, 0)' 
        }}
        onClick={(e) => e.stopPropagation()} 
      >
        {/* 指向箭头 */}
        {mode === 'line' && (
           <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-white/60 translate-y-[1px]"></div>
        )}
        
        {/* 灵动岛风格菜单 */}
        <div className="flex items-center gap-1 p-1.5 bg-white/80 backdrop-blur-2xl border border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-2xl animate-in zoom-in-95 fade-in slide-in-from-top-2 duration-200 ring-1 ring-black/5">
            <ActionBtn type={ActionType.CLICK} icon={<MousePointer2 size={16}/>} label="点击" color="text-blue-600" onClick={() => { onInsert(ActionType.CLICK); setIsExpanded(false); }} />
            <ActionBtn type={ActionType.MOVE} icon={<Move size={16}/>} label="移动" color="text-emerald-600" onClick={() => { onInsert(ActionType.MOVE); setIsExpanded(false); }} />
            <ActionBtn type={ActionType.SCROLL} icon={<ScrollText size={16}/>} label="滚轮" color="text-pink-600" onClick={() => { onInsert(ActionType.SCROLL); setIsExpanded(false); }} />
            <ActionBtn type={ActionType.DELAY} icon={<Clock size={16}/>} label="延时" color="text-amber-600" onClick={() => { onInsert(ActionType.DELAY); setIsExpanded(false); }} />
            <ActionBtn type={ActionType.KEY} icon={<Keyboard size={16}/>} label="按键" color="text-purple-600" onClick={() => { onInsert(ActionType.KEY); setIsExpanded(false); }} />
        </div>
      </div>,
      document.body
    );
  };

  // === 模式: 空状态触发器 ===
  if (mode === 'empty-state') {
    return (
      <>
        {/* 这是一个全尺寸的隐形触发层，覆盖在父级容器上 */}
        <div 
          ref={triggerRef} 
          className="w-full h-full absolute inset-0 cursor-pointer z-10" 
          onClick={handleOpenMenu}
        />
        {renderPortalMenu()}
      </>
    );
  }

  // === 模式: 标准线条 ===
  return (
    <>
      <div 
        ref={triggerRef}
        className="relative h-5 -my-2.5 flex items-center justify-center group z-10 select-none py-1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleOpenMenu}
      >
        {/* 交互热区 */}
        <div className="w-full h-full flex items-center justify-center cursor-pointer">
            {/* 极简分割线：默认隐藏，Hover时优雅显现 */}
            <div className={`w-[96%] h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent transition-all duration-300 ease-out ${isHovered || isExpanded ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-50'}`}></div>
            
            {/* 灵动加号：微小的圆形按钮 */}
            <div className={`absolute bg-indigo-500 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-md shadow-indigo-500/30 transform transition-all duration-300 ${isHovered || isExpanded ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 -rotate-90'}`}>
                <Plus size={12} strokeWidth={3} />
            </div>
        </div>
      </div>
      
      {renderPortalMenu()}
    </>
  );
};
