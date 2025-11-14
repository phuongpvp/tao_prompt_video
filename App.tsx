import React, { useState, useEffect } from 'react';
import { AppStep, Story, Character, Script } from './types';
import { VISUAL_STYLES, NARRATION_LANGUAGES } from './constants';
// Import các hàm BYOK
import { setApiKeys, hasApiKeys, clearApiKeys } from './services/geminiService';
import * as geminiService from './services/geminiService';
import Loader from './components/Loader';
import CharacterCard from './components/CharacterCard';

// --- ICONS (Giữ nguyên) ---
const BackIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>);
const DownloadIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>);
const CreateNewIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110 2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>);
const KeyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 8a6 6 0 20-12 0 6 6 0 0012 0zm-6-3a1 1 0 110-2 1 1 0 010 2zm-2 4a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;

// --- COMPONENT POPUP NHẬP KEY (Giữ nguyên) ---
const ApiKeyModal = ({ isOpen, onClose, onSave, savedKeys }: { isOpen: boolean, onClose: () => void, onSave: (keys: string[]) => void, savedKeys: string[] }) => {
    const [inputVal, setInputVal] = useState('');
    useEffect(() => {
        if (isOpen) setInputVal(savedKeys.join('\n'));
    }, [isOpen, savedKeys]);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-xl p-6 max-w-lg w-full shadow-2xl border border-slate-600">
                <h3 className="text-xl font-bold text-amber-400 mb-2">🔐 Cấu hình API Key</h3>
                <p className="text-slate-300 text-sm mb-4">
                    Nhập Google Gemini API Key để bắt đầu. Key được lưu trên trình duyệt của bạn.
                    <br/><span className="text-xs text-slate-400">(Mẹo: Nhập nhiều key, mỗi dòng 1 key để tự động xoay vòng khi hết quota).</span>
                </p>
                <textarea
                    className="w-full h-32 bg-slate-900 text-slate-200 border border-slate-600 rounded p-3 font-mono text-sm"
                    placeholder="Dán API Key vào đây..."
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                />
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-700">
                     <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 underline text-sm">Lấy Key miễn phí</a>
                    <div className="flex gap-3">
                        {savedKeys.length > 0 && <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Đóng</button>}
                        <button onClick={() => onSave(inputVal.split('\n'))} className="px-6 py-2 bg-amber-500 text-slate-900 font-bold rounded hover:bg-amber-400 transition">Lưu Key</button>
                    </div>
                </div>
            </div>
        </div>
    );
};


