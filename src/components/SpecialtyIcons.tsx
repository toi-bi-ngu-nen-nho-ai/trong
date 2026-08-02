// Bộ icon chuyên khoa, vẽ bằng SVG.
//
// Vì sao không dùng emoji như trước (🫀🫁🔬🫘💉🧠🩸🦠🚨🧬💊): emoji do HỆ ĐIỀU HÀNH vẽ, nên cùng một
// app mà mỗi máy ra một kiểu — iPhone một bộ, Android một bộ, Windows một bộ khác nữa; cỡ chữ và
// đường nét không khớp với các icon nét mảnh còn lại; không đổi được màu theo chuyên khoa; và vài
// hình còn sai nghĩa (🔬 kính hiển vi cho Tiêu hoá, 💉 kim tiêm cho Nội tiết). Bộ này vẽ đúng cơ
// quan/khái niệm của từng khoa, nét `currentColor` nên nơi gọi đặt màu gì thì icon theo màu đó
// (chip màu chuyên khoa, ô trắng trên nền màu, hay xám nhạt trong danh sách).
//
// Khung 24×24, nét 1.6, đầu nét tròn — cùng khuôn với `icons` trong App.tsx và MindmapIcons.tsx.

function svg(cls: string, children: React.ReactNode, width = 1.6): React.ReactElement {
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

const SPECIALTY_ICONS: Record<string, (cls: string) => React.ReactElement> = {
  // Trang chủ (mục đầu trong bánh xe chọn chuyên khoa)
  home: (cls) =>
    svg(
      cls,
      <>
        <path d="M12 3.6L20.6 10.6V19.6H14.6V13.8H9.4V19.6H3.4V10.6Z" />
      </>,
    ),
  // Tim mạch — trái tim kèm một nhịp điện tim bên trong
  cardiology: (cls) =>
    svg(
      cls,
      <>
        <path d="M12 20.2l-.9-.8c-4.5-4-7.4-6.6-7.4-9.8a4.6 4.6 0 018.3-2.8 4.6 4.6 0 018.3 2.8c0 3.2-2.9 5.8-7.4 9.8l-.9.8z" />
        <path d="M7.9 11.4h1.8l1-2 1.5 3.5 1-1.5h2.9" strokeWidth={1.25} />
      </>,
    ),

  // Hô hấp — khí quản, hai phế quản và hai lá phổi. Lá phổi vẽ dày và bám vào khí quản; bản đầu vẽ
  // hai lá mảnh tách rời nên ở cỡ 20px trông như một cái kéo.
  pulmonology: (cls) =>
    svg(
      cls,
      <>
        <path d="M12 3.6v6.9" />
        <path d="M11.6 10.5H9.4c-1.2 0-2.3.5-3.2 1.4-1.2 1.3-1.9 3.1-1.9 5v1.3c0 1.6 1.3 2.9 2.9 2.9h.6c1.5 0 2.8-1.2 3-2.7.5-2.6.8-5.2.8-7.9z" />
        <path d="M12.4 10.5h2.2c1.2 0 2.3.5 3.2 1.4 1.2 1.3 1.9 3.1 1.9 5v1.3c0 1.6-1.3 2.9-2.9 2.9h-.6c-1.5 0-2.8-1.2-3-2.7-.5-2.6-.8-5.2-.8-7.9z" />
      </>,
    ),

  // Tiêu hoá — đoạn ruột gấp khúc (thay cho kính hiển vi, vốn chẳng liên quan gì tới tiêu hoá).
  // Đã thử vẽ dạ dày trước đó nhưng ở cỡ 20px cái bóng dạ dày chỉ còn là một nét cong như quả chuối;
  // ống ruột gấp khúc thì nét nào cũng rõ và không lẫn với hình nào khác trong app.
  gastrointestinal: (cls) =>
    svg(
      cls,
      <path d="M8.4 3.6v3.2a2.6 2.6 0 002.6 2.6h1.8a2.6 2.6 0 010 5.2h-1.8a2.6 2.6 0 000 5.2h3.8a2.6 2.6 0 002.6-2.6v-1.2" />,
    ),

  // Thận học — hình hạt đậu, có khuyết rốn thận ở giữa mặt trong
  nephrology: (cls) =>
    svg(
      cls,
      <path d="M13.8 4.4C9.8 4.4 6.8 7.8 6.8 12s3 7.6 7 7.6c2 0 4-1.3 4-3.2 0-1.5-1.2-2.4-2.1-3.1-.5-.4-.5-1.2 0-1.6.9-.7 2.1-1.6 2.1-3.1 0-1.9-2-3.2-4-3.2z" />,
    ),

  // Nội tiết — tuyến giáp hình con bướm dưới khí quản (thay cho kim tiêm). Hai thuỳ vẽ to gần hết
  // khung; bản đầu vẽ nhỏ giữa khung nên ở cỡ nhỏ chỉ còn là một cái nơ.
  endocrine: (cls) =>
    svg(
      cls,
      <>
        <path d="M12 3.6v4.8" />
        <path d="M12 8.8c-1.3-1.7-3-2.8-4.9-2.8-2.3 0-3.7 1.6-3.7 4.1 0 4.2 2.8 8.3 5.7 8.3 2 0 2.9-1.9 2.9-4.1V8.8z" />
        <path d="M12 8.8c1.3-1.7 3-2.8 4.9-2.8 2.3 0 3.7 1.6 3.7 4.1 0 4.2-2.8 8.3-5.7 8.3-2 0-2.9-1.9-2.9-4.1V8.8z" />
      </>,
    ),

  // Thần kinh — hai bán cầu não và khe giữa
  neurology: (cls) =>
    svg(
      cls,
      <>
        <path d="M12 5.4a3.1 3.1 0 00-3.1 3.1v.2A2.7 2.7 0 006.8 11.4c0 .9.4 1.7 1.1 2.2-.4.5-.6 1.1-.6 1.8a2.9 2.9 0 002.9 2.9c.7 0 1.3-.2 1.8-.6" />
        <path d="M12 5.4a3.1 3.1 0 013.1 3.1v.2a2.7 2.7 0 012.1 2.7c0 .9-.4 1.7-1.1 2.2.4.5.6 1.1.6 1.8a2.9 2.9 0 01-2.9 2.9c-.7 0-1.3-.2-1.8-.6" />
        <path d="M12 5.4v13" strokeWidth={1.3} />
        <path d="M9.2 9.8c.9.4 1.6 1.1 1.8 2.1M14.8 9.8c-.9.4-1.6 1.1-1.8 2.1" strokeWidth={1.2} opacity={0.75} />
      </>,
    ),

  // Huyết học — giọt máu kèm một tế bào bên trong
  hematology: (cls) =>
    svg(
      cls,
      <>
        <path d="M12 3.6c0 0 5.7 6.2 5.7 9.7a5.7 5.7 0 11-11.4 0C6.3 9.8 12 3.6 12 3.6z" />
        <circle cx="12" cy="13.6" r="2.2" strokeWidth={1.3} opacity={0.65} />
      </>,
    ),

  // Truyền nhiễm — vi rút: thân tròn, gai bám quanh và hai hạt nhân bên trong (có hạt bên trong thì
  // không bị đọc thành hình mặt trời)
  infectious: (cls) =>
    svg(
      cls,
      <>
        <circle cx="12" cy="12" r="4.9" />
        <path d="M12 3.8v2.3M12 17.9v2.3M3.8 12h2.3M17.9 12h2.3M6.4 6.4l1.6 1.6M16 16l1.6 1.6M17.6 6.4L16 8M8 16l-1.6 1.6" />
        <g fill="currentColor" stroke="none" opacity={0.45}>
          <circle cx="10.4" cy="10.9" r="0.95" />
          <circle cx="13.5" cy="13.4" r="0.95" />
        </g>
      </>,
    ),

  // Hồi sức - Cấp cứu — chữ thập y tế
  emergency: (cls) =>
    svg(
      cls,
      <path d="M9.7 3.8h4.6a.8.8 0 01.8.8v4.3h4.3a.8.8 0 01.8.8v4.6a.8.8 0 01-.8.8h-4.3v4.3a.8.8 0 01-.8.8H9.7a.8.8 0 01-.8-.8v-4.3H4.6a.8.8 0 01-.8-.8V9.7a.8.8 0 01.8-.8h4.3V4.6a.8.8 0 01.8-.8z" />,
    ),

  // Sinh lý - Sinh lý bệnh — chuỗi xoắn kép DNA. Hai sợi phải phình rộng ra hai bên mới thấy là xoắn;
  // bản đầu để hai sợi quá sát nhau nên chỉ còn là một chữ X có gạch ngang.
  pathophysiology: (cls) =>
    svg(
      cls,
      <>
        <path d="M7.4 3.6c0 4 9.2 4.4 9.2 8.4s-9.2 4.4-9.2 8.4" />
        <path d="M16.6 3.6c0 4-9.2 4.4-9.2 8.4s9.2 4.4 9.2 8.4" />
        <path d="M9.4 6.8h5.2M7.9 12h8.2M9.4 17.2h5.2" strokeWidth={1.3} opacity={0.7} />
      </>,
    ),

  // Dược lý — cối và chày (khác với viên nang dùng cho mục "Thuốc"). Chày vẽ dày và chìa hẳn ra ngoài
  // miệng cối; bản đầu chày quá ngắn nên chỉ như một que tăm dựa vào cái bát.
  pharmacology: (cls) =>
    svg(
      cls,
      <>
        <path d="M4.2 10.8h15.6v.8c0 4.3-3.5 7.8-7.8 7.8s-7.8-3.5-7.8-7.8v-.8z" />
        <path d="M12.8 10.8l5.4-6.6" strokeWidth={2} />
        <path d="M16.4 3.4l3 2.5" strokeWidth={2} />
      </>,
    ),

  // Dùng cho bài viết có tên chuyên khoa không nằm trong danh mục (mục tự nhập)
  default: (cls) =>
    svg(
      cls,
      <>
        <path d="M6.6 3.6h6.9l4.9 4.9v11.3a1.8 1.8 0 01-1.8 1.8H6.6a1.8 1.8 0 01-1.8-1.8V5.4a1.8 1.8 0 011.8-1.8z" />
        <path d="M13.2 3.7v3.4a1.5 1.5 0 001.5 1.5h3.4" />
      </>,
    ),
}

// Icon của một chuyên khoa theo id. Id lạ (bài tự nhập ghi tên chuyên khoa ngoài danh mục) trả về
// icon trang giấy chung, không bao giờ trả về rỗng để ô icon không bị trống trơn.
export function specialtyIcon(id: string | undefined, cls = "w-5 h-5"): React.ReactElement {
  const draw = (id && SPECIALTY_ICONS[id]) || SPECIALTY_ICONS.default
  return draw(cls)
}
