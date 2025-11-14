import React, { useState } from 'react';
import { Character } from '../types';

interface CharacterCardProps {
  character: Character;
  // Cập nhật props
  onNameChange: (id: number, newName: string) => void;
  onDescriptionChange: (id: number, newDescription: string) => void;
  onPromptChange: (id: number, newPrompt: string) => void;
}

const CopyIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>);


const CharacterCard: React.FC<CharacterCardProps> = ({ character, onNameChange, onDescriptionChange, onPromptChange }) => {
    const [copySuccess, setCopySuccess] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(character.prompt);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    }

    return (
        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 space-y-4">
            
            {/* Hàng 1: Tên + Tag */}
            <div className="flex items-center gap-3">
                <input
                    type="text"
                    value={character.name}
                    onChange={(e) => onNameChange(character.id, e.target.value)}
                    className="flex-1 bg-transparent text-2xl font-bold text-cyan-400 p-1 -ml-1 focus:outline-none focus:bg-slate-700 rounded"
                />
                <span className="bg-yellow-500/20 text-yellow-300 text-xs font-semibold px-3 py-1 rounded-full">
                    Nhân vật chính
                </span>
            </div>
            
            {/* Hàng 2: Mô tả Tiếng Việt */}
            <div>
                 <textarea
                    rows={5}
                    value={character.description}
                    onChange={(e) => onDescriptionChange(character.id, e.target.value)}
                    className="w-full bg-transparent text-slate-300 p-1 focus:outline-none focus:bg-slate-700 rounded resize-none"
                    placeholder="Mô tả nhân vật (Tiếng Việt)"
                />
            </div>

            {/* Hàng 3: Prompt Tiếng Anh */}
            <div className="bg-slate-900 p-4 rounded-md border border-slate-600 space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Prompt tạo ảnh nhân vật (Tiếng Anh)
                </label>
                <textarea
                    rows={6}
                    value={character.prompt}
                    onChange={(e) => onPromptChange(character.id, e.target.value)}
                    className="w-full bg-transparent text-slate-300 font-mono text-sm p-1 focus:outline-none focus:bg-slate-700 rounded resize-none"
                    placeholder="English prompt for AI image generation..."
                />
                <button 
                    onClick={handleCopy} 
                    className="flex items-center justify-center w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
                >
                    <CopyIcon />
                    {copySuccess ? 'Đã sao chép!' : 'Sao chép'}
                </button>
            </div>
        </div>
    );
};

export default CharacterCard;