export type Language = 'ko' | 'en';

type TranslationKey =
  | 'openFolder'
  | 'openFiles'
  | 'storage'
  | 'thisPc'
  | 'items'
  | 'ready'
  | 'scanning'
  | 'noFolders'
  | 'searchImages'
  | 'allFormats'
  | 'anySize'
  | 'anyDate'
  | 'anyRating'
  | 'favorites'
  | 'clearFilters'
  | 'batchRename'
  | 'settings'
  | 'about'
  | 'diagnosticsCopied';

const translations: Record<Language, Record<TranslationKey, string>> = {
  ko: {
    openFolder: '폴더 열기', openFiles: '이미지 파일 열기', storage: '저장소', thisPc: '내 PC', items: '개 항목', ready: '준비됨', scanning: '검색 중…', noFolders: '불러온 폴더가 없습니다.', searchImages: '이미지 검색…', allFormats: '모든 형식', anySize: '모든 용량', anyDate: '모든 날짜', anyRating: '모든 평점', favorites: '즐겨찾기', clearFilters: '필터 지우기', batchRename: '일괄 이름 변경', settings: '설정', about: 'FastImage 정보', diagnosticsCopied: '진단 정보가 클립보드에 복사되었습니다.',
  },
  en: {
    openFolder: 'Open Folder', openFiles: 'Open Image Files', storage: 'Storage', thisPc: 'This PC', items: 'items', ready: 'Ready', scanning: 'Scanning…', noFolders: 'No folders loaded.', searchImages: 'Search images…', allFormats: 'All formats', anySize: 'Any size', anyDate: 'Any date', anyRating: 'Any rating', favorites: 'Favorites', clearFilters: 'Clear filters', batchRename: 'Batch rename', settings: 'Settings', about: 'About FastImage', diagnosticsCopied: 'Diagnostics copied to the clipboard.',
  },
};

export function t(language: Language, key: TranslationKey): string {
  return translations[language][key];
}
