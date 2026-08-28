// Lưới thẻ danh sách bảng — tạo/đổi tên/xoá. KHÔNG phụ thuộc BlockSuite (không import ./index hay
// ./EdgelessBoard) — giữ file này nhẹ, tách hẳn khỏi ranh giới nạp chậm 994 kB. BoardGallery.tsx
// (bao ngoài) mới là nơi quyết định khi nào mount bảng vẽ thật.
import { useEffect, useRef, useState } from 'react'

import { SPECIALTIES } from '../data'
import { ScreenHeader } from '../components/ScreenHeader'
import { specialtyIcon } from '../components/SpecialtyIcons'
import { IDB_STORES } from '../lib/idb'
import { formatReadTime } from '../lib/recentReads'
import { useIdbCollection } from '../lib/useIdbCollection'
import { bangKhopTimKiem, type BangMeta, taoIdBang } from './boardMeta'

// Cùng giá trị CONFIRM_DELETE_RESET_MS của App.tsx (5000) — viết hằng số riêng thay vì import vì
// component gốc (ConfirmIconButton) là private, phụ thuộc `icons` cũng private của file 11.000+
// dòng đó. Xem Global Constraints của kế hoạch này.
const XAC_NHAN_XOA_MS = 5000

// Ngưỡng coi một thẻ là "vừa tạo" (dùng .card-plop thay vì .card-settle êm) — xem §3.2/§3.3 spec.
const VUA_TAO_NGUONG_MS = 3000

// Thời lượng .card-slide-out (src/index.css) — thẻ giữ mount đúng bằng ngần này trước khi đánh dấu
// xoá mềm (daXoaLuc) chạy, để animation kịp chạy hết trước khi thẻ biến mất khỏi lưới. PHẢI khớp
// đúng thời lượng animation CSS (0.4s, tăng từ 0.2s cũ — debug 2026-08-26, "xoá quá nhanh, có như
// không có") — lệch hai số này là jump-cut hoặc khoảng trắng chết, xem comment tại .card-slide-out.
const XOA_TRE_MS = 400

// Vị trí/góc nghiêng/ảnh xem trước của đúng thẻ vừa bấm, chụp lại NGAY LÚC BẤM (getBoundingClientRect
// thật, không phải suy ra từ index lưới) — BoardGallery.tsx dùng để chạy chuyển cảnh FLIP thật từ
// thẻ sang canvas thay vì một cú phóng chung chung không neo vào đâu (hiến chương Mindmap, mục
// "Continuity of the visual anchor... mandatory" — critique 2026-08-26 P1).
export type BoardOpenOrigin = {
  top: number
  left: number
  width: number
  height: number
  tilt: number
  anhXemTruoc?: string
  // Chuyên khoa của bảng — undefined khi mở KHÔNG qua một thẻ trong lưới (vd kết quả tìm kiếm toàn
  // app).
  chuyenKhoa?: string
}

// Cửa sổ "Hoàn tác" sau khi xoá mềm một bảng — cùng độ dài với XAC_NHAN_XOA_MS (quy ước sẵn có của
// đúng màn này cho "khoảng ân hạn"), đủ lâu để đọc tên bảng vừa xoá và quyết định, không quá lâu
// tới mức dải xác nhận cảm giác bị kẹt trên màn hình.
const HOAN_TAC_XOA_MS = 5000

// Nhấn-giữ trên thẻ mở CÙNG menu mà nút "⋯" mở — lối vào THỨ HAI, không thay thế nút. Trước đây
// "⋯" là cửa duy nhất tới đổi tên/gắn khoa/xuất PNG/xoá, nên toàn bộ khả năng quản lý bảng dồn rủi
// ro vào việc người dùng tự tìm ra một glyph nhỏ ở góc thẻ (critique 2026-08-28, P2). Nhấn-giữ là
// cử chỉ đúng ẩn dụ "cầm tờ giấy lên" và là quy ước sẵn có trên di động, nên nó thêm đường vào mà
// không phải làm nút "⋯" nặng nề hơn (giữ nguyên thẩm mỹ giấy).
// 500ms: mốc quen thuộc của long-press trên iOS/Android — ngắn hơn thì cú chạm mở bảng bình thường
// dễ lỡ kích hoạt, dài hơn thì đọc như treo máy.
const NHAN_GIU_MS = 500
// Ngón tay dịch quá ngần này (px) trong lúc đang đếm giờ = người dùng đang CUỘN lưới, không phải
// nhấn giữ — huỷ hẹn giờ. pointercancel bắt được phần lớn ca cuộn thật, nhưng không phải mọi ca.
const NHAN_GIU_TRUOT_TOI_DA = 10

// Băm chuỗi id thành một góc nghiêng ỔN ĐỊNH trong khoảng [-3.0, 3.0] độ, bước 0.1 — KHÔNG dùng
// Math.random() vì góc phải giữ nguyên qua mọi lần re-render (đúng thẻ ảnh thật nằm yên trên bàn,
// không tự xoay mỗi khi có gì đó khiến component render lại).
export function nghiengOnDinh(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((Math.abs(h) % 61) - 30) / 10
}

// Băm id thành một góc (độ hue) ỔN ĐỊNH trong khoảng [260, 330) — họ tím-hồng quanh --c-accent-2
// (~327°, xem src/index.css), CỐ TÌNH tránh xa đỏ/hổ phách/xanh lá (~0-50°, ~90-150°) vì ba màu đó
// dành riêng cho tín hiệu nguy hiểm/cảnh báo/thành công (Untouchable Signal Rule, DESIGN.md) — chấm
// phân biệt bảng không bao giờ được lẫn với tín hiệu an toàn. Dùng chung `--chip-s`/`--chip-l` (định
// nghĩa cạnh --c-accent-2 trong index.css, tự đổi theo sáng/tối) nên hue là thứ DUY NHẤT hàm này cần
// tính — critique lượt 3 (2026-08-24): bảng mới tạo không phân biệt được trong lưới lẫn panel "Đã
// xoá gần đây" (11/15 bảng thật trên máy dev đọc y hệt "Bảng chưa đặt tên").
export function mauOnDinh(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) | 0
  return 260 + (Math.abs(h) % 70)
}

// Độ sáng tương đối (WCAG relative luminance, 0-1) của một màu hex "#rrggbb".
function doSangTuongDoi(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const tuyenTinh = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * tuyenTinh(r) + 0.7152 * tuyenTinh(g) + 0.0722 * tuyenTinh(b)
}

// Xấp xỉ độ sáng của --c-on-bright ở dark mode (#0b0c1c) — dùng làm ứng viên "chữ gần đen" thay vì
// đen tuyệt đối, để khớp đúng giá trị token thật app đang dùng ở mọi nơi khác.
const DO_SANG_GAN_DEN = doSangTuongDoi('#0b0c1c')

function tiLeTuongPhan(l1: number, l2: number): number {
  const [sang, toi] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (sang + 0.05) / (toi + 0.05)
}

// Chọn chữ trắng hoặc gần-đen tuỳ theo màu NỀN CỤ THỂ (kh.color) — KHÔNG dùng var(--c-on-bright)
// cứng cho nền này: token đó chỉ được hiệu chỉnh cho --c-primary (đổi độ sáng theo theme), còn
// kh.color là hằng số CỐ ĐỊNH qua cả hai theme (xem comment đầu specialties.ts: "chưa đổi theo chủ
// đề"). Ghép nhầm --c-on-bright vào nền này khiến cả 11/11 màu chuyên khoa xuống dưới AA ở dark mode
// (đo được 3.00-3.97:1, critique 2026-08-26 P1) — bài học từ chính lượt vá contrast trước, áp đúng
// công thức cho MỘT điểm chạm (chip "Tất cả", nền --c-primary) rồi lan sang điểm chạm khác có màu
// nền hoàn toàn khác bản chất. Hàm này tính tương phản thật với CẢ HAI ứng viên rồi chọn bên thắng —
// đúng cho bất kỳ giá trị hex nào, kể cả nếu sau này thêm chuyên khoa với màu sáng hơn hẳn 11 màu
// hiện tại (nơi trắng sẽ không còn thắng nữa).
function chuTrenNen(hexNen: string): string {
  const lNen = doSangTuongDoi(hexNen)
  const dungTrang = tiLeTuongPhan(1, lNen)
  const dungGanDen = tiLeTuongPhan(DO_SANG_GAN_DEN, lNen)
  return dungTrang >= dungGanDen ? '#ffffff' : '#0b0c1c'
}

// khoa: id chuyên khoa để tô màu + chọn icon cho huy hiệu — undefined khi không có ngữ cảnh chuyên
// khoa nào (lưới rỗng toàn bộ, chưa lọc gì). specialtyIcon() đã tự xử lý id lạ/undefined bằng icon
// "trang giấy" mặc định (xem SpecialtyIcons.tsx), TheTrong không cần thêm nhánh dự phòng cho icon —
// chỉ cần tự lo phần MÀU (spec undefined thì không có spec.color để đọc).
function TheTrong({ khoa }: { khoa?: string }) {
  const spec = SPECIALTIES.find((s) => s.id === khoa)
  return (
    <div className="relative w-full h-full" aria-hidden="true">
      {/* Không còn nền doodle vẽ tay — phản hồi thật (2026-08-26, test tay): "xóa ảnh background
          nét line đi". Huy hiệu chuyên khoa CHÍNH GIỮA khung 4:3 (50%,50%), không nền/viền tròn. */}
      <div
        aria-hidden="true"
        data-testid="huy-hieu-chuyen-khoa"
        data-khoa={khoa ?? ''}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '34%',
          aspectRatio: '1 / 1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Nhánh "chưa gắn chuyên khoa" tô bằng --c-on-note-muted, KHÔNG phải --c-text-muted:
          // huy hiệu này nằm TRÊN tờ giấy (.mind-note-card) vốn không đổi theo theme, còn
          // --c-text-muted thì lật sáng ở bản tối — cặp đó đo được 2,69:1 trên giấy bản tối, dưới
          // ngưỡng 3:1 của WCAG 1.4.11 cho đồ hoạ mang nghĩa (critique 2026-08-28, P0). Token mới
          // giữ 5,9:1 / 5,2:1 ở cả hai bản mà vẫn nhạt hơn hẳn --c-on-note, đúng sắc thái "chưa
          // gắn khoa". Nhánh spec.color không đổi: màu chuyên khoa đều đậm, thấp nhất đo được
          // 5,04:1 trên giấy nên vốn đã an toàn ở cả hai bản.
          color: spec ? spec.color : 'var(--c-on-note-muted, #5c5f7a)',
        }}
      >
        {specialtyIcon(khoa, 'w-full h-full')}
      </div>
    </div>
  )
}

// Lời mời ở trạng thái lưới rỗng. ` ` là DẤU CÁCH KHÔNG NGẮT (non-breaking space) chèn vào
// giữa các âm tiết của cùng MỘT từ ghép — trình duyệt được phép xuống dòng ở bất kỳ dấu cách nào,
// mà tiếng Việt viết rời từng âm tiết nên "bức tranh" bị cắt thành "bức" cuối dòng trên / "tranh"
// đầu dòng dưới (phản hồi chủ dự án 2026-08-28, mục 2: 'chữ "bức tranh" phải sát nhau'). Khoá cứng
// bốn từ ghép mang nghĩa — "kiến thức", "bức tranh", "trực quan", "hình dung" — vẫn chừa đủ chỗ
// ngắt hợp lệ (sau "Biến", "thành", dấu phẩy, "dễ") để text-wrap:balance chia hai dòng cho đều.
// Dùng escape ` ` chứ KHÔNG dán ký tự thật vào chuỗi: ký tự thật nhìn y hệt dấu cách thường
// trong mã nguồn, người sửa sau sẽ vô tình gõ đè thành dấu cách thường mà không ai thấy.
const LOI_MOI_TRONG = 'Biến kiến thức thành bức tranh trực quan, dễ hình dung'

