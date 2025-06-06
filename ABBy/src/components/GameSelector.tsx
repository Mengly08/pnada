import React from 'react';

interface Props {
  selectedGame: 'mlbb' | 'freefire';
  onSelect: (game: 'mlbb' | 'freefire') => void;
}

export function GameSelector({ selectedGame, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={() => onSelect('mlbb')}
        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300 ${
          selectedGame === 'mlbb'
            ? 'border-purple-500 bg-purple-500/20'
            : 'border-white/20 hover:border-purple-500/50 bg-white/10'
        }`}
      >
        <img
          src="https://raw.githubusercontent.com/Cheagjihvg/feliex-assets/refs/heads/main/IMG_1324.JPG"
          alt="Mobile Legends"
          className="w-16 h-16 rounded-xl"
        />
        <div className="text-left">
          <h3 className="text-lg font-semibold text-white">Mobile Legends</h3>
          <p className="text-sm text-purple-200">Diamonds & Weekly Pass</p>
        </div>
      </button>
      
      <button
        onClick={() => onSelect('freefire')}
        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300 ${
          selectedGame === 'freefire'
            ? 'border-orange-500 bg-orange-500/20'
            : 'border-white/20 hover:border-orange-500/50 bg-white/10'
        }`}
      >
        <img
          src="https://raw.githubusercontent.com/Cheagjihvg/feliex-assets/refs/heads/main/IMG_1225.JPG"
          alt="Free Fire"
          className="w-16 h-16 rounded-xl"
        />
        <div className="text-left">
          <h3 className="text-lg font-semibold text-white">Free Fire</h3>
          <p className="text-sm text-orange-200">Diamonds & Special Items</p>
        </div>
      </button>
    </div>
  );
}
