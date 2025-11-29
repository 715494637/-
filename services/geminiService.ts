
import { GoogleGenAI, Type } from "@google/genai";
import { ActionType, MacroAction } from "../types";

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

export const generateMacroFromPrompt = async (
  prompt: string
): Promise<{ mainActions: MacroAction[]; releaseActions: MacroAction[] }> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // REVISED SYSTEM INSTRUCTION
  // Focused on Atomic States (Down/Up) and Linear Time Slicing
  const systemInstruction = `
    You are a Professional Macro Configuration Engine.
    Your job is to convert natural language requests into a specific JSON sequence of atomic hardware actions.

    ### CORE CONCEPTS
    1. **ATOMIC ACTIONS**:
       - **CLICK**: Instant press and release (0ms hold). Use 'actionState': 'click'.
       - **DOWN**: Press and HOLD. Use 'actionState': 'down'.
       - **UP**: Release. Use 'actionState': 'up'.
       - **DELAY**: Wait for milliseconds.
    
    2. **TIMELINE LINEARIZATION (Time Slicing)**:
       - Computers execute commands linearly (one after another).
       - You CANNOT have two actions happen "simultaneously" in the JSON list.
       - You MUST manage the timeline using DELAYS.

    ### CRITICAL RULES FOR GENERATION
    
    **RULE 1: HOW TO HANDLE "HOLD" (按住/蓄力)**
    - NEVER use "duration" on a Click/Key action to represent a hold in complex sequences.
    - ALWAYS split it into 3 parts:
      1. Action DOWN
      2. DELAY (duration)
      3. Action UP

    **RULE 2: HOW TO HANDLE "INTERRUPTIONS" (打断)**
    - Scenario: "Hold Right Click for 500ms, but at 300ms press Space."
    - YOU MUST CALCULATE THE MATH:
      - Time segment 1: 300ms (Start to interruption)
      - Time segment 2: 500ms - 300ms = 200ms (Remainder)
    - GENERATED SEQUENCE:
      1. Right Click (DOWN)
      2. DELAY 300ms
      3. Space Key (CLICK)  <-- The interruption
      4. DELAY 200ms       <-- The remaining time
      5. Right Click (UP)

    **RULE 3: RELEASE ACTIONS (松开时)**
    - If user says "When I release...", "Finally...", "On stop...", put those actions in the 'releaseSequence' array.
    - If user says "Hold Right for 2s" inside the release sequence, you may use the simplified {type: CLICK, duration: 2000} format OR the explicit Down/Delay/Up format. Both are acceptable for simple cleanup chains.

    ### KEYWORD MAPPING (Chinese)
    - "按住", "长按", "蓄力" -> actionState: 'down' + DELAY
    - "松开" -> actionState: 'up'
    - "点击", "按一下" -> actionState: 'click'
    - "滚轮" -> type: 'SCROLL'
    - "打断" -> Insert action between delays.

    ### OUTPUT SCHEMA
    Return JSON with 'mainSequence' and 'releaseSequence'.
  `;

  const actionSchema = {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, enum: ["CLICK", "DELAY", "MOVE", "KEY", "SCROLL"] },
      button: { type: Type.STRING, enum: ["left", "right", "middle"] },
      actionState: { type: Type.STRING, enum: ["click", "down", "up"] },
      duration: { type: Type.INTEGER },
      x: { type: Type.INTEGER },
      y: { type: Type.INTEGER },
      absolute: { type: Type.BOOLEAN },
      key: { type: Type.STRING },
      scrollAmount: { type: Type.INTEGER }
    },
    required: ["type"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mainSequence: { type: Type.ARRAY, items: actionSchema },
            releaseSequence: { type: Type.ARRAY, items: actionSchema }
          }
        }
      }
    });

    const text = response.text;
    console.log(text)
    if (!text) return { mainActions: [], releaseActions: [] };
    
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.error("JSON Parse Error", e);
      return { mainActions: [], releaseActions: [] };
    }

    // SANITIZER: Ensures robustness even if AI makes minor format errors
    const sanitize = (list: any[]): MacroAction[] => {
      if (!Array.isArray(list)) return [];
      
      const processed: MacroAction[] = [];

      for (const a of list) {
        const type = a.type;
        const button = (a.button || 'left').toLowerCase();
        const key = (a.key || '').toLowerCase();
        const duration = a.duration ? parseInt(String(a.duration), 10) : 0;
        const scrollAmount = a.scrollAmount ? parseInt(String(a.scrollAmount), 10) : 0;
        let actionState = (a.actionState || 'click').toLowerCase();

        // 1. Explicit Down/Up (Preferred)
        if (actionState === 'down' || actionState === 'up') {
          processed.push({
            id: generateId(),
            type,
            button,
            key,
            actionState: actionState as any,
            duration: 0,
            x: a.x || 0,
            y: a.y || 0,
            absolute: a.absolute || false,
            scrollAmount
          });
          
          // Safety catch: If AI mistakenly added duration to a DOWN event, convert it to a following Delay
          if (duration > 0 && actionState === 'down') {
             processed.push({
               id: generateId(),
               type: ActionType.DELAY,
               duration: duration
             });
          }
          continue;
        }

        // 2. "Lazy" Hold Fallback (Click with Duration)
        // If AI ignores the prompt and sends { CLICK, duration: 2000 }, auto-expand it.
        if ((type === 'CLICK' || type === 'KEY') && duration > 10) {
           processed.push({
             id: generateId(),
             type,
             button,
             key,
             actionState: 'down',
             duration: 0,
             x: 0, y: 0, absolute: false, scrollAmount: 0
           });
           processed.push({
             id: generateId(),
             type: ActionType.DELAY,
             duration: duration
           });
           processed.push({
             id: generateId(),
             type,
             button,
             key,
             actionState: 'up',
             duration: 0,
             x: 0, y: 0, absolute: false, scrollAmount: 0
           });
           continue; 
        }

        // 3. Standard Atomic Action
        processed.push({
          id: generateId(),
          type,
          duration: type === 'DELAY' ? (duration || 100) : 0,
          x: a.x || 0,
          y: a.y || 0,
          button,
          absolute: a.absolute || false,
          key,
          actionState: 'click',
          scrollAmount
        });
      }

      return processed;
    };

    return {
      mainActions: sanitize(result.mainSequence),
      releaseActions: sanitize(result.releaseSequence)
    };

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};
