# FastImage 2.0

Windows용 로컬 우선 이미지 브라우저·정리 도구입니다. 폴더를 빠르게 스캔하고, 썸네일/뷰어/기본 편집/파일 정리를 한 앱에서 처리합니다.

개발자: **은준욱**

## 주요 기능

- Windows 폴더 트리 탐색, 최근 폴더 기억, 폴더 변경 감지
- 파일명 검색, 자연 정렬(이름·용량·날짜·평점), 형식·용량·날짜·평점 필터
- JPG/JPEG, PNG, GIF, BMP, WebP, SVG, ICO, TIFF, AVIF 지원
- 썸네일 지연 로딩 및 Electron 네이티브 메모리 캐시
- Ctrl/Shift 다중 선택, 키보드 탐색, 복사·잘라내기·붙여넣기, 일괄 복사/이동/삭제
- 충돌 안전 일괄 이름 변경 미리보기
- 즐겨찾기, 0–5점 평점, 색상 라벨, 태그 저장
- 검색/필터 결과와 동일한 컬렉션을 사용하는 뷰어
- 확대·축소·실제 픽셀·맞춤 보기, 커서 기준 줌, bounded pan, 회전, 슬라이드쇼, 전체화면
- 비파괴 편집 상태, Undo/Redo, 자르기 프리셋, 밝기·대비·채도, JPG/PNG/WebP Save As
- 동일 형식에 한해 명시적 원본 덮어쓰기와 Recycle Bin 삭제
- 한국어/영어, 다크/라이트 테마, 마우스 휠 동작, 삭제 확인 설정
- 이미지 파일/폴더 인수 실행과 Windows 파일 연결 설정
- 진단 정보 복사(이미지 데이터 및 업로드 없음)

## 기술 구조

- Electron + React 19 + TypeScript + Vite + Tailwind CSS
- `src/domain`: 순수 필터/정렬/선택 규칙과 단위 테스트
- `src/application`: 파일 레코드와 메타데이터를 화면 모델로 변환
- `electron`: 안전한 파일 작업, 썸네일, watcher, 설정 저장을 담당하는 IPC 경계
- 파일 삭제는 영구 삭제 대신 Windows Recycle Bin으로 이동합니다.

## 개발 환경

- Windows 10/11 권장
- Node.js 20.19 이상
- npm

## 설치 및 실행

```bash
git clone https://github.com/cybereun/FastImageViewer.git
cd FastImageViewer
npm ci
npm run electron:dev
```

검증 명령:

```bash
npm test
npm run typecheck
npm run build
```

## Windows 포터블 빌드

```bash
npm run electron:build
```

출력 파일:

- `dist-electron/FastImage-2.0.0-Windows-Portable.exe`
- `dist-electron/win-unpacked/`

## FastImage 2.0 작업 기록

사용자 원본 checkout은 `Y:\내 드라이브\AI\내가 만든 앱\Util\fast-image`에 보존하고, 작업용 복사본을 `L:\Codex-L\fast-image`에 만들어 기능을 구현했습니다. 구현 완료 후에는 L: 작업본을 검증하고 Git 원격 저장소와 Y: checkout에 동기화했습니다.

검증 결과와 수동 확인 항목은 [docs/FASTIMAGE-2.0-VERIFICATION.md](docs/FASTIMAGE-2.0-VERIFICATION.md)에 기록했습니다. 전체 변경 이력은 [CHANGELOG.md](CHANGELOG.md)에서 확인할 수 있습니다.

## 릴리스 버전 히스토리

- [`v2.0.0`](https://github.com/cybereun/FastImageViewer/releases/tag/v2.0.0) — 로컬 이미지 컬렉션, 안전한 일괄 파일 작업, 썸네일 캐시, 필터/메타데이터, 뷰어·편집기·설정 개선
- `v1.0.0` — 폴더 탐색, 썸네일 그리드, 이미지 뷰어, 기본 편집기, 파일 작업

## 알려진 제한

- 모든 처리는 로컬에서 수행되며 클라우드 동기화는 제공하지 않습니다.
- GIF 등 애니메이션 이미지는 편집/변환 시 첫 프레임 기준으로 처리될 수 있습니다.
- 편집 저장은 EXIF/ICC 등 원본 메타데이터를 보존하지 않을 수 있습니다.
- 원본 덮어쓰기는 형식 불일치로 인한 파일 손상을 막기 위해 동일 MIME 형식에서만 활성화됩니다.
- 코드 서명이 없는 포터블 파일은 첫 실행 시 Windows SmartScreen 경고가 표시될 수 있습니다.

## 라이선스

MIT