// Biểu tượng "Sơ đồ tư duy" cho trạng thái lưới rỗng — CÙNG icon với tab Mindmap ở thanh nav dưới
// (App.tsx: icons.mindmap, viewBox 0 0 608 608, tô currentColor). Hai <path> chép nguyên xi vào
// đây thay vì import: `icons` là object PRIVATE trong App.tsx (12.000+ dòng, không export) — cùng
// path nghĩa là cùng hình, không phải một icon mới. Thay cho hình tự vẽ trước đây (phản hồi chủ dự
// án 2026-08-29: "xoá hình bạn vẽ, thay bằng hình icon mindmap"). currentColor tự ăn theo màu div
// cha (--c-text-muted) nên hợp cả bản sáng lẫn tối.
function BieuTuongMindmap() {
  return (
    <svg
      viewBox="0 0 608 608"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
      data-testid="bieu-tuong-mindmap"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <path d="M118.906410,117.928040 C133.539993,93.791702 152.227600,73.907448 174.708923,57.503590 C200.352142,38.792599 228.852142,26.546539 259.626648,19.118103 C284.605316,13.088681 310.035553,10.891353 335.406097,13.052048 C390.167786,17.715855 440.343872,35.114105 482.760406,71.374138 C513.184021,97.381973 533.056519,129.907104 542.523560,168.882431 C547.748108,190.391571 549.950562,212.173187 549.084106,234.197601 C548.410828,251.311401 545.916077,268.256165 542.856873,285.146790 C539.976929,301.047852 536.352783,316.690094 531.575073,332.125305 C526.484558,348.570923 519.520630,364.165344 511.599152,379.386566 C503.141602,395.637848 494.668274,411.887268 491.931366,430.348907 C491.761169,431.496979 491.421631,432.633301 491.373047,433.784058 C490.549103,453.301483 491.635590,472.695770 494.969452,491.965607 C498.648407,513.230286 502.889008,534.370544 508.256805,555.280212 C515.833496,584.794495 491.929840,601.507507 472.126221,601.426208 C388.142365,601.081543 304.154724,601.022156 220.172134,601.501404 C201.947968,601.605408 185.421768,588.026184 183.257233,568.591553 C182.531525,562.075745 184.842758,555.712952 186.290771,549.482422 C189.260284,536.705322 190.410797,523.900818 189.827454,510.857666 C189.381409,500.884186 187.789658,499.264038 178.091125,499.270538 C166.759811,499.278137 155.427979,499.331970 144.097275,499.246307 C119.581573,499.061005 98.586548,483.006256 92.253807,459.285339 C89.691040,449.685822 90.868210,439.740479 90.737724,429.936493 C90.650040,423.348450 90.728981,423.356384 84.127533,423.316833 C75.175163,423.263184 66.335518,423.764069 57.685825,419.815979 C41.548100,412.450043 30.176935,393.495789 33.040939,376.327148 C34.358864,368.426697 38.213509,361.257111 41.389156,353.935699 C51.321606,331.036499 61.435879,308.214386 71.159393,285.226929 C79.658264,265.134705 83.507843,244.008759 84.996986,222.264771 C85.914673,208.864944 88.538200,195.587204 91.995163,182.569504 C98.004524,159.940369 106.763206,138.416901 118.906410,117.928040 M362.500000,576.818054 C399.663788,576.824402 436.827576,576.843201 473.991364,576.827209 C481.949432,576.823792 486.990204,570.663574 485.314758,562.940369 C484.329041,558.396729 482.973999,553.933960 481.954865,549.396667 C475.579315,521.013062 470.159698,492.506226 467.635345,463.438446 C465.194733,435.334991 469.154510,408.681549 482.350250,383.625488 C489.490662,370.067291 496.914490,356.622772 502.501099,342.346741 C514.327942,312.124329 520.929932,280.661804 523.885010,248.381653 C526.256653,222.474197 524.510925,196.948700 517.844421,171.734299 C510.804016,145.106003 497.980194,121.749222 479.156677,101.693825 C463.003845,84.483917 443.887207,71.437988 422.757599,61.004940 C394.897430,47.248596 365.330109,39.739254 334.603119,37.523029 C304.361420,35.341805 274.476440,38.258488 245.491776,48.231949 C218.036438,57.679184 193.257233,71.550133 171.797791,91.159599 C150.392044,110.720009 134.986465,134.406982 124.116447,161.165649 C116.371666,180.230911 111.721420,200.078354 109.249153,220.456436 C107.710548,233.138687 107.285324,245.919037 104.633240,258.511047 C99.889656,281.033356 90.447861,301.768402 81.324013,322.652100 C73.796677,339.881500 66.106705,357.040558 58.680969,374.313385 C53.891441,385.454132 59.927811,396.323029 71.892288,398.974335 C79.175301,400.588257 86.540611,400.057312 93.799400,399.682220 C106.701424,399.015564 115.628586,409.585938 115.198555,421.361603 C114.876442,430.181793 115.058090,439.025208 115.183365,447.855865 C115.394127,462.713135 127.443565,474.692932 142.313324,474.808868 C155.311554,474.910217 168.311172,474.820251 181.310043,474.860138 C185.658722,474.873505 189.917816,475.519653 193.988953,477.141724 C209.152649,483.183258 212.921783,496.321045 214.133316,510.568420 C215.544693,527.166382 212.349792,543.416443 208.605438,559.475647 C205.818466,571.428711 209.695129,576.827393 222.010376,576.828552 C268.506927,576.832947 315.003448,576.822144 362.500000,576.818054 z" />
      <path d="M465.892609,173.131989 C477.955750,187.286011 480.877411,202.762497 472.907623,219.312363 C464.914276,235.911194 450.662140,243.710114 432.640930,244.031754 C423.179169,244.200623 414.280060,240.909821 406.642029,235.074432 C404.236481,233.236603 402.323212,233.321381 399.870056,234.741913 C386.611206,242.419754 373.322845,250.047974 359.975555,257.570709 C357.573853,258.924347 356.537964,260.077759 357.819885,262.996826 C364.359955,277.888855 363.944763,292.809998 356.774536,307.309113 C354.532196,311.843353 354.828613,314.430664 358.873138,317.750824 C366.457336,323.976746 373.517731,330.854187 380.629150,337.635620 C383.242767,340.127991 385.503693,340.545624 388.999817,339.179352 C411.180115,330.511444 432.222565,337.601868 444.855957,357.697327 C454.578156,373.162079 450.940582,396.408203 436.871338,408.723175 C412.747772,429.838837 378.165680,422.120972 365.824799,392.586853 C361.701843,382.719879 362.221100,372.384979 366.130005,362.429779 C367.110016,359.933868 367.365356,358.401062 365.191162,356.410400 C356.591766,348.536896 348.140900,340.499542 339.717133,332.437073 C337.868500,330.667755 336.363678,330.446411 334.020599,331.712433 C315.823853,341.544464 297.271027,342.452576 278.511719,333.342712 C276.172791,332.206909 274.843964,332.905945 273.429962,334.678833 C262.629089,348.220978 251.815506,361.753174 240.943573,375.238159 C239.299011,377.277985 239.598755,378.917786 240.809601,381.085022 C250.020264,397.570679 248.898926,415.157227 237.927521,428.746765 C226.770462,442.566345 206.963776,449.227966 190.218063,443.788269 C172.412979,438.004456 159.316437,422.716278 159.583115,402.207184 C159.820572,383.945435 172.800735,367.185333 190.808136,362.167999 C199.191910,359.832031 207.577332,360.058319 215.886505,362.229462 C219.034286,363.051910 220.906097,362.027649 222.749268,359.721680 C233.669327,346.059570 244.631546,332.431000 255.639557,318.839691 C257.021790,317.133118 257.755585,315.851501 256.304047,313.620728 C247.473648,300.049805 245.433990,285.280579 249.117950,269.643646 C249.548843,267.814636 248.942215,266.860718 247.474457,265.985504 C239.893906,261.465332 232.308838,256.950684 224.802567,252.309219 C222.569458,250.928375 221.196808,251.990326 219.506454,253.265472 C198.818207,268.872284 169.387131,263.407440 155.868225,241.496597 C140.995728,217.391861 153.118912,186.935577 180.816910,178.819702 C204.713394,171.817719 229.380859,185.700729 235.646530,209.714355 C237.181717,215.598038 236.755936,221.589233 236.233994,227.545578 C236.017670,230.014130 236.774200,231.603729 238.952759,232.855423 C245.448944,236.587723 251.901306,240.401443 258.279144,244.332062 C260.819946,245.897949 262.687469,245.599457 264.932373,243.646164 C272.024445,237.475235 279.725983,232.334335 289.184387,230.402786 C291.820557,229.864410 292.879333,228.023178 292.875214,225.267502 C292.837311,199.938263 292.822083,174.608627 292.955078,149.279922 C292.974335,145.608521 290.804077,144.504776 288.062317,143.340942 C274.240112,137.473679 264.808350,127.332130 262.077209,112.593864 C256.852478,84.399071 277.869568,64.741364 299.074036,62.192936 C320.553589,59.611446 341.525970,73.925781 347.014954,92.960762 C352.755768,112.869034 342.001343,135.469803 322.617523,143.053665 C318.340759,144.726913 316.774506,146.878326 316.812744,151.439545 C317.012390,175.267624 317.009033,199.098801 316.844879,222.927307 C316.813110,227.543472 318.381744,229.794708 322.899750,231.058273 C328.146332,232.525589 333.328613,234.561142 337.698792,238.038330 C340.122711,239.966980 342.427368,239.941406 345.043945,238.426834 C359.309967,230.169189 373.606781,221.964661 387.912720,213.776276 C389.877350,212.651764 390.488678,211.407867 390.140503,208.935608 C386.901550,185.938980 400.411163,166.129669 422.770264,160.403946 C439.600342,156.094116 453.466248,161.449875 465.892609,173.131989 M289.602570,311.917358 C302.271973,317.095734 314.664093,317.081055 325.844299,308.550995 C334.182190,302.189453 339.397125,293.281708 338.359467,282.666992 C336.518036,263.829742 322.422058,252.143723 303.333252,252.320084 C289.499878,252.447891 275.755585,262.867920 272.469421,275.718933 C268.691711,290.492340 275.021393,304.339142 289.602570,311.917358 M287.101257,96.777718 C281.872620,108.473328 289.195740,120.694138 302.059418,122.670181 C313.939575,124.495132 326.520844,112.872147 324.217407,101.894653 C322.341461,92.954506 316.027008,86.981010 306.902893,85.515076 C300.150909,84.430260 291.592834,89.053734 287.101257,96.777718 M418.231934,213.232635 C422.852417,218.130066 428.449310,220.231949 435.227081,219.744232 C446.711090,218.917877 455.233643,208.144119 452.425018,197.559311 C450.407867,189.957397 445.366425,184.937057 437.771179,183.553040 C429.429382,182.032974 421.610016,183.933823 416.812469,191.679001 C412.486633,198.662598 412.841614,205.880707 418.231934,213.232635 M212.677292,222.004974 C213.047638,211.728622 208.598633,205.264038 198.913986,202.006332 C190.104355,199.042953 179.540695,203.632889 175.360443,212.240387 C171.467224,220.256897 174.645584,230.146896 182.762451,235.272842 C193.805878,242.247025 208.494797,236.078705 212.677292,222.004974 M422.435974,388.846069 C427.471649,381.145233 427.153168,372.131531 421.641022,366.349152 C415.912659,360.339935 405.752167,358.237610 398.093506,361.476898 C390.116638,364.850769 385.131439,374.589752 387.440063,382.289215 C391.946198,397.317749 409.954437,401.025848 422.435974,388.846069 M222.638062,405.885406 C223.057495,395.107025 219.030197,389.060425 209.290344,385.845123 C200.451050,382.927185 191.060837,386.182922 186.128296,393.875824 C182.402374,399.686859 183.398682,409.979431 188.483307,415.215302 C197.259109,424.252106 217.927414,423.970337 222.638062,405.885406 z" />
    </svg>
  )
}

