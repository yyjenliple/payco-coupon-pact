# 식권장부 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 식권(1장 = 10,000원) 주고받기 기록, 쌍별 순잔액 대시보드, 철회·개인 메모가 있는 이력, 관리자 회원/기록 관리를 갖춘 반응형 웹앱을 만든다.

**Architecture:** 기존 Next.js 16 App Router 프로젝트(`cacheComponents: true`)에 SQLite(Drizzle) 데이터 계층을 붙인다. 모든 비즈니스 규칙은 `lib/` 의 순수 함수와 `db`를 첫 인자로 받는 데이터 함수에 두고 Vitest로 검증한다. 화면은 서버 컴포넌트로 조회하고, 변경은 Server Actions가 데이터 함수를 호출한다. 세션은 iron-session 암호화 쿠키.

**Tech Stack:** Next.js 16.4.2, React 19.3, Tailwind CSS v4, TypeScript, drizzle-orm 0.45 + better-sqlite3 13 (+ drizzle-kit), bcryptjs 3, iron-session 9, server-only, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-10-22-coupon-pact-design.md` (화면 디자인: `design/coupon-pact.pen`, pen.dev MCP `execute`로만 열람. 프레임 이름은 스펙 4장 참조)

## Global Constraints

- AGENTS.md: 코드 작성 전 `node_modules/next/dist/docs/` 의 관련 가이드를 읽는다. Next 16에서 middleware는 `proxy.ts`(export `proxy`). `cookies()`/`searchParams`를 읽는 컴포넌트는 반드시 `<Suspense>` 안에 둔다(안 그러면 빌드 에러). `params`/`searchParams`는 Promise.
- 식권 1장 = 10,000원 고정. 금액 입력 UI 없음. 금액 표기 = `(장수 × 10000).toLocaleString('ko-KR') + '원'`, 양수면 `+` 접두.
- 시간: DB에는 UTC epoch ms 정수(`integer(..., { mode: 'timestamp_ms' })`). 표시·기간 계산은 `Asia/Seoul`. 표시 형식 `YYYY-MM-DD HH:MM`.
- 사번: 문자 종류 제한 없음. `<input maxLength={12}>` 로만 12자 제한, 서버/DB 길이 검증 없음. 앞뒤 공백 trim, 빈 값 불가.
- 관리자 로그인 아이디 `admin`, 시드 비밀번호 `admin1234!`. 일반 회원 초기 비밀번호 `0000`. 비밀번호는 bcrypt 해시(cost 10)만 저장.
- 새 비밀번호 최소 4자.
- 메모 최대 200자. 메모 조회·검색은 항상 `memos.user_id = 현재 사용자`. 관리자에게 메모를 반환하는 코드 경로 없음.
- 일반 회원: 기록 삭제·수정 불가, 철회만(준 사람/받은 사람). 관리자: 기록 생성·수정(날짜 포함)·삭제, 회원 생성·수정·소프트 삭제. 관리자는 기록의 당사자가 될 수 없다.
- 순잔액은 철회되지 않은 기록만으로 계산.
- 디자인 토큰(그대로): bg `#FFFFFF`, surface `#F6F6F8`, line `#EBEBEE`, ink `#1E1E22`, sub `#8B8B93`, red `#F0302B`, red-soft `#FFF0EF`. 아바타 파스텔 `#FFE3D6 #DDEBFF #E3F5E1 #F3E4FF #FFF3C9 #DFF4F4 #FFE0EA`. 폰트: IBM Plex Sans KR(본문), Black Han Sans(로고·메인 숫자·"밥 살 사람" 제목·순위만).
- UI 문구는 스펙의 한국어 문구를 그대로 사용. 부제·설명 문구 추가 금지.
- 반응형 기준 768px: 미만 = 하단 탭바(모바일 프레임), 이상 = 상단 내비(데스크톱 프레임).
- 실행 환경: 서버 한 대 상시 구동. DB 경로 `process.env.DATABASE_PATH ?? 'data/app.db'`, 업로드 `data/uploads/`. `data/`는 git 무시.

## Review Focus

- 같은 두 사람이 서로 여러 번 주고받고 일부가 철회된 경우 → 쌍별 순잔액이 상쇄·철회를 모두 반영해야 한다. (Task 2 `computeNets` 테스트)
- 다른 사람이 같은 기록에 남긴 메모 내용으로 검색 → 결과에 나오면 안 되고, 조회 결과에도 남의 메모가 실리면 안 된다. (Task 5 `listHistory` 테스트)
- 삭제된 회원: 로그인 실패, 쏘기 대상 검색에서 제외, 그러나 이력·보드에는 "삭제됨"으로 남고 잔액 유지. 같은 사번으로 재등록 가능. (Task 3, 4, 2 테스트)
- 이미 철회된 기록을 다시 철회하거나 제3자가 철회 시도 → 거부, 기존 철회자 기록 유지. (Task 5 테스트)
- 같은 `given_at` 을 가진 기록이 페이지 경계에 걸칠 때 → 커서(given_at, id)로 중복·누락 없이 이어져야 한다. (Task 5 테스트)

---

## File Structure

