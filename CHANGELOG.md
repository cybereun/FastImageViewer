# Changelog

## [2.0.0] - 2026-08-30

### Added

- 로컬 이미지 컬렉션과 개별 파일 열기, 드래그 앤 드롭 임시 컬렉션
- 폴더 변경 watcher, 최근/기본 폴더 설정, 원자적 preferences 저장
- 네이티브 썸네일 지연 로딩 및 메모리 캐시
- 검색, 자연 정렬, 형식·용량·날짜·평점 필터
- Ctrl/Shift 다중 선택, 키보드 탐색, 다중 파일 drag/copy/move/delete
- Recycle Bin 기반 삭제, 충돌 안전 파일명 생성, 일괄 이름 변경 미리보기
- 즐겨찾기, 평점, 색상 라벨, 태그 메타데이터
- 필터 결과 연동 뷰어, 실제 픽셀/맞춤 보기, 커서 줌, bounded pan, 슬라이드쇼, 전체화면
- 편집기 자르기 프리셋, 밝기/대비/채도, Undo/Redo, before/after, Save As 및 동일 형식 원본 덮어쓰기
- 한국어/영어 설정, 다크/라이트 테마, 삭제 확인/마우스 휠 설정
- 파일/폴더 command-line 인수와 Windows file association
- Vitest 도메인 테스트와 진단 정보 복사 기능

### Changed

- Electron IPC를 좁은 preload API 뒤로 정리하고 이미지/경로 입력을 검증
- 뷰어 순서를 원본 배열이 아니라 현재 검색·정렬·필터 컬렉션과 일치시킴
- 배치 파일 작업과 배치 rename은 작업 완료 후 한 번만 폴더를 갱신
- 오래된 browser-only `useFileSystem` hook 제거

### Verification

- `npm ci --no-audit --no-fund`
- `npm test -- --run` — 7 tests passed
- `npm run typecheck` — passed
- `npm run build` — passed
- `npm run electron:build` — portable Windows artifact created

## [1.0.0]

- Initial folder explorer, thumbnail grid, viewer, basic editor, and file operations.
