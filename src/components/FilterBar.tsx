import { Filter, Star, X } from 'lucide-react';
import type { ImageFilterOptions } from '../domain/image';
import { cn } from '../utils/cn';
import type { Language } from '../i18n';
import { t } from '../i18n';

export type FormatFilter = 'all' | 'jpg' | 'png' | 'gif' | 'webp' | 'bmp' | 'svg' | 'tif' | 'avif';
export type SizeFilter = 'all' | 'under1' | '1to10' | 'over10';
export type DateFilter = 'all' | '7d' | '30d' | 'year';

interface FilterBarProps {
  format: FormatFilter;
  size: SizeFilter;
  date: DateFilter;
  favoriteOnly: boolean;
  minimumRating: number;
  onFormatChange: (value: FormatFilter) => void;
  onSizeChange: (value: SizeFilter) => void;
  onDateChange: (value: DateFilter) => void;
  onFavoriteChange: (value: boolean) => void;
  onMinimumRatingChange: (value: number) => void;
  onClear: () => void;
  language?: Language;
}

export function getFilterOptions(
  format: FormatFilter,
  size: SizeFilter,
  date: DateFilter
): ImageFilterOptions {
  const now = Date.now();
  const modifiedAfter = date === '7d'
    ? now - 7 * 24 * 60 * 60 * 1000
    : date === '30d'
      ? now - 30 * 24 * 60 * 60 * 1000
      : date === 'year'
        ? new Date(new Date().getFullYear(), 0, 1).getTime()
        : undefined;

  return {
    format,
    minSizeBytes: size === '1to10' ? 1024 * 1024 : size === 'over10' ? 10 * 1024 * 1024 : undefined,
    maxSizeBytes: size === 'under1' ? 1024 * 1024 : size === '1to10' ? 10 * 1024 * 1024 : undefined,
    modifiedAfter,
  };
}

export function FilterBar({
  format,
  size,
  date,
  favoriteOnly,
  minimumRating,
  onFormatChange,
  onSizeChange,
  onDateChange,
  onFavoriteChange,
  onMinimumRatingChange,
  onClear,
  language = 'en',
}: FilterBarProps) {
  const hasFilters = format !== 'all' || size !== 'all' || date !== 'all' || favoriteOnly || minimumRating > 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-800 bg-gray-900/80 px-4 py-1.5">
      <Filter size={13} className="text-gray-500" aria-hidden="true" />
      <select
        value={format}
        onChange={(event) => onFormatChange(event.target.value as FormatFilter)}
        className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none"
        aria-label="Filter by format"
      >
        <option value="all">{t(language, 'allFormats')}</option>
        <option value="jpg">JPG / JPEG</option>
        <option value="png">PNG</option>
        <option value="gif">GIF</option>
        <option value="webp">WebP</option>
        <option value="bmp">BMP</option>
        <option value="svg">SVG</option>
        <option value="tif">TIFF</option>
        <option value="avif">AVIF</option>
      </select>
      <select
        value={size}
        onChange={(event) => onSizeChange(event.target.value as SizeFilter)}
        className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none"
        aria-label="Filter by file size"
      >
        <option value="all">{t(language, 'anySize')}</option>
        <option value="under1">Under 1 MB</option>
        <option value="1to10">1–10 MB</option>
        <option value="over10">Over 10 MB</option>
      </select>
      <select
        value={date}
        onChange={(event) => onDateChange(event.target.value as DateFilter)}
        className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none"
        aria-label="Filter by modified date"
      >
        <option value="all">{t(language, 'anyDate')}</option>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="year">This year</option>
      </select>
      <select
        value={minimumRating}
        onChange={(event) => onMinimumRatingChange(Number(event.target.value))}
        className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none"
        aria-label="Filter by rating"
      >
        <option value={0}>{t(language, 'anyRating')}</option>
        {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}+ stars</option>)}
      </select>
      <button
        onClick={() => onFavoriteChange(!favoriteOnly)}
        className={cn(
          'flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors',
          favoriteOnly ? 'border-yellow-600 bg-yellow-900/40 text-yellow-200' : 'border-gray-700 bg-gray-800 text-gray-400 hover:text-white'
        )}
        aria-pressed={favoriteOnly}
      >
        <Star size={12} fill={favoriteOnly ? 'currentColor' : 'none'} />
        {t(language, 'favorites')}
      </button>
      {hasFilters && (
        <button onClick={onClear} className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-white">
          <X size={12} />
          {t(language, 'clearFilters')}
        </button>
      )}
    </div>
  );
}