```
lib/
  db/schema.ts          Drizzle 테이블 정의 (users, transfers, memos)
  db/client.ts          createDb(path) / getDb() 싱글턴, 마이그레이션 + 관리자 시드
  errors.ts             DomainError(code, message)
  format.ts             formatKst, formatWon, monthAgoKst, initialsOf, avatarColorOf
  domain/balance.ts     순잔액·보드·내 요약·관계 상태 (순수 함수)
  auth/password.ts      hashPassword / verifyPassword
  auth/session.ts       iron-session 쿠키 읽기/쓰기 (server-only)
  auth/current-user.ts  getCurrentUser / requireMember / requireAdmin (server-only)
  data/users.ts         인증, 회원 CRUD(관리자), 내 프로필·비밀번호
  data/transfers.ts     쏘기, 철회, 이력 조회(필터·검색·커서), 관리자 기록 CRUD, 보드용 조회
  data/memos.ts         내 메모 저장/삭제
app/
  layout.tsx            폰트·토큰·Toast provider
  globals.css           Tailwind v4 @theme 토큰
  login/page.tsx, login/actions.ts
  (member)/layout.tsx   일반 회원 셸(TopNav/TabBar), 관리자는 /admin 으로
  (member)/page.tsx     메인
  (member)/history/page.tsx, history/actions.ts
  (member)/me/page.tsx, me/password/page.tsx, me/actions.ts
  admin/layout.tsx, admin/page.tsx(회원 관리), admin/records/page.tsx, admin/actions.ts
  avatars/[file]/route.ts 업로드 사진 서빙
  actions/common.ts     logout, giveCoupon, withdraw, saveMemo 액션
components/             Avatar, CreditorChip, ScopeToggle, Button, TabBar, TopNav, Sheet, Toast, ConfirmDialog, Field
proxy.ts                세션 쿠키 없으면 /login 으로 (낙관적 체크)
tests/                  Vitest (tests/helpers/db.ts = 메모리 DB 팩토리)
```

---

### Task 1: 데이터 기반 (의존성, 스키마, DB 클라이언트, 시드, 테스트 러너)

**Files:**
- Modify: `package.json` (scripts `test`: `vitest run`, `db:generate`: `drizzle-kit generate`), `.gitignore` (`/data`), `next.config.ts` (`experimental.serverActions.bodySizeLimit: '6mb'`)
- Create: `drizzle.config.ts`, `drizzle/` (생성된 마이그레이션), `vitest.config.ts`, `lib/db/schema.ts`, `lib/db/client.ts`, `lib/errors.ts`, `lib/auth/password.ts`, `tests/helpers/db.ts`, `.env.example`
- Test: `tests/db.test.ts`

**Interfaces:**
- Produces:
  - `schema.users`: `id` int pk autoincrement, `empNo` text not null, `name` text not null, `passwordHash` text not null, `isAdmin` boolean default false, `passwordChanged` boolean default false, `avatarPath` text null, `deletedAt` timestamp_ms null, `createdAt` timestamp_ms not null. 부분 유니크 인덱스 `users_emp_no_active` on `empNo` where `deleted_at is null`.
  - `schema.transfers`: `id`, `giverId`, `receiverId` (fk users), `givenAt` timestamp_ms, `createdBy` fk users, `withdrawnAt` null, `withdrawnBy` null fk, `editedAt` null, `editedBy` null fk, `createdAt`. 인덱스 `(given_at desc, id desc)`.
  - `schema.memos`: `id`, `transferId` fk transfers `onDelete: 'cascade'`, `userId` fk users, `body` text, `createdAt`, `updatedAt`, unique `(transfer_id, user_id)`.
  - `type Db = BetterSQLite3Database<typeof schema>`; `createDb(path: string): Db` (foreign_keys ON, journal_mode WAL, 마이그레이션 실행, `ensureAdmin`); `getDb(): Db` (globalThis 싱글턴, `DATABASE_PATH`, 디렉터리 자동 생성).
  - `ensureAdmin(db: Db): Promise<void>` — `empNo='admin'` 활성 관리자가 없으면 `admin1234!` 해시로 생성.
  - `class DomainError extends Error { code: 'FORBIDDEN'|'NOT_FOUND'|'INVALID'|'CONFLICT' }` (message = 사용자에게 보여줄 한국어).
  - `hashPassword(plain: string): Promise<string>`, `verifyPassword(plain: string, hash: string): Promise<boolean>` (bcryptjs, cost 10).
  - `tests/helpers/db.ts`: `makeTestDb(): Promise<Db>` (`:memory:`), `addMember(db, { name, empNo }): Promise<number>`, `addTransfer(db, { giverId, receiverId, givenAt?: Date, withdrawnBy?: number }): Promise<number>`.

- [ ] **Step 1: 의존성 설치**

Run: `npm i drizzle-orm better-sqlite3 bcryptjs iron-session server-only && npm i -D drizzle-kit @types/better-sqlite3 vitest vite-tsconfig-paths`
Expected: 설치 성공. better-sqlite3 네이티브 빌드가 실패하면 중단하고 오류를 보고한다.

- [ ] **Step 2: 실패하는 테스트 작성** — `tests/db.test.ts`

```ts
test('createDb seeds a hashed admin account', async () => {
  const db = await makeTestDb();
  const admin = db.select().from(users).where(eq(users.empNo, 'admin')).get();
  expect(admin?.isAdmin).toBe(true);
  expect(admin?.passwordHash).not.toBe('admin1234!');
  expect(await verifyPassword('admin1234!', admin!.passwordHash)).toBe(true);
});
test('ensureAdmin is idempotent', async () => {
  const db = await makeTestDb();
  await ensureAdmin(db);
  expect(db.select().from(users).where(eq(users.empNo, 'admin')).all()).toHaveLength(1);
});
test('emp_no is unique only among active users', async () => {
  const db = await makeTestDb();
  const id = await addMember(db, { name: '박준호', empNo: 'P-10412' });
  await expect(addMember(db, { name: '박준호2', empNo: 'P-10412' })).rejects.toThrow();
  db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id)).run();
  await expect(addMember(db, { name: '박준호', empNo: 'P-10412' })).resolves.toBeTypeOf('number');
});
test('deleting a transfer cascades its memos', async () => { /* addTransfer + insert memo, delete transfer, memos count 0 */ });
```

