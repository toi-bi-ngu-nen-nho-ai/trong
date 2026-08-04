// Bộ icon nét vẽ (stroke) cho bảng Sơ đồ tư duy.
//
// Vì sao không dùng emoji như bản trước (✋🖊🖍🧽🔗): emoji do HỆ ĐIỀU HÀNH vẽ nên mỗi máy một kiểu,
// nhiều màu, đậm nhạt khác nhau và không đổi màu theo trạng thái nút — đặt cạnh các icon nét mảnh
// một màu ở phần còn lại của app thì lệch hẳn ra. Icon ở đây cùng khuôn với `icons` trong App.tsx:
// khung 24×24, nét `currentColor`, đầu nét tròn, nên nút đang chọn chỉ cần đổi màu chữ là icon đổi
// theo, và nhìn cùng một hệ với thanh điều hướng dưới.

type IconFn = (cls?: string) => React.ReactElement

function svg(cls: string, width: number, children: React.ReactNode): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cls}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const mindIcons: Record<string, IconFn> = {
  // ─── Công cụ ───────────────────────────────────────────────────────────────
  hand: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.6,
      <>
        <path d="M9 11.5V6.2a1.5 1.5 0 013 0v5.3" />
        <path d="M12 11.5V5a1.5 1.5 0 013 0v6.5" />
        <path d="M15 11.5V7.6a1.5 1.5 0 013 0V15a5.4 5.4 0 01-5.4 5.4h-1.1a5 5 0 01-3.5-1.5l-2.9-2.9a1.6 1.6 0 012.3-2.3L9 15.2V11.5" />
      </>,
    ),
  pen: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.6,
      <>
        <path d="M4.4 19.6l1.1-4.2 9.9-9.9a1.9 1.9 0 012.7 0l1.4 1.4a1.9 1.9 0 010 2.7l-9.9 9.9-4.2 1.1z" />
        <path d="M13.6 7l3.4 3.4" />
      </>,
    ),
  marker: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.6,
      <>
        <path d="M14.7 4.3l5 5-6.8 6.8H8.2L6.5 14.4 14.7 4.3z" />
        <path d="M5 20.2h11" strokeWidth={2.6} opacity={0.42} />
      </>,
    ),
  eraser: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.6,
      <>
        <g transform="rotate(-42 12 12.5)">
          <rect x="4.2" y="8.6" width="15.6" height="7.8" rx="2" />
          <path d="M11.2 8.6v7.8" />
        </g>
        <path d="M5 20.6h14" strokeWidth={1.4} opacity={0.4} />
      </>,
    ),
  shapes: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.6,
      <>
        <rect x="3.4" y="3.4" width="10.4" height="10.4" rx="2" />
        <circle cx="15.6" cy="15.6" r="5" />
      </>,
    ),
  // Khoanh vùng: một vòng nét đứt kèm con trỏ ở góc
  lasso: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.7,
      <>
        <path d="M12 4.4c4.4 0 8 2.5 8 5.6 0 2.4-2.1 4.4-5.2 5.2" strokeDasharray="2.6 2.4" />
        <path d="M9.6 15.1C6.2 14.4 4 12.4 4 10c0-3.1 3.6-5.6 8-5.6" strokeDasharray="2.6 2.4" />
        <path d="M9.8 15.1c0 1.6-.5 2.6-1.4 3.2" />
        <path d="M11.4 20.6l-3-2.3 3.4-1.1-.4 3.4z" fill="currentColor" stroke="none" />
      </>,
    ),
  link: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.7,
      <path d="M9 15l6-6m-5-2l1.5-1.5a3.54 3.54 0 015 5L15 12M9 12l-1.5 1.5a3.54 3.54 0 105 5L14 17" />,
    ),

  // ─── Hình vẽ ───────────────────────────────────────────────────────────────
  shapeLine: (cls = "w-5 h-5") => svg(cls, 1.8, <path d="M5 19L19 5" />),
  shapeArrow: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.8,
      <>
        <path d="M5 19L19 5" />
        <path d="M12.4 5H19v6.6" />
      </>,
    ),
  shapeRect: (cls = "w-5 h-5") => svg(cls, 1.8, <rect x="4" y="6" width="16" height="12" rx="1.6" />),
  shapeEllipse: (cls = "w-5 h-5") => svg(cls, 1.8, <ellipse cx="12" cy="12" rx="8.4" ry="6.4" />),

  // ─── Thao tác bảng ─────────────────────────────────────────────────────────
  undo: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.8,
      <>
        <path d="M8.6 5.4L4.6 9.4l4 4" />
        <path d="M4.6 9.4H14a5.5 5.5 0 010 11h-3.4" />
      </>,
    ),
  redo: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.8,
      <>
        <path d="M15.4 5.4l4 4-4 4" />
        <path d="M19.4 9.4H10a5.5 5.5 0 000 11h3.4" />
      </>,
    ),
  plus: (cls = "w-5 h-5") => svg(cls, 2.1, <path d="M12 5.4v13.2M5.4 12h13.2" />),
  minus: (cls = "w-5 h-5") => svg(cls, 2.1, <path d="M5.4 12h13.2" />),
  fit: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.8,
      <path d="M4 9V5.6A1.6 1.6 0 015.6 4H9M15 4h3.4A1.6 1.6 0 0120 5.6V9M20 15v3.4A1.6 1.6 0 0118.4 20H15M9 20H5.6A1.6 1.6 0 014 18.4V15" />,
    ),
  more: (cls = "w-5 h-5") =>
    svg(
      cls,
      0,
      <g fill="currentColor" stroke="none">
        <circle cx="5.6" cy="12" r="1.7" />
        <circle cx="12" cy="12" r="1.7" />
        <circle cx="18.4" cy="12" r="1.7" />
      </g>,
    ),
  close: (cls = "w-5 h-5") => svg(cls, 2, <path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6" />),
  chevronLeft: (cls = "w-5 h-5") => svg(cls, 2.2, <path d="M14.5 5.5L8 12l6.5 6.5" />),
  chevronRight: (cls = "w-5 h-5") => svg(cls, 2.2, <path d="M9.5 5.5L16 12l-6.5 6.5" />),
  chevronUp: (cls = "w-5 h-5") => svg(cls, 2.2, <path d="M5.5 14.5L12 8l6.5 6.5" />),
  chevronDown: (cls = "w-5 h-5") => svg(cls, 2.2, <path d="M5.5 9.5L12 16l6.5-6.5" />),
  // Ô viết phóng to: một khung viết nhỏ trên trang, kèm nét chữ phóng to bên dưới.
  writeBox: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.8,
      <>
        <rect x="3.5" y="4" width="17" height="6" rx="1.4" />
        <path d="M3.5 14.5h4M3.5 18.5h9" />
        <path d="M14 19.5l6-6" strokeWidth="2.2" />
      </>,
    ),
  // Tìm thẻ trên bảng — kính lúp
  search: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.9,
      <>
        <circle cx="10.8" cy="10.8" r="6.2" />
        <path d="M15.4 15.4L20 20" />
      </>,
    ),
  // Gấp nhánh con lại: hai mũi tên chụm vào nhau
  collapse: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.9,
      <>
        <path d="M9.2 3.6v4.4H4.8" />
        <path d="M14.8 20.4V16h4.4" />
        <path d="M9.2 8L3.8 3.2M14.8 16l5.4 4.8" />
      </>,
    ),
  // Mở lại nhánh đang gấp: hai mũi tên toả ra
  expand: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.9,
      <>
        <path d="M14.6 3.6H19v4.4" />
        <path d="M9.4 20.4H5V16" />
        <path d="M19 3.6l-5.4 5.4M5 20.4l5.4-5.4" />
      </>,
    ),
  // Sắp xếp lại các nhánh con cho gọn — cây nhánh kèm tia lấp lánh
  tidy: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.7,
      <>
        <path d="M5.6 4.4v11.2a2.2 2.2 0 002.2 2.2h6.4" />
        <path d="M11.8 8.4H5.6" opacity={0.75} />
        <path
          d="M17.9 12.2l.85 2.05 2.05.85-2.05.85-.85 2.05-.85-2.05-2.05-.85 2.05-.85.85-2.05z"
          fill="currentColor"
          stroke="none"
        />
      </>,
    ),
  check: (cls = "w-5 h-5") => svg(cls, 2.1, <path d="M5 12.6l4.6 4.6L19 7.4" />),

  // ─── Nội dung thêm vào bảng ────────────────────────────────────────────────
  note: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.6,
      <>
        <path d="M6.4 3.8h7.4l5.4 5.4v10.4a1.6 1.6 0 01-1.6 1.6H6.4a1.6 1.6 0 01-1.6-1.6V5.4a1.6 1.6 0 011.6-1.6z" />
        <path d="M13.4 3.8v4a1.6 1.6 0 001.6 1.6h4.2" />
        <path d="M8.4 13h6.4M8.4 16.6h4" opacity={0.55} />
      </>,
    ),
  // Bài trong thư viện của app (để gắn vào thẻ) — quyển sách mở
  library: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.6,
      <>
        <path d="M11.3 6.9C10.2 6.1 8.7 5.6 7.1 5.6c-1.5 0-2.9.4-3.9 1v11.6c1-.6 2.4-1 3.9-1 1.6 0 3.1.5 4.2 1.3" />
        <path d="M12.7 6.9c1.1-.8 2.6-1.3 4.2-1.3 1.5 0 2.9.4 3.9 1v11.6c-1-.6-2.4-1-3.9-1-1.6 0-3.1.5-4.2 1.3" />
        <path d="M12 7.4v11.2" opacity={0.6} />
      </>,
    ),
  image: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.6,
      <>
        <rect x="3" y="4.6" width="18" height="14.8" rx="2.4" />
        <circle cx="8.6" cy="10" r="1.7" />
        <path d="M3.4 17.4l4.8-4.5a2 2 0 012.7 0l4 3.8m-1.2-1.2l1.9-1.7a2 2 0 012.7 0l2.1 1.9" />
      </>,
    ),
  branch: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.8,
      <>
        <circle cx="6.4" cy="12" r="2.8" />
        <path d="M9.2 12h4.6" />
        <path d="M18 9.2v5.6M15.2 12h5.6" />
      </>,
    ),
  pencil: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.7,
      <>
        <path d="M4.6 19.4l1-3.9 9.6-9.6 2.9 2.9-9.6 9.6-3.9 1z" />
        <path d="M15.2 5.9l1.6-1.6a1.4 1.4 0 012 0l.9.9a1.4 1.4 0 010 2l-1.6 1.6" />
      </>,
    ),
  palette: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.6,
      <>
        <path d="M12 3.6a8.4 8.4 0 000 16.8c1.5 0 2.2-1 2.2-2 0-1.7-1.7-1.7-1.7-3.1 0-1.2 1-2.1 2.3-2.1h1.6a4 4 0 004-4c0-3.2-3.8-5.6-8.4-5.6z" />
        <g fill="currentColor" stroke="none">
          <circle cx="8.1" cy="9.2" r="1.15" />
          <circle cx="12.2" cy="7.3" r="1.15" />
          <circle cx="7" cy="13.6" r="1.15" />
        </g>
      </>,
    ),
  copy: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.7,
      <>
        <rect x="9" y="9" width="10.6" height="10.6" rx="2" />
        <path d="M15 9V6.6a2 2 0 00-2-2H6.4a2 2 0 00-2 2V13a2 2 0 002 2H9" />
      </>,
    ),
  trash: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.7,
      <>
        <path d="M4.6 7h14.8M9.6 7V5.3A1.3 1.3 0 0110.9 4h2.2a1.3 1.3 0 011.3 1.3V7" />
        <path d="M6.6 7l.85 11.8A1.7 1.7 0 009.15 20.4h5.7a1.7 1.7 0 001.7-1.6L17.4 7" />
      </>,
    ),
  download: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.8,
      <>
        <path d="M12 4v11M8 11.4l4 4 4-4" />
        <path d="M4.6 19.6h14.8" />
      </>,
    ),
  paper: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.7,
      <>
        <rect x="4" y="4" width="16" height="16" rx="2.4" />
        <path d="M4 9.6h16M4 14.4h16M9.6 4v16M14.4 4v16" strokeWidth={1.1} opacity={0.5} />
      </>,
    ),
  textSize: (cls = "w-5 h-5") =>
    svg(
      cls,
      1.8,
      <>
        <path d="M3.6 18.4L8 6.2l4.4 12.2M5.2 14.4h5.6" />
        <path d="M14.4 18.4l3.1-8.4 3.1 8.4M15.6 15.6h3.8" strokeWidth={1.5} />
      </>,
    ),
}
