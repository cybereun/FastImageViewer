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
  | 'diagnosticsCopied'
  | 'updateAvailable'
  | 'currentVersion'
  | 'newVersion'
  | 'releaseNotes'
  | 'updateNow'
  | 'later'
  | 'downloadingUpdate'
  | 'installingUpdate'
  | 'updateCheck'
  | 'upToDate'
  | 'updateCheckFailed'
  | 'updateUnsupported'
  | 'updateDevelopment'
  | 'updateNoNotes'
  | 'updateAutoInstallNote';

const translations: Record<Language, Record<TranslationKey, string>> = {
  ko: {
    openFolder: '폴더 열기', openFiles: '이미지 파일 열기', storage: '저장소', thisPc: '내 PC', items: '개 항목', ready: '준비됨', scanning: '검색 중…', noFolders: '불러온 폴더가 없습니다.', searchImages: '이미지 검색…', allFormats: '모든 형식', anySize: '모든 용량', anyDate: '모든 날짜', anyRating: '모든 평점', favorites: '즐겨찾기', clearFilters: '필터 지우기', batchRename: '일괄 이름 변경', settings: '설정', about: 'FastImage 정보', diagnosticsCopied: '진단 정보가 클립보드에 복사되었습니다.', updateAvailable: '새 업데이트가 있습니다', currentVersion: '현재 버전', newVersion: '새 버전', releaseNotes: '릴리스 내용', updateNow: '지금 업데이트', later: '나중에', downloadingUpdate: '업데이트 다운로드 중…', installingUpdate: '업데이트를 적용하고 다시 시작합니다…', updateCheck: '업데이트 확인', upToDate: '최신 버전입니다.', updateCheckFailed: '업데이트를 확인하지 못했습니다.', updateUnsupported: '현재 환경에서는 자동 업데이트를 지원하지 않습니다.', updateDevelopment: '개발 모드에서는 자동 업데이트를 설치하지 않습니다.', updateNoNotes: '이번 릴리스에 별도 설명이 없습니다.', updateAutoInstallNote: '다운로드가 끝나면 앱이 자동으로 다시 시작되고 새 버전으로 교체됩니다.',
  },
  en: {
    openFolder: 'Open Folder', openFiles: 'Open Image Files', storage: 'Storage', thisPc: 'This PC', items: 'items', ready: 'Ready', scanning: 'Scanning…', noFolders: 'No folders loaded.', searchImages: 'Search images…', allFormats: 'All formats', anySize: 'Any size', anyDate: 'Any date', anyRating: 'Any rating', favorites: 'Favorites', clearFilters: 'Clear filters', batchRename: 'Batch rename', settings: 'Settings', about: 'About FastImage', diagnosticsCopied: 'Diagnostics copied to the clipboard.', updateAvailable: 'An update is available', currentVersion: 'Current version', newVersion: 'New version', releaseNotes: 'Release notes', updateNow: 'Update now', later: 'Later', downloadingUpdate: 'Downloading update…', installingUpdate: 'Applying the update and restarting…', updateCheck: 'Check for updates', upToDate: 'You are up to date.', updateCheckFailed: 'Could not check for updates.', updateUnsupported: 'Automatic updates are not supported in this environment.', updateDevelopment: 'Automatic installation is disabled in development mode.', updateNoNotes: 'No release notes were provided.', updateAutoInstallNote: 'After the download finishes, FastImage will restart and replace itself with the new version.',
  },
};

export function t(language: Language, key: TranslationKey): string {
  return translations[language][key];
}
