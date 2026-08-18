# Thiết kế: lưu trữ bền vững cho nội dung bảng (D4 — phần nội dung)

Ngày: **2026-08-18**. Trạng thái: đã chốt thiết kế, chưa lập kế hoạch.

Track: **MindmapScreen**, phần "ruột bảng" — theo [[project_mindmap-charter]] chuẩn mực ở đây là bám
sát AFFiNE, không phải sáng tạo thêm. Kiến trúc lưu trữ tổng thể đã được chủ dự án duyệt từ trước ở
`docs/superpowers/specs/2026-08-12-nhung-edgeless-affine-design.md` §6 ("Lưu trữ (D4)"): chia đôi theo
bản chất dữ liệu — danh sách bảng (metadata) vào `src/lib/idb.ts`, nội dung bảng (CRDT + blob) qua lớp
đồng bộ có sẵn của AFFiNE. Spec này chỉ cụ thể hoá **nửa nội dung bảng** của quyết định đó.

**Ngoài phạm vi (đã chốt với chủ dự án lúc brainstorm):** danh sách bảng/metadata, nâng `DB_VERSION`
của `idb.ts`, và màn BoardGallery — dời sang chặng riêng khi thực sự cần (chặng đó mới cần khái niệm
"nhiều bảng"). Chặng này chỉ làm cho **đúng một bảng đang có** (id cứng `'bs-trong-board'`/`'board'`,
giữ nguyên) sống sót qua tải lại trang.

---

## 1. Vấn đề — board hiện không bền vững chút nào

`taoBangTrong()` (`src/board/EdgelessBoard.tsx:46-61`) dựng một `TestWorkspace` **mới tinh mỗi lần
mount**, không truyền `docSources`/`blobSources` (mặc định `NoopDocSource`/`MemoryBlobSource` —
không lưu gì) và **không bao giờ gọi `workspace.start()`**. Nội dung sống hoàn toàn trong bộ nhớ,
mất sạch khi tải lại trang.

`App.tsx` né hậu quả bằng một hack đã tự ghi chú lý do trong mã: giữ `<EdgelessBoard />` mount vĩnh
viễn sau lần mở tab đầu tiên (ẩn bằng CSS `invisible pointer-events-none` + `inert` khi đổi tab, không
bao giờ unmount thật). Chặng này **không đụng vào hack đó** (đã chốt lúc brainstorm) — chỉ làm cho
việc unmount/remount, nếu về sau có xảy ra, không còn mất dữ liệu.

## 2. Cơ chế đã có sẵn trong cây vendor — đo được, không suy luận

Đọc trực tiếp `src/vendor/blocksuite/framework/sync/src/`:

- **`IndexedDBDocSource`** (`doc/impl/indexeddb.ts:35`) — implement giao diện `DocSource` (`pull`,
  `push`, `subscribe`). Dùng gói `idb` (đã có trong `package.json`), một object store `'collection'`
  giữ các lượt cập nhật Yjs nhị phân. Có `BroadcastChannel` nội bộ (`'indexeddb:' + dbName`) để các
  tab cùng trình duyệt tự đồng bộ với nhau — **không cần thêm gì để có tính năng đó**.
- **`IndexedDBBlobSource`** (`blob/impl/indexeddb.ts:5`) — dùng gói `idb-keyval` (đã có sẵn), hai
  keyval store `` `${name}_blob` `` / `` `${name}_blob_mime` ``.
- **`DocEngine`** (`doc/engine.ts:47`) — nhận `(rootDoc, main, shadows, logger)`. Tự lắng
  `rootDoc.on('subdocs', ...)` (xác nhận ở `doc/peer.ts:255`) nên **subdoc `'board'` được đồng bộ
  theo root doc của workspace tự động** — chỉ cần nối `main` ở CHỖ DUY NHẤT là constructor của
  `TestWorkspace`, không cần nối riêng cho từng doc.
- Ghi xảy ra **liên tục theo từng lượt sửa**, không gộp tới lúc unmount: `peer.ts:185` gắn
  `doc.on('update', this.handleYDocUpdates)`, đẩy vào `pushUpdatesQueue` (`peer.ts:100-108`), một
  vòng lặp async liên tục rút hàng đợi đó ra và gọi `main.push(...)` (`peer.ts:294-300`). Rủi ro mất
  dữ liệu khi đóng tab đột ngột vì vậy **rất nhỏ** — không phụ thuộc một bước "flush lúc unmount".
