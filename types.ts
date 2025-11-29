
export enum ActionType {
  CLICK = 'CLICK',
  DELAY = 'DELAY',
  MOVE = 'MOVE',
  KEY = 'KEY',
  SCROLL = 'SCROLL',
}

export enum LoopMode {
  ONCE = 'once',
  REPEAT = 'repeat', // Repeats while held
  TOGGLE = 'toggle', // Press start, press stop
}

export type ActionState = 'click' | 'down' | 'up';

export interface MacroAction {
  id: string;
  type: ActionType;
  
  // SHARED: 'click' (default), 'down' (press & hold), 'up' (release)
  actionState?: ActionState;

  // CLICK params
  button?: 'left' | 'right' | 'middle';
  
  // DELAY params
  duration?: number; // ms
  
  // MOVE params
  x?: number;
  y?: number;
  absolute?: boolean; // true = go to x,y; false = relative move
  
  // KEY params
  key?: string;

  // SCROLL params
  scrollAmount?: number; // positive = up, negative = down
}

export interface Macro {
  id: string;
  name: string;
  triggerKey: string;
  loopMode: LoopMode;
  actions: MacroAction[];       // Main loop actions
  releaseActions: MacroAction[]; // Actions to run when trigger is released
}

export interface Config {
  macros: Macro[];
}
