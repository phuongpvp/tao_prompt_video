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

// --- XÓA BỎ `generateStoryIdeas` và `generateCharacterDetails` ---

// --- HÀM TẠO KỊCH BẢN MỚI (ALL-IN-ONE) ---
export const generateScript = async (
    storyIdea: string, 
    numMain: number, 
    numSide: number,
    style: string,
    duration: number, 
    narrationLanguage: string, 
    scriptStyle: string
): Promise<{script: Script, story: Story, characters: Character[]}> => { // Trả về object lớn
    
    const isDialogueStyle = scriptStyle === 'Lời thoại';
    
    const dialoguePromptInstruction = isDialogueStyle
        ? `3. "dialogues": MẢNG các lời thoại giữa các nhân vật (ví dụ: [{"character": "Tên NV", "line": "Lời thoại..."}]). PHẢI có ít nhất 1 lời thoại.`
        : `3. "dialogues": MẢNG CHỨA 1 LỜI DẪN (ví dụ: [{"character": "Narrator", "line": "Lời dẫn..."}]).`;

    const veoPromptInstruction = isDialogueStyle
        ? `
            - "veo_prompt": (TIẾNG ANH) Một câu lệnh mô tả hình ảnh chi tiết, súc tích, BẮT BUỘC chứa tên nhân vật ĐẦY ĐỦ.
            - QUAN TRỌNG: Nối TOÀN BỘ nội dung "line" (lời thoại) của cảnh đó vào cuối "veo_prompt", đặt trong dấu nháy đơn.
            - CHỈ NỐI NỘI DUNG LỜI THOẠI.
        `
        : `
            - "veo_prompt": (TIẾNG ANH) Một câu lệnh mô tả hình ảnh chi tiết, súc tích, BẮT BUỘC chứa tên nhân vật ĐẦY ĐỦ.
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

    // Đây là Cấu trúc JSON lớn mà AI phải trả về
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            // Phần 1: Thông tin truyện
            story: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING }
                },
                required: ["title", "summary"]
            },
            // Phần 2: Danh sách nhân vật
            characters: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        prompt: { type: Type.STRING }
                    },
                    required: ["name", "prompt"]
                }
            },
            // Phần 3: Kịch bản
            script: {
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
                required: ["summary", "scenes"]
            }
        },
        required: ["story", "characters", "script"]
    };


    return callWithRetry(async (ai) => {
        const expectedScenes = Math.ceil(duration / 8);

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash", 
            contents: `Bạn là một nhà biên kịch AI. Hãy thực hiện 3 nhiệm vụ sau dựa trên yêu cầu của người dùng:
            
            YÊU CẦU ĐẦU VÀO:
            - Ý tưởng gốc: "${storyIdea}"
            - Phong cách: "${style}"
            - Ngôn ngữ: ${narrationLanguage}
            - Kiểu kịch bản: ${scriptStyle}
            - Thời lượng: ${duration} giây
            - Số nhân vật chính: ${numMain}
            - Số nhân vật phụ: ${numSide}

            NHIỆM VỤ (TRẢ VỀ 1 JSON DUY NHẤT):

            1. TẠO TRUYỆN ("story"):
               - "title": Tên câu chuyện (Tiếng Việt).
               - "summary": Tóm tắt câu chuyện (ngôn ngữ ${narrationLanguage}).

            2. TẠO NHÂN VẬT ("characters"):
               - Tạo ${numMain} nhân vật chính VÀ ${numSide} nhân vật phụ.
               - Với mỗi nhân vật, cung cấp:
                 - "name": Tên nhân vật (Tiếng Việt, phải thật đầy đủ, ví dụ "Rùa Rừng Rình" thay vì "Rùa").
                 - "prompt": Mô tả chi tiết ngoại hình, tính cách (Tiếng Anh) theo phong cách ${style}.

            3. VIẾT KỊCH BẢN ("script"):
               - "summary": Tóm tắt kịch bản (ngôn ngữ ${narrationLanguage}).
               - "scenes": Mảng gồm ${expectedScenes} cảnh.
               ${dialoguePromptInstruction}
               - Mỗi cảnh cũng phải có:
                 - "id": Số thứ tự.
                 - "description": Mô tả cảnh (Tiếng Việt).
                 - "characters_present": Mảng tên nhân vật có trong cảnh (PHẢI DÙNG TÊN ĐẦY ĐỦ bạn vừa tạo ở NHIỆM VỤ 2).
                 ${veoPromptInstruction}
            
            QUY TẮC TỐI THƯỢNG: 
            Tất cả tên nhân vật trong "dialogues", "characters_present" và "veo_prompt" BẮT BUỘC phải khớp 100% với tên nhân vật đầy đủ bạn đã tạo ở NHIỆM VỤ 2.
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString); // Trả về object lớn { story, characters, script }
    }, 'script generation');
};