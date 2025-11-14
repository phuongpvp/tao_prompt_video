import React from 'react';
import { Character } from '../types';

interface CharacterCardProps {
  character: Character;
  onNameChange: (id: number, newName: string) => void;
  onPromptChange: (id: number, newPrompt: string) => void;
}

const CopyIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>);


const CharacterCard: React.FC<CharacterCardProps> = ({ character, onNameChange, onPromptChange }) => {

    const handleCopy = () => {
        navigator.clipboard.writeText(character.prompt);
    }

    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-4 flex flex-col">
            
            <div className="flex-grow flex flex-col justify-between">
                <div>
                    <label htmlFor={`char-name-${character.id}`} className="block text-sm font-medium text-slate-300 mb-1">Tên nhân vật {character.id}</label>
                    <input
                        id={`char-name-${character.id}`}
                        type="text"
                        value={character.name}
                        onChange={(e) => onNameChange(character.id, e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-200 focus:ring-amber-500 focus:border-amber-500"
                    />
                </div>
                <div className="mt-4">
                    {/* === SỬA LỖI Ở ĐÂY === */}
                    <label htmlFor={`char-prompt-${character.id}`} className="block text-sm font-medium text-slate-300 mb-1">Mô tả nhân vật {character.id}</label>
                    <div className="relative">
                       <textarea
                            id={`char-prompt-${character.id}`}
                            rows={6}
                            value={character.prompt}
                            onChange={(e) => onPromptChange(character.id, e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-slate-200 focus:ring-amber-500 focus:border-amber-500 resize-none"
                        />
                         <button onClick={handleCopy} title="Sao chép prompt" className="absolute top-2 right-2 p-1.5 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 transition flex items-center">
                            <CopyIcon />
                         </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CharacterCard;