# 식권장부

동료끼리 식권(1장 = 10,000원)을 주고받은 기록을 남기고, 두 사람 사이에서 상쇄한 순잔액으로 "누가 누구에게 몇 장 갚을 차례인지"를 보여주는 웹앱.

- 설계: `docs/superpowers/specs/2026-10-22-coupon-pact-design.md`
- 디자인: `design/coupon-pact.pen` (pen.dev)
- 구현 계획: `docs/superpowers/plans/2026-10-22-coupon-pact.md`

## 실행

```bash
npm install
cp .env.example .env.local   # 값 채우기
npm run dev
```

| 변수 | 설명 |
|---|---|
| `SESSION_PASSWORD` | 로그인 쿠키 암호화용 32자 이상 임의 문자열 |
| `DATABASE_URL` | Supabase Postgres 연결 문자열 (Connect › Session pooler, 포트 5432). 비우면 로컬 PGlite(`data/pglite`) |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | 프로필 사진 저장(Supabase Storage `avatars` 버킷, 첫 업로드 때 자동 생성). 비우면 `data/uploads` |

`NEXT_PUBLIC_` 접두사는 쓰지 않는다. 브라우저는 Supabase에 직접 접근하지 않고, 모든 DB·스토리지 접근은 서버에서만 한다.

처음 연결하면 마이그레이션이 자동으로 실행되고 관리자 계정이 만들어진다.

- 관리자: `admin` / `admin1234!` (로그인 후 상단 "비밀번호 변경"으로 바꿀 것)
- 관리자가 추가한 회원의 처음 비밀번호: `0000`

## 스크립트

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm test` | Vitest (메모리 PGlite로 도메인·데이터 규칙 검사) |
| `npm run db:check` | `.env.local`의 Supabase에 연결해 마이그레이션·관리자 계정·RLS 확인 |
| `npm run db:generate` | `lib/db/schema.ts` 변경 후 마이그레이션 생성 |
| `npm run dev:seed` | 로컬 PGlite에 데모 회원·기록 넣기 (`DATABASE_URL`이 있으면 거부) |

데모 데이터로 화면을 보려면 `DATABASE_URL`을 비운 채로 실행한다: `npm run dev:seed` 후 `DATABASE_URL= npm run dev` (bash 기준).

## 구조

```
lib/db          스키마(users, transfers, memos), 연결, 관리자 시드
lib/domain      순잔액 계산 (순수 함수)
lib/data        회원 / 기록 / 메모 데이터 함수 — 모든 권한 규칙이 여기 있다
lib/auth        세션 쿠키(iron-session), 현재 사용자
app/(member)    메인, 이력, 마이페이지
app/admin       회원 관리, 기록 관리
app/account     비밀번호 변경 (회원·관리자 공용)
```

규칙 요약: 일반 회원은 기록을 지우거나 고칠 수 없고 철회만 한다(준 사람·받은 사람 모두 가능). 메모는 본인만 볼 수 있고 관리자도 못 본다. 날짜 수정과 기록 삭제는 관리자만.