- [ ] **Step 3: 테스트 실패 확인** — Run: `npx vitest run tests/db.test.ts` / Expected: FAIL (모듈 없음)
- [ ] **Step 4: 스키마·클라이언트·시드·헬퍼 구현, `npm run db:generate` 로 `drizzle/` 마이그레이션 생성** (마이그레이션은 `migrate(db, { migrationsFolder: 'drizzle' })` 로 적용; 부분 유니크 인덱스는 `uniqueIndex(...).on(t.empNo).where(sql\`deleted_at is null\`)`)
- [ ] **Step 5: 테스트 통과 확인** — Run: `npx vitest run tests/db.test.ts` / Expected: 4 passed
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: add sqlite schema, admin seed and test harness"`

---

### Task 2: 순잔액 도메인 (순수 함수)

**Files:**
- Create: `lib/domain/balance.ts`, `lib/format.ts`
- Test: `tests/balance.test.ts`, `tests/format.test.ts`

**Interfaces:**
- Consumes: 없음 (순수)
- Produces:
  - `type Edge = { giverId: number; receiverId: number; withdrawn: boolean }`
  - `type PersonRef = { id: number; name: string; empNo: string; avatarPath: string | null; deleted: boolean }`
  - `computeNets(edges: Edge[]): Map<string, number>` — 키 `"${min}:${max}"`, 값 = count(min→max) − count(max→min), 철회 제외, 0인 쌍은 키 유지(관계 상태 "정산 끝" 판정용).
  - `owesOf(nets): Array<{ debtorId: number; creditorId: number; count: number }>` — count > 0만.
  - `buildBoard(owes, people: Map<number, PersonRef>, opts: { scope: 'all' | 'me'; meId: number }): BoardRow[]` where `BoardRow = { debtor: PersonRef; total: number; creditors: Array<{ person: PersonRef; count: number }> }`. 정렬: total 내림차순 → 이름 `localeCompare('ko')`. creditors: count 내림차순 → 이름. `scope:'me'`: 내 행(있으면) + 나에게 빚진 사람들의 행(creditors는 나만, total은 그 장수).
  - `mySummary(owes, meId): { receive: number; owe: number; net: number; oweTo: Array<{id;count}>; receiveFrom: Array<{id;count}> }` (각 목록 count 내림차순).
  - `relationStatus(nets, meId, otherId): { kind: 'receive'|'owe'|'settled'|'none'; count: number }` → 문구 `N장 받을 차례` / `N장 갚을 차례` / `정산 끝` / `주고받은 기록 없음` 은 `relationLabel(status): string`.
  - `format.ts`: `formatKst(d: Date): string` (`YYYY-MM-DD HH:MM`, Asia/Seoul), `formatWon(count: number): string` (`+20,000원`, `-10,000원`, `0원`), `monthAgoKst(now: Date): Date` (KST 기준 한 달 전 같은 날 00:00), `initialsOf(name: string): string` (2자 이상이면 끝 2자), `avatarColorOf(id: number): string` (파스텔 7색 `id % 7`).

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/balance.test.ts`

```ts
// ids: 1 하늘, 2 서연, 3 준호
test('nets cancel opposite directions', () => {
  const n = computeNets([e(1,3),e(1,3),e(1,3),e(3,1)]);
  expect(owesOf(n)).toEqual([{ debtorId: 3, creditorId: 1, count: 2 }]);
});
test('withdrawn edges are ignored', () => {
  expect(owesOf(computeNets([e(1,3), e(1,3,true)]))).toEqual([{ debtorId: 3, creditorId: 1, count: 1 }]);
});
test('fully cancelled pair is settled, not owed', () => {
  const n = computeNets([e(1,2), e(2,1)]);
  expect(owesOf(n)).toEqual([]);
  expect(relationStatus(n, 1, 2)).toEqual({ kind: 'settled', count: 0 });
  expect(relationStatus(n, 1, 3)).toEqual({ kind: 'none', count: 0 });
});
test('board sorts by total desc then name', () => { /* 최민지 4, 박준호 3, 김하늘 1, 오세린 1 → 순서 [최민지, 박준호, 김하늘, 오세린] */ });
test('board scope me keeps my row and people who owe me with only me as creditor', () => { /* 스펙 4.2 */ });
test('mySummary: receive 3, owe 1, net +2', () => { /* 준호→하늘 2, 민지→하늘 1, 하늘→다은 1 */ });
```

`tests/format.test.ts`: `formatKst(new Date('2026-10-22T03:31:00Z')) === '2026-10-22 12:31'`, `formatWon(2) === '+20,000원'`, `formatWon(-1) === '-10,000원'`, `formatWon(0) === '0원'`, `initialsOf('김하늘') === '하늘'`, `initialsOf('민') === '민'`, `monthAgoKst(new Date('2026-10-22T03:00:00Z'))` 가 `2026-09-22T00:00+09:00` 과 같은 시각.

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/balance.test.ts tests/format.test.ts` / Expected: FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — 같은 명령 / Expected: all passed
- [ ] **Step 5: Commit** — `git commit -m "feat: add net balance domain and formatting helpers"`

---