- `TestWorkspace` (`framework/store/src/test/test-workspace.ts`) lộ đúng các hàm cần: `start()`
  (dòng 215-219, khởi cả `docSync`/`blobSync`/`awarenessSync`), `waitForSynced()` (228-230, uỷ quyền
  cho `docSync.waitForSynced()`), `forceStop()` (179-183, dừng cả ba, "có thể mất dữ liệu" theo
  docstring — chấp nhận được vì ghi đã gần-tức-thời, xem trên), `getDoc(docId): Doc | null` (190-193),
  `createDoc(docId?): Doc` (153-169, **ném lỗi nếu `docId` đã tồn tại** — điểm mấu chốt của §3).

Không có gói `y-indexeddb` thật nào trong `package.json` — tài liệu cũ gọi tắt lớp trên là
"y-indexeddb của AFFiNE" theo thói quen, không phải một phụ thuộc npm thật. Giữ cách gọi đó cho nhất
quán với tài liệu trước, nhưng import đúng từ `@blocksuite/sync` (đường dẫn thật, xem §4).

## 3. Vấn đề mấu chốt — phải rẽ nhánh "đã có/chưa có", không phải luôn seed

`createDoc('board')` ném lỗi nếu doc đã tồn tại. Với người dùng CŨ (mở app lần hai), sau
`waitForSynced()` thì `meta` (một phần của root doc, đồng bộ cùng lượt) **đã có sẵn** mục cho
`'board'` — `workspace.getDoc('board')` trả về non-null ngay, không cần đợi thêm gì khác (sự kiện
`meta.docMetaAdded` bắn đồng bộ theo lượt áp update, xem `test-workspace.ts:115-124`).

Nếu mã cứ gọi `createDoc('board')` không điều kiện như hiện tại: lần mở ĐẦU TIÊN thì ổn (doc chưa
có), nhưng **mọi lần mở sau đó đều ném lỗi ngay khi mount** — hỏng hoàn toàn tính năng, không phải
lỗi nhẹ.

**Quy tắc đúng:** sau `waitForSynced()`, gọi `getDoc('board')` trước. Có → dùng thẳng, KHÔNG thêm
block nào (seed lại là nhân đôi `affine:page`/`affine:surface` trên nội dung đã có). Không có (đúng
nghĩa lần đầu) → `createDoc('board')` rồi mới seed như hiện tại.

## 4. Kiến trúc

| File | Trạng thái | Việc |
|---|---|---|
| `src/board/EdgelessBoard.tsx` | sửa | `taoBangTrong()` → `taoHoacMoBang()`, đổi thành **async**, trả `{ workspace, store }` thay vì chỉ `store`. `EdgelessBoard()` (component) sửa `useEffect` để đợi promise đó, có trạng thái "đang mở", dọn bằng `workspace.forceStop()` lúc unmount. |
| `src/board/__tests__/edgeless-board.spec.ts` | sửa | Mở rộng ca kiểm `taoBangTrong` cũ cho hàm mới, thêm ca "gọi hai lần trên cùng cặp source → lần hai không tạo lại doc, không nhân đôi block". |
| `src/board/__tests__/edgeless-board-mount.spec.ts` | sửa | Thêm ca xác nhận trạng thái "đang mở" hiện ra trước, nội dung Lit hiện sau khi đồng bộ xong; ca unmount giữa chừng lúc đang chờ đồng bộ không rơi vào lỗi "set state sau unmount". |

### 4.1 `taoHoacMoBang()` — chữ ký mới

```ts
export async function taoHoacMoBang(tuyChon?: {
  docSources?: { main: DocSource }
  blobSources?: { main: BlobSource }
  hanGioMs?: number
}): Promise<{
  workspace: TestWorkspace
  store: ReturnType<Doc['getStore']>
}>
```

Tham số `tuyChon` CHỈ để ca kiểm tiêm `docSources`/`blobSources`/`hanGioMs` giả — component
`EdgelessBoard()` luôn gọi `taoHoacMoBang()` không đối số, dùng nguyên bộ mặc định thật
(`IndexedDBDocSource`/`IndexedDBBlobSource`, hạn giờ 4000 ms).

Các bước:

1. Dựng `docSources`/`blobSources` từ `IndexedDBDocSource`/`IndexedDBBlobSource` (tên CSDL
   `'drtrong-board'` — hằng số riêng, KHÔNG dùng mặc định `'blocksuite-local'` mơ hồ, và tách hẳn
   khỏi `'drtrong-ecg'` của `src/lib/idb.ts`).