function TheBang({
  bang,
  index,
  dangXoa,
  dangSuaTen,
  dangMoMenu,
  dangXacNhanXoa,
  dangSuaTag,
  onMo,
  onBatMenu,
  onBatSuaTen,
  onLuuTen,
  onXoa,
  onBatSuaTag,
  onDoiChuyenKhoa,
  onThemTag,
  onXoaTag,
}: {
  bang: BangMeta
  index: number
  dangXoa: boolean
  dangSuaTen: boolean
  dangMoMenu: boolean
  dangXacNhanXoa: boolean
  dangSuaTag: boolean
  onMo: (origin?: BoardOpenOrigin) => void
  onBatMenu: () => void
  onBatSuaTen: () => void
  onLuuTen: (tenMoi: string) => void
  onXoa: () => void
  onBatSuaTag: () => void
  onDoiChuyenKhoa: (id: string) => void
  onThemTag: (tag: string) => void
  onXoaTag: (tag: string) => void
}) {
  const [tenNhap, setTenNhap] = useState(bang.ten)
  const [tagNhap, setTagNhap] = useState('')
  const nutRef = useRef<HTMLButtonElement>(null)
  // Nút "⋯" — giữ ref để TRẢ FOCUS về đây khi đóng menu/panel bằng Escape (bàn phím/trình đọc màn
  // hình mở sheet ra rồi thoát, con trỏ tiêu điểm phải quay lại đúng chỗ vừa bấm, không rơi về
  // <body>). Đóng bằng bấm-ra-ngoài hoặc chọn một mục (Đổi tên/tag/Xoá) KHÔNG trả về đây — focus
  // đi theo hành động (ô đổi tên tự autoFocus, v.v.), đúng như mong đợi.
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const tagPanelRef = useRef<HTMLDivElement>(null)
  // Hẹn giờ nhấn-giữ (xem NHAN_GIU_MS) + toạ độ điểm chạm đầu để đo trượt. `daNhanGiuRef` là cờ
  // "lượt chạm này ĐÃ mở menu bằng nhấn-giữ" — onClick đọc nó để KHÔNG mở luôn cả bảng ngay sau đó
  // (pointerup vẫn sinh ra một click bình thường, không có cờ này thì giữ tay = vừa mở menu vừa mở
  // bảng, menu nháy lên rồi biến mất cùng lúc canvas chiếm màn hình).
  const hesNhanGiuRef = useRef<number | null>(null)
  const diemChamRef = useRef<{ x: number; y: number } | null>(null)
  const daNhanGiuRef = useRef(false)

  const huyNhanGiu = () => {
    if (hesNhanGiuRef.current !== null) {
      clearTimeout(hesNhanGiuRef.current)
      hesNhanGiuRef.current = null
    }
    diemChamRef.current = null
  }
  // Thẻ có thể bị gỡ khỏi DOM giữa lúc đang đếm giờ (xoá bảng, đổi chip lọc, huỷ tìm kiếm) — hẹn
  // giờ còn sống sẽ gọi onBatMenu() cho một thẻ không còn tồn tại.
  useEffect(() => huyNhanGiu, [])
  // Tên chuyên khoa cho aria-label — huy hiệu chuyên khoa trong TheTrong là aria-hidden (nó lồng
  // vào artwork trang trí), nên người dùng trình đọc màn hình không có cách nào khác biết bảng này
  // thuộc chuyên khoa nào trong khi người dùng sáng mắt thấy ngay qua icon+màu (critique 2026-08-26 P3).
  const tenChuyenKhoa = SPECIALTIES.find((s) => s.id === (bang.chuyenKhoa ?? SPECIALTIES[0].id))?.name

  // Tính "vừa tạo" bằng ĐỒNG HỒ RIÊNG của thẻ, không phải mốc đông cứng lúc DanhSachBang mount —
  // trước đây parent chụp `Date.now()` một lần lúc MOUNT rồi so cho MỌI thẻ; bảng tạo SAU khi
  // gallery đã mở (đúng luồng "+" → mở ô đổi tên tại chỗ) có taoLuc > mốc đó, hiệu số luôn ÂM nên
  // `vuaTao` treo `true` suốt phiên xem thay vì tắt sau 3s — thẻ đóng băng ở khung hình đầu của
  // .card-plop, kéo theo vùng chạm "⋯" bị scale nhỏ lại (critique lượt 3, 2026-08-24). Đồng hồ
  // riêng + hẹn giờ tự tắt ở đây đảm bảo đúng hạn bất kể parent có re-render đúng lúc t+3s hay không.
  const [vuaTao, setVuaTao] = useState(() => Date.now() - bang.taoLuc < VUA_TAO_NGUONG_MS)
  useEffect(() => {
    if (!vuaTao) return
    const conLai = VUA_TAO_NGUONG_MS - (Date.now() - bang.taoLuc)
    if (conLai <= 0) {
      setVuaTao(false)
      return
    }
    const id = setTimeout(() => setVuaTao(false), conLai)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ cần chạy lại khi ĐỔI bảng (khoá
    // theo id), không phải mỗi khi `vuaTao` tự nó đổi (tránh vòng lặp huỷ-rồi-lập-lại hẹn giờ).
  }, [bang.id, bang.taoLuc])

  // `tenNhap` chỉ khởi tạo MỘT LẦN từ `useState(bang.ten)` — không tự đồng bộ lại khi mở sửa tên
  // LẦN THỨ HAI. Không có effect này: gõ nháp → Escape (huỷ, không lưu nhưng cũng không reset ô
  // nhập) → mở sửa tên lại → ô nhập vẫn hiện bản nháp đã huỷ chứ không phải tên thật hiện tại →
  // lỡ tay blur ra ngoài thì `onLuuTen(tenNhap)` ÂM THẦM ghi đè tên bảng bằng bản nháp cũ — mất
  // dữ liệu thật, không chỉ hiển thị sai. Đồng bộ lại mỗi khi `dangSuaTen` chuyển sang true.
  useEffect(() => {
    if (dangSuaTen) setTenNhap(bang.ten)
  }, [dangSuaTen, bang.ten])

  // Quản lý tiêu điểm cho sheet "⋯" và panel chuyên khoa/tag — cả hai là <div> thường, không có
  // hành vi focus sẵn của control gốc (critique 2026-08-28 P2, persona Sam: mở sheet ra là focus
  // vẫn kẹt ở đầu lưới đã cuộn, Tab lại xổ trang ra xa sheet). Mở → đưa focus vào phần tử focus
  // được đầu tiên TRONG sheet. Đóng bằng Escape → trả về nút "⋯". Tab bị giam vòng trong sheet.
  // Deps là HAI cờ riêng (không phải `dangMoMenu || dangSuaTag`) để lượt chuyển menu→panel — hai
  // cờ đổi nhưng "có sheet nào mở" vẫn true — vẫn kích hoạt lại đúng ref mới.
  useEffect(() => {
    const el = dangMoMenu ? menuRef.current : dangSuaTag ? tagPanelRef.current : null
    if (!el) return
    const focusables = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((n) => !n.hasAttribute('disabled'))
    focusables()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        menuBtnRef.current?.focus()
        return
      }
      if (e.key !== 'Tab') return
      const f = focusables()
      if (f.length === 0) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [dangMoMenu, dangSuaTag])

  const lopVaoMan = dangXoa ? 'card-slide-out' : vuaTao ? 'card-plop' : 'card-settle'

  return (
    <div
      data-testid="the-bang"
      className={lopVaoMan}
      style={{
        position: 'relative',
        '--tilt': `${nghiengOnDinh(bang.id)}deg`,
        '--i': index,
        pointerEvents: dangXoa ? 'none' : undefined,
      } as React.CSSProperties}
    >
      <button
        ref={nutRef}
        type="button"
        onClick={() => {
          // Lượt chạm này vừa mở menu bằng nhấn-giữ → nuốt cú click đi kèm, đừng mở luôn cả bảng.
          if (daNhanGiuRef.current) {
            daNhanGiuRef.current = false
            return
          }
          // Chỉ dựng origin khi rect đo được có kích thước thật (>0) — rect rỗng (0×0) xảy ra khi
          // phần tử chưa layout xong hoặc trong môi trường không có engine layout thật (vd ca kiểm
          // happy-dom). Không có kích thước thật thì FLIP không có gì để "First" từ đó — rơi về
          // .board-in (scale-fade) cũ thay vì một chuyển cảnh co về góc (0,0) vô nghĩa.
          const r = nutRef.current?.getBoundingClientRect()
          onMo(
            r && r.width > 0 && r.height > 0
              ? {
                  top: r.top,
                  left: r.left,
                  width: r.width,
                  height: r.height,
                  tilt: nghiengOnDinh(bang.id),
                  anhXemTruoc: bang.anhXemTruoc,
                  chuyenKhoa: bang.chuyenKhoa,
                }
              : undefined,
          )
        }}
        className="the-bang-vat the-bang-nghieng-con-tro mind-focus-ring"
        // Nhấn-giữ CHỈ cho cảm ứng/bút. Chuột được loại trừ có chủ ý: trên máy có con trỏ, nút "⋯"
        // đã hiện rõ khi rê tới và không ai có thói quen giữ chuột để mở menu — bật cho chuột chỉ
        // tạo ra một cái bẫy "giữ hơi lâu rồi thả thì bảng không mở".
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse') return
          huyNhanGiu()
          daNhanGiuRef.current = false
          diemChamRef.current = { x: e.clientX, y: e.clientY }
          hesNhanGiuRef.current = window.setTimeout(() => {
            hesNhanGiuRef.current = null
            daNhanGiuRef.current = true
            onBatMenu()
          }, NHAN_GIU_MS)
        }}
        onPointerUp={huyNhanGiu}
        onPointerCancel={huyNhanGiu}
        // Long-press trên cảm ứng làm iOS/Android bật menu ngữ cảnh hệ thống ("Sao chép", "Chia
        // sẻ…") đè lên menu của app — chặn để hai menu không chồng nhau.
        onContextMenu={(e) => e.preventDefault()}
        onPointerMove={(e) => {
          if (e.pointerType !== 'mouse') {
            // Trượt quá ngưỡng = đang cuộn lưới, không phải nhấn giữ.
            const d = diemChamRef.current
            if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > NHAN_GIU_TRUOT_TOI_DA) huyNhanGiu()
            return
          }
          const el = nutRef.current
          if (!el) return
          const r = el.getBoundingClientRect()
          el.style.setProperty('--con-tro-x', String((e.clientX - r.left) / r.width))
          el.style.setProperty('--con-tro-y', String((e.clientY - r.top) / r.height))
        }}
        onPointerLeave={() => {
          huyNhanGiu()
          nutRef.current?.style.removeProperty('--con-tro-x')
          nutRef.current?.style.removeProperty('--con-tro-y')
        }}
        // WebkitTouchCallout/userSelect none: đi kèm nhấn-giữ ở trên — iOS bật bong bóng "Sao chép"
        // và bôi đen tên bảng ngay giữa cử chỉ giữ nếu không tắt, khiến menu app mở ra dưới một lớp
        // lựa chọn văn bản đang nhấp nháy. Không ảnh hưởng bàn phím/trình đọc màn hình.
        style={{
          display: 'block',
          width: '100%',
          border: 0,
          background: 'none',
          padding: 0,
          textAlign: 'left',
          WebkitTouchCallout: 'none',
          userSelect: 'none',
        }}
        aria-label={tenChuyenKhoa ? `Mở bảng ${bang.ten}, chuyên khoa ${tenChuyenKhoa}` : `Mở bảng ${bang.ten}`}
      >
        <div
          // .mind-note-card (index.css): tờ giấy ghim y hệt ảnh tham chiếu người dùng gửi lần 2
          // (2026-08-26) — trắng, mép dưới-trái cong lên (curl), có bóng đổ thật để "nổi" khỏi trang
          // (KHÔNG áp Floating-Layer-Only Rule ở đây — bề mặt Mindmap có luật vật liệu riêng, xem
          // surface brief "chân thực vật lý"). overflow KHÔNG hidden ở div này — góc cong + bóng cần
          // tràn ra ngoài khung 4:3; ảnh/doodle bên trong được bọc riêng một div overflow:hidden.
          className="mind-note-card"
          style={{ position: 'relative', aspectRatio: '4 / 3' }}
        >
          <div
            style={{
              position: 'absolute',
              // Ảnh thật (anhXemTruoc) chừa mép giấy 6px đều bốn phía — ẢNH KHÔNG PHỦ KÍN sát viền
              // thẻ như trước. Lượt trước ảnh tràn hết inset:0 xoá mất toàn bộ chất liệu "giấy ghim"
              // của .mind-note-card ngay khi bảng có nội dung: nền canvas tối gần trùng nền app khiến
              // thẻ đọc thành một khối màu phẳng nổi trơ trên nền — đúng cảm giác "ảnh placeholder AI"
              // generic, không còn là MỘT TẤM ẢNH ĐƯỢC GHIM LÊN GIẤY THẬT (phản hồi thật 2026-08-27,
              // taste review). Giấy giờ LUÔN lộ ra như đường viền Polaroid, bất kể bảng trống hay có
              // nội dung — nhất quán với TheTrong (bảng trống, vẫn tràn kín vì đó là icon trang trí
              // của CHÍNH tờ giấy, không phải một tấm ảnh dán lên trên).
              inset: bang.anhXemTruoc ? 6 : 0,
              overflow: 'hidden',
              borderRadius: 2,
              color: 'var(--c-text-muted, #6b6e96)',
              boxShadow: bang.anhXemTruoc ? 'inset 0 0 0 1px rgba(0,0,0,0.08)' : undefined,
            }}
          >
            {bang.anhXemTruoc ? (
              <img
                src={bang.anhXemTruoc}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <TheTrong khoa={bang.chuyenKhoa ?? SPECIALTIES[0].id} />
            )}
          </div>
          {/* Không còn cây ghim vẽ trên thẻ — chủ dự án yêu cầu bỏ hẳn (2026-08-29: "xóa ghim").
              Phân biệt bảng cùng tên mặc định vẫn còn: icon + màu chuyên khoa trong TheTrong, tên,
              vị trí trong lưới, và chấm màu ổn định trong panel "Đã xoá gần đây". */}
        </div>
        {!dangSuaTen && (
          <>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                margin: '4px 0 0',
                lineHeight: 1.2,
                // Tên lâm sàng dài (vd danh sách chẩn đoán phân biệt) từng kéo cả HÀNG lưới cao theo
                // ô cao nhất (Grid stretch mặc định), để lại khoảng trắng chết ở thẻ liền kề tên
                // ngắn — chặn ở 2 dòng, cùng cỡ mọi thẻ trong cùng hàng luôn khớp nhau.
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {bang.ten}
            </p>
            <p style={{ fontSize: 11, margin: '1px 0 0', color: 'var(--c-text-muted, #6b6e96)' }}>
              {formatReadTime(bang.capNhatLuc)}
            </p>
          </>
        )}
      </button>

      {dangSuaTen && (
        <input
          type="text"
          data-testid={`input-ten-${bang.id}`}
          value={tenNhap}
          autoFocus
          // aria-label TĨNH, không dựa vào `value` — nếu không, người dùng đọc màn hình xoá trắng ô
          // để gõ lại sẽ mất tên truy cập giữa chừng (critique lượt 3, 2026-08-24).
          aria-label="Đổi tên bảng"
          onChange={(e) => setTenNhap(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onLuuTen(tenNhap)
            if (e.key === 'Escape') onLuuTen(bang.ten)
          }}
          onBlur={() => onLuuTen(tenNhap)}
          className="mind-focus-ring"
          // `input:focus{outline:none}` (index.css, reset toàn app) + Tailwind preflight đưa border
          // về 0 cộng lại xoá sạch MỌI tín hiệu đây là ô nhập — .mind-focus-ring chỉ bù lại lúc
          // :focus-visible (bàn phím), nên cần thêm viền nghỉ để ô này trông "có thể sửa" ngay cả
          // trước khi focus.
          style={{
            width: '100%',
            marginTop: 4,
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid var(--c-line, #d9ddf4)',
            borderRadius: 4,
            padding: '2px 4px',
            background: 'var(--c-surface, #fff)',
          }}
        />
      )}

      <button
        ref={menuBtnRef}
        type="button"
        data-testid={`menu-bang-${bang.id}`}
        onClick={onBatMenu}
        aria-label="Tuỳ chọn bảng"
        aria-haspopup="menu"
        aria-expanded={dangMoMenu || dangSuaTag}
        className="mind-focus-ring"
        // Vùng chạm 44×44 (chuẩn tối thiểu cho ngón tay, WCAG 2.2 AA + khuyến nghị thực hành) — giữ
        // cùng gốc top/right:4 như cũ (không đẩy ra ngoài mép thẻ, tránh chồng lên khoảng gap của
        // lưới) nên box lớn hơn ăn VÀO PHÍA TRONG thẻ; icon tự căn giữa lại bằng flex, dịch nhẹ
        // vào trong so với vị trí cũ — chấp nhận được, không phóng to một hình tròn nền/viền vốn
        // không tồn tại (nút này chưa từng có background/border thấy được, chỉ có ba dấu chấm).
        //
        // color BẮT BUỘC đặt ở đây, không để kế thừa: nút nằm TRÊN tờ giấy .mind-note-card (không
        // đổi theo theme) nhưng Tailwind preflight cho <button> `color: inherit`, nên trước lượt vá
        // này nó nhận --c-text — token LẬT sang near-white ở bản tối. Đo thật trên trang:
        // rgb(236,239,252) trên giấy rgb(239,236,227) = 1,03:1, tức nút mở TOÀN BỘ hành động của
        // thẻ (đổi tên, gắn khoa, xuất PNG, xoá) VÔ HÌNH ở dark mode — đúng ca dùng ban đêm mà
        // DESIGN.md đặt làm ràng buộc hạng nhất (critique 2026-08-28, P0). --c-on-note giữ 17,3:1
        // bản sáng / 15,5:1 bản tối.
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 0,
          background: 'none',
          color: 'var(--c-on-note, #12142b)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Icon VẼ THẬT thay cho ký tự Unicode "⋯" dùng trước đây. Hai lý do: (1) glyph Unicode
            render khác nhau theo font/hệ điều hành và không nhận được cỡ/khoảng cách nhất quán như
            phần còn lại của hệ icon app (đều là SVG currentColor); (2) ba chấm đặc r=1.5 ở 18px
            đọc rõ hơn hẳn glyph text cùng ô — trực tiếp nới cái affordance vốn quá mờ nhạt
            (critique 2026-08-28, P2). currentColor nên tự ăn theo --c-on-note đặt ngay trên. */}
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
          <circle cx="3.5" cy="9" r="1.5" fill="currentColor" />
          <circle cx="9" cy="9" r="1.5" fill="currentColor" />
          <circle cx="14.5" cy="9" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {dangMoMenu && (
        // .mind-menu-bang: trên màn hẹp (mobile), src/index.css ghim panel này xuống ĐÁY màn hình
        // (bottom sheet, luôn trong tầm ngón cái) thay vì neo cứng top:30 relative-tới-thẻ — thẻ ở
        // HÀNG TRÊN CÙNG của lưới dài mở panel gần rìa trên, không phải vùng ngón cái thoải mái nhất
        // khi dùng một tay (critique 2026-08-26, minor observation). .mind-sheet thêm hiệu ứng trượt
        // lên nhẹ, nhất quán với các sheet khác của app.
        <div
          // mind-menu-compact: chỉ 3 dòng chữ ngắn (Chuyên khoa/tag, Đổi tên, Xoá) — KHÔNG cần trải
          // full-bleed như panel "Chuyên khoa/tag" ngay dưới (có select+chip+input, thật sự cần rộng).
          // Cả hai vốn dùng chung .mind-menu-bang nên trên mobile đều bị media query kéo full-bleed
          // như nhau, khiến menu thưa nội dung này đọc thành một menu quá khổ so với "các menu còn
          // lại" của app (phản hồi thật 2026-08-27, taste review). Modifier này cho index.css tách
          // riêng: vẫn ghim đáy màn hình trong tầm ngón cái (lý do gốc của bottom-sheet, giữ nguyên
          // critique 2026-08-26), chỉ bỏ ép trải hết bề ngang.
          ref={menuRef}
          role="menu"
          aria-label={`Tuỳ chọn bảng ${bang.ten}`}
          className="mind-menu-bang mind-menu-compact mind-sheet"
          style={{ position: 'absolute', top: 30, right: 4, width: 'max-content', background: 'var(--c-surface, #fff)', boxShadow: '0 2px 8px var(--c-shadow), var(--c-shadow-glow)', border: '1px solid rgba(var(--c-accent-2-rgb, 184, 25, 111), 0.2)', borderRadius: 8, padding: 4, zIndex: 1 }}
        >
          {/* Vùng chạm 40px (display:flex+minHeight, không phải padding trần) + khoảng cách/đường
              phân trước mục xoá — trước đây hai dòng cao ~30.6px, cách nhau 0px, hành động phá huỷ
              đứng ngay sát hành động an toàn (critique lượt 3, 2026-08-24), nên tăng lên 44px. 44px
              sau đó tự đọc thành "dòng dãn cách quá xa" cho 3-4 dòng chữ 12px ngắn xếp chồng (phản
              hồi thật 2026-08-28) — hạ về 40px: vẫn vượt xa ngưỡng WCAG 2.5.8 AA (24px, không phải
              44 — 44 là mức khuyến nghị AAA/HIG, không bắt buộc), vẫn đủ rộng hơn hẳn 30.6px từng bị
              coi là lỗi, chỉ bớt khoảng đệm rỗng trên/dưới mỗi dòng chữ. Đường phân + marginTop trước
              "Xoá" giữ nguyên — đó là phần thật sự xử lý ranh giới phá huỷ/an toàn, độc lập với chiều
              cao từng dòng.
              width:'max-content' trên div ngoài + whiteSpace nowrap trên từng nhãn (mới thêm
              2026-08-26, phản hồi thật "cắt cụt ngang") — trước đây div ngoài KHÔNG có width tường
              minh, phải tự suy shrink-to-fit trong khi mọi <button> con lại đặt width:100% CỦA CHÍNH
              div đó — vòng phụ thuộc khiến trình duyệt suy ra độ rộng hẹp hơn nội dung thật, ngắt dòng
              ngay giữa nhãn dài nhất ("Chuyên khoa/tag" vỡ thành "Chuyên" / "khoa/tag" trên hai dòng).
              CHỌN 'max-content' thay vì một số minWidth cố định (thử trước, ĐÃ BỎ): số cố định đè
              lên đúng cơ chế "trải full-width" của bottom sheet mobile ngay dưới (.mind-menu-bang
              media max-width:640px đặt width:auto!important + left/right:12px) — !important CHỈ
              thắng width, không thắng min-width, nên minWidth cố định vẫn ăn vào SAU khi width:auto
              đã giải, ép menu bottom-sheet mobile co lại đúng bằng con số đó thay vì trải hết bề
              ngang (đo thật: 172px thay vì ~351px ở màn 375px — hồi quy tự phát hiện lúc kiểm tay).
              max-content không xung đột: nó là GIÁ TRỊ width thật (không phải min-width) nên bị
              width:auto!important ở mobile ghi đè đúng như ý, còn ở desktop trình duyệt tự suy đúng
              độ rộng cần thiết từ nội dung chữ dài nhất — không cần đoán một con số px. */}
          {/* fontSize 10 + fontWeight 600 — KHỚP đúng nhãn thanh nav dưới (App.tsx: text-[10px],
              fontWeight 500/700 tuỳ trạng thái). Ba nút này trước đây KHÔNG đặt fontSize nào, nên
              thừa kế cỡ chữ mặc định trình duyệt (~16px) — to hơn HẲN mọi chữ khác quanh nó (chip
              12px, nhãn "Chuyên khoa"/tag 11px) — vừa đọc "chữ menu quá bự", vừa kéo bề rộng
              max-content của cả thanh menu to theo (phản hồi thật 2026-08-27, layout review). Chữ
              nhỏ lại không thu hẹp vùng chạm: minHeight:40 vẫn giữ nguyên, chỉ khối TEXT bên trong
              gọn lại — không bị ép/cắt cụt vì max-content vẫn tự co đúng theo độ rộng chữ mới. */}
          <button
            type="button"
            data-testid={`sua-tag-${bang.id}`}
            onClick={onBatSuaTag}
            className="mind-focus-ring"
            role="menuitem"
            style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 40, textAlign: 'left', padding: '0 10px', border: 0, background: 'none', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600 }}
          >
            Chuyên khoa/tag
          </button>
          <button
            type="button"
            data-testid={`doi-ten-${bang.id}`}
            onClick={onBatSuaTen}
            className="mind-focus-ring"
            role="menuitem"
            style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 40, textAlign: 'left', padding: '0 10px', border: 0, background: 'none', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600 }}
          >
            Đổi tên
          </button>
          {bang.anhXemTruoc ? (
            // Xuất ẢNH XEM TRƯỚC đã lưu sẵn (data URL JPEG, ghi lúc rời bảng — capNhatAnhXemTruoc(),
            // boardMeta.ts) — KHÔNG mở bảng để xuất bằng ExportManager thật. Đây là điểm "chuyển ra
            // board" người dùng yêu cầu (phản hồi thật 2026-08-27, lần 3: xoá hẳn menu xuất trong
            // màn vẽ, dồn về đúng menu "..." sẵn có của thẻ ở lưới cùng Đổi tên/Chuyên khoa).
            // Nhãn "Xuất PNG" (2026-08-28, phản hồi thật: "thiếu nút xuất PNG" — trước đây đặt tên
            // "Xuất ảnh" vì file gốc là JPEG, nhãn phải khớp định dạng thật). Vẽ lại ảnh JPEG lên một
            // <canvas> rồi toDataURL('image/png') để tệp xuất ra ĐÚNG LÀ PNG thật (không chỉ đổi đuôi
            // .png lên byte JPEG) — data: URL không dính CORS/taint nên canvas đọc lại được an toàn.
            <button
              type="button"
              data-testid={`xuat-anh-${bang.id}`}
              role="menuitem"
              onClick={() => {
                const anh = new Image()
                anh.onload = () => {
                  const canvas = document.createElement('canvas')
                  canvas.width = anh.naturalWidth
                  canvas.height = anh.naturalHeight
                  const ctx = canvas.getContext('2d')
                  if (!ctx) return
                  ctx.drawImage(anh, 0, 0)
                  const a = document.createElement('a')
                  a.href = canvas.toDataURL('image/png')
                  a.download = `${bang.ten.replace(/[\\/:*?"<>|]/g, '_')}.png`
                  a.click()
                }
                anh.src = bang.anhXemTruoc as string
              }}
              className="mind-focus-ring"
              style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 40, textAlign: 'left', padding: '0 10px', border: 0, background: 'none', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600 }}
            >
              Xuất PNG
            </button>
          ) : (
            // BẢNG CHƯA TỪNG MỞ — mục xuất VẪN HIỆN, ở trạng thái tắt kèm lý do một dòng.
            //
            // Trước đây mục này bị ẩn hẳn khi thiếu `anhXemTruoc`, nên người tạo một loạt bảng trước
            // ca trực thấy menu chỉ có 2 mục và không có gì giải thích — họ không thể biết là "chưa
            // xuất được" hay "app không có tính năng xuất" (critique 2026-08-27, P2). Ẩn một khả năng
            // mà không nói vì sao thì người dùng kết luận nó không tồn tại.
            //
            // `disabled` + `aria-disabled`: trình đọc màn hình đọc ra là mục menu đang tắt thay vì bỏ
            // qua im lặng. Lý do đặt trong CHÍNH nút (không phải tooltip/title) vì trên cảm ứng không
            // có hành vi di chuột để lộ tooltip — đây là app dùng bằng ngón tay.
            <div
              data-testid={`xuat-anh-tat-${bang.id}`}
              role="menuitem"
              aria-disabled="true"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1, width: '100%', minHeight: 40, textAlign: 'left', padding: '4px 10px', opacity: 0.55 }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>Xuất PNG</span>
              <span style={{ fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap' }}>Mở bảng một lần để có ảnh</span>
            </div>
          )}
          <button
            type="button"
            data-testid={`xoa-${bang.id}`}
            onClick={onXoa}
            className="mind-focus-ring"
            role="menuitem"
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              minHeight: 40,
              textAlign: 'left',
              padding: '0 10px',
              marginTop: 2,
              border: 0,
              borderTop: '1px solid var(--c-line, #d9ddf4)',
              background: 'none',
              color: dangXacNhanXoa ? 'var(--c-danger, #c0392b)' : undefined,
              whiteSpace: 'nowrap',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {dangXacNhanXoa ? 'Chắc chắn xoá?' : 'Xoá'}
          </button>
        </div>
      )}

      {dangSuaTag && (
        <div
          ref={tagPanelRef}
          role="dialog"
          aria-label={`Chuyên khoa và tag cho bảng ${bang.ten}`}
          data-testid={`sua-chuyen-khoa-tag-${bang.id}`}
          // Cùng .mind-menu-bang/.mind-sheet với menu "⋯" ngay trên — cùng lý do (thẻ hàng trên
          // cùng, tầm ngón cái).
          className="mind-menu-bang mind-sheet"
          style={{ position: 'absolute', top: 30, right: 4, background: 'var(--c-surface, #fff)', boxShadow: '0 2px 8px var(--c-shadow), var(--c-shadow-glow)', border: '1px solid rgba(var(--c-accent-2-rgb, 184, 25, 111), 0.2)', borderRadius: 8, padding: 8, zIndex: 1, width: 200 }}
        >
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--c-text-muted, #6b6e96)', marginBottom: 2 }}>
            Chuyên khoa
          </label>
          <select
            data-testid={`chon-chuyen-khoa-${bang.id}`}
            // <label> ngay trên là nhãn TRẦN (không htmlFor, control không có id) nên trình đọc màn
            // hình không nối được nhãn với ô nào — ô này đọc ra là "không tên". Cùng mức chăm sóc
            // a11y file này đã áp cho ô tìm ("Tìm kiếm bảng"), nút × ("Xoá tag …"), ô đổi tên
            // ("Đổi tên bảng") — review cuối nhánh, mục 4.
            aria-label="Chuyên khoa"
            value={bang.chuyenKhoa ?? SPECIALTIES[0].id}
            onChange={(e) => onDoiChuyenKhoa(e.target.value)}
            className="mind-focus-ring"
            style={{ width: '100%', fontSize: 12.5, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--c-line, #d9ddf4)', marginBottom: 8 }}
          >
            {SPECIALTIES.map((kh) => (
              <option key={kh.id} value={kh.id}>{kh.name}</option>
            ))}
          </select>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--c-text-muted, #6b6e96)', marginBottom: 2 }}>
            Tag
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
            {(bang.tags ?? []).map((t) => (
              <span
                key={t}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, padding: '2px 6px', borderRadius: 999, background: 'var(--c-surface-alt, #f6f7fd)' }}
              >
                {t}
                <button
                  type="button"
                  aria-label={`Xoá tag ${t}`}
                  onClick={() => onXoaTag(t)}
                  className="mind-focus-ring"
                  style={{ border: 0, background: 'none', padding: 0, fontSize: 11, lineHeight: 1, color: 'var(--c-text-muted, #6b6e96)' }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            data-testid={`nhap-tag-${bang.id}`}
            // Cùng lý do với <select> ngay trên: nhãn "Tag" là <label> trần, không nối được với ô.
            // Placeholder KHÔNG thay được nhãn truy cập (nó biến mất ngay khi bắt đầu gõ).
            aria-label="Thêm tag"
            value={tagNhap}
            onChange={(e) => setTagNhap(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              const tagSach = tagNhap.trim()
              if (tagSach) onThemTag(tagSach)
              setTagNhap('')
            }}
            placeholder="Thêm tag, Enter để lưu"
            className="mind-focus-ring"
            style={{ width: '100%', fontSize: 12.5, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--c-line, #d9ddf4)' }}
          />
        </div>
      )}
    </div>
  )
}

// Tiêu đề tab Mindmap dùng ScreenHeader chung (../components/ScreenHeader) — thống nhất với Thư viện/
// Dùng thuốc/Ôn tập (2026-08-28, phản hồi chủ dự án). KHÔNG còn header tự chế 17px + viền + nền, và
// KHÔNG còn nút "+ Bảng mới" trên header — ô "+" trong lưới (và ở trạng thái rỗng) đã đủ.

// Lưới giữ chỗ trong lúc useIdbCollection đọc lần đầu — trước đây `if (loading) return null` để
// nguyên tab TRỐNG TRƠN suốt lượt đọc IndexedDB đầu (critique 2026-08-28 P3): trên máy có nhiều
// bảng, mở app vội là một khung chết không gì neo vào. Tấm giấy ghim mờ "thở" nhẹ (empty-breathe
// đã gate reduced-motion) cho biết nội dung đang tới.
function LuoiChoTai() {
  return (
    // .mind-board-grid (index.css) — CÙNG lớp với lưới thật bên dưới, để khung giữ chỗ khớp đúng số
    // cột/cỡ ô của dữ liệu thật sắp thay thế nó, không nhảy layout khi useIdbCollection đọc xong.
    <div aria-hidden="true" className="mind-board-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="empty-breathe"
          style={{
            aspectRatio: '4 / 3',
            borderRadius: 2,
            background: 'var(--c-note, #fbfaf7)',
            boxShadow: '0 14px 22px -10px rgba(15, 15, 15, 0.16), 0 4px 8px rgba(15, 15, 15, 0.07)',
            animationDelay: `${i * 90}ms`,
          }}
        />
      ))}
    </div>
  )
}

export function DanhSachBang({
  onMoBang,
  dungTuBang,
  onHieuUngXong,
}: {
  onMoBang: (boardId: string, origin?: BoardOpenOrigin) => void
  dungTuBang?: boolean
  onHieuUngXong?: () => void
}) {
  // useIdbCollection tự nạp danh sách lúc mount (fetch một lần, xem src/lib/useIdbCollection.ts)
  // và cập nhật `items` CỤC BỘ NGAY khi add/update/remove được gọi — ghi IndexedDB chạy nền
  // (fire-and-forget), không chặn re-render. Đây là mẫu ĐÃ CÓ SẴN, dùng chung với ECG lessons/bài
  // viết — không tự viết state/fetch riêng cho danh sách bảng (xem cảnh báo ở Task 1).
  const {
    items: danhSach,
    loading,
    loiDoc,
    thuLaiDoc,
    loiGhi,
    soGhiCho,
    xoaLoiGhi,
    thuLaiGhi,
    add,
    update,
  } = useIdbCollection<BangMeta>(IDB_STORES.boards)
  const [dangSuaTenId, setDangSuaTenId] = useState<string | null>(null)
  const [dangMoMenuId, setDangMoMenuId] = useState<string | null>(null)
  const [dangSuaTagId, setDangSuaTagId] = useState<string | null>(null)
  const [dangXacNhanXoaId, setDangXacNhanXoaId] = useState<string | null>(null)
  // Mang cả OBJECT (không chỉ id) — cần đủ dữ liệu gốc để đánh dấu daXoaLuc rồi đưa thẳng cho dải
  // "Hoàn tác" mà không phải tra lại danhSach sau khi bang đã bị lọc khỏi danh sách hiển thị.
  const [dangChoXoa, setDangChoXoa] = useState<BangMeta | null>(null)
  // Bang vừa xoá mềm xong — điều khiển dải "Hoàn tác". null nghĩa là không có dải nào đang hiện.
  const [vuaXoa, setVuaXoa] = useState<BangMeta | null>(null)
  // Dải "Hoàn tác" (vuaXoa) chỉ sống HOAN_TAC_XOA_MS rồi tắt im lặng — nếu người dùng bị gọi đi
  // giữa ca trực (đúng bối cảnh PRODUCT.md mô tả) và bỏ lỡ, bảng vẫn còn thật trong IndexedDB
  // (daXoaLuc được set) nhưng trước đây KHÔNG có đường nào lấy lại nữa — vi phạm thẳng lời hứa "xoá
  // mềm, phục hồi được". Panel này là lưới an toàn tối thiểu: không phải màn "thùng rác" đầy đủ (dọn
  // vĩnh viễn, sắp xếp theo ngày...), chỉ để mở lại được những gì vuaXoa đã bỏ lỡ.
  const [hienDaXoaGanDay, setHienDaXoaGanDay] = useState(false)
  // null = "Tất cả" (không lọc). Không đưa vào URL/localStorage — lọc chỉ có ý nghĩa trong phiên
  // đang xem lưới, giống các bộ lọc tạm thời khác của app (SearchScreen.activeFilter).
  const [chuyenKhoaLoc, setChuyenKhoaLoc] = useState<string | null>(null)
  // Dải chip chuyên khoa mặc định chỉ hiện 4 chip đầu + nút "Thêm" — 12 chip đồng hạng trên một
  // hàng buộc cuộn-và-quét mới tìm ra một chuyên khoa, vi phạm luật ≤4 lựa chọn tại một điểm quyết
  // định (critique 2026-08-25, mục "Hàng filter chuyên khoa"). Không lưu localStorage: đây là trạng
  // thái mở-ra tạm thời của một phiên xem lưới, cùng quy ước với chuyenKhoaLoc/truyVan ngay trên.
  const [hienHetChip, setHienHetChip] = useState(false)
  // Truy vấn ô tìm nội bộ — cùng quy ước "chỉ sống trong phiên xem lưới" với chuyenKhoaLoc ngay
  // trên (không vào URL/localStorage). Chuỗi rỗng = chưa lọc (bangKhopTimKiem trả true).
  const [truyVan, setTruyVan] = useState('')

  useEffect(() => {
    if (!dangXacNhanXoaId) return
    const id = setTimeout(() => setDangXacNhanXoaId(null), XAC_NHAN_XOA_MS)
    return () => clearTimeout(id)
  }, [dangXacNhanXoaId])

  // Đánh dấu XOÁ MỀM (daXoaLuc) sau khi .card-slide-out chạy xong — KHÔNG gọi idbDelete/remove()
  // nữa (trước đây xoá vĩnh viễn ngay, không hoàn tác được, ngược với lời hứa "xoá mềm" của
  // PRODUCT.md). update() vẫn ghi IndexedDB như cũ, chỉ đổi field nào được ghi.
  useEffect(() => {
    if (!dangChoXoa) return
    const bangBiXoa = dangChoXoa
    const id = setTimeout(() => {
      update({ ...bangBiXoa, daXoaLuc: Date.now() })
      setDangChoXoa(null)
      setVuaXoa(bangBiXoa)
    }, XOA_TRE_MS)
    return () => clearTimeout(id)
  }, [dangChoXoa, update])

  // Tự tắt dải "Hoàn tác" sau HOAN_TAC_XOA_MS — bang vẫn ở lại trạng thái xoá mềm sau khi dải tắt,
  // chỉ là không còn cách hoàn tác NHANH qua dải này nữa (chưa có màn "thùng rác" để hoàn tác sau).
  useEffect(() => {
    if (!vuaXoa) return
    const id = setTimeout(() => setVuaXoa(null), HOAN_TAC_XOA_MS)
    return () => clearTimeout(id)
  }, [vuaXoa])

  // Hiệu ứng .board-out chỉ chạy MỘT LẦN khi vừa đóng một bảng (dungTuBang=true) — tự báo xong
  // sau khi animation (0,2s, xem index.css) kết thúc, cộng biên an toàn nhỏ. KHÔNG chạy khi
  // DanhSachBang mount vì lý do khác (vd lần đầu vào tab Mindmap) — dungTuBang khi đó là
  // undefined/false, effect này không làm gì.
  useEffect(() => {
    if (!dungTuBang) return
    const id = setTimeout(() => onHieuUngXong?.(), 220)
    return () => clearTimeout(id)
  }, [dungTuBang, onHieuUngXong])

  // Đóng menu "⋯"/panel "Chuyên khoa,tag" khi CHẠM/BẤM ra ngoài, hoặc bấm Escape — hai popover này
  // là <div> thường, không tự có hành vi "rời khỏi là đóng" như <input> (ô đổi tên NGAY DƯỚI, xem
  // dangSuaTenId, đã có blur-để-lưu + Escape-để-huỷ SẴN vì nó là control gốc trình duyệt). Thiếu
  // gần một năm không ai để ý vì mọi lượt kiểm/test tay của tính năng này đều làm trên iPhone, luôn
  // bấm ĐÚNG mục menu muốn chọn — không ai từng bấm RA NGOÀI để xem điều gì xảy ra. Trên PC (chuột)
  // và iPad (có trackpad qua Magic Keyboard, hoặc chỉ đơn giản chạm ra chỗ khác trên màn lớn), bấm ra
  // ngoài để đóng popover là phản xạ phổ biến nhất — thiếu nó, menu "⋯" bấm mở xong rồi bấm sang việc
  // khác sẽ ĐỨNG NGUYÊN, nổi lơ lửng đè lên thẻ khác cho tới khi tự tay bấm lại đúng "⋯" đó lần nữa
  // (phản hồi thật 2026-08-27: "chỉnh tương thích trên iPhone mà quên PC/iPad", dẫn đúng cách ô đổi
  // tên đã tương thích nhiều thiết bị để áp dụng lại ở đây).
  // `pointerdown` (không phải `mousedown`) — cùng họ Pointer Events mà .the-bang-nghieng-con-tro
  // (onPointerMove/onPointerLeave) đã dùng trong file này, bắt ĐỦ cả chuột/bút/chạm trong một API
  // duy nhất, không cần một nhánh `touchstart` riêng cho di động.
  useEffect(() => {
    if (!dangMoMenuId && !dangSuaTagId) return
    const dongNeuBenNgoai = (e: PointerEvent) => {
      const target = e.target as Element | null
      // Bấm vào chính nút "⋯"/"Chuyên khoa,tag" (mở/đóng bảng khác) hoặc vào TRONG panel đang mở
      // (một mục menu, select, ô nhập tag...) — để đúng onClick của các phần tử đó tự quyết định,
      // không chặn/giật trước.
      if (target?.closest('.mind-menu-bang, [data-testid^="menu-bang-"], [data-testid^="sua-tag-"]')) return
      setDangMoMenuId(null)
      setDangSuaTagId(null)
    }
    const dongNeuEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setDangMoMenuId(null)
      setDangSuaTagId(null)
    }
    document.addEventListener('pointerdown', dongNeuBenNgoai)
    document.addEventListener('keydown', dongNeuEscape)
    return () => {
      document.removeEventListener('pointerdown', dongNeuBenNgoai)
      document.removeEventListener('keydown', dongNeuEscape)
    }
  }, [dangMoMenuId, dangSuaTagId])

  // Chưa nạp xong lần đầu — hiện tiêu đề + lưới giấy giữ chỗ (KHÔNG còn `return null` để tab trống
  // trơn, critique 2026-08-28 P3). Nút "+" ở tiêu đề mờ đi tới khi có dữ liệu thật.
  if (loading)
    return (
      <div className="h-full flex flex-col">
        <ScreenHeader title="Sơ đồ tư duy" />
        <div className="scroll-ios flex-1">
          <div className="mind-board-wrap">
            <LuoiChoTai />
          </div>
        </div>
      </div>
    )

  // ĐỌC HỎNG — phải chặn TRƯỚC lưới, vì nếu để lọt xuống thì `danhSach` rỗng sẽ render trạng thái
  // rỗng "Bắt đầu một sơ đồ tư duy mới": một lời khẳng định SAI rằng người dùng chưa có bảng nào,
  // đúng vào lúc dữ liệu của họ chỉ đang không đọc được. Ca hay gặp nhất không hề hiếm — còn một
  // tab app bản cũ đang giữ IndexedDB thì openDb() rơi vào nhánh onblocked (xem idb.ts).
  // Không dùng chung dải cảnh báo nhỏ như lỗi ghi: lỗi ghi xảy ra CẠNH nội dung vẫn đang hiển thị,
  // còn lỗi đọc nghĩa là không có gì để hiển thị cả — nó phải chiếm chỗ của chính lưới bảng.
  if (loiDoc)
    return (
      <div className="h-full flex flex-col">
        <ScreenHeader title="Sơ đồ tư duy" />
        <div className="scroll-ios flex-1">
          <div className="mind-board-wrap">
            <div
              role="alert"
              data-testid="loi-doc-bang"
              className="flex flex-col items-center text-center gap-3 px-6"
              style={{ paddingTop: 48, paddingBottom: 48 }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 3.6 2.7 19.2a1.2 1.2 0 0 0 1 1.8h16.6a1.2 1.2 0 0 0 1-1.8L12 3.6Z"
                  stroke="var(--c-danger-icon, #dc2626)"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path d="M12 9.6v4.2" stroke="var(--c-danger-icon, #dc2626)" strokeWidth="1.7" strokeLinecap="round" />
                <circle cx="12" cy="17" r="1.05" fill="var(--c-danger-icon, #dc2626)" />
              </svg>
              <p className="text-[15px] font-bold m-0" style={{ color: 'var(--c-text, #12142b)' }}>
                Chưa đọc được danh sách bảng
              </p>
              {/* Câu thứ hai là thông điệp từ idb.ts — nói ĐÚNG nguyên nhân và cách thoát cho từng
                  ca (đóng tab app bản cũ / trình duyệt đang chặn lưu trữ), thay vì một câu lỗi
                  chung chung. */}
              <p className="text-[13px] leading-snug m-0" style={{ color: 'var(--c-text-soft, #454870)', maxWidth: 340 }}>
                {loiDoc}
              </p>
              {/* Trấn an rõ ràng: mặc định người dùng sẽ đọc màn này thành "mất hết bảng rồi". */}
              <p className="text-[12.5px] leading-snug m-0" style={{ color: 'var(--c-text-muted, #6b6e96)', maxWidth: 340 }}>
                Các bảng của bạn vẫn nằm trên máy — app chỉ chưa mở được kho lưu trữ.
              </p>
              <button
                type="button"
                onClick={thuLaiDoc}
                data-testid="thu-lai-doc-bang"
                className="mind-btn mind-focus-ring"
                style={{
                  minHeight: 44,
                  padding: '0 20px',
                  marginTop: 4,
                  borderRadius: 9999,
                  border: 0,
                  background: 'var(--c-primary, #2d3a94)',
                  color: 'var(--c-on-bright, #ffffff)',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Thử lại
              </button>
            </div>
          </div>
        </div>
      </div>
    )

  // Lọc bỏ bang đã xoá mềm (daXoaLuc) khỏi lưới hiển thị — chúng vẫn còn thật trong IndexedDB.
  // Chip chuyên khoa lọc THÊM sau đó — bang thiếu chuyenKhoa (bản ghi cũ chưa backfill, xem
  // boardMeta.ts) coi như thuộc chuyên khoa đầu tiên trong SPECIALTIES.
  // Ô tìm lọc THÊM lần nữa (giao của cả hai, không phải hoặc): bangKhopTimKiem gộp tên/chuyên
  // khoa/tag/nội dung trích được và bỏ dấu hai phía (xem boardMeta.ts), truy vấn rỗng luôn khớp.
  const danhSachSapXep = [...danhSach]
    .filter((b) => !b.daXoaLuc)
    .filter((b) => !chuyenKhoaLoc || (b.chuyenKhoa ?? SPECIALTIES[0].id) === chuyenKhoaLoc)
    .filter((b) => bangKhopTimKiem(b, truyVan))
    .sort((a, b) => b.capNhatLuc - a.capNhatLuc)
  // Xoá gần đây nhất lên đầu — người mở panel này thường đang tìm đúng bảng vừa lỡ tay bấm Hoàn tác.
  const daXoaGanDay = danhSach.filter((b) => b.daXoaLuc).sort((a, b) => (b.daXoaLuc ?? 0) - (a.daXoaLuc ?? 0))
  // Lưới rỗng vì BỘ LỌC hoàn toàn khác lưới rỗng vì chưa có bảng nào: mời "Bắt đầu một sơ đồ tư duy
  // mới" trong tình huống này vừa sai sự thật (bảng vẫn còn nguyên, chỉ đang bị lọc khuất) vừa đẩy
  // người dùng đi tạo một bảng thừa thay vì sửa truy vấn/tắt chip lọc (review cuối nhánh, mục 7).
  const rongDoBoLoc =
    danhSachSapXep.length === 0 &&
    (truyVan.trim().length > 0 || chuyenKhoaLoc !== null) &&
    danhSach.filter((b) => !b.daXoaLuc).length > 0

  // Bỏ xoá mềm cho một bảng (cả hai nút "Hoàn tác": dải toast và panel "Đã xoá gần đây").
  // "Hoàn tác" là đường phục hồi CUỐI CÙNG nên nó phải chịu ĐÚNG lớp lỗi mà taoBangMoi/
  // onDoiChuyenKhoa/onLuuTen/onXoaTag đã vá: bảng được ghi lại thật trong IndexedDB nhưng không
  // khớp chip lọc/ô tìm đang bật nên vẫn vô hình trong lưới — người dùng thấy nút "Hoàn tác" như
  // bấm hụt, không có gì xảy ra (review cuối nhánh, mục 2). Cùng cách vá với các callback kia: đưa
  // bộ lọc khiến bảng vừa thao tác rớt khỏi lưới về trạng thái không lọc.
  const khoiPhucBang = (b: BangMeta) => {
    const bangMoi = { ...b, daXoaLuc: undefined }
    update(bangMoi)
    // So cùng biểu thức với bộ lọc của lưới ở trên (bảng thiếu chuyenKhoa coi như SPECIALTIES[0]).
    if (chuyenKhoaLoc && (bangMoi.chuyenKhoa ?? SPECIALTIES[0].id) !== chuyenKhoaLoc) setChuyenKhoaLoc(null)
    // Ô tìm là bộ lọc THỨ HAI, rớt khỏi nó cũng giấu thẻ y hệt — phải canh riêng. Truy vấn rỗng
    // luôn khớp nên nhánh này tự im lặng khi chưa lọc gì.
    if (!bangKhopTimKiem(bangMoi, truyVan)) setTruyVan('')
  }

  const taoBangMoi = () => {
    const luc = Date.now()
    const meta: BangMeta = {
      id: taoIdBang(),
      ten: 'Bảng chưa đặt tên',
      taoLuc: luc,
      capNhatLuc: luc,
      chuyenKhoa: SPECIALTIES[0].id,
      tags: [],
      noiDungTimKiem: '',
    }
    add(meta)
    // Trước đây mở thẳng vào canvas (onMoBang) — ba bảng tạo liên tiếp đều dừng lại ở tên mặc định
    // "Bảng chưa đặt tên" và ảnh xem trước GIỐNG HỆT NHAU byte-cho-byte (canvas trống chụp y hệt),
    // không cách nào phân biệt trong lưới. Giữ người dùng lại ở danh sách, mở luôn ô đổi tên cho thẻ
    // vừa tạo — họ đặt tên trước rồi mới bấm vào để vẽ, đúng lúc còn nhớ đang tạo bảng cho việc gì.
    setDangSuaTenId(meta.id)
    // Bảng mới LUÔN được gán chuyenKhoa: SPECIALTIES[0].id — nếu chip lọc đang chọn một chuyên khoa
    // KHÁC, thẻ vừa tạo sẽ không khớp bộ lọc và biến mất khỏi lưới ngay khi vừa ghi xong (bấm "+"
    // trông như không phản ứng gì, trong khi một bản ghi mồ côi đã lặng lẽ vào IndexedDB — review
    // lượt 1 phát hiện). Đưa bộ lọc về "Tất cả" ngay khi tạo để thẻ mới chắc chắn hiện ra.
    setChuyenKhoaLoc(null)
    // Ô tìm gây ĐÚNG lớp lỗi đó một lần nữa, còn dễ vấp hơn chip lọc: tên bảng mới luôn là "Bảng
    // chưa đặt tên", nên bất kỳ truy vấn nào đang gõ dở (trừ chuỗi khớp đúng tên mặc định) đều loại
    // thẻ vừa tạo khỏi lưới ngay lượt render kế tiếp. Xoá trắng truy vấn cùng lúc với chip lọc.
    setTruyVan('')
  }

  return (
    <>
    {/* `screen-transition` (index.css: fadeSlideIn) — CÙNG hiệu ứng vào màn với "Hướng dẫn"/"Thẻ ghi
        nhớ" (ComingSoonScreen) và mọi màn khác trong app. Trước đây tab Mindmap là màn DUY NHẤT
        thiếu nó, nên bấm nav "Mindmap" hiện ra khô khốc, lệch nhịp với các tab kề bên (phản hồi chủ
        dự án 2026-08-28). Chỉ chạy khi vào từ tab khác — lượt quay lại từ một bảng đang mở
        (`dungTuBang`) đã có `.board-out` riêng ở vùng cuộn bên dưới, chồng hai hiệu ứng là thừa. */}
    <div className={`h-full flex flex-col${dungTuBang ? '' : ' screen-transition'}`}>
      <ScreenHeader title="Sơ đồ tư duy" />
      <div className={`scroll-ios flex-1${dungTuBang ? ' board-out' : ''}`}>
      {/* .mind-board-wrap (index.css) — bọc toàn bộ nội dung trong một cột co giãn tối đa, CĂN GIỮA.
          Trần nới từ 720px lên 1040px (2026-08-28, phản hồi thật: "không gian bảng bị ép hẹp hai
          bên") — 720px từng đúng khi lưới thẻ dùng minmax(110px,140px) cố định (4 cột thẻ ~140px
          vừa lấp đủ 720px), nhưng .mind-board-grid giờ dùng cột 1fr co GIÃN theo bề ngang khung chứa
          (xem index.css), nên trần hẹp cũ ép luôn cả 4 thẻ dừng ở ~140px trên PC/iPad rộng thay vì
          được lớn lên cùng khung — đúng triệu chứng người dùng báo. 1040px cho thẻ ~240px ở PC/iPad
          rộng (lớn hơn hẳn 140px cũ) mà vẫn có trần, không phình vô hạn trên màn siêu rộng. KHÔNG
          ảnh hưởng màn hẹp (điện thoại) — max-width chỉ có tác dụng khi khung cha rộng hơn nó. */}
      <div className="mind-board-wrap">
      {/* Ô tìm đứng TRƯỚC "Đã xoá gần đây" — công cụ tìm chính phải nằm trên affordance phục hồi
          hiếm dùng (critique 2026-08-28: recovery-panel nằm trên ô tìm). Cổng hiện/ẩn gắn vào
          danhSach GỐC (chỉ trừ bang xoá mềm), KHÔNG phải danh sách đã lọc — gõ tới ký tự không khớp
          bảng nào mà unmount chính ô đang gõ thì mất focus giữa chừng, không xoá bớt để quay lại được. */}
      {danhSach.filter((b) => !b.daXoaLuc).length > 0 && (
        <div style={{ padding: '12px 16px 4px' }}>
          {/* CÙNG khuôn "pill" với ô tìm toàn app (HomeScreen / SearchScreen): nền --c-line-soft, bo
              2xl, icon kính lúp bên trái, nút × xoá nhanh khi có chữ. Trước đây là ô viền mảnh nền
              --c-surface, không khớp phần còn lại của app (phản hồi chủ dự án 2026-08-28) — chỉ đổi
              lớp vỏ, logic lọc (truyVan/setTruyVan) giữ nguyên. `.mind-search-pill` (index.css) lo
              vòng focus "ôm sát" dùng chung nên bỏ .mind-focus-ring khỏi input. KHÔNG đặt fontSize:
              index.css có `input,select,textarea{font-size:16px !important}` (chặn iOS Safari tự
              zoom) — mọi giá trị đặt ở đây đều bị nuốt. */}
          <div
            className="mind-search-pill flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: 'var(--c-line-soft, #eef0f8)', minHeight: 44 }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
              style={{ width: 20, height: 20, flexShrink: 0, color: 'var(--c-text-muted, #6b6e96)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              data-testid="tim-kiem-bang"
              value={truyVan}
              onChange={(e) => setTruyVan(e.target.value)}
              placeholder="Tìm bảng theo tên, tag, nội dung..."
              aria-label="Tìm kiếm bảng"
              className="flex-1"
              style={{ minWidth: 0, border: 0, background: 'transparent', color: 'var(--c-text, #12142b)' }}
            />
            {truyVan && (
              <button
                type="button"
                onClick={() => setTruyVan('')}
                aria-label="Xoá tìm kiếm"
                className="mind-focus-ring"
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  border: 0,
                  background: 'none',
                  padding: 2,
                  color: 'var(--c-text-muted, #6b6e96)',
                }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" style={{ width: 16, height: 16 }}>
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
      {daXoaGanDay.length > 0 && (
        <div style={{ padding: '4px 16px 0' }}>
          <button
            type="button"
            data-testid="mo-da-xoa-gan-day"
            onClick={() => setHienDaXoaGanDay(!hienDaXoaGanDay)}
            className="mind-focus-ring"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: 44,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--c-text-muted, #6b6e96)',
              background: 'none',
              border: 0,
              padding: '4px 2px',
              borderRadius: 4,
            }}
            aria-expanded={hienDaXoaGanDay}
          >
            {hienDaXoaGanDay ? '▾' : '▸'} Đã xoá gần đây ({daXoaGanDay.length})
          </button>
          {hienDaXoaGanDay && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, marginBottom: 8 }}>
              {daXoaGanDay.map((b) => (
                <div
                  key={b.id}
                  data-testid={`da-xoa-gan-day-${b.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    background: 'var(--c-surface-alt, #f6f7fd)',
                    borderRadius: 8,
                  }}
                >
                  {/* Cùng chấm màu ổn định theo id với lưới chính — hai bảng "Bảng chưa đặt tên"
                      trong panel này giờ phân biệt được TRƯỚC KHI bấm Hoàn tác nhầm (critique lượt 3). */}
                  <span
                    aria-hidden="true"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: `hsl(${mauOnDinh(b.id)} var(--chip-s) var(--chip-l))`,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      color: 'var(--c-text-muted, #6b6e96)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {b.ten}
                  </span>
                  <button
                    type="button"
                    data-testid={`hoan-tac-gan-day-${b.id}`}
                    onClick={() => khoiPhucBang(b)}
                    className="mind-focus-ring"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      minHeight: 44,
                      fontSize: 12,
                      fontWeight: 600,
                      // --c-accent-2, KHÔNG --c-primary — cùng hành động "phục hồi bảng vừa xoá" với
                      // nút Hoàn tác trong toast (ngay dưới, đã đổi màu ở lượt vá trước); hai nút cho
                      // cùng một hành động phải đọc cùng một ngôn ngữ màu (critique 2026-08-26 P2, lượt 2).
                      color: 'var(--c-accent-2, #b8196f)',
                      background: 'none',
                      border: 0,
                      padding: '4px 6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Hoàn tác
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Dải chip chuyên khoa — cùng cổng `danhSach GỐC (trừ xoá mềm) > 0` với ô tìm ở trên (gắn
          vào danh sách đã lọc thì gõ ký tự không khớp sẽ unmount chính control đang thao tác). */}
      {danhSach.filter((b) => !b.daXoaLuc).length > 0 && (() => {
        // 2 chip đầu luôn hiện; phần còn lại gấp sau nút "Thêm" — cộng "Tất cả" + "Thêm" là ĐÚNG 4
        // lựa chọn rời rạc tại điểm quyết định này (luật ≤4, Cognitive Load Checklist). Trước đây
        // VISIBLE=4 cộng "Tất cả"+"Thêm" ra 6 lựa chọn cùng lúc, đã giảm từ 12 chip ở một lượt trước
        // đó nhưng chưa đạt ngưỡng (critique 2026-08-25 rồi 2026-08-26, cùng một phát hiện tái diễn).
        // Nếu bộ lọc ĐANG chọn nằm trong phần gấp mà dải đang thu gọn, vẫn chèn riêng đúng chip đó
        // vào — ẩn hẳn chip đang bật sẽ khiến người dùng không hiểu vì sao lưới đang lọc theo một
        // chuyên khoa "biến mất" khỏi dải. Nút "Thêm/Ẩn bớt" chỉ đổi `hienHetChip`, không bị khoá
        // kẹt bởi lựa chọn hiện tại — "Ẩn bớt" luôn thu gọn về đúng {2 chip đầu + chip đang chọn
        // nếu có}.
        const VISIBLE = 2
        const chipHien = SPECIALTIES.slice(0, VISIBLE)
        const chipAn = SPECIALTIES.slice(VISIBLE)
        const chonNamOTrongPhanAn = chuyenKhoaLoc !== null && chipAn.some((kh) => kh.id === chuyenKhoaLoc)
        const chipDangHienNgoaiVISIBLE = hienHetChip
          ? chipAn
          : chipAn.filter((kh) => kh.id === chuyenKhoaLoc)
        const soChipConLai = chipAn.length - chipDangHienNgoaiVISIBLE.length
        const veChip = (kh: (typeof SPECIALTIES)[number]) => (
          <button
            key={kh.id}
            type="button"
            data-testid={`chip-chuyen-khoa-${kh.id}`}
            onClick={() => setChuyenKhoaLoc(kh.id)}
            aria-pressed={chuyenKhoaLoc === kh.id}
            className="mind-focus-ring"
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: 44,
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid var(--c-line, #d9ddf4)',
              background: chuyenKhoaLoc === kh.id ? kh.color : 'none',
              // chuTrenNen(kh.color), KHÔNG var(--c-on-bright) — xem comment tại định nghĩa hàm:
              // token đó chỉ đúng cho nền --c-primary, không đúng cho nền kh.color cố định qua theme
              // (critique 2026-08-26 P1, lượt 2).
              color: chuyenKhoaLoc === kh.id ? chuTrenNen(kh.color) : 'var(--c-text-muted, #6b6e96)',
            }}
          >
            {kh.name}
          </button>
        )
        return (
          <div
            // role="group" + nút toggle aria-pressed là mẫu ARIA đúng cho một cụm nút bật/tắt độc lập
            // — KHÔNG dùng role="tablist" (đó là mẫu điều hướng dạng tab, đòi hỏi role="tab" +
            // aria-selected + roving tabindex, không khớp cấu trúc button/aria-pressed ở đây). Ruling
            // review lượt 1.
            role="group"
            aria-label="Lọc theo chuyên khoa"
            style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', padding: '0 16px 8px' }}
          >
            <button
              type="button"
              data-testid="chip-chuyen-khoa-tat-ca"
              onClick={() => setChuyenKhoaLoc(null)}
              aria-pressed={chuyenKhoaLoc === null}
              className="mind-focus-ring"
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 44,
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid var(--c-line, #d9ddf4)',
                background: chuyenKhoaLoc === null ? 'var(--c-primary, #2d3a94)' : 'none',
                // Cùng vá với chip chuyên khoa (veChip ở trên): var(--c-on-bright) thay '#fff' cứng.
                color: chuyenKhoaLoc === null ? 'var(--c-on-bright, #fff)' : 'var(--c-text-muted, #6b6e96)',
              }}
            >
              Tất cả
            </button>
            {chipHien.map(veChip)}
            {chipDangHienNgoaiVISIBLE.map(veChip)}
            {chipAn.length > 0 && (
              <button
                type="button"
                data-testid="chip-chuyen-khoa-them"
                onClick={() => setHienHetChip((v) => !v)}
                aria-expanded={hienHetChip}
                className="mind-focus-ring"
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  minHeight: 44,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: '1px dashed var(--c-line, #d9ddf4)',
                  background: 'none',
                  color: 'var(--c-text-muted, #6b6e96)',
                }}
              >
                {hienHetChip
                  ? 'Ẩn bớt ▴'
                  : soChipConLai > 0
                    ? `Thêm +${soChipConLai} ▾`
                    : chonNamOTrongPhanAn
                      ? 'Ẩn bớt ▴'
                      : 'Thêm ▾'}
              </button>
            )}
          </div>
        )
      })()}
      {danhSachSapXep.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '70%',
            gap: 12,
            padding: 16,
            textAlign: 'center',
          }}
        >
          <div className="empty-breathe" style={{ width: 92, height: 92, color: 'var(--c-text-muted, #6b6e96)' }}>
            <BieuTuongMindmap />
          </div>
          {/* Lưới THẬT SỰ trống: một câu nói thẳng giá trị của bề mặt (hiến chương: biến lý thuyết
              thành một bức tranh trực quan, dễ hình dung) TRƯỚC dòng mời cũ — người lần đầu không có
              cách nào biết vì sao đây là "phòng não phải" ≥50% công sức thiết kế nếu chỉ thấy một
              dòng xám (critique 2026-08-28 P3, persona Jordan). `textWrap: 'balance'` cho hai dòng
              chữ khi xuống hàng dài gần bằng nhau, không lệch bậc thang (phản hồi chủ dự án
              2026-08-28: "căn chỉnh cho đều hàng"). Đã bỏ dòng "Ghi chú nối thẳng tới bài viết…
              phác đồ điều trị" — hứa hẹn một năng lực liên kết chưa hiện diện rõ trong luồng, gây
              rối hơn là dẫn dắt (cùng phản hồi). */}
          {!rongDoBoLoc && (
            <p style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--c-text, #12142b)', margin: 0, maxWidth: 280, lineHeight: 1.3, textWrap: 'balance' }}>
              {LOI_MOI_TRONG}
            </p>
          )}
          <p style={{ fontSize: 14, color: 'var(--c-text-muted, #6b6e96)', margin: 0, maxWidth: 280, textWrap: 'balance' }}>
            {rongDoBoLoc ? 'Không tìm thấy bảng nào khớp' : 'Bắt đầu một sơ đồ tư duy mới'}
          </p>
          {rongDoBoLoc && (
            // Ô tìm và dải chip vẫn hiện ngay phía trên (cả hai gắn vào danhSach GỐC, không phải
            // danh sách đã lọc) nên không cần thêm nút "xoá bộ lọc" riêng — chỉ cần chỉ đúng chỗ.
            <p style={{ fontSize: 12.5, color: 'var(--c-text-muted, #6b6e96)', margin: 0 }}>
              Thử từ khoá khác hoặc bỏ bớt bộ lọc.
            </p>
          )}
          <button
            type="button"
            data-testid="tao-bang"
            onClick={taoBangMoi}
            // .mind-o-tao-bang (index.css): viền đứt mảnh + nền tint, cả hai đọc từ --c-accent-2
            // (magenta riêng của Mindmap, xem DESIGN.md "The One Other Place Rule") nên tự đổi theo
            // sáng/tối. Trước đây viền/nền viết nội tuyến ở ĐÂY và ở ô "+" cuối lưới — hai bản chép
            // tay phải nhớ sửa song song.
            className="mind-focus-ring mind-o-tao-bang"
            style={{ width: 104, height: 78, fontSize: 28 }}
            aria-label="Tạo bảng mới"
          >
            +
          </button>
        </div>
      ) : (
        // .mind-board-grid (index.css) — 4 cột 1fr cố định trên PC/iPad, rút về 2 cột dưới
        // @media max-width:640px cho iPhone (2026-08-28, thay cho repeat(auto-fill, minmax(110px,
        // 140px)) cũ). Cột cố định + 1fr (thay vì auto-fill dò cột theo cỡ ô cố định) là đổi hướng
        // CÓ CHỦ Ý: yêu cầu mới là đúng 2 mức cột theo LỚP THIẾT BỊ (iPhone/PC-iPad), không phải một
        // dải liên tục co giãn theo từng px màn hình — 1fr khiến thẻ DÃN lấp đúng 1/4 hoặc 1/2 bề
        // ngang khung .mind-board-wrap thay vì đứng yên ở cỡ tối đa 140px cũ (đúng phản hồi "bảng nên
        // to hơn"). Ít bảng hơn số cột (vd 2 bảng trong lưới 4 cột) để trống các cột còn lại bên phải
        // thay vì tự co lưới lại/căn giữa — hành vi lưới-căn-trái tiêu chuẩn (Google Drive, Notion…),
        // khoảng trống thừa nhỏ hơn NHIỀU so với ca "không cân đối" đã sửa trước đây (ca đó phát sinh
        // từ auto-fill dò RA THÊM cột rỗng vô hình để lấp hết bề ngang một container rộng trong khi
        // mỗi cột bị ghim cỡ nhỏ cố định — vấn đề gốc đã biến mất cùng với chính cơ chế auto-fill).
        <div className="mind-board-grid">
          {danhSachSapXep.map((bang, index) => (
            <TheBang
              key={bang.id}
              bang={bang}
              index={index}
              dangXoa={dangChoXoa?.id === bang.id}
              dangSuaTen={dangSuaTenId === bang.id}
              dangMoMenu={dangMoMenuId === bang.id}
              dangXacNhanXoa={dangXacNhanXoaId === bang.id}
              dangSuaTag={dangSuaTagId === bang.id}
              onMo={(origin) => onMoBang(bang.id, origin)}
              onBatMenu={() => {
                const dangMo = dangMoMenuId === bang.id
                setDangMoMenuId(dangMo ? null : bang.id)
                // Panel sửa chuyên khoa/tag và menu "⋯" ghim CÙNG toạ độ (top:30 right:4) với cùng
                // zIndex, panel render SAU nên luôn vẽ ĐÈ lên menu. Mục "Chuyên khoa/tag" là đường
                // DUY NHẤT đóng panel (nó là toggle), mà nó nằm trong menu bị che — panel mở ra là
                // kẹt cho tới khi thẻ unmount. Mở menu thì đóng panel trước: "⋯" luôn là đường thoát.
                if (!dangMo) setDangSuaTagId(null)
              }}
              onBatSuaTen={() => {
                setDangMoMenuId(null)
                setDangSuaTenId(bang.id)
              }}
              onBatSuaTag={() => {
                setDangMoMenuId(null)
                setDangSuaTagId(dangSuaTagId === bang.id ? null : bang.id)
              }}
              onDoiChuyenKhoa={(id) => {
                const bangMoi = { ...bang, chuyenKhoa: id, capNhatLuc: Date.now() }
                update(bangMoi)
                // Chip lọc đang chọn MỘT chuyên khoa khác id vừa gán → bảng sẽ rớt khỏi danhSachSapXep
                // ngay khi update() cập nhật state cục bộ (cùng lượt render), kéo theo panel đang mở
                // (dangSuaTag) unmount cùng lúc — người dùng vừa đổi chuyên khoa thì cả thẻ lẫn panel
                // biến mất không một lời giải thích. Đúng lớp lỗi review Task 2 đã bắt ở taoBangMoi
                // (tạo bảng dưới chip lọc khác cũng làm thẻ mới biến mất) — cùng cách vá: đưa bộ lọc
                // về "Tất cả" ngay khi thao tác khiến bảng đang thao tác rớt khỏi bộ lọc hiện tại.
                if (chuyenKhoaLoc && chuyenKhoaLoc !== id) setChuyenKhoaLoc(null)
                // Ô tìm (Task 8) là bộ lọc THỨ HAI, rớt khỏi nó cũng làm thẻ + panel biến mất y hệt,
                // nên phải vá RIÊNG — chặn được chip lọc không có nghĩa là chặn được ô tìm.
                // bangKhopTimKiem gộp cả TÊN HIỂN THỊ của chuyên khoa ("Tim mạch", xem boardMeta.ts)
                // nên đổi khoa thật sự đổi kết quả so khớp. Kiểm bằng chính bản ghi MỚI (bangMoi):
                // `bang` trong closure vẫn là bản cũ, so khớp nó sẽ ra kết luận sai. Truy vấn rỗng
                // luôn khớp nên nhánh này tự im lặng khi chưa lọc gì.
                if (!bangKhopTimKiem(bangMoi, truyVan)) setTruyVan('')
              }}
              onLuuTen={(tenMoi) => {
                setDangSuaTenId(null)
                const tenSach = tenMoi.trim() || bang.ten
                // Bỏ qua nếu tên KHÔNG đổi (Escape-huỷ, hoặc blur không gõ gì) — trước đây luôn
                // ghi update() dù tên y hệt, bump capNhatLuc thành "Vừa xong" cho một thao tác
                // không làm gì cả, khiến tín hiệu "cập nhật gần đây" càng thêm sai lệch (critique
                // lượt 3, 2026-08-24 — xác nhận trực tiếp bằng Escape trên Browser pane thật).
                if (tenSach === bang.ten) return
                const bangMoi = { ...bang, ten: tenSach, capNhatLuc: Date.now() }
                update(bangMoi)
                // Đổi tên ra NGOÀI truy vấn đang lọc thì thẻ vừa lưu biến mất ngay lượt render kế
                // tiếp — nhẹ hơn hai ca kia (ô đổi tên đã tự đóng ở dòng đầu callback nên không có
                // panel nào bị giật mất) nhưng vẫn là "vừa lưu xong thì mất thẻ". Cùng cách vá với
                // chip lọc ngay trên: xoá trắng bộ lọc khiến bảng đang thao tác rớt khỏi lưới.
                if (!bangKhopTimKiem(bangMoi, truyVan)) setTruyVan('')
              }}
              onXoa={() => {
                if (dangXacNhanXoaId !== bang.id) {
                  setDangXacNhanXoaId(bang.id)
                  return
                }
                setDangXacNhanXoaId(null)
                setDangMoMenuId(null)
                setDangChoXoa(bang)
              }}
              onThemTag={(tag) => {
                const hienCo = bang.tags ?? []
                if (hienCo.includes(tag)) return
                update({ ...bang, tags: [...hienCo, tag], capNhatLuc: Date.now() })
              }}
              onXoaTag={(tag) => {
                const bangMoi = { ...bang, tags: (bang.tags ?? []).filter((t) => t !== tag), capNhatLuc: Date.now() }
                update(bangMoi)
                // Ca TỆ NHẤT của lớp lỗi này: truy vấn khớp bảng CHỈ nhờ đúng cái tag vừa bị bấm ×.
                // Panel sửa tag đang mở ngay dưới con trỏ, xoá xong là bảng thôi khớp truyVan → thẻ
                // rớt khỏi lưới kéo panel unmount cùng lượt render, người dùng mất chỗ đang thao tác
                // giữa chừng. Cùng cách vá với chip lọc ở onDoiChuyenKhoa phía trên.
                if (!bangKhopTimKiem(bangMoi, truyVan)) setTruyVan('')
              }}
            />
          ))}
          <button
            type="button"
            data-testid="tao-bang"
            onClick={taoBangMoi}
            // Cùng .mind-o-tao-bang với ô "+" ở trạng thái rỗng phía trên — một nguồn sự thật cho
            // viền/nền/màu, đây chỉ khác cỡ (dãn theo ô lưới thay vì cố định).
            className="mind-focus-ring mind-o-tao-bang"
            style={{ aspectRatio: '4 / 3', fontSize: 24 }}
            aria-label="Tạo bảng mới"
          >
            +
          </button>
        </div>
      )}
      </div>
      </div>
    </div>
    {/* Dải BÁO LỖI GHI — hiện khi useIdbCollection báo một lượt ghi IndexedDB thất bại thật (xem
        loiGhi ở đó). Đặt TRƯỚC dải "Hoàn tác" và không tự tắt: người dùng phải tự đóng, vì thứ nó
        báo là "thao tác vừa rồi CÓ THỂ chưa được lưu", không phải một xác nhận thoáng qua.
        Trình bày theo Untouchable Signal Rule của DESIGN.md: nền/viền/chữ đọc từ họ token
        --c-danger-*, PHẲNG và nghiêm túc — không bounce, không glow, không đếm ngược như dải xanh
        bên dưới. Không chỉ dùng màu để truyền tin (colorblind-safe): có icon cảnh báo + câu chữ
        nói rõ vấn đề VÀ đường thoát (xuất file sao lưu), đúng yêu cầu "errors name the problem and
        the recovery". role="alert" thay vì "status" — đây là thứ phải cắt ngang, không phải thông
        báo lịch sự.
        aria-live mặc định của role="alert" là assertive, không cần khai thêm. */}
    {loiGhi && (
      <div
        role="alert"
        className="absolute flex items-start gap-2.5 px-4 py-3 rounded-2xl z-50"
        style={{
          left: 12,
          right: 12,
          bottom: 'var(--above-nav)',
          background: 'var(--c-danger-soft, #fef2f2)',
          border: '1px solid var(--c-danger-line, #fecaca)',
          color: 'var(--c-danger-deep, #991b1b)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: 'none', marginTop: 1 }}>
          <path
            d="M12 3.6 2.7 19.2a1.2 1.2 0 0 0 1 1.8h16.6a1.2 1.2 0 0 0 1-1.8L12 3.6Z"
            stroke="var(--c-danger-icon, #dc2626)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M12 9.6v4.2" stroke="var(--c-danger-icon, #dc2626)" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="17" r="1.05" fill="var(--c-danger-icon, #dc2626)" />
        </svg>
        <div className="flex-1 flex flex-col items-start gap-1.5">
          <span className="text-[12.5px] leading-snug">
            {/* Nói SỐ thay đổi chưa lưu thay vì "có lỗi xảy ra": người dùng cần biết mình đang mất
                bao nhiêu việc để quyết định thử lại hay xuất file ngay. soGhiCho chạm trần 100 thì
                lời khuyên "thử lại" không còn đủ — xem TRAN_HANG_CHO trong useIdbCollection. */}
            {soGhiCho > 1
              ? `${soGhiCho} thay đổi chưa lưu được vào bộ nhớ máy.`
              : 'Không lưu được thay đổi vào bộ nhớ máy.'}{' '}
            Chúng có thể mất khi bạn đóng app — thử lại, hoặc xuất bản sao ra file trước khi tiếp tục.
          </span>
          <button
            type="button"
            onClick={() => void thuLaiGhi()}
            data-testid="thu-lai-ghi-bang"
            className="mind-focus-ring"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: 36,
              padding: '0 12px',
              marginLeft: -12,
              borderRadius: 9999,
              border: 0,
              background: 'none',
              color: 'var(--c-danger-deep, #991b1b)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Thử lại
          </button>
        </div>
        <button
          type="button"
          onClick={xoaLoiGhi}
          aria-label="Đóng thông báo lỗi lưu"
          className="mind-focus-ring"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 44,
            minWidth: 44,
            margin: -10,
            color: 'var(--c-danger-deep, #991b1b)',
            background: 'none',
            border: 0,
            flex: 'none',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 3.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    )}
    {vuaXoa && (
        <div
          key={vuaXoa.id}
          role="status"
          aria-live="polite"
          className="toast-in-full absolute flex items-center gap-2.5 px-4 py-2.5 rounded-2xl z-40 overflow-hidden"
          // bottom ĐÃ cộng var(--nav-pad-bottom) (= env(safe-area-inset-bottom)) — dải nằm SÁT trên
          // thanh nav thật kể cả iPhone có home-indicator, cùng công thức .mind-menu-bang đã dùng.
          // Nền + chữ + nút đọc từ token --c-toast-* (index.css): trước đây nền là rgba(15,23,42,.94)
          // viết cứng (vi phạm "mọi màu là token") và nút "Hoàn tác" tô --c-accent-2 bản sáng chỉ đạt
          // 2,90:1 trên nền tối này — dưới AA (critique 2026-08-28 P1). --c-toast-action là sắc
          // magenta bản-tối, ~8,2:1 trên nền dải, vẫn thuộc "One Other Place Rule" của Mindmap.
          style={{ left: 12, right: 12, bottom: 'var(--above-nav)', background: 'var(--c-toast-surface, rgba(15,23,42,.94))' }}
        >
          <span className="flex-1 text-[12.5px] leading-snug" style={{ color: 'var(--c-toast-text, #f4f6fb)' }}>Đã xoá "{vuaXoa.ten}"</span>
          <button
            type="button"
            onClick={() => {
              khoiPhucBang(vuaXoa)
              setVuaXoa(null)
            }}
            className="mind-focus-ring"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 44,
              minWidth: 44,
              color: 'var(--c-toast-action, #f175a6)',
              fontWeight: 600,
              fontSize: 13,
              background: 'none',
              border: 0,
              whiteSpace: 'nowrap',
              padding: '4px 6px',
            }}
          >
            Hoàn tác
          </button>
          {/* Thanh đếm ngược — cho biết còn bao lâu trước khi dải tự tắt (critique 2026-08-28 P1:
              "không có countdown ở khoảnh khắc căng nhất"). key={vuaXoa.id} ở div cha khiến cả dải
              remount mỗi bảng bị xoá nên animation luôn chạy lại từ đầu. */}
          <span
            aria-hidden="true"
            className="toast-countdown-bar"
            style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              height: 2,
              width: '100%',
              background: 'var(--c-toast-action, #f175a6)',
              opacity: 0.55,
              '--toast-countdown-ms': `${HOAN_TAC_XOA_MS}ms`,
            } as React.CSSProperties}
          />
        </div>
      )}
    </>
  )
}