### Task 3: 회원 데이터 (인증, 관리자 회원 CRUD, 내 프로필·비밀번호)

**Files:**
- Create: `lib/data/users.ts`
- Test: `tests/users.test.ts`

**Interfaces:**
- Consumes: `Db`, `schema.users`, `hashPassword`, `verifyPassword`, `DomainError` (Task 1)
- Produces:
  - `authenticate(db, loginId: string, password: string): Promise<{ id: number; isAdmin: boolean } | null>` — trim한 loginId로 활성 사용자 조회, 삭제된 회원·불일치 모두 `null`.
  - `listMembers(db, q?: string): Member[]` — 활성·비관리자, 이름/사번 부분 일치, 이름순. `Member = { id; name; empNo; avatarPath; passwordChanged }`.
  - `searchGiveTargets(db, meId: number, q: string): Member[]` — listMembers에서 나 제외.
  - `allPeople(db): Map<number, PersonRef>` — 삭제 포함 모든 비관리자 (보드·이력 표시용).
  - `createMember(db, input: { name: string; empNo: string }): Promise<number>` — 비밀번호 `0000` 해시, `passwordChanged=false`.
  - `updateMember(db, id: number, input: { name: string; empNo: string }): void`
  - `deleteMember(db, id: number): void` — 소프트 삭제(`deletedAt=now`). 관리자 대상이면 `FORBIDDEN`.
  - `updateMyName(db, userId: number, name: string): void`, `setMyAvatar(db, userId: number, avatarPath: string): void`
  - `changeMyPassword(db, userId: number, input: { current: string; next: string; confirm: string }): Promise<void>` — 성공 시 `passwordChanged=true`.
  - 검증 메시지(그대로): 이름 trim 1~20자 아니면 `INVALID` "이름은 1~20자로 입력해 주세요"; 사번 빈 값 `INVALID` "사번을 입력해 주세요"; 사번 `admin`(대소문자 무시) 또는 활성 중복 `CONFLICT` "이미 쓰고 있는 사번이에요"; 현재 비밀번호 불일치 "현재 비밀번호가 맞지 않아요"; next 4자 미만 "4자 이상 입력해 주세요"; next ≠ confirm "새 비밀번호와 달라요".

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/users.test.ts`

```ts
test('new member logs in with 0000 and starts with passwordChanged=false', async () => {
  const id = await createMember(db, { name: '윤가람', empNo: 'A-2026-01' });
  expect(await authenticate(db, ' A-2026-01 ', '0000')).toEqual({ id, isAdmin: false });
  expect(listMembers(db)[0].passwordChanged).toBe(false);
});
test('admin logs in with admin / admin1234!', async () => { expect((await authenticate(db,'admin','admin1234!'))?.isAdmin).toBe(true); });
test('deleted member cannot log in, disappears from lists, stays in allPeople', async () => { /* ... deleted:true */ });
test('emp no longer than 12 chars is accepted server-side', async () => { await expect(createMember(db,{name:'긴사번',empNo:'ABCDEFGHIJKLMNOP'})).resolves.toBeTypeOf('number'); });
test('emp no admin and active duplicates are rejected', async () => { /* rejects CONFLICT '이미 쓰고 있는 사번이에요' for 'Admin' and duplicate */ });
test('admin account cannot be deleted', async () => { /* FORBIDDEN */ });
test('changeMyPassword validates in order and flips passwordChanged', async () => {
  // wrong current → '현재 비밀번호가 맞지 않아요'; next '123' → '4자 이상 입력해 주세요'; confirm mismatch → '새 비밀번호와 달라요'; success → authenticate with new works, old fails
});
test('searchGiveTargets excludes me, admin and deleted, matches name or emp no', async () => {});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/users.test.ts` / Expected: FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — Expected: all passed
- [ ] **Step 5: Commit** — `git commit -m "feat: add member auth, admin member management and password change"`

---

### Task 4: 기록 쓰기 규칙 (쏘기, 철회, 메모, 관리자 기록 CRUD)

**Files:**
- Create: `lib/data/transfers.ts` (쓰기 부분), `lib/data/memos.ts`
- Test: `tests/transfers-write.test.ts`, `tests/memos.test.ts`

**Interfaces:**
- Consumes: Task 1 schema/`DomainError`
- Produces:
  - `giveCoupon(db, actorId: number, receiverId: number, now = new Date()): number` — actor·receiver 모두 활성 비관리자, 서로 다름. 아니면 `FORBIDDEN`/`INVALID`.
  - `withdrawTransfer(db, actorId: number, transferId: number, now = new Date()): void` — actor가 준/받은 사람이 아니면 `FORBIDDEN` "내 기록만 철회할 수 있어요"; 이미 철회면 `CONFLICT` "이미 철회된 기록이에요".
  - `adminCreateTransfer(db, adminId, input: { giverId; receiverId; givenAt: Date }): number` — 미래 시각 `INVALID` "미래 시각은 넣을 수 없어요", giver = receiver `INVALID` "준 사람과 받은 사람이 같아요", 관리자 포함 시 `INVALID`.
  - `adminUpdateTransfer(db, adminId, transferId, input: 같은 형태): void` — 같은 검증 + `editedAt/editedBy` 기록.
  - `adminDeleteTransfer(db, adminId, transferId): void` — 하드 삭제(메모 cascade).
  - 관리자 함수는 `adminId`가 관리자가 아니면 `FORBIDDEN`. 일반 회원용 수정/삭제 함수는 만들지 않는다.
  - `saveMyMemo(db, userId: number, transferId: number, body: string): void` — 당사자 아니면 `FORBIDDEN`; trim 후 200자 초과 `INVALID` "메모는 200자까지 쓸 수 있어요"; 빈 문자열이면 내 메모 삭제; 아니면 upsert. 철회된 기록에도 저장 가능.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('giveCoupon records me as giver at now', () => {});
test('cannot give to myself, admin, or deleted member', () => {});
test('giver or receiver can withdraw and withdrawnBy is recorded', () => {
  const t = giveCoupon(db, haneul, junho);
  withdrawTransfer(db, junho, t);
  expect(get(t)).toMatchObject({ withdrawnBy: junho });
});
test('third party cannot withdraw; second withdraw is rejected and keeps first withdrawer', () => {});
test('admin edits set editedAt and editedBy; non-admin calling admin functions is FORBIDDEN', () => {});
test('admin cannot create future-dated or self transfer', () => {});
test('memo: party-only, 200 char limit, empty body deletes, one per user per transfer', () => {});
test('memo: giver and receiver keep separate memos on the same transfer', () => {});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/transfers-write.test.ts tests/memos.test.ts` / Expected: FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — Expected: all passed
- [ ] **Step 5: Commit** — `git commit -m "feat: add give, withdraw, private memo and admin transfer rules"`

