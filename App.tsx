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
    // Quay lại logic 3 bước
    const [step, setStep] = useState<AppStep>(AppStep.STORY_IDEAS);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Đang xử lý...');

    // State cho API Key (Giữ nguyên)
    const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
    const [userKeys, setUserKeys] = useState<string[]>([]);

    // Step 1 State
    const [storyIdea, setStoryIdea] = useState('');
    const [style, setStyle] = useState(VISUAL_STYLES[0]);
    const [narrationLanguage, setNarrationLanguage] = useState(NARRATION_LANGUAGES[0]);
    const [scriptStyle, setScriptStyle] = useState('Lời dẫn');
    const [numStories, setNumStories] = useState(3);
    const [generatedStories, setGeneratedStories] = useState<Story[]>([]);
    
    // Step 2 State
    const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null);
    const [numCharacters, setNumCharacters] = useState(2);
    
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
        setIsLoading(false); // Luôn dừng loading khi có lỗi
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
            // Gọi hàm service đã nâng cấp
            const characterDetails = await geminiService.generateCharacterDetails(selectedStory, numCharacters, style);
            // Map dữ liệu mới (có 'description')
            const initialCharacters = characterDetails.map((cd, i) => ({
                id: i + 1,
                name: cd.name,
                description: cd.description, // Thêm trường mới
                prompt: cd.prompt,
            }));
            setCharacters(initialCharacters);
            setStep(AppStep.CHARACTER_CREATION);
        } catch (error) {
            handleApiError(error);
        }
        setIsLoading(false);
    };

    // Cập nhật hàm này để xử lý 3 trường
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
    const downloadPrompts = () => { /* ... (Giữ nguyên code) ... */ };
    const languageToCode: { [key: string]: string } = { /* ... (Giữ nguyên code) ... */ };
    const downloadNarration = () => { /* ... (Giữ nguyên code) ... */ };
    const createProjectJson = (story: Story, characters: Character[], script: Script, style: string, duration: number, language: string) => { /* ... (Giữ nguyên code) ... */ };
    const downloadJson = () => { /* ... (Giữ nguyên code) ... */ };
    // (Copy & paste các hàm download từ file cũ của bạn)
    
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
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
                                <div>
                                    <label htmlFor="num-stories" className="block text-sm font-medium text-slate-300">Số ý tưởng</label>
                                    <input type="number" id="num-stories" value={numStories} onChange={(e) => setNumStories(parseInt(e.target.value, 10))} min="1" max="5" className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500" />
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
                                <div className="mt-6 bg-slate-800 p-6 rounded-lg shadow-lg flex items-center gap-6">
                                    <div>
                                        <label htmlFor="num-characters" className="block text-sm font-medium text-slate-300">Số lượng nhân vật chính</label>
                                        <input type="number" id="num-characters" value={numCharacters} onChange={(e) => setNumCharacters(parseInt(e.target.value, 10))} min="1" max="4" className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-amber-500 focus:border-amber-500" />
                                    </div>
                                    <button onClick={handleCreateCharacter} disabled={selectedStoryId === null || isLoading} className="self-end w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition">
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
                        {/* Wrapper mới cho danh sách nhân vật, giống ảnh của bạn */}
                        <div className="bg-slate-800 p-8 rounded-lg shadow-2xl space-y-8">
                           <h3 className="text-xl font-semibold text-cyan-400">Danh sách nhân vật</h3>
                           {characters.map(character => (
                                <CharacterCard 
                                    key={character.id} 
                                    character={character} 
                                    onNameChange={(id, value) => handleCharacterChange(id, 'name', value)}
                                    // Thêm onDescriptionChange
                                    onDescriptionChange={(id, value) => handleCharacterChange(id, 'description', value)}
                                    onPromptChange={(id, value) => handleCharacterChange(id, 'prompt', value)}
                                />
                            ))}
                        </div>
                        
                        {/* Khung thời lượng */}
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
                 const CopyButton = ({ textToCopy }: { textToCopy: string }) => { /* ... (Giữ nguyên code) ... */ };
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