2. `new TestWorkspace({ id: 'bs-trong-board', idGenerator: createAutoIncrementIdGenerator(),
   docSources, blobSources })`, `workspace.meta.initialize()`, `workspace.start()`.
3. **`await` `waitForSynced()` với TIMEOUT, không `await` trần.** — xem "ĐÍNH CHÍNH" ngay dưới, đây
   là chỗ bản nháp đầu của thiết kế này sai.
4. `const daCo = workspace.getDoc('board')`; nếu có → `doc = daCo`; nếu không →
   `doc = workspace.createDoc('board')` rồi seed `affine:page`+`affine:surface` như mã hiện tại
   (giữ nguyên `doc.getStore(...)`/`doc.load()` như cũ, chỉ seed block trong nhánh "chưa có").
5. Trả `{ workspace, store }`.

> **ĐÍNH CHÍNH (phát hiện lúc chuyển sang lập kế hoạch, 2026-08-18) — bản nháp §4.1 bước 1 ban đầu
> sai.** Bản đó định "bọc `try/catch` quanh việc dựng `IndexedDBDocSource`" để bắt lỗi mở IndexedDB.
> Đọc lại mã thật (`framework/sync/src/doc/impl/indexeddb.ts:39,45-54`): constructor CHỈ gán
> `dbName` và tạo `BroadcastChannel` — không hề chạm `indexedDB.open()`. Việc mở CSDL thật xảy ra
> TRỄ, bên trong `getDb()`, chỉ được gọi lúc `pull`/`push` thật sự chạy — sâu bên trong
> `workspace.start()`, không đồng bộ, không nằm trong tầm với của một `try/catch` quanh
> constructor.
>
> Nặng hơn: đọc `framework/sync/src/doc/peer.ts:329-345`, khi `pull`/`push` ném lỗi,
> `syncRetryLoop` **tự thử lại mỗi 5 giây, vô thời hạn** ("auto retry after 5 seconds if sync
> failed"), không bao giờ tự bỏ cuộc. `waitForSynced()` chỉ resolve khi trạng thái tới `Synced` —
> nếu IndexedDB hỏng vĩnh viễn (chế độ ẩn danh chặn hẳn, hay lỗi quyền), `await` trần trên hàm đó
> **treo mãi mãi**, màn "Đang mở bảng…" hiện vĩnh viễn — một hồi quy NẶNG HƠN hành vi hôm nay (board
> luôn hiện ra, chỉ là không lưu).
>
> **Sửa đúng: đua `waitForSynced()` với một hạn giờ.** Thêm tham số
> `taoHoacMoBang(hanGioMs = 4000)`. Nếu hạn giờ thắng trước khi đồng bộ xong: gọi
> `workspace.forceStop()` trên bản đã hỏng, dựng LẠI một `TestWorkspace` khác — lần này KHÔNG truyền
> `docSources`/`blobSources` (mặc định `NoopDocSource`/`MemoryBlobSource`, đúng hành vi hôm nay),
> `console.warn` nêu rõ lý do rơi về chế độ không lưu. Board vẫn seed như bình thường (bản mới không
> có doc `'board'` nào, luôn đi nhánh "lần đầu"). 4 giây là ước lượng hào phóng cho IndexedDB cục bộ
> (bình thường xong trong vài chục ms) mà vẫn đủ ngắn để không cảm thấy app treo.

### 4.2 `EdgelessBoard()` — component

`useEffect` hiện tại gọi `taoBangTrong()` đồng bộ rồi `litRender` ngay. Đổi thành:

```ts
useEffect(() => {
  const el = hostRef.current
  if (!el) return
  let huyBo = false
  let workspaceHienTai: TestWorkspace | null = null

  taoHoacMoBang().then(({ workspace, store }) => {
    if (huyBo) {
      // Component đã unmount trong lúc đang đợi đồng bộ — đóng ngay, không render, không giữ
      // engine chạy nền cho một cây Lit sẽ không bao giờ được gắn.
      workspace.forceStop()
      return
    }
    workspaceHienTai = workspace
    const std = new BlockStdScope({ store, extensions: viewManager.get('edgeless') })
    litRender(std.render(), el)
    setDangMo(false)
  })

  return () => {
    huyBo = true
    litRender(null, el)
    workspaceHienTai?.forceStop()
  }
}, [])
```

Thêm `const [dangMo, setDangMo] = useState(true)`. Trong lúc `dangMo`, hiển thị một trạng thái chờ
nhẹ (chữ "Đang mở bảng…", cùng khuôn Tailwind với dòng "Đang tải bảng vẽ…" của `Suspense fallback` ở
`src/board/index.tsx:90-94` — nhất quán thị giác giữa hai lớp chờ: tải chunk JS và mở CSDL cục bộ) —
lớp bọc `.drt-edgeless-viewport` vẫn render ngay (giữ đúng cấu trúc DOM ổn định cho `closest()` mà
comment hiện tại đã giải thích), chỉ nội dung bên trong đổi giữa "đang mở" và host div thật.

## 5. Vì sao KHÔNG chọn hai phương án khác

| | Cơ chế | Vì sao loại |
|---|---|---|
| B — tự lưu định kỳ | `Y.encodeStateAsUpdate(doc)` toàn bộ, ghi vào `idb.ts` theo chu kỳ hoặc theo sự kiện `update` | Tái phát minh đồng bộ tăng dần mà `DocEngine` đã giải quyết đúng (diff/merge, hàng đợi, tránh ghi trùng); mất khả năng đồng bộ server sau này (điều kiện "đồng bộ được" mà spec §6 đã kiểm và giữ lại qua `main`/`shadows`); không có đồng bộ đa-tab miễn phí như `IndexedDBDocSource` |
| C — OPFS/`localStorage` | Lưu trực tiếp vào Origin Private File System hoặc `localStorage` | `localStorage` quota quá nhỏ (~5-10 MB) cho nội dung bảng + blob ảnh theo thời gian; OPFS không có `DocSource`/`BlobSource` sẵn trong cây vendor — phải tự viết từ đầu, nhiều việc hơn chứ không ít hơn |

## 6. Kiểm thử

### 6.1 Ca kiểm hàm thuần (mở rộng `edgeless-board.spec.ts`)

Không cần IndexedDB thật — dựng `docSources`/`blobSources` GIẢ qua tham số `tuyChon` (một
`DocSource`/`BlobSource` tối giản, giữ state trong biến JS thường ngoài closure của ca kiểm — CÙNG
một cặp biến số dùng lại giữa hai lượt gọi thì mới mô phỏng đúng "đóng rồi mở lại app", implement
đúng 3 hàm `pull`/`push`/`subscribe` của `DocSource` — `pull` trả `mergeUpdates` của mọi lượt `push`
trước đó, giống hệt cách `IndexedDBDocSource` thật làm) để kiểm logic rẽ nhánh mà không phụ thuộc
trình duyệt thật:

| # | Ca | Canh cái gì |
|---|---|---|
| 1 | Gọi `taoHoacMoBang({ docSources, blobSources })` lần đầu trên cặp source rỗng → có đúng 1 `affine:page`, 1 `affine:surface`, `affine:surface` 0 phần tử | đường cơ bản, giữ hành vi cũ |
| 2 | Gọi hai lần LIÊN TIẾP trên CÙNG cặp source (mô phỏng đóng-mở app) → lần hai KHÔNG ném lỗi "doc already exists", tổng số `affine:page` trong doc vẫn là 1 (không nhân đôi) | đây là ca ghim đúng lỗi mấu chốt ở §3 |
| 3 | `workspace.forceStop()` gọi được ngay sau `taoHoacMoBang()` mà không ném lỗi | dọn dẹp an toàn |
| 4 | `docSources`/`blobSources` giả có `pull`/`push` không bao giờ resolve (mô phỏng IndexedDB hỏng vĩnh viễn) + `hanGioMs: 20` → `taoHoacMoBang` vẫn TRẢ VỀ (không treo), kết quả là một workspace hoạt động bình thường trong bộ nhớ (seed đủ `affine:page`+`affine:surface`) | ca ghim đúng lỗ hổng "await trần treo mãi mãi" đã sửa ở ĐÍNH CHÍNH §4.1 — đây là ca quan trọng thứ hai của cả chặng, ngang ca #2 |

### 6.2 Ca kiểm mount thật (mở rộng `edgeless-board-mount.spec.ts`)

Cần IndexedDB thật trong môi trường test (`happy-dom`, đang ở bản `^20.11.2`) — **đo trước khi viết
ca kiểm, đừng giả định**: viết một ca thăm dò `typeof indexedDB !== 'undefined'` trước; nếu thiếu,
thêm `fake-indexeddb` làm devDependency và import polyfill ở đầu file test (hoặc `vitest.setup`).

| # | Ca | Canh cái gì |
|---|---|---|
| 5 | Mount → trạng thái "Đang mở bảng…" hiện trước, biến mất sau khi `editor-host` xuất hiện | đúng thứ tự UI đã chọn ("đợi đồng bộ xong rồi mới hiện") |
| 6 | Mount → sửa nội dung (thêm một block) → unmount → mount LẠI với cùng tên CSDL `'drtrong-board'` → nội dung cũ còn nguyên, không tạo `affine:page` thứ hai | bằng chứng end-to-end cho toàn bộ chặng |
| 7 | Unmount NGAY khi đang giữa chừng đợi `waitForSynced()` (chưa resolve) → không ném lỗi console (React "set state after unmount"), `workspace.forceStop()` được gọi đúng một lần | canh nhánh `huyBo` ở §4.2 |

## 7. Rủi ro đã biết

- **Tên CSDL `'drtrong-board'` cố định, không theo id bảng** — đúng phạm vi chặng này (một bảng),
  nhưng LÀ nợ kỹ thuật thật cho chặng multi-board sau: khi đó tên CSDL (hoặc `docId` bên trong cùng
  một CSDL — `IndexedDBDocSource` đã hỗ trợ nhiều `docId` trong một `dbName`, xem `pull(docId, ...)`)
  phải đổi theo board đang mở. Ghi vào "Ngoài phạm vi" để chặng BoardGallery không quên.
- **`happy-dom`'s IndexedDB (nếu có sẵn) có thể không đầy đủ đặc tả** (ví dụ thiếu một số ràng buộc
  transaction) — nếu ca kiểm §6.2 gặp hành vi lạ so với trình duyệt thật, chuyển hẳn sang
  `fake-indexeddb` thay vì cố vá quanh bản có sẵn của `happy-dom`.
