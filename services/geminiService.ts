import { GoogleGenAI, Type } from "@google/genai";
import { Story, Character, Script } from '../types';

// --- HỆ THỐNG QUẢN LÝ KEY (BYOK) ---
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

// Centralized error handler
const handleGeminiError = (error: unknown, context: string): Error => {
    console.error(`Error during ${context}:`, error);
    const errorMessage = String(error).toLowerCase();

    // Lỗi này quan trọng nhất cho BYOK
    if (errorMessage.includes('api key not valid') || errorMessage.includes('permission denied')) {
        return new Error("API Key không hợp lệ hoặc đã bị khóa. Vui lòng kiểm tra lại.");
    }
    if (errorMessage.includes('billing') || errorMessage.includes('403')) {
        return new Error('Lỗi: API Key của bạn (Free) không có quyền dùng model này hoặc cần bật thanh toán (Billing).');
    }
    if (errorMessage.includes('overloaded') || errorMessage.includes('unavailable')) {
        return new Error("Lỗi: Model AI hiện đang quá tải. Vui lòng thử lại.");
    }
    if (errorMessage.includes('resource_exhausted') || errorMessage.includes('quota') || errorMessage.includes('429')) {
        return new Error("Lỗi: Key hiện tại đã hết quota. Tool sẽ tự động đổi sang key khác ở lần gọi tiếp theo.");
    }
    
    // Default messages based on context
    switch (context) {
        case 'story generation':
            return new Error("Không thể tạo ý tưởng câu chuyện.");
        case 'character generation':
            return new Error("Không thể tạo chi tiết nhân vật.");
        case 'script generation':
            return new Error("Không thể tạo kịch bản.");
        default:
            return new Error("Đã xảy ra lỗi không xác định.");
    }
};

// --- HÀM WRAPPER TỰ ĐỘNG THỬ LẠI (RETRY) ---
const callWithRetry = async <T>(apiCall: (ai: GoogleGenAI) => Promise<T>, context: string): Promise<T> => {
    if (USER_API_KEYS.length === 0) throw new Error("MISSING_KEYS");
    
    let lastError: any;
    // Thử qua tất cả các key nếu gặp lỗi quota
    for (let i = 0; i < USER_API_KEYS.length; i++) {
        try {
            const apiKey = getNextApiKey();
            const ai = new GoogleGenAI({ apiKey });
            return await apiCall(ai);
        } catch (error: any) {
            lastError = error;
            const errMsg = String(error).toLowerCase();
            
            // Nếu lỗi do Quota/Quá tải, tự động thử key tiếp
            if (errMsg.includes('resource_exhausted') || errMsg.includes('quota') || errMsg.includes('overloaded') || errMsg.includes('429')) {
                console.warn(`[Auto-Retry] Key ...${USER_API_KEYS[currentKeyIndex]?.slice(-4)} bị lỗi quota, đang đổi key...`);
                continue; 
            }
            // Lỗi khác (Key sai, Billing,...) thì văng ra luôn
            throw handleGeminiError(error, context);
        }
    }
    throw new Error(`Thất bại sau khi thử tất cả ${USER_API_KEYS.length} Key. Lỗi cuối: ${lastError?.message || lastError}`);
};


export const generateStoryIdeas = async (idea: string, style: string, count: number): Promise<Omit<Story, 'id'>[]> => {
  return callWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Đổi sang model 2.0 Flash
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

export const generateCharacterDetails = async (story: Story, numCharacters: number, style: string): Promise<Omit<Character, 'id' | 'imageUrl' | 'imageMimeType' | 'isLoadingImage' | 'error'>[]> => {
    return callWithRetry(async (ai) => {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-pro-latest", // Đổi sang 1.5 Pro
            contents: `Dựa trên câu chuyện: "${story.title}" (${story.summary}), tạo ra ${numCharacters} nhân vật chính.
            Với mỗi nhân vật, cung cấp:
            - "name": Tên nhân vật (Tiếng Việt)
            - "prompt": Mô tả chi tiết ngoại hình, tính cách bằng TIẾNG ANH (dùng để tạo ảnh AI sau này) theo phong cách ${style}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            prompt: { type: Type.STRING },
                        },
                         required: ["name", "prompt"],
                    },
                },
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    }, 'character generation');
};

// ĐÃ XÓA HÀM generateCharacterImage() THEO YÊU CẦU

export const generateScript = async (story: Story, characters: Character[], duration: number, narrationLanguage: string): Promise<Script> => {
    return callWithRetry(async (ai) => {
        const characterDescriptions = characters.map(c => `- ${c.name}: ${c.prompt}`).join('\n');
        const expectedScenes = Math.ceil(duration / 8);

        const response = await ai.models.generateContent({
            model: "gemini-1.5-pro-latest", // Đổi sang 1.5 Pro
            contents: `Viết kịch bản video ${duration} giây.
            - Truyện: "${story.title}" (${story.summary})
            - Nhân vật: ${characterDescriptions}
            - Ngôn ngữ lời dẫn (narration): ${narrationLanguage}

            Yêu cầu (JSON):
            1. "summary": Tóm tắt kịch bản.
            2. "scenes": Mảng gồm ${expectedScenes} cảnh.
            3. Mỗi cảnh ("scene") phải có: "id", "description" (mô tả cảnh, tiếng Việt), "narration" (lời dẫn), "veo_prompt" (prompt tạo video, tiếng Anh, BẮT BUỘC chứa tên 1 nhân vật), "characters_present" (mảng tên nhân vật có trong cảnh, BẮT BUỘC có ít nhất 1).
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
                                    narration: { type: Type.STRING },
                                    veo_prompt: { type: Type.STRING },
                                    characters_present: { type: Type.ARRAY, items: { type: Type.STRING } },
                                },
                                required: ["id", "description", "narration", "veo_prompt", "characters_present"],
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