---

### Task 5: 기록 읽기 (보드 데이터, 이력 조회·필터·검색·커서)

**Files:**
- Modify: `lib/data/transfers.ts` (읽기 함수 추가)
- Test: `tests/transfers-read.test.ts`

**Interfaces:**
- Consumes: Task 2 `Edge`, `PersonRef`; Task 3 `allPeople`
- Produces:
  - `allEdges(db): Edge[]` — 전체 기록(철회 여부 포함).
  - `type HistoryFilter = { from?: Date; to?: Date; giverId?: number; receiverId?: number; onlyMe?: boolean; q?: string }`
  - `type Cursor = { givenAt: number; id: number }`
  - `type HistoryItem = { id; giver: PersonRef; receiver: PersonRef; givenAt: Date; withdrawnBy: PersonRef | null; edited: boolean; myMemo: string | null }`
  - `listHistory(db, viewerId: number, filter: HistoryFilter, cursor: Cursor | null, limit = 30): { items: HistoryItem[]; nextCursor: Cursor | null }` — 정렬 `given_at desc, id desc`; 커서 조건 `(given_at < c.givenAt) or (given_at = c.givenAt and id < c.id)`; `to`는 포함(그날 23:59:59.999 KST까지는 호출 측이 넘김); `onlyMe` = giver 또는 receiver가 viewer; `q` = 준/받은 사람 이름·사번 또는 **viewer의 메모 본문** `LIKE %q%` (memos는 `transfer_id = t.id AND user_id = viewerId` 로만 LEFT JOIN); `myMemo` 도 같은 조인에서만.
  - `listAdminRecords(db, adminId: number, filter: Omit<HistoryFilter,'onlyMe'>, cursor, limit = 30): { items: Omit<HistoryItem,'myMemo'>[]; nextCursor }` — 관리자 확인, `q`는 이름·사번만, 메모 조인 없음.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('search matches my memo but never another user\'s memo', () => {
  const t = giveCoupon(db, haneul, junho);
  saveMyMemo(db, junho, t, '국밥');
  expect(listHistory(db, haneul, { q: '국밥' }, null).items).toHaveLength(0);
  expect(listHistory(db, junho, { q: '국밥' }, null).items.map(i => i.id)).toEqual([t]);
  expect(listHistory(db, haneul, {}, null).items[0].myMemo).toBeNull();
});
test('cursor paging over identical givenAt has no duplicates or gaps', () => {
  // 5 transfers at the same instant, limit 2 → pages [2,2,1], ids strictly descending overall, nextCursor null at end
});
test('from/to bounds and onlyMe, giverId, receiverId filters combine', () => {});
test('withdrawn items are returned with withdrawnBy; edited flag reflects editedAt', () => {});
test('listAdminRecords requires admin and never exposes memo text', () => {});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/transfers-read.test.ts` / Expected: FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인, 전체 테스트** — Run: `npm test` / Expected: all passed
- [ ] **Step 5: Commit** — `git commit -m "feat: add history query with private memo search and cursor paging"`

---

### Task 6: 세션, 로그인, 앱 셸, 공용 컴포넌트

먼저 읽을 문서: `node_modules/next/dist/docs/01-app/02-guides/authentication.md`, `authentication-with-cache-components.md`, `01-getting-started/16-proxy.md`, `13-fonts.md`, `07-mutating-data.md`.
디자인 확인: pen.dev 프레임 `Components`, `M · 로그인`, `D · 로그인`, `M · 메인`(탭바), `D · 메인`(상단 내비).

**Files:**
- Create: `lib/auth/session.ts`, `lib/auth/current-user.ts`, `proxy.ts`, `app/login/page.tsx`, `app/login/actions.ts`, `app/actions/common.ts`(logout만 이 태스크), `components/{Avatar,Button,Field,TopNav,TabBar,Sheet,Toast,ConfirmDialog,ScopeToggle}.tsx`, `app/(member)/layout.tsx`, `app/admin/layout.tsx`
- Modify: `app/layout.tsx` (lang `ko`, 폰트 변수, metadata title `식권장부`), `app/globals.css` (토큰을 `@theme`로, 다크모드 제거), 삭제 `app/page.tsx`(→ `(member)/page.tsx`가 대체)
- Test: `tests/session.test.ts`

**Interfaces:**
- Consumes: `authenticate`(Task 3), `getDb`
- Produces:
  - `session.ts`: 쿠키 이름 `coupon_session`, 30일, httpOnly, sameSite lax, `secure` = production. `readSession(): Promise<{ userId?: number }>`, `writeSession(userId: number)`, `clearSession()`. 내부 `sealSession(data, password)` / `unsealSession(seal, password)` 는 순수 export(테스트용). `SESSION_PASSWORD`(32자 이상) 없으면 명확한 에러.
  - `current-user.ts`: `getCurrentUser(): Promise<CurrentUser | null>`, `requireMember(): Promise<CurrentUser>` (없으면 `/login`, 관리자면 `/admin` redirect), `requireAdmin()` (아니면 `/`). `CurrentUser = { id; name; empNo; isAdmin; avatarPath; passwordChanged }`. 삭제된 사용자는 null.
  - `app/login/actions.ts`: `login(prev: { error?: string }, formData: FormData)` — 실패 시 `{ error: '사번이나 비밀번호가 맞지 않아요' }`, 성공 시 관리자 `/admin`, 회원 `/` redirect.
  - `logout()` — 세션 삭제 후 `/login`.
  - `proxy.ts`: `/login`, `/_next`, 정적 파일 외에 `coupon_session` 쿠키가 없으면 `/login` redirect.
  - 컴포넌트 props: `Avatar({ person: { id; name; avatarPath }, size: number })` (사진 없으면 파스텔 원 + `initialsOf`), `Sheet({ open, onClose, title, children })` (<768px 바텀시트, 이상은 가운데 모달), `Toast` = context `useToast().show({ message, actions?: { label; onClick }[] })` 5초, `ConfirmDialog({ title, body, confirmLabel, onConfirm })`, `ScopeToggle({ value: 'all'|'me', labels: [string,string], onChange })`.
  - 회원 셸: <768px 하단 캡슐 탭바 `홈 / 이력 / 마이`, 이상은 상단 바(로고 `식권장부`, `홈 / 이력 / 마이`, 내 아바타·이름). 관리자 셸: `회원 관리 / 기록 관리` + `admin` + `비밀번호 변경` + `로그아웃`(모바일은 상단 세그먼트 탭).
  - 레이아웃/페이지에서 세션 읽는 부분은 `<Suspense>` 안에.

- [ ] **Step 1: 실패하는 테스트** — `tests/session.test.ts`: `unsealSession(await sealSession({ userId: 7 }, PW), PW)` → `{ userId: 7 }`; 다른 비밀번호로 열면 `{}`.
- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/session.test.ts` / Expected: FAIL
- [ ] **Step 3: 세션·현재 사용자·proxy·로그인 페이지/액션·셸·공용 컴포넌트 구현**, `.env.local` 에 `SESSION_PASSWORD` 생성(커밋 안 함, `.env.example`에 키만)
- [ ] **Step 4: 테스트 통과 + 빌드** — Run: `npm test && npm run build` / Expected: 테스트 통과, 빌드 성공(Suspense 관련 에러 없음)
- [ ] **Step 5: 브라우저 확인** — `npm run dev` 후 390px·1440px에서 `/` → `/login` 리다이렉트, `admin`/`admin1234!` 로그인 → `/admin`, 틀린 비밀번호 → 오류 문구. 스크린샷을 pen 프레임 `M · 로그인`/`D · 로그인` 과 비교.
- [ ] **Step 6: Commit** — `git commit -m "feat: add session auth, login page and app shells"`

