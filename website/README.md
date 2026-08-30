# FastImage 프로모션 사이트

FastImage 2.0을 소개하고 Windows 실행파일을 다운로드할 수 있는 정적 홍보 사이트입니다.
사이트는 `index.html`, `styles.css`, `script.js`만으로 동작하며, 데스크톱 앱 본체와 별도로
관리됩니다.

- 개발자: **Lebi_Cybereun**
- 저작권: **© 2026 Lebi_Cybereun** · **MIT License**
- 문의: **cybereunny@gmail.com**
- 추천 릴리즈: **v2.0.6**
- 실행 대상: **Windows 10/11 · x64**
- 개인정보 원칙: 이미지 파일은 외부 서버로 업로드되지 않음

## 로컬에서 보기

PowerShell에서 사이트 폴더로 이동한 뒤 아래 명령 중 하나를 실행합니다.

```powershell
py -m http.server 4173
```

또는 Node.js가 있다면:

```powershell
npx --yes serve . -l 4173
```

브라우저에서 <http://127.0.0.1:4173/>을 엽니다. 서버는 `Ctrl+C`로 종료합니다.

## 검증

```powershell
.\scripts\validate-site.ps1
```

검증 스크립트는 필수 파일, 시맨틱 랜드마크, 개발자명, v2.0.x 릴리즈 7개, 실제 GitHub
자산 파일명, HTTPS 링크, 원격 런타임 의존성 부재를 확인합니다.

브라우저에서 다음도 수동으로 확인하세요.

1. 360px, 768px, 1440px 폭에서 가로 스크롤이 생기지 않는지 확인합니다.
2. `Tab` 키로 스킵 링크, 메뉴, 다운로드, 필터, FAQ, 푸터 링크를 이동하고 포커스 링을
   확인합니다.
3. JavaScript를 차단해도 본문과 릴리즈 다운로드 링크가 보이는지 확인합니다.
4. 운영체제의 모션 감소 설정에서 장식 애니메이션이 억제되는지 확인합니다.

### 현재 검증 기록

- `scripts/validate-site.ps1`: PASS
- `node --check script.js`: PASS
- `http://127.0.0.1:4173/`, `/styles.css`, `/script.js`: 모두 HTTP 200 응답 확인
- GitHub 공개 릴리즈 API와 비교한 실행파일 링크 8개: 모두 실제 자산과 일치
- Codex 내장 브라우저의 로컬 페이지 보안 검사가 현재 차단되어 자동 스크린샷 점검은 수행하지
  못했습니다. 위의 폭·키보드·JavaScript 차단·모션 감소 항목은 브라우저에서 한 번 확인해 주세요.

## 릴리즈 갱신

새 GitHub Release를 공개하면 `index.html`의 현재 추천 버전, 히어로 CTA, 릴리즈 카드, 푸터
버전을 함께 갱신합니다. 먼저 아래 명령으로 공개 자산 이름을 확인한 뒤 링크를 수정합니다.

```powershell
gh api repos/cybereun/FastImageViewer/releases?per_page=20
```

링크는 반드시 공개된 실제 자산만 사용하고, 패키지가 없는 경우 버튼을 만들지 않습니다.
수정 후 `scripts/validate-site.ps1`과 로컬 브라우저 점검을 다시 실행합니다.

## 정적 호스팅

`website` 폴더 전체를 GitHub Pages, Netlify 등 정적 호스팅 서비스의 publish directory로
사용할 수 있습니다. 이 작업에는 공개 배포나 도메인 연결은 포함하지 않았습니다.

## 범위와 설계

밝은 펄/블루 기반 색상, 큰 타이포그래피, 모듈형 카드 리듬, 선택적 모션을 사용해 2026년형
제품 랜딩페이지 분위기를 만들었습니다. 외부 폰트·이미지 CDN·분석 스크립트 없이 첫 화면의
제품 프리뷰를 CSS로 그려 빠른 첫 표시와 정적 호스팅을 유지합니다. 첫 접속 시에는 헤더와
히어로만 뷰포트에 맞춰 보여 주며, 신뢰 정보와 기능·릴리즈·FAQ는 휠 스크롤 이후 확인할 수
있도록 구성했습니다. 히어로 오른쪽 아래의 `SCROLL TO EXPLORE` 링크도 같은 흐름을 제공합니다.