function App() {
    const [step, setStep] = useState<AppStep>(AppStep.STORY_IDEAS);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Đang xử lý...');

    // State cho API Key
    const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
    const [userKeys, setUserKeys] = useState<string[]>([]);

    // Step 1 State
    const [storyIdea, setStoryIdea] = useState('');
    const [style, setStyle] = useState(VISUAL_STYLES[0]);
    const [narrationLanguage, setNarrationLanguage] = useState(NARRATION_LANGUAGES[0]);
    const [scriptStyle, setScriptStyle] = useState('Lời dẫn'); 
    const [numStories] = useState(1); 
    const [generatedStories, setGeneratedStories] = useState<Story[]>([]);
    
    // Step 2 State
    const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null);
    const [numMainCharacters, setNumMainCharacters] = useState(2);
    const [numSideCharacters, setNumSideCharacters] = useState(0); // Sửa lại mặc định là 0 cho hợp lý
    
    // Step 3 State
    const [characters, setCharacters] = useState<Character[]>([]);
    const [videoDuration, setVideoDuration] = useState(150);

    // Step 4 State
    const [script, setScript] = useState<Script | null>(null);

    // Logic BYOK (Giữ nguyên)
    useEffect(() => {
        const storedKeys = localStorage.getItem('VIDEO_SCRIPT_KEYS');
        if (storedKeys) {
            const keys = JSON.parse(storedKeys);
            if (keys.length > 0) {
                setUserKeys(keys);
                setApiKeys(keys);
            } else {
                setTimeout(() => setIsKeyModalOpen(true), 800);
            }
        } else {
             setTimeout(() => setIsKeyModalOpen(true), 800);
        }
    }, []);
    const handleSaveKeys = (rawKeys: string[]) => {
        const validKeys = rawKeys.map(k => k.trim()).filter(k => k.length > 10);
        if (validKeys.length === 0) { alert("Vui lòng nhập ít nhất 1 Key hợp lệ!"); return; }
        setUserKeys(validKeys);
        localStorage.setItem('VIDEO_SCRIPT_KEYS', JSON.stringify(validKeys));
        setApiKeys(validKeys);
        setIsKeyModalOpen(false);
    };
    const handleDeleteKeys = () => {
        if (window.confirm("Bạn có chắc muốn xóa API Key không?")) {
            setUserKeys([]);
            localStorage.removeItem('VIDEO_SCRIPT_KEYS');
            clearApiKeys();
            setIsKeyModalOpen(true);
        }
    };
    const handleApiError = (error: unknown) => {
        const message = (error instanceof Error) ? error.message : "Lỗi không xác định";
        alert(message);
        setIsLoading(false);
        if (message === 'MISSING_KEYS') {
            setIsKeyModalOpen(true);
        }
    };
    // Hết Logic BYOK

    const handleGenerateStories = async () => {
        if (!hasApiKeys()) { setIsKeyModalOpen(true); return; }
        setIsLoading(true);
        setLoadingMessage('Đang tạo ý tưởng...');
        try {
            const storiesData = await geminiService.generateStoryIdeas(storyIdea, style, numStories);
            setGeneratedStories(storiesData.map((s, i) => ({ ...s, id: i + 1 })));
        } catch (error) {
            handleApiError(error);
        }
        setIsLoading(false);
    };

    const handleCreateCharacter = async () => {
        if (!hasApiKeys()) { setIsKeyModalOpen(true); return; }
        const selectedStory = generatedStories.find(s => s.id === selectedStoryId);
        if (!selectedStory) { alert("Vui lòng chọn một câu chuyện"); return; }
        setIsLoading(true);
        setLoadingMessage('Đang tạo mô tả nhân vật...');
        try {
            const characterDetails = await geminiService.generateCharacterDetails(selectedStory, numMainCharacters, numSideCharacters, style);
            
            // === SỬA Ở ĐÂY: Tự động chèn "Solid white background." ===
            const initialCharacters = characterDetails.map((cd, i) => ({
                id: i + 1,
                name: cd.name,
                description: cd.description,
                // Thêm "Solid white background." vào cuối prompt
                prompt: `${cd.prompt.trim()}. Solid white background.`, 
                role: cd.role,
            }));
            
            setCharacters(initialCharacters);
            setStep(AppStep.CHARACTER_CREATION);
        } catch (error) {
            handleApiError(error);
        }
        setIsLoading(false);
    };

    const handleCharacterChange = (id: number, field: 'name' | 'prompt' | 'description', value: string) => {
        setCharacters(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleGenerateScript = async () => {
        if (!hasApiKeys()) { setIsKeyModalOpen(true); return; }
        const selectedStory = generatedStories.find(s => s.id === selectedStoryId);
        if (!selectedStory) return;

        setIsLoading(true);
        setLoadingMessage('Đang viết kịch bản và kiểm tra...');
        try {
            const result = await geminiService.generateScript(selectedStory, characters, videoDuration, narrationLanguage, scriptStyle);
            setScript(result);
            setStep(AppStep.SCRIPT_DISPLAY);
        } catch (error) {
            handleApiError(error);
        }
        setIsLoading(false);
    };

    // --- CÁC HÀM DOWNLOAD (Giữ nguyên) ---
    const downloadPrompts = () => {
        if (!script) return;
        const content = script.scenes.map(scene => scene.veo_prompt.trim()).join('\n');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prompts.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    const languageToCode: { [key: string]: string } = {
        'Tiếng Việt': 'vi', 'English': 'en', 'Français': 'fr', 'Español': 'es', '日本語': 'ja', '한국어': 'ko', '中文': 'zh',
    };
    
    const downloadNarration = () => {
        if (!script) return;
        const content = script.scenes.map(scene => 
            `--- Cảnh ${scene.id} ---\n` +
            scene.dialogues.map(d => `${d.character}: ${d.line}`).join('\n')
        ).join('\n\n');

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const langCode = languageToCode[narrationLanguage] || 'txt';
        a.download = `narration_${langCode}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const createProjectJson = (story: Story, characters: Character[], script: Script, style: string, duration: number, language: string) => {
        const createId = (name: string) => `char_${name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15)}`;
        const characterMap = new Map(characters.map(c => [c.name, createId(c.name)]));
        const languageToCodeMap: { [key: string]: string } = {
            'Tiếng Việt': 'vi-VN', 'English': 'en-US', 'Français': 'fr-FR', 'Español': 'es-ES', '日本語': 'ja-JP', '한국어': 'ko-KR', '中文': 'zh-CN',
        };
        const project = {
            version: "3.0.0", type: "project",
            projectId: `project_${story.title.toLowerCase().replace(/\s+/g, '_').slice(0, 20)}`,
            metadata: { title: story.title, genre: "adventure", style: style, mood: ["epic", "emotional"], audience: "Teen+", aspectRatio: "16:9", language: languageToCodeMap[language] || 'en-US', },
            continuity: { styleFingerprint: "generated_style_v1", globalSeed: Math.floor(Math.random() * 100000), locks: { characterLock: true, lightingLock: true, paletteLock: true, assetLock: true, scaleLock: true }, characterSeeds: Object.fromEntries(characters.map(c => [createId(c.name), Math.floor(Math.random() * 100000)])), },
            defaults: { lighting: "Natural", colorPalette: ["cold", "desaturated", "warm_firelight_accents"], pace: "normal", seedStrategy: "inherit_per_scene_then_offset_per_shot", styleStrength: 0.9, denoiseStrength: 0.35, negativePrompts: ["flicker", "model drift", "face/hand deformation"], cameraRules: { moveSpeed: "slow_to_medium", noHandheld: true, avoid: ["whip pans", "unmotivated angle flips"] } },
            characterDescriptions: characters.map(c => ({ id: createId(c.name), name: c.name, physicalAppearance: c.prompt, clothing: "Described in physical appearance prompt.", characterTraits: "Described in physical appearance prompt.", voiceType: "N/A", seed: Math.floor(Math.random() * 100000), })),
            assets: { props: {}, locations: {} },
            shotTemplates: { establishing_wide: { lens: "35mm eq.", move: "slow pan or slow dolly-in", durationHint: 4 }, medium: { lens: "50mm eq.", move: "gentle static with micro parallax", durationHint: 4 }, close_up: { lens: "75mm eq.", move: "subtle push-in", durationHint: 3 } },
            veo3Settings: { resolution: "1080p", fps: 24, motion: "medium", continuityPriority: true, seedRespect: "strict" },
            globalContext: { logline: story.summary, themes: ["survival", "friendship", "adventure"], visualPalette: { lighting: "Natural", colorPalette: ["cold_blues", "white_snow", "warm_orange_firelight"] } },
            audioVoSettings: { voiceGender: "male", language: languageToCodeMap[language] || 'en-US', paceBpm: 80, style: "dramatic narration", microphone: "studio condenser cinematic", fx: ["slight reverb 12%", "EQ warm low-mids"], musicDucking: "-10dB during narration", exportFormat: "wav, mono 48kHz" },
            scenes: script.scenes.map((scene) => ({
                type: "scene", inherit: "project", sceneId: `scene_${String(scene.id).padStart(3, '0')}`, sceneNumber: scene.id, sceneTitle: scene.description.slice(0, 70) + '...', durationSec: Math.round(duration / script.scenes.length), setting: { place: "Varies", timeOfDay: "day", locationId: "loc_generic" }, participatingCharacters: scene.characters_present.map(name => characterMap.get(name) || name), prompt: scene.veo_prompt,
                visual: { lighting: "Natural cold daylight", colorPalette: ["cold_blues", "white_snow", "desaturated_neutrals"], pace: "normal", shots: [{ id: `s${String(scene.id).padStart(3, '0')}`, template: "medium", camera: scene.description.slice(0, 70) + '...', durationHint: 4, seed: Math.floor(Math.random() * 100000), shotPrompt: scene.veo_prompt, }] },
                audio: { dialogues: scene.dialogues.map(d => ({ character: d.character, line: d.line })), music: { style: "orchestral", mood: "epic and emotional" }, sfx: ["howling winter wind", "footsteps in snow"] },
                meta: { order: scene.id, notes: "Generated from video script generator app.", generatedAt: new Date().toISOString() }
            })),
            export: { container: "mp4", codec: "h264", bitrateTarget: "12Mbps", generatedAt: new Date().toISOString() }
        };
        return project;
    }
    const downloadJson = () => {
        if (!script || !selectedStoryId) return;
        const selectedStory = generatedStories.find(s => s.id === selectedStoryId);
        if (!selectedStory) return;
        const projectJson = createProjectJson( selectedStory, characters, script, style, videoDuration, narrationLanguage );
        const content = JSON.stringify(projectJson, null, 2);
        const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedStory.title.replace(/\s+/g, '_')}_project.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const resetApp = () => {
        setStep(AppStep.STORY_IDEAS);
        setGeneratedStories([]);
        setSelectedStoryId(null);
        setCharacters([]);
        setScript(null);
    }
    
    // (Phần renderStep đã được sửa lại)
    const renderStep = () => {
        switch (step) {
            case AppStep.STORY_IDEAS:
                return (
                    <div>
                        <div className="bg-slate-800 p-8 rounded-lg shadow-2xl space-y-6">
                            <h2 className="text-2xl font-bold text-white mb-2">Bước 1: Tạo ý tưởng câu chuyện</h2>
                            <div className="space-y-2">
                                <label htmlFor="story-idea" className="block text-sm font-medium text-slate-300">Nhập thể loại hoặc ý tưởng câu chuyện</label>
                                <textarea id="story-idea" value={storyIdea} onChange={(e) => setStoryIdea(e.target.value)} rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-200 focus:ring-amber-500 focus:border-amber-500 placeholder-slate-400" placeholder="Ví dụ: một con quái vật khổng lồ tấn công thành phố, một bộ phim tài liệu về động vật hoang dã..." />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label htmlFor="style" className="block text-sm font-medium text-slate-300">Phong cách</label>
                                    <select id="style" value={style} onChange={(e) => setStyle(e.target.value)} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500">
                                        {VISUAL_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="narration-language" className="block text-sm font-medium text-slate-300">Ngôn ngữ</label>
                                    <select id="narration-language" value={narrationLanguage} onChange={(e) => setNarrationLanguage(e.target.value)} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500">
                                        {NARRATION_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="script-style" className="block text-sm font-medium text-slate-300">Kiểu kịch bản</label>
                                    <select id="script-style" value={scriptStyle} onChange={(e) => setScriptStyle(e.target.value)} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500">
                                        <option>Lời dẫn</option>
                                        <option>Lời thoại</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleGenerateStories} disabled={!storyIdea || isLoading} className="w-full bg-amber-500 text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-amber-400 disabled:bg-slate-600 disabled:cursor-not-allowed transition">
                                {isLoading ? 'Đang tạo...' : 'Tạo ý tưởng'}
                            </button>
                        </div>

                        {generatedStories.length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-xl font-bold mb-4">Chọn một câu chuyện để tiếp tục:</h3>
                                <div className="space-y-4">
                                    {generatedStories.map(story => (
                                        <div key={story.id} onClick={() => setSelectedStoryId(story.id)} className={`bg-slate-800 p-4 rounded-lg cursor-pointer border-2 transition ${selectedStoryId === story.id ? 'border-amber-500 bg-slate-700' : 'border-transparent hover:border-slate-600'}`}>
                                            <h4 className="font-bold text-amber-400">{story.title}</h4>
                                            <p className="text-sm text-slate-300 mt-1">{story.summary}</p>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="mt-6 bg-slate-800 p-6 rounded-lg shadow-lg flex flex-col md:flex-row items-start md:items-end gap-6">
                                    <div className="flex-grow">
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Số lượng nhân vật (tùy chọn):</label>
                                        <div className="flex gap-4">
                                            <div>
                                                <label htmlFor="num-main-characters" className="block text-xs font-medium text-slate-400">Nhân vật chính</label>
                                                <input type="number" id="num-main-characters" value={numMainCharacters} onChange={(e) => setNumMainCharacters(parseInt(e.target.value, 10))} min="1" max="5" className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500" />
                                            </div>
                                            <div>
                                                <label htmlFor="num-side-characters" className="block text-xs font-medium text-slate-400">Nhân vật phụ</label>
                                                <input type="number" id="num-side-characters" value={numSideCharacters} onChange={(e) => setNumSideCharacters(parseInt(e.target.value, 10))} min="0" max="5" className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500" />
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={handleCreateCharacter} disabled={selectedStoryId === null || isLoading} className="w-full md:w-auto bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition">
                                         {isLoading ? 'Đang tạo...' : 'Tiếp tục: Tạo nhân vật'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case AppStep.CHARACTER_CREATION:
                 return (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">Bước 2: Tinh chỉnh nhân vật</h2>
                        {/* === SỬA LẠI LAYOUT GRID 2 CỘT === */}
                        <div className="bg-slate-800 p-8 rounded-lg shadow-2xl">
                           <h3 className="text-xl font-semibold text-cyan-400 mb-6">Danh sách nhân vật</h3>
                           {/* Thêm grid-cols-2 */}
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               {characters.map(character => (
                                    <CharacterCard 
                                        key={character.id} 
                                        character={character} 
                                        onNameChange={(id, value) => handleCharacterChange(id, 'name', value)}
                                        onDescriptionChange={(id, value) => handleCharacterChange(id, 'description', value)}
                                        onPromptChange={(id, value) => handleCharacterChange(id, 'prompt', value)}
                                    />
                                ))}
                           </div>
                        </div>
                        
                        <div className="mt-6 bg-slate-800 p-6 rounded-lg shadow-lg flex items-center gap-6">
                            <div>
                                <label htmlFor="video-duration" className="block text-sm font-medium text-slate-300">Thời lượng video (giây)</label>
                                <input type="number" id="video-duration" value={videoDuration} onChange={(e) => setVideoDuration(parseInt(e.target.value, 10))} step="10" min="10" className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500" />
                            </div>
                            <button onClick={handleGenerateScript} disabled={isLoading} className="self-end w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-500 transition disabled:bg-slate-600">
                                {isLoading ? 'Đang tạo...' : 'Tiếp tục: Viết kịch bản'}
                            </button>
                        </div>
                        <button onClick={() => setStep(AppStep.STORY_IDEAS)} className="mt-6 flex items-center text-slate-400 hover:text-white transition"><BackIcon /> Quay lại</button>
                    </div>
                );
            case AppStep.SCRIPT_DISPLAY:
                 const CopyButton = ({ textToCopy }: { textToCopy: string }) => {
                    const [copied, setCopied] = useState(false);
                    const handleCopy = () => {
                        navigator.clipboard.writeText(textToCopy);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                    };
                    return (
                        <button onClick={handleCopy} className="text-slate-400 hover:text-white transition" title="Sao chép">
                            {copied ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>
                            )}
                        </button>
                    );
                };

                return (
                    <div>
                        <h2 className="text-3xl font-bold text-amber-400 mb-2">{generatedStories.find(s => s.id === selectedStoryId)?.title}</h2>
                        <p className="text-slate-300 mb-6 italic">{script?.summary}</p>
                        
                        <div className="flex flex-wrap gap-4 mb-8 p-4 bg-slate-800/80 backdrop-blur-sm rounded-lg sticky top-4 z-10 border border-slate-700">
                            <button onClick={downloadPrompts} className="bg-amber-500 text-slate-900 font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition flex items-center"><DownloadIcon /> Tải Prompts</button>
                            <button onClick={downloadNarration} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-500 transition flex items-center"><DownloadIcon /> Tải lời thoại</button>
                            <button onClick={downloadJson} className="bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-500 transition flex items-center"><DownloadIcon /> Tải JSON</button>
                            <button onClick={resetApp} className="ml-auto bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition flex items-center"><CreateNewIcon /> Tạo kịch bản mới</button>
                        </div>

                        <div className="space-y-6">
                            {script?.scenes.map(scene => (
                                <div key={scene.id} className="bg-slate-800 p-6 rounded-lg shadow-lg">
                                    <h3 className="font-bold text-xl text-amber-400 mb-4 border-b border-slate-700 pb-2">Cảnh {scene.id}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                                        <div className="md:col-span-3 space-y-4">
                                            <div>
                                                <h4 className="font-semibold text-slate-400 text-sm uppercase tracking-wider">Mô tả</h4>
                                                <p className="text-slate-200 mt-1">{scene.description}</p>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center">
                                                    <h4 className="font-semibold text-slate-400 text-sm uppercase tracking-wider">
                                                        {scriptStyle === 'Lời thoại' ? 'Lời thoại' : 'Lời dẫn'}
                                                    </h4>
                                                    <CopyButton textToCopy={scene.dialogues.map(d => `${d.character}: ${d.line}`).join('\n')} />
                                                </div>
                                                <div className="text-slate-200 mt-2 space-y-2 bg-slate-900/50 p-3 rounded-md border border-slate-700">
                                                    {scene.dialogues.map((dialogue, index) => (
                                                        <p key={index} className="text-sm">
                                                            <strong className="text-amber-400">{dialogue.character}:</strong>
                                                            <span className="italic ml-2">"{dialogue.line}"</span>
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 bg-slate-900 p-4 rounded-md">
                                             <div className="flex justify-between items-center mb-2">
                                                 <h4 className="font-semibold text-slate-400 text-sm uppercase tracking-wider">Prompt Video</h4>
                                                 <CopyButton textToCopy={scene.veo_prompt} />
                                             </div>
                                            <p className="text-sm font-mono text-amber-300 break-words">{scene.veo_prompt}</p>
                                            <div className="mt-4 border-t border-slate-700 pt-3">
                                                <h4 className="font-semibold text-slate-400 text-sm uppercase tracking-wider">Nhân vật</h4>
                                                <p className="text-sm text-slate-300 mt-1">{scene.characters_present.join(', ') || 'Không có'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
        }
    };
    
    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8">
            <ApiKeyModal isOpen={isKeyModalOpen} onClose={() => { if(userKeys.length > 0) setIsKeyModalOpen(false); }} onSave={handleSaveKeys} savedKeys={userKeys} />
            {isLoading && <Loader message={loadingMessage} />}
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-amber-400">Trình tạo kịch bản video</h1>
                <div>
                    {userKeys.length > 0 ? (
                        <div className="flex items-center gap-2 bg-slate-800 rounded-full p-1 pr-3 border border-slate-700">
                            <span className="px-2 py-1 rounded-full bg-green-900/30 text-green-400 text-xs font-bold flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div> {userKeys.length} Key
                            </span>
                            <button onClick={() => setIsKeyModalOpen(true)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full" title="Sửa Key"><EditIcon /></button>
                            <button onClick={handleDeleteKeys} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-full" title="Xóa Key"><TrashIcon /></button>
                        </div>
                    ) : (
                        <button onClick={() => setIsKeyModalOpen(true)} className="text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 bg-red-600 text-white hover:bg-red-500 animate-pulse">
                            <KeyIcon /> Nhập API Key
                        </button>
                    )}
                </div>
            </header>
            <main>
                {renderStep()}
            </main>
        </div>
    );
}

export default App;