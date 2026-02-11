# Fast Image Viewer V1.0.0

로컬 폴더 이미지를 빠르게 탐색하고, 미리보기/뷰어/편집까지 한 번에 처리하는 데스크톱 이미지 뷰어입니다.  
개발자: **은준욱**

## 주요 기능

- 로컬 폴더 빠른 스캔 + 트리 탐색 + 썸네일 그리드
- 파일명 검색, 이름/용량/날짜 정렬, 썸네일 크기(S/M/L) 전환
- 몰입형 뷰어 키보드 탐색 (←/→, ESC, `+`, `-`, `0`, `R`)
- 확대/축소, 드래그 이동, 회전, 이전/다음 이동, 즉시 다운로드
- 이미지 정보 패널 (이름, 용량, 형식, 수정일, 경로)
- 내장 편집기 (회전/반전/리사이즈/품질 조절/JPG·PNG·WebP 저장)
- 썸네일 멀티 선택 및 파일 작업 (복사/이동/이름 변경/삭제)

## 기술 스택

- Electron
- React + TypeScript
- Vite
- Tailwind CSS
- electron-builder

## 개발 환경 요구사항

- Windows 10/11 권장
- Node.js 18+ (권장: 최신 LTS)
- npm

## 설치 및 실행 방법

```bash
git clone https://github.com/cybereun/FastImageViewer.git
cd FastImageViewer
npm install
```

개발 모드 실행:

```bash
npm run electron:dev
```

## 빌드 방법

프로덕션 빌드 + 무설치 EXE 생성:

```bash
npm run electron:build
```

생성 위치:

- 무설치 EXE: `dist-electron/FastImageViewer 1.0.0.exe`
- 압축 해제 실행본: `dist-electron/win-unpacked/`

## 무설치 EXE만 배포할 때

`dist-electron/FastImageViewer 1.0.0.exe` 파일만 전달하면 설치 없이 바로 실행할 수 있습니다.

## 참고 사항

- 처음 실행 시 Windows SmartScreen 경고가 나올 수 있습니다.
- 로컬 파일 시스템 접근 기반 앱이므로 폴더 읽기/쓰기 권한이 필요할 수 있습니다.
- 빌드 산출물(`dist`, `dist-electron`)은 Git 추적에서 제외됩니다.

## 라이선스

MIT