---

### Task 7: 메인 화면 (내 잔액, 식권 쏘기, 밥 살 사람 보드)

디자인: `M · 메인`, `M · 식권 쏘기 시트`, `D · 메인`.

**Files:**
- Create: `app/(member)/page.tsx`, `app/(member)/_components/{BalanceHero,GivePanel,Board,BoardRow,CreditorChip}.tsx`
- Modify: `app/actions/common.ts` (`giveCouponAction`, `withdrawAction`, `saveMemoAction`, `searchTargetsAction`)

**Interfaces:**
- Consumes: `requireMember`, `allEdges`, `allPeople`, `computeNets`, `owesOf`, `buildBoard`, `mySummary`, `relationStatus`, `relationLabel`, `searchGiveTargets`, `giveCoupon`, `withdrawTransfer`, `saveMyMemo`, `formatWon`
- Produces (Server Actions, `'use server'`, 모두 `requireMember()` 후 `getDb()` 데이터 함수 호출, `DomainError`는 `{ error: message }`로 반환, 성공 시 `refresh()`):
  - `searchTargetsAction(q: string): Promise<Array<Member & { status: string }>>`
  - `giveCouponAction(receiverId: number): Promise<{ transferId: number } | { error: string }>`
  - `withdrawAction(transferId: number): Promise<{ ok: true } | { error: string }>`
  - `saveMemoAction(transferId: number, body: string): Promise<{ ok: true } | { error: string }>`

