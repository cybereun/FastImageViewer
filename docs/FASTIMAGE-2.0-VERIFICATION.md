# FastImage 2.0/2.0.1/2.0.2 Verification Record

검증 기준일: 2026-08-30  
작업 checkout: `L:\Codex-L\fast-image`

## 자동 검증

| 명령 | 결과 |
| --- | --- |
| `npm ci --no-audit --no-fund` | exit 0 |
| `npm test -- --run` | exit 0 — 3 files, 10 tests passed |
| `npm run typecheck` | exit 0 |
| `node --check electron/main.js` | exit 0 |
| `node --check electron/preload.js` | exit 0 |
| `node --check electron/file-system.js` | exit 0 |
| `node --check electron/preferences.js` | exit 0 |
| `node --check electron/update-utils.js` | exit 0 |
| `node --check electron/update-service.js` | exit 0 |
| `npm run build` | exit 0 — Vite production bundle generated |
| `npm run electron:build` | portable artifact generated successfully |

## 배포 산출물

- 파일: `L:\Codex-L\fast-image\dist-electron\FastImage-2.0.2-Windows-Portable.exe`
- 크기: 75,651,449 bytes
- SHA-256: `D15438F34AC6A5FEAD7A707409C751A8BB4AF2F6290472E0C5C6C90489FD4E39`
- unpacked 실행본: `L:\Codex-L\fast-image\dist-electron\win-unpacked\FastImage.exe`

## 자동 업데이트 검증

- `electron/update-utils.test.mjs`에서 SemVer 비교, 포터블 자산 정확 매칭, SHA-256 digest 파싱을 검증했습니다.
- 앱은 고정된 GitHub 저장소의 최신 안정 Release에서 `FastImage-X.Y.Z-Windows-Portable.exe`만 선택합니다.
- 다운로드 파일은 사용자 데이터의 `updates` 임시 영역에 저장하고, 크기·SHA-256 검증이 끝난 뒤 다음 실행용 manifest를 기록합니다.
- 실행 중인 포터블 EXE는 PowerShell 교체 도우미가 프로세스 종료를 기다린 뒤 교체하고 새 EXE를 재실행합니다.
- `.github/workflows/release.yml`은 `vX.Y.Z` 태그 push 시 Windows 빌드·테스트·GitHub Release 업로드를 수행합니다.

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
- [ ] 하단 전체 이미지 가로 탭, 활성 이미지 표시, 우측 버전 표시 및 버전 클릭
- [ ] 새 GitHub Release가 있을 때 시작 후 업데이트 안내창 표시
- [ ] 업데이트 안내창에서 릴리스 내용·버전·다운로드 진행률 표시
- [ ] 다운로드 완료 후 SHA-256 검증 및 앱 재시작·포터블 EXE 교체
- [ ] 인터넷 오류, 잘못된 자산, 동일 버전 Release에서 현재 앱 유지
- [ ] EXE에 이미지 파일을 연결해 실행했을 때 파일 열기

수동 체크 항목은 GUI 실행 환경에서 사용자가 실제 파일을 선택해야 하므로, 자동 빌드 검증과 구분해 남겼습니다.

## 동기화 기록

- 작업 전 Y: 원본 checkout은 변경하지 않고 L: 작업본에서만 개발했습니다.
- 검증 후 GitHub `v2.0.0` 및 `v2.0.1` 태그/릴리스에 포터블 EXE를 업로드했습니다.
- 같은 검증된 소스·문서·실행파일을 Y: checkout에 복사했습니다.
- `v2.0.1` 업데이트 자산은 GitHub API에서 `uploaded` 상태와 SHA-256 digest를 확인했고, Y: 실행파일 해시도 L:과 일치했습니다.
- `v2.0.1`부터는 `vX.Y.Z` 태그 push 시 자동 배포하도록 GitHub Actions workflow를 추가했습니다.
