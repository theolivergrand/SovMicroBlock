import React from 'react';

export type ActiveModalType = 'none' | 'passport' | 'catalog' | 'snip' | 'plan2d';

interface TopBarProps {
  activeModal: ActiveModalType;
  onOpenModal: (modal: ActiveModalType) => void;
  onRandomizeSeed: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeModal,
  onOpenModal,
  onRandomizeSeed,
}) => {
  return (
    <header className="relative z-20 flex items-center justify-between gap-8 px-6 py-3.5 bg-stone-950 border-b border-stone-800">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          onOpenModal('none');
        }}
        className="font-display text-lg font-bold tracking-wide text-stone-100 whitespace-nowrap shrink-0"
      >
        СовМодГен
      </a>

      {/* Zone 2: 4 concise single-line text navigation links */}
      <nav
        aria-label="Основная навигация"
        className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-300"
      >
        <button
          type="button"
          onClick={() => onOpenModal(activeModal === 'passport' ? 'none' : 'passport')}
          className={`hover:text-amber-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
            activeModal === 'passport' ? 'text-amber-400 underline' : ''
          }`}
        >
          Паспорт района
        </button>
        <button
          type="button"
          onClick={() => onOpenModal(activeModal === 'catalog' ? 'none' : 'catalog')}
          className={`hover:text-amber-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
            activeModal === 'catalog' ? 'text-amber-400 underline' : ''
          }`}
        >
          Каталог серий
        </button>
        <button
          type="button"
          onClick={() => onOpenModal(activeModal === 'snip' ? 'none' : 'snip')}
          className={`hover:text-amber-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
            activeModal === 'snip' ? 'text-amber-400 underline' : ''
          }`}
        >
          Соцкультбыт СНиП
        </button>
        <button
          type="button"
          onClick={() => onOpenModal(activeModal === 'plan2d' ? 'none' : 'plan2d')}
          className={`hover:text-amber-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
            activeModal === 'plan2d' ? 'text-amber-400 underline' : ''
          }`}
        >
          Генплан 2D
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onRandomizeSeed}
          className="px-4 py-2 text-xs font-semibold text-stone-950 bg-amber-500 rounded-md hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
        >
          Новый микрорайон
        </button>
      </div>
    </header>
  );
};