- [ ] **Step 1: 페이지 구현** — 상단 `받을 식권 N장 / 갚을 식권 M장`, `다 정산하면 {formatWon(net)}`; `식권 쏘기` 버튼(모바일 Sheet "누구한테 쏠까요?", 데스크톱 왼쪽 인라인 검색, placeholder `이름이나 사번`, 행 버튼 `쏘기`); 쏜 뒤 토스트 `{이름}님에게 식권 1장 쐈어요` + `메모`(메모 입력 Sheet) + `되돌리기`(= `withdrawAction`). 보드 제목 `밥 살 사람`, `ScopeToggle` 라벨 `전체`/`나`, `?scope=me` URL 유지, 1위 숫자 빨강, 본인 행 `나` 태그, 삭제된 회원 회색 `삭제됨` 태그, 빈 상태 `아직 밥 살 사람이 없어요`.
- [ ] **Step 2: 빌드·테스트** — Run: `npm test && npm run build` / Expected: 통과
- [ ] **Step 3: 브라우저 확인** — 관리자로 회원 3명 추가(Task 9 전이면 `tests/helpers` 대신 임시 스크립트 `scripts/dev-seed.ts`로 회원·기록 시드, 커밋 포함) → 회원 로그인 → 쏘기 → 잔액·보드 즉시 갱신, 되돌리기 → 원복, `나` 토글. 390/1440 스크린샷을 pen 프레임과 비교.
- [ ] **Step 4: Commit** — `git commit -m "feat: add main dashboard with quick give and debtor board"`

---

### Task 8: 이력 화면 (요약, 필터, 검색, 무한 스크롤, 메모, 철회)

디자인: `M · 이력`, `M · 기록 상세 시트`, `M · 철회 확인`, `D · 이력`.

**Files:**
- Create: `app/(member)/history/page.tsx`, `app/(member)/history/actions.ts`, `app/(member)/history/_components/{HistorySummary,HistoryFilters,HistoryList,HistoryRow,RecordSheet,MemoBlock}.tsx`, `lib/history-params.ts`
- Test: `tests/history-params.test.ts`

**Interfaces:**
- Consumes: `listHistory`, `withdrawAction`, `saveMemoAction`, `mySummary`, `monthAgoKst`, `formatKst`
- Produces:
  - `parseHistoryParams(sp: Record<string, string | string[] | undefined>, now: Date): { filter: HistoryFilter; explicitPeriod: boolean }` — 쿼리 키 `from`,`to`(`YYYY-MM-DD`, KST), `giver`,`receiver`(id), `me`(`1`), `q`. `from` 없으면 `monthAgoKst(now)`, `explicitPeriod=false`.
  - `loadHistoryPage(filter: HistoryFilter, cursor: Cursor | null): Promise<{ items; nextCursor }>` (server action, 직렬화 가능한 형태로 Date → number).
  - 무한 스크롤: IntersectionObserver. `nextCursor`가 null이고 `explicitPeriod=false`이며 아직 확장 전이면 `from`을 지운 필터로 마지막 커서부터 계속 로드. 로딩 `이전 기록 불러오는 중`, 끝 `처음 기록까지 다 봤어요`, 결과 없음 `조건에 맞는 기록이 없어요`.
- UI 규칙: 상단 `내 식권 잔액`, `{이름}님에게 갚을 식권 N장`/`받을 식권 N장`; 검색 placeholder 모바일 `이름, 사번, 내 메모 검색`, 데스크톱 `이름, 사번, 내 메모`; 칩 `최근 1개월`(기간)/`준 사람`/`받은 사람`; `나만 보기`(모바일 스위치, 데스크톱 체크박스); 행 태그 `보냄`/`받음`/`철회됨`/`수정됨`, 철회 행은 흐리게+취소선+`{이름}님이 철회`; 메모 **기본 펼침**, 행별 토글, 목록 위 `메모 모두 접기`/`메모 모두 펼치기`(localStorage 키 `history.memos.collapsed`, try/catch); 내가 당사자인 미철회 행만 동작 — 모바일 행 탭 → RecordSheet(`기록 상세`, 일시 읽기 전용, `내 메모` + `나만 볼 수 있어요`, 카운터 `n/200`, textarea `maxLength={200}`, `철회` / `메모 저장`), 데스크톱 행 버튼 `메모`/`메모 추가`/`철회`; 철회 확인 `이 기록을 철회할까요?` / `잔액 계산에서 빠지고, {상대}님도 {나}님이 철회한 걸 볼 수 있어요.`

