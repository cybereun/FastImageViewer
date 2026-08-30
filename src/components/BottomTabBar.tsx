import { CheckCircle2, Image as ImageIcon, LoaderCircle } from 'lucide-react';
import type { Language } from '../i18n';
import { t } from '../i18n';
import type { ImageFile } from '../types';
import { cn } from '../utils/cn';

interface BottomTabBarProps {
  images: ImageFile[];
  activeImageId: string | null;
  status: 'ready' | 'scanning';
  language: Language;
  appVersion: string;
  onSelectImage: (index: number) => void;
  onVersionClick: () => void;
}

function ImageTab({
  image,
  active,
  onClick,
}: {
  image: ImageFile;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={image.name}
      title={image.name}
      onClick={onClick}
      className={cn(
        'group flex h-10 min-w-[150px] max-w-[230px] shrink-0 items-center gap-2 border-r border-gray-800 px-2 text-left transition-colors',
        active ? 'bg-blue-950/70 text-white' : 'text-gray-400 hover:bg-gray-800/80 hover:text-gray-100'
      )}
    >
      <span className={cn('flex h-7 w-9 shrink-0 items-center justify-center overflow-hidden rounded border', active ? 'border-blue-400/70 bg-blue-900/50' : 'border-gray-700 bg-gray-900')}>
        <img
          src={image.thumbnailUrl ?? image.url}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
        <ImageIcon size={14} className="shrink-0 text-gray-500" />
      </span>
      <span className="min-w-0 truncate text-xs">{image.name}</span>
    </button>
  );
}

export function BottomTabBar({
  images,
  activeImageId,
  status,
  language,
  appVersion,
  onSelectImage,
  onVersionClick,
}: BottomTabBarProps) {
  return (
    <div className="flex h-12 min-h-12 items-stretch border-t border-gray-800 bg-[#171717]" role="region" aria-label={t(language, 'imageTabsStatus')}>
      <div className="flex w-[190px] shrink-0 items-center justify-between gap-2 border-r border-gray-800 px-3 text-xs">
        <span className="truncate text-gray-300">{images.length} {t(language, 'items')}</span>
        <span className="flex shrink-0 items-center gap-1 text-gray-500">
          {status === 'scanning' ? <LoaderCircle size={13} className="animate-spin" /> : <CheckCircle2 size={13} className="text-emerald-400" />}
          {t(language, status)}
        </span>
      </div>

      <div className="scrollbar-thin min-w-0 flex-1 overflow-x-auto overflow-y-hidden" role="tablist" aria-label={t(language, 'imageTabs')}>
        <div className="flex h-full min-w-max items-stretch">
          {images.length > 0 ? images.map((image, index) => (
            <ImageTab
              key={image.id}
              image={image}
              active={activeImageId === image.id}
              onClick={() => onSelectImage(index)}
            />
          )) : (
            <div className="flex items-center px-4 text-xs text-gray-600">{t(language, 'noImages')}</div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onVersionClick}
        className="flex w-[118px] shrink-0 items-center justify-center border-l border-gray-800 px-3 text-xs font-medium tracking-wide text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        title={t(language, 'about')}
        aria-label={`${t(language, 'about')} FastImage ${appVersion}`}
      >
        FastImage&nbsp;v{appVersion}
      </button>
    </div>
  );
}
