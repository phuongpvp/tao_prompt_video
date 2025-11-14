import { GoogleGenAI, Type } from "@google/genai";
import { Story, Character, Script } from '../types';

// --- HỆ THỐNG QUẢN LÝ KEY (BYOK) (Giữ nguyên) ---
let USER_API_KEYS: string[] = [];
let currentKeyIndex = 0;

export const setApiKeys = (keys: string[]) => {
    USER_API_KEYS = keys.map(k => k.trim()).filter(k => k.length > 10);
    currentKeyIndex = 0;
};
export const clearApiKeys = () => {
    USER_API_KEYS = [];
    currentKeyIndex = 0;
};
export const hasApiKeys = (): boolean => {
    return USER_API_KEYS.length > 0;
};
const getNextApiKey = (): string => {
    if (USER_API_KEYS.length === 0) throw new Error("MISSING_KEYS");
    const key = USER_API_KEYS[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % USER_API_KEYS.length;
    return key;
};
// --- KẾT THÚC HỆ THỐNG KEY ---

// Centralized error handler (Giữ nguyên)
const handleGeminiError = (error: unknown, context: string): Error => {
    console.error(`Error during ${context}:`, error);
    const errorMessage = String(error).toLowerCase();
    const originalError = (error instanceof Error) ? error.message : errorMessage;

    if (errorMessage.includes('api key not valid') || errorMessage.includes('permission denied')) {
        return new Error(`Lỗi: API Key không hợp lệ hoặc đã bị khóa. (Chi tiết: ${originalError})`);
    }
    if (errorMessage.includes('billing') || errorMessage.includes('403')) {
        return new Error(`Lỗi: Key của bạn không có quyền dùng model này hoặc cần bật thanh toán (Billing). (Chi tiết: ${originalError})`);
    }
    if (errorMessage.includes('overloaded') || errorMessage.includes('unavailable')) {
        return new Error("Lỗi: Model AI hiện đang quá tải. Vui lòng thử lại.");
    }
    if (errorMessage.includes('resource_exhausted') || errorMessage.includes('quota') || errorMessage.includes('429')) {
        return new Error("Lỗi: Key hiện tại đã hết quota. Tool sẽ tự động đổi sang key khác ở lần gọi tiếp theo.");
    }
    
    switch (context) {
        case 'story generation': return new Error(`Không thể tạo ý tưởng câu chuyện. (Lỗi: ${originalError})`);
        case 'character generation': return new Error(`Không thể tạo chi tiết nhân vật. (Lỗi: ${originalError})`);
        case 'script generation': return new Error(`Không thể tạo kịch bản. (Lỗi: ${originalError})`);
        default: return new Error(`Đã xảy ra lỗi không xác định. (Lỗi: ${originalError})`);
    }
};

// --- HÀM WRAPPER TỰ ĐỘNG THỬ LẠI (RETRY) (Giữ nguyên) ---
const callWithRetry = async <T>(apiCall: (ai: GoogleGenAI) => Promise<T>, context: string): Promise<T> => {
    if (USER_API_KEYS.length === 0) throw new Error("MISSING_KEYS");
    
    let lastError: any;
    for (let i = 0; i < USER_API_KEYS.length; i++) {
        try {
            const apiKey = getNextApiKey();
            const ai = new GoogleGenAI({ apiKey });
            return await apiCall(ai);
        } catch (error: any) {
            lastError = error;
            const errMsg = String(error).toLowerCase();
            if (errMsg.includes('resource_exhausted') || errMsg.includes('quota') || errMsg.includes('overloaded') || errMsg.includes('429')) {
                console.warn(`[Auto-Retry] Key ...${USER_API_KEYS[currentKeyIndex]?.slice(-4)} bị lỗi quota, đang đổi key...`);
                continue; 
            }
            throw handleGeminiError(error, context);
        }
    }
    throw new Error(`Đã thử tất cả ${USER_API_KEYS.length} Key nhưng đều thất bại. Lỗi cuối cùng: ${lastError?.message || lastError}`);
};


export const generateStoryIdeas = async (idea: string, style: string, count: number): Promise<Omit<Story, 'id'>[]> => {
  return callWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", 
      contents: `Tạo ${count} ý tưởng câu chuyện bằng TIẾNG VIỆT, dựa trên: "${idea}" (phong cách "${style}"). Output: "title" (tên) và "summary" (tóm tắt).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING }, 
            },
            required: ["title", "summary"],
          },
        },
      },
    });
    const jsonString = response.text.trim();
    return JSON.parse(jsonString);
  }, 'story generation');
};

// === NÂNG CẤP HÀM NÀY ===
export const generateCharacterDetails = async (story: Story, numMain: number, numSide: number, style: string): Promise<Omit<Character, 'id'>[]> => {
    return callWithRetry(async (ai) => {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash", 
            contents: `Dựa trên câu chuyện: "${story.title}" (${story.summary}), tạo ra ${numMain} NHÂN VẬT CHÍNH và ${numSide} NHÂN VẬT PHỤ.
            Với mỗi nhân vật, cung cấp:
            - "name": Tên nhân vật (Tiếng Việt, ví dụ: "Kael", "Elara").
            - "role": Vai trò (Ghi chính xác "Nhân vật chính" hoặc "Nhân vật phụ").
            - "description": Mô tả chi tiết nhân vật (tính cách, ngoại hình, vai trò) bằng TIẾNG VIỆT.
            - "prompt": Một câu lệnh (prompt) tạo ảnh chi tiết bằng TIẾNG ANH (theo phong cách ${style}) để dùng cho AI tạo ảnh.
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            role: { type: Type.STRING }, // Thêm trường mới
                            description: { type: Type.STRING },
                            prompt: { type: Type.STRING },
                        },
                         required: ["name", "role", "description", "prompt"], // Yêu cầu cả 4
                    },
                },
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    }, 'character generation');
};

