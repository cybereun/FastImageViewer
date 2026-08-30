# Changelog

## [2.0.4] - 2026-08-30

### Fixed

- 업데이트 설치 예약 후 현재 앱을 자동 종료하지 않아 `업데이트를 적용하고 다시 시작합니다.` 상태에 멈추던 문제 수정

### Improved

- 다운로드 진행률에 현재 용량과 전체 용량을 함께 표시
- 설치 단계에 재시작 안내와 진행 상태 표시 추가
- 업데이트 설치 수명주기 회귀 테스트 추가

## [2.0.3] - 2026-08-30

### Changed

- 왼쪽 탐색창에 있던 항목 수·준비 상태 표시를 앱 전체 하단의 통합 푸터로 확장
- 이미지 가로탭을 제거하고 왼쪽과 오른쪽 콘텐츠 영역이 같은 푸터를 공유하도록 레이아웃 개선
- 통합 푸터 오른쪽에 `FastImage vX.Y.Z` 버전 표시와 About 창 연결 추가

## [2.0.2] - 2026-08-30

### Added

- 메인 화면 하단에 현재 컬렉션 전체를 가로 스크롤하는 이미지 탭 바 추가
- 이미지 탭 클릭으로 해당 이미지 뷰어 열기 및 현재 이미지 활성 상태 표시
- 하단 우측에 클릭 가능한 `FastImage vX.Y.Z` 버전 표시 추가

## [2.0.1] - 2026-08-30

### Added

- GitHub Release 기반 시작 시 업데이트 확인 및 업데이트 안내창
- 포터블 EXE 다운로드 진행률 표시, SHA-256 검증, 다음 실행 시 자동 설치
- `vX.Y.Z` 태그 push 후 Windows 실행파일을 빌드·업로드하는 GitHub Actions workflow
- 업데이트 버전 비교·릴리스 자산 선택·digest 파싱 단위 테스트

### Security and reliability

- 고정된 GitHub 저장소의 HTTPS Release API와 정확한 포터블 EXE 이름만 사용
- 다운로드 파일을 사용자 데이터의 임시 영역에 저장하고 검증 후에만 설치 예약
- 현재 실행파일은 별도 PowerShell 교체 도우미가 프로세스 종료를 기다린 후 교체

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
