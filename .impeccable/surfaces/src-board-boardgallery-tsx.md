---
version: 1
slug: "src-board-boardgallery-tsx"
primary_target: "src/board/BoardGallery.tsx"
related_targets: ["src/board/DanhSachBang.tsx","src/board/EdgelessBoard.tsx"]
---

# Surface: Mindmap (MindmapScreen / BoardGallery / DanhSachBang / EdgelessBoard)

<!-- Trỏ lại 2026-09-04. Brief này viết khi bảng vẽ còn là src/components/MindmapBoard.tsx tự viết
     (8949 dòng, xoá ở fd24576 ngày 2026-08-10) và được thay bằng bảng BlockSuite vendored trong
     src/board/. Bề mặt DI CHUYỂN, không mất — hiến chương, mode Experience và chỉ thị ≥50% công sức
     bên dưới vẫn nguyên hiệu lực, chỉ đường dẫn đổi. File brief cũng đổi tên theo: resolver tra brief
     bằng slug SUY TỪ đường dẫn target (scripts/lib/target-slug.mjs), nên đổi mỗi frontmatter mà giữ
     tên file cũ là brief thành vô hình. -->

## Mode

**Experience** — not Operate. This is the one surface in "Bs Trọng" where the visitor is *inside* the work.
Every other screen in this product is Operate/Read: dense left-hemisphere lookup under time pressure
(doses, CrCl, drug cards, articles). Mindmap is deliberately the opposite pole.

## Role (owner's charter, stated 2026-08-10)

Mindmap is the **right-hemisphere room** of the product:

- A place to *relax* while still working — relief from the left-hemisphere load every other screen imposes.
- A place to *see the whole* — spatial overview, imagination, association between pieces of knowledge.
- The bridge from **theory to real practice**: the other screens store knowledge; this one is where a
  clinician turns it into a picture they can act from.
- The **core differentiator and brand value** of the PWA. Owner's instruction: it is worth **at least
  50% of the app's total design investment**. Treat every task here as high-stakes, never as a side feature.
- A **retention surface**: users should want to stay in it for hours. Dull tool feedback is an existential
  bug here, not a polish item ("nobody stays more than 2 days with a boring toolbar").

## Motion and effect policy — deliberately separate from the rest of the app

DESIGN.md's global "Decoration/Diagnosis split" still holds, but on this surface the *decoration* side of
that line is opened all the way up. Explicit owner instruction: **push every effect as far as it can go,
then propose — the owner reviews and pulls back**. Over-reach is preferred to under-reach.

The one framing constraint: this is still a medical product. "Pushed all the way" means **material realism
and physical believability** (real ink, real paper, real magnetism, real weight), never carnival —
no confetti, no neon, no sound-effect-driven UI, no motion that mocks the seriousness of the content
inside the notes. Effects earn their place by making the tool feel like a *real physical instrument*.

Consequences that follow from this and apply to every future task on this surface:

- Every tool must be **unmistakable from its mark alone** — a stroke's material identity (ballpoint vs
  fountain vs brush vs pencil vs highlighter vs tape) has to be legible without reading a label.
- Every drag, dock, open, and close is a **physical event** with weight, attraction, and settle — not a
  CSS state swap.
- Continuity of the visual anchor across navigation is mandatory (gallery card ↔ board), and the anchor
  must never distort: uniform scale only, the frame is what changes shape.
- `prefers-reduced-motion` still removes decorative motion; tap-confirmation feedback always survives.

## Palette

The Mindmap-only magenta (`--c-accent-2`) and the pen/highlighter palettes (nay do bảng BlockSuite
vendored dựng, thay cho `src/lib/mindmapStyle.ts` đã xoá; vẫn deliberately *not* the note-card
palette) belong to this surface alone. Magenta là màu của MẶT BÀN VẼ: nó không đi vào chrome quản lý
danh sách của gallery (khay "Đã xoá gần đây", dải lọc) — xem DESIGN.md, The One Other Place Rule.
The three paper tones (white / black / ivory) are a material choice, not a theme mirror — ink palettes
must stay readable on all three.

## Non-negotiables inherited from the product

- Clinical content inside notes is never decorated by the effect layer.
- Everything stays offline and local (IndexedDB); no effect may require a network round-trip.
- Performance floor: a board with thousands of strokes must still pan, zoom and draw at 60fps on a phone.
  Material effects are bought with static SVG filters/patterns, never per-frame per-stroke JS.