- [ ] **Step 1: 실패하는 테스트** — `tests/history-params.test.ts`: 빈 쿼리 → `from = monthAgoKst(now)`, `explicitPeriod=false`; `from=2026-09-01&to=2026-09-30` → `explicitPeriod=true`, `to`는 `2026-09-30 23:59:59.999 KST`; `me=1&q=국밥&giver=3` 매핑.
- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/history-params.test.ts` / Expected: FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 테스트·빌드** — Run: `npm test && npm run build` / Expected: 통과
- [ ] **Step 5: 브라우저 확인** — 40건 이상 시드 후 스크롤로 1개월 이후까지 이어지는지, 메모 저장·검색(상대 계정으로는 안 걸림), 철회 후 양쪽 계정에서 `{이름}님이 철회` 표시와 잔액 반영, 모두 접기 상태 새로고침 후 유지. pen 프레임과 비교.
- [ ] **Step 6: Commit** — `git commit -m "feat: add history with filters, private memos, withdraw and infinite scroll"`

---

### Task 9: 마이페이지와 비밀번호 변경

디자인: `M · 마이페이지`, `D · 마이페이지`, `M · 비밀번호 변경`.

**Files:**
- Create: `app/(member)/me/page.tsx`, `app/(member)/me/password/page.tsx`, `app/(member)/me/actions.ts`, `app/avatars/[file]/route.ts`, `lib/avatar-upload.ts`
- Modify: `app/admin/layout.tsx` (`비밀번호 변경` 링크 → `/me/password`, 관리자도 접근 허용)
- Test: `tests/avatar-upload.test.ts`

**Interfaces:**
- Consumes: `updateMyName`, `setMyAvatar`, `changeMyPassword`, `getCurrentUser`
- Produces:
  - `validateAvatar(file: { type: string; size: number }): string | null` — 허용 `image/jpeg`,`image/png`,`image/webp`, 최대 `5 * 1024 * 1024`; 오류 `JPG, PNG, WebP 사진만 올릴 수 있어요` / `5MB 이하 사진만 올릴 수 있어요`.
  - 저장 파일명 `${userId}-${Date.now()}.${ext}` (사용자 입력 파일명 사용 금지), `avatarPath` = 파일명. 라우트는 `^[0-9]+-[0-9]+\.(jpg|png|webp)$` 만 서빙, 그 외 404.
  - 액션: `updateProfileAction(prev, formData)` (name), `uploadAvatarAction(formData)`, `changePasswordAction(prev, formData)` → 성공 시 토스트 `비밀번호를 바꿨어요` 후 `/me`(관리자는 `/admin`).
- UI: 사번 읽기 전용 + 잠금, 라벨 `사번 (로그인 아이디)`; `사진 변경`; `비밀번호 변경` 행; `저장`; `로그아웃`.

- [ ] **Step 1: 실패하는 테스트** — `validateAvatar` 타입·크기 경계(5MB 정확히 허용, +1 거부, `image/gif` 거부).
- [ ] **Step 2: 실패 확인** — Run: `npx vitest run tests/avatar-upload.test.ts` / Expected: FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 테스트·빌드** — Run: `npm test && npm run build` / Expected: 통과
- [ ] **Step 5: 브라우저 확인** — 사진 업로드 후 메인·이력 아바타 반영, 이름 변경, `0000` → 새 비밀번호 변경 후 재로그인, 관리자 비밀번호 변경.
- [ ] **Step 6: Commit** — `git commit -m "feat: add profile page, avatar upload and password change"`

---

### Task 10: 관리자 화면 (회원 관리, 기록 관리)

디자인: `M · 회원 관리 (admin)`, `M · 회원 추가 시트`, `M · 회원 삭제 확인`, `M · 기록 관리 (admin)`, `D · 회원 관리 (admin)`, `D · 기록 관리 (admin)`.

**Files:**
- Create: `app/admin/page.tsx`, `app/admin/records/page.tsx`, `app/admin/actions.ts`, `app/admin/_components/{MemberTable,MemberSheet,RecordTable,RecordSheet}.tsx`

**Interfaces:**
- Consumes: `requireAdmin`, `listMembers`, `createMember`, `updateMember`, `deleteMember`, `listAdminRecords`, `adminCreateTransfer`, `adminUpdateTransfer`, `adminDeleteTransfer`, `allPeople`, `parseHistoryParams`
- Produces: 액션 `createMemberAction`, `updateMemberAction`, `deleteMemberAction`, `createRecordAction`, `updateRecordAction`, `deleteRecordAction`, `loadAdminRecordsPage` — 모두 `requireAdmin()` 선행, `DomainError` → `{ error }`.
- UI: 회원 — 제목 `회원 관리` + `{n}명`, 검색 `이름이나 사번`, `회원 추가`, 사번 입력 `maxLength={12}`, 안내 `처음 비밀번호는 0000으로 만들어져요`, 비밀번호 상태 `초기 비밀번호`/`변경함`, 모바일 `⋮` → 수정/삭제, 데스크톱 행 인라인 편집 `저장`/`취소`, 삭제 확인 `{이름}님을 삭제할까요?` / `로그인은 더 이상 안 되고, 주고받은 기록은 그대로 남아요.` 기록 — 제목 `기록 관리`, `기록 추가`(준 사람·받은 사람 선택, `datetime-local` KST), 컬럼 `준 사람 | 받은 사람 | 일자 | 상태`, 상태 `정상`/`{이름}님이 철회`/`수정됨`, 인라인 편집, 삭제 확인 `이 기록을 삭제할까요?` / `잔액에서 빠지고 되돌릴 수 없어요.`

- [ ] **Step 1: 구현**
- [ ] **Step 2: 테스트·빌드** — Run: `npm test && npm run build` / Expected: 통과
- [ ] **Step 3: 브라우저 확인** — 대시 포함 사번(`A-2026-001`) 회원 추가, 13자 입력이 막히는지, 중복 사번 오류, 삭제 후 해당 회원 로그인 실패·이력에 `삭제됨` 유지, 과거 날짜 기록 추가 → 회원 화면 잔액 반영, 기록 수정 → `수정됨`. 일반 회원으로 `/admin` 접근 시 `/` 로 이동.
- [ ] **Step 4: Commit** — `git commit -m "feat: add admin member and record management"`

---

### Task 11: 디자인 참조 내보내기, 문서, 최종 검증

**Files:**
- Create: `docs/design/*.png` (pen 프레임별), Modify: `README.md` (실행법: `.env.local`의 `SESSION_PASSWORD`, `npm run dev`, 관리자 계정, `data/` 백업)

- [ ] **Step 1: pen.dev `Export([...frameIds], 'png', 'docs/design')`** 로 모든 `M ·`/`D ·` 프레임을 내보내고 파일명을 프레임 이름(공백→`-`)으로 바꾼다.
- [ ] **Step 2: 전체 검증** — Run: `npm run lint && npm test && npm run build` / Expected: 오류 0, 테스트 전부 통과, 빌드 성공
- [ ] **Step 3: Commit** — `git commit -m "docs: add design exports and run instructions"`