- **`forceStop()` "có thể mất dữ liệu" theo đúng docstring của chính nó** — chấp nhận được vì §2 đã
  đo: ghi gần-tức-thời theo từng sửa, cửa sổ mất dữ liệu (nếu có) chỉ là các lượt update Yjs vừa xảy
  ra trong khoảng vài chục ms trước đó chưa kịp đẩy hết hàng đợi. Không cần `waitForGracefulStop()`
  (chờ hàng đợi rỗng) ở bước unmount vì bảng hiện tại hầu như không unmount thật (hack ở App.tsx vẫn
  giữ nguyên) — chỉ có giá trị phòng hờ.

## 8. Ngoài phạm vi

- Danh sách bảng / metadata (`idb.ts` `DB_VERSION` → 5) — chặng BoardGallery riêng.
- Gỡ hack "mount vĩnh viễn" ở `App.tsx` — chuyển đổi hành vi riêng, sau khi persistence chạy ổn định
  thật (đã chốt lúc brainstorm).
- Đồng bộ server (`shadows`) — điều kiện đã kiểm là "khả thi", không phải "làm ngay".
- Không đụng `src/lib/idb.ts` — `DB_VERSION` giữ nguyên 4.

## 9. Tiêu chí xong

1. `taoHoacMoBang()` async, đúng chữ ký ở §4.1, có nhánh dự phòng khi IndexedDB không mở được.
2. `EdgelessBoard()` đợi đồng bộ xong mới `litRender` nội dung thật, có trạng thái "đang mở" nhìn
   thấy được trong lúc chờ, dọn `workspace.forceStop()` đúng ở cả hai đường: unmount sau khi đã
   render, và unmount trong lúc còn đang chờ.
3. Cả 7 ca kiểm ở §6 xanh, ca #2, #4 và #6 phải có bằng chứng đỏ đã thật sự chạy trước khi có mã —
   ba ca ghim đúng ba lỗi mấu chốt của chặng: nhân đôi doc, treo vĩnh viễn khi IndexedDB hỏng, và
   toàn bộ vòng lưu-rồi-mở-lại.
4. `src/lib/idb.ts` không đổi gì — `DB_VERSION` vẫn 4.
5. Bảy cổng dự án xanh: `tsc --noEmit` · `npm test` · `kiem:vendor` · `kiem:vendor-paths` ·
   `kiem:vendor-build` · `build` · `kiem:dist`.
6. Kiểm tay trên trình duyệt thật (khi có người xem trực tiếp — phiên trước từng gặp giới hạn công
   cụ Browser pane không compositing frame khi chạy không người xem): mở board, gõ chữ, tải lại
   trang, nội dung còn nguyên.
