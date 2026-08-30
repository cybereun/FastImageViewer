# FastImage 2.0 Verification Record

검증 기준일: 2026-08-30  
작업 checkout: `L:\Codex-L\fast-image`

## 자동 검증

| 명령 | 결과 |
| --- | --- |
| `npm ci --no-audit --no-fund` | exit 0 |
| `npm test -- --run` | exit 0 — 2 files, 7 tests passed |
| `npm run typecheck` | exit 0 |
| `node --check electron/main.js` | exit 0 |
| `node --check electron/preload.js` | exit 0 |
| `node --check electron/file-system.js` | exit 0 |
| `node --check electron/preferences.js` | exit 0 |
| `npm run build` | exit 0 — Vite production bundle generated |
| `npm run electron:build` | portable artifact generated successfully |

## 배포 산출물

- 파일: `L:\Codex-L\fast-image\dist-electron\FastImage-2.0.0-Windows-Portable.exe`
- 크기: 75,643,545 bytes
- SHA-256: `36F06E0EDA553EBF2B89563EA6B5AF8196C662AA4E66DCE8C40F4C67A25F0C57`
- unpacked 실행본: `L:\Codex-L\fast-image\dist-electron\win-unpacked\FastImage.exe`

## 수동 확인 체크리스트

포터블 EXE 실행 후 아래 항목을 확인하도록 기능별 경로를 기록했습니다.

- [ ] 폴더 열기, 폴더 트리 확장/축소, 빈 폴더 및 권한 오류 표시
- [ ] 이미지 파일 다중 열기와 드래그 앤 드롭 임시 컬렉션
- [ ] 검색/정렬/형식·용량·날짜·평점 필터 결과가 뷰어 순서와 일치
- [ ] Ctrl/Shift 선택, Ctrl+A, 화살표/Enter/F2/Delete 단축키
- [ ] 다중 복사·이동·붙여넣기와 이름 충돌 시 `(1)` 파일명 처리
- [ ] 일괄 이름 변경 미리보기에서 중복 이름 차단
- [ ] 삭제 확인 후 Windows Recycle Bin 이동
- [ ] 즐겨찾기/평점/색상 라벨/태그 저장 후 앱 재시작 시 복원
- [ ] 뷰어 맞춤/1:1/커서 줌/팬/회전/슬라이드쇼/전체화면
- [ ] 편집기 before/after, crop preset, adjustments, undo/redo, Save As
- [ ] 동일 형식 원본 덮어쓰기 확인 대화상자 및 watcher 새로고침
- [ ] 설정의 한국어/영어, 다크/라이트, 삭제 확인, 휠 동작, 기본 폴더
- [ ] About의 진단 정보 복사 동작(이미지 데이터 미포함)
- [ ] EXE에 이미지 파일을 연결해 실행했을 때 파일 열기

수동 체크 항목은 GUI 실행 환경에서 사용자가 실제 파일을 선택해야 하므로, 자동 빌드 검증과 구분해 남겼습니다.

## 동기화 기록

- 작업 전 Y: 원본 checkout은 변경하지 않고 L: 작업본에서만 개발했습니다.
- 검증 후 GitHub `v2.0.0` 태그/릴리스에 포터블 EXE를 업로드했습니다.
- 같은 검증된 소스·문서·실행파일을 Y: checkout에 복사했습니다.
