export interface Story {
  id: number;
  title: string;
  summary: string;
}

// Cập nhật kiểu Character
export interface Character {
  id: number;
  name: string;
  description: string; // Mô tả tiếng Việt
  prompt: string;      // Prompt tiếng Anh
  role: string;        // THÊM TRƯỜNG NÀY (ví dụ: "Nhân vật chính")
}

// Cập nhật Scene để dùng 'dialogues'
export interface Scene {
  id: number;
  description: string;
  dialogues: {
    character: string;
    line: string;
  }[];
  veo_prompt: string;
  characters_present: string[];
}

export interface Script {
  summary: string;
  scenes: Scene[];
}

export enum AppStep {
  STORY_IDEAS = 1,
  CHARACTER_CREATION = 2,
  SCRIPT_DISPLAY = 3,
}