// === HÀM NÀY GIỮ NGUYÊN TỪ LẦN TRƯỚC ===
export const generateScript = async (story: Story, characters: Character[], duration: number, narrationLanguage: string, scriptStyle: string): Promise<Script> => {
    
    const isDialogueStyle = scriptStyle === 'Lời thoại';
    
    const dialoguePromptInstruction = isDialogueStyle
        ? `3. "dialogues": MẢNG các lời thoại giữa các nhân vật (ví dụ: [{"character": "Tên NV", "line": "Lời thoại..."}]). PHẢI có ít nhất 1 lời thoại.`
        : `3. "dialogues": MẢNG CHỨA 1 LỜI DẪN (ví dụ: [{"character": "Narrator", "line": "Lời dẫn..."}]).`;

    const veoPromptInstruction = isDialogueStyle
        ? `
            - "veo_prompt": (TIẾNG ANH) Một câu lệnh mô tả hình ảnh chi tiết, súc tích (giống prompt gốc).
            - QUAN TRỌNG: Nối TOÀN BỘ nội dung "line" (lời thoại) của cảnh đó vào cuối "veo_prompt", đặt trong dấu nháy đơn.
            - CHỈ NỐI NỘI DUNG LỜI THOẠI, KHÔNG thêm "Narrator says:".
        `
        : `
            - "veo_prompt": (TIẾNG ANH) Một câu lệnh mô tả hình ảnh chi tiết, súc tích (giống prompt gốc).
            - KHÔNG chèn lời dẫn vào.
        `;

    const dialoguesSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                character: { type: Type.STRING },
                line: { type: Type.STRING }
            },
            required: ["character", "line"]
        }
    };

    return callWithRetry(async (ai) => {
        const characterDescriptions = characters.map(c => `- ${c.name}: ${c.prompt} (Tên đầy đủ: "${c.name}", Vai trò: "${c.role}")`).join('\n');
        const expectedScenes = Math.ceil(duration / 8);

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash", 
            contents: `Viết kịch bản video ${duration} giây.
            - Truyện: "${story.title}" (${story.summary})
            - Ngôn ngữ: ${narrationLanguage}
            - Kiểu kịch bản: ${scriptStyle}
            - Danh sách nhân vật (BẮT BUỘC DÙNG TÊN NÀY):
            ${characterDescriptions}

            Yêu cầu (JSON):
            1. "summary": Tóm tắt kịch bản (ngôn ngữ ${narrationLanguage}).
            2. "scenes": Mảng gồm ${expectedScenes} cảnh.
            ${dialoguePromptInstruction}
            4. Mỗi cảnh cũng phải có:
                - "id": Số thứ tự.
                - "description": Mô tả cảnh (Tiếng Việt).
                - "characters_present": Mảng tên nhân vật có trong cảnh.
                ${veoPromptInstruction}
            
            QUY TẮC TỐI THƯỢNG: 
            Khi viết "veo_prompt", BẮT BUỘC phải sử dụng TÊN NHÂN VẬT ĐẦY ĐỦ (ví dụ: "Rùa Turbo", "Thỏ Zoom")
            thay vì tên ngắn (ví dụ: "Turbo", "Zoom"). Đây là yêu cầu bắt buộc để đồng bộ video.
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        scenes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.NUMBER },
                                    description: { type: Type.STRING },
                                    dialogues: dialoguesSchema,
                                    veo_prompt: { type: Type.STRING },
                                    characters_present: { type: Type.ARRAY, items: { type: Type.STRING } },
                                },
                                required: ["id", "description", "dialogues", "veo_prompt", "characters_present"],
                            },
                        },
                    },
                    required: ["summary", "scenes"],
                },
            },
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    }, 'script generation');
};