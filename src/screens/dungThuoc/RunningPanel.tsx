import { useState, useRef, useEffect } from "react"
import { COMPAT_DISCLAIMER, findInteractionRule, findYsiteRule, type CompatRule, type InteractionRule } from "../../data/compatibility"
import { SEVERITY_STYLE } from "../../lib/doseSafety"
import { MAX_LINES, STALE_AFTER_MS, formatAgo, formatClock, lineLabel, type RunningDrug } from "../../lib/runningDrugs"
import { icons } from "../../components/icons"
import { C, NUM, R, T, highlightDoseNumbers } from "../../lib/ui"
import { useDosing } from "./context"
import { CONFIRM_DELETE_RESET_MS, Disclosure } from "./sharedUi"

function CompatSource({ verified, source, color }: { verified: boolean; source?: string; color: string }) {
  return (
    <p className="text-[12px] leading-[1.45] mt-1" style={{ color, opacity: 0.85 }}>
      {verified && source ? `Đã đối chiếu — nguồn: ${source}` : "CHƯA đối chiếu tài liệu gốc — dữ liệu khởi tạo của app, cần xác nhận với dược lâm sàng."}
    </p>
  )
}

export function RunningPanel() {
  const { running, unpinRunning, setRunningLine, abwKg } = useDosing()
  // Đồng hồ chạy mỗi phút để dòng "3 giờ trước" không đứng yên trong suốt ca trực.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])
  // Bỏ ghim một thuốc làm mất luôn kết quả rà tương hợp Khóa chữ Y/tương tác cho cặp đó, mà người dùng
  // không hề được báo. Bấm "×" chỉ ĐÁNH DẤU chờ xoá (hàng mờ đi + nút đổi thành "Hoàn tác") — xoá
  // thật sự chỉ xảy ra sau CONFIRM_DELETE_RESET_MS, đủ để bấm nhầm còn kịp sửa. Dùng CHUNG hằng số
  // với ConfirmIconButton (không phải một con số 5000 riêng trùng hợp giống) — cùng loại hành động
  // (xoá dữ liệu, làm lại được), nên cùng một khoá thời gian, sửa một chỗ là sửa cả hai.
  const [pendingRemove, setPendingRemove] = useState<Record<string, true>>({})
  // Đổi Đường truyền là thao tác HIẾM (hầu hết thuốc không bao giờ đổi Đường truyền suốt ca), nhưng trước đây 4 chip
  // Đường truyền luôn mở sẵn trên MỌI dòng — 4×44px + nút xoá 44px = 236/375px, tên thuốc phải truncate.
  // Nay mặc định chỉ hiện MỘT chip báo Đường truyền hiện tại; chạm vào mới mở 4 lựa chọn, chọn xong tự đóng.
  // Chỉ một dòng mở rộng cùng lúc — mở dòng khác thì dòng cũ tự đóng, không cần nhớ đóng tay.
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null)
  const pendingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  useEffect(() => () => { Object.values(pendingTimers.current).forEach(clearTimeout) }, [])
  function requestUnpin(id: string) {
    setPendingRemove((prev) => ({ ...prev, [id]: true }))
    pendingTimers.current[id] = setTimeout(() => {
      delete pendingTimers.current[id]
      setPendingRemove((prev) => {
        const { [id]: _drop, ...rest } = prev
        return rest
      })
      unpinRunning(id)
    }, CONFIRM_DELETE_RESET_MS)
  }
  function cancelUnpin(id: string) {
    if (pendingTimers.current[id]) {
      clearTimeout(pendingTimers.current[id])
      delete pendingTimers.current[id]
    }
    setPendingRemove((prev) => {
      const { [id]: _drop, ...rest } = prev
      return rest
    })
  }
  if (running.length === 0) return null

  const lines = Array.from({ length: MAX_LINES }, (_, i) => i).filter((l) => running.some((r) => r.line === l))
  // Một mục cần xem lại khi: ghim đã lâu, HOẶC cân nặng bệnh nhân đã đổi kể từ lúc ghim (mọi tốc độ
  // mL/giờ đều tính từ cân nặng đó nên con số đang hiện không còn đúng).
  //
  // "kind" quyết định CÂU CHỮ, không chỉ badge: thuốc ngắt quãng (kháng sinh mỗi 8-12h) không chạy
  // trên bơm liên tục — 5 giờ sau khi Vancomycin q8h đã truyền xong thì KHÔNG CÓ bơm nào để "đối
  // chiếu lại", và cũng không có "tốc độ" nào để tính lại theo cân nặng mới, chỉ có LIỀU. Trước đây
  // cả hai dòng nhắc dùng chung một câu viết cho thuốc truyền liên tục — đúng lỗi mà chính field
  // `kind` này được thêm vào để tránh (xem lib/runningDrugs.ts), chỉ là chưa lan hết tới đây
  // (/impeccable critique 2026-08-18, P1).
  function staleReason(r: RunningDrug): string | null {
    const intermittent = r.kind === "intermittent"
    if (r.weightKgAtPin != null && abwKg != null && Math.abs(r.weightKgAtPin - abwKg) > 0.05) {
      return intermittent
        ? `Cân nặng đã đổi ${r.weightKgAtPin} → ${abwKg} kg từ lúc ghim — tính lại liều`
        : `Cân nặng đã đổi ${r.weightKgAtPin} → ${abwKg} kg từ lúc ghim — tính lại tốc độ`
    }
    if (now - r.at > STALE_AFTER_MS) {
      return intermittent
        ? "Liều gần nhất đã lâu — còn đúng lịch dùng không?"
        : "Ghim đã lâu — đối chiếu lại với bơm thật"
    }
    return null
  }

  const ysiteFindings: { line: number; a: RunningDrug; b: RunningDrug; rule: CompatRule }[] = []
  lines.forEach((line) => {
    const onLine = running.filter((r) => r.line === line)
    for (let i = 0; i < onLine.length; i++) {
      for (let j = i + 1; j < onLine.length; j++) {
        const rule = findYsiteRule(onLine[i].compatKey, onLine[j].compatKey)
        if (rule) ysiteFindings.push({ line, a: onLine[i], b: onLine[j], rule })
      }
    }
  })

  const interactionFindings: { a: RunningDrug; b: RunningDrug; rule: InteractionRule }[] = []
  for (let i = 0; i < running.length; i++) {
    for (let j = i + 1; j < running.length; j++) {
      const rule = findInteractionRule(running[i].compatKey, running[j].compatKey)
      if (rule) interactionFindings.push({ a: running[i], b: running[j], rule })
    }
  }

  return (
    <div className="mx-5 mb-3 rounded-[20px] border p-4" style={{ borderColor: C.line, background: C.surface }}>
      <p className={`${T.label} mb-2`} style={{ color: "var(--c-primary-strong)" }}>
        {/* Trước đây tên là "Đang truyền", nhưng kháng sinh mỗi 8 giờ cũng nằm trong bảng này —
            gọi một liều ngắt quãng là "đang truyền" là mô tả sai thứ đang xảy ra trên người bệnh.
            Số đếm nảy một nhịp mỗi khi đổi — ghim/bỏ ghim là hành động "thành công" chính của
            màn hình này, trước đây không có phản hồi thị giác nào khi con số đổi.
            Rà lại (/impeccable critique 2026-08-18): số đếm N-thuốc KHÔNG phải số liều/tốc độ hay
            tín hiệu an toàn (không phạm luật Untouchable Signal), và nằm trong một card — bounce ở
            đây xác nhận "hành động ghim/bỏ ghim vừa xảy ra", đúng mục đích motion mà DESIGN.md cho
            phép ("did this action finish"). Giữ nguyên, không phải chrome thừa cần bỏ. */}
        Bệnh nhân đang dùng · <span key={running.length} className="pop-value inline-block">{running.length}</span> thuốc
      </p>

      {lines.map((line) => (
        <div key={line} className="mb-2.5">
          {/* text-slate-500 (→ --c-text-muted, ~5,8:1) chứ không phải -400 (→ --c-muted, ~3,1:1) —
              đây là NHÃN MỤC thật phải đọc được ("Đường truyền 2"...), không phải icon/placeholder. Cùng
              lỗi mà SectionLabel đã tự sửa cho chính nó nhưng chưa lan sang nhãn này. */}
          <p className="text-[12px] font-bold text-slate-500 mb-1">{lineLabel(line)}</p>
          {running
            .filter((r) => r.line === line)
            .map((r) => {
              // Liều đã high/extreme LÚC GHIM (severity ghi lại từ InfusionCalculator) phải vẫn nhìn
              // nguy hiểm ở đây — đây là bảng dùng để bàn giao ca/đối chiếu tương hợp, đúng chỗ một
              // liều gấp N lần bình thường không được trông y hệt liều thường (critique /impeccable
              // 2026-08-17T17-38, P0). Dùng chung SEVERITY_STYLE với InfusionCalculator, không tự
              // bịa bảng màu riêng cho bảng này.
              const dangerous = r.severity === "high" || r.severity === "extreme"
              const runningStyle = r.severity ? SEVERITY_STYLE[r.severity] : null
              return (
              <div
                key={r.id}
                className="rise-in flex items-start gap-2 px-2.5 py-2 rounded-[14px] mb-1"
                style={{ background: C.surfaceAlt, opacity: pendingRemove[r.id] ? 0.45 : 1, transition: "opacity .2s ease" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className={`${T.critical} truncate`} style={{ color: C.text }}>{r.name}</p>
                    {r.kind === "intermittent" && (
                      <span className={`${T.meta} font-bold px-1.5 rounded-full flex-none`} style={{ background: C.primarySoft, color: "var(--c-primary-deep)" }}>
                        ngắt quãng
                      </span>
                    )}
                  </div>
                  <p className={`${T.meta} flex items-center gap-1`} style={{ color: dangerous && runningStyle ? runningStyle.text : C.textSoft }}>
                    {dangerous && <span className="flex-none scale-75">{icons.alert()}</span>}
                    {/* Bảng bàn giao ca — đúng chỗ DESIGN.md nói Mono quan trọng nhất ("đọc đúng
                        từng chữ số"), nhưng trước đây con số ở đây lại là text thường, khác thẻ liều
                        gốc (App.tsx:8169) vốn đã bọc NUM_DOSE qua highlightDoseNumbers. Cùng nguồn
                        app tự định dạng số (doseText/rateText, xem App.tsx:9719-9720, 8297, 10414),
                        không phải chữ người dùng gõ — an toàn dùng dangerouslySetInnerHTML. */}
                    <span
                      dangerouslySetInnerHTML={{
                        __html: highlightDoseNumbers(r.doseText + (r.rateText ? ` · ${r.rateText}` : "")),
                      }}
                    />
                  </p>
                  {r.concText && <p className={T.meta} style={{ color: C.textSoft }}>{r.concText}</p>}
                  {/* Con số này CŨ tới mức nào — thiếu dòng này thì bảng trông như đang phản ánh
                      thời gian thực, trong khi nó chỉ là ảnh chụp lúc bấm ghim. */}
                  <p className={`${T.meta} ${NUM}`} style={{ color: C.textSoft }}>
                    Ghim {formatClock(r.at)} · {formatAgo(r.at, now)}
                  </p>
                  {staleReason(r) && (
                    <p className={`${T.meta} font-semibold mt-1 px-2 py-1 ${R.box}`} style={{ background: C.warnSoft, color: C.warn }}>
                      {staleReason(r)}
                    </p>
                  )}
                </div>
                <div className="flex items-center flex-none">
                  {/* Trước đây 4 chip Đường truyền LUÔN mở trên mọi dòng — 4×44px chiếm gần 2/3 bề ngang
                      hàng, đẩy tên thuốc phải truncate dù đổi Đường truyền là thao tác hiếm. Mặc định chỉ
                      hiện MỘT chip báo Đường truyền hiện tại (vẫn đủ 44px, vẫn tách khỏi nút xoá bằng
                      khoảng trống rõ ràng — đeo găng/buồng tối không chạm hụt sang nút xoá đỏ);
                      chạm vào mới bung 4 lựa chọn, chọn xong tự đóng lại. */}
                  {expandedLineId === r.id ? (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: MAX_LINES }, (_, i) => i).map((l) => (
                        <button
                          key={l}
                          onClick={() => {
                            setRunningLine(r.id, l)
                            setExpandedLineId(null)
                          }}
                          className="w-11 h-11 rounded-full text-[12px] font-bold border"
                          style={
                            r.line === l
                              ? { background: C.accent, borderColor: C.accent, color: "var(--c-on-primary)" }
                              : { background: C.surface, borderColor: C.line, color: C.textSoft }
                          }
                          aria-label={`Chuyển sang ${lineLabel(l)}`}
                        >
                          {l === 0 ? "NB" : l}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => setExpandedLineId(r.id)}
                      className="w-11 h-11 rounded-full text-[12px] font-bold border"
                      style={{ background: C.accent, borderColor: C.accent, color: "var(--c-on-primary)" }}
                      aria-label={`Đang ở ${lineLabel(r.line)} — chạm để đổi Đường truyền`}
                    >
                      {r.line === 0 ? "NB" : r.line}
                    </button>
                  )}
                  <div className="w-4 flex-none" aria-hidden="true" />
                  {pendingRemove[r.id] ? (
                    // Dải cạn ngang giống hệt "Xoá bệnh nhân" (PatientPanel) — cùng quy ước hình dạng
                    // (nút pill có chữ → thanh cạn, không phải vòng tròn quanh icon), cùng hằng số
                    // CONFIRM_DELETE_RESET_MS. Trước đây nút này không có dải đếm ngược nào: mờ dòng
                    // đi là tín hiệu DUY NHẤT, không nói được còn bao lâu thì xoá thật.
                    <button
                      onClick={() => cancelUnpin(r.id)}
                      className="h-11 px-3 rounded-full flex items-center justify-center flex-none text-[12px] font-bold relative overflow-hidden"
                      style={{ background: C.primary, color: "var(--c-on-primary)" }}
                      aria-label={`Hoàn tác bỏ khỏi bảng — tự xoá hẳn sau ${(CONFIRM_DELETE_RESET_MS / 1000).toFixed(0)} giây nếu không chạm`}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute inset-0"
                        style={{ background: "rgba(255,255,255,0.28)", transformOrigin: "left", animation: `confirmDrain ${CONFIRM_DELETE_RESET_MS}ms linear forwards` }}
                      />
                      <span className="relative">Hoàn tác</span>
                    </button>
                  ) : (
                    // Màu trung tính, không phải đỏ-nhạt: bỏ ghim làm lại được (5s hoàn tác + ghim
                    // lại) và đỏ để dành cho cảnh báo thuốc thật (/impeccable critique 2026-08-31,
                    // P2). Vẫn cách nút Đường truyền một khoảng w-4 rõ ràng để không chạm hụt.
                    <button onClick={() => requestUnpin(r.id)} className="w-11 h-11 rounded-full flex items-center justify-center flex-none" style={{ background: C.lineSoft, color: C.textSoft }} aria-label="Bỏ khỏi bảng">
                      {icons.x()}
                    </button>
                  )}
                </div>
              </div>
              )
            })}
        </div>
      ))}

      {/* Khi KHÔNG có xung đột nào, cả khối này trước đây vẫn chiếm sáu dòng chữ để nói "không tìm
          thấy gì" — nay thu về một dải xanh một dòng. Có xung đột thì khối tự bung ra. */}
      {ysiteFindings.length === 0 && interactionFindings.length === 0 ? (
        <div className="pt-2 border-t" style={{ borderColor: C.lineSoft }}>
          <Disclosure label="Tương hợp · Tương tác">
            <p className={T.meta} style={{ color: C.textSoft }}>{COMPAT_DISCLAIMER}</p>
          </Disclosure>
          {/* Dấu tích xanh khẳng định "đã kiểm, sạch" chỉ có ý nghĩa khi có ÍT NHẤT 2 thuốc để so
              sánh — với đúng 1 thuốc đang ghim, danh sách rỗng chỉ vì chưa có gì để đối chiếu, không
              phải vì đã kiểm và không thấy gì. Trước đây hai trường hợp hiện y hệt nhau, trong khi
              phần còn lại của màn hình luôn nói rõ "chưa ghi nguồn"/"CHƯA đối chiếu" — đây là chỗ
              duy nhất một tín hiệu trấn an có thể bị đọc nhầm thành đã-kiểm (critique /impeccable
              2026-08-17T22-03, P2). */}
          {running.length >= 2 ? (
            <p className={`${T.meta} flex items-center gap-1.5 mt-2 px-2.5 py-1.5 ${R.box}`} style={{ background: C.accentSoft, color: "var(--c-primary-deep)" }}>
              <span className="flex-none scale-90">{icons.check()}</span>
              Chưa thấy xung đột nào trong bảng dữ liệu của app
            </p>
          ) : (
            <p className={`${T.meta} mt-2 px-2.5 py-1.5 ${R.box}`} style={{ background: C.surfaceAlt, color: C.textSoft }}>
              Ghim thêm thuốc để kiểm tương hợp
            </p>
          )}
        </div>
      ) : (
      <div className="pt-2 border-t" style={{ borderColor: C.lineSoft }}>
        <p className="text-[12px] font-bold mb-1.5 text-slate-500">Chạy chung Đường truyền (Khóa chữ Y)</p>
        {ysiteFindings.length === 0 ? (
          <p className="text-[12px] text-slate-500 leading-[1.45]">Không tìm thấy cặp nào trong bảng dữ liệu của app.</p>
        ) : (
          ysiteFindings.map((f, i) => {
            const danger = f.rule.verdict === "incompatible"
            const fg = danger ? "var(--c-danger-deep)" : C.warn
            return (
              <div
                key={i}
                className="fade-in flex items-start gap-2 px-2.5 py-2 rounded-[14px] mb-1.5"
                style={danger ? { background: C.dangerSoft, border: "1px solid var(--c-danger-line)" } : { background: C.warnSoft, border: "1px solid var(--c-warn-line)" }}
              >
                <span className="mt-0.5 flex-none" style={{ color: danger ? C.dangerIcon : C.warnIcon }}>{icons.alert()}</span>
                <div>
                  <p className={T.critical} style={{ color: fg }}>
                    {danger ? "KHÔNG tương hợp" : "Thận trọng"} — {f.a.name} + {f.b.name} ({lineLabel(f.line)})
                  </p>
                  <p className={`${T.meta} mt-0.5`} style={{ color: fg }}>{f.rule.text}</p>
                  <CompatSource verified={f.rule.verified} source={f.rule.source} color={fg} />
                </div>
              </div>
            )
          })
        )}

        <p className="text-[12px] font-bold mb-1.5 mt-2.5 text-slate-500">Tương tác thuốc</p>
        {interactionFindings.length === 0 ? (
          <p className="text-[12px] text-slate-500 leading-[1.45]">Không tìm thấy cặp nào trong bảng dữ liệu của app.</p>
        ) : (
          interactionFindings.map((f, i) => {
            const danger = f.rule.severity === "cao"
            const fg = danger ? "var(--c-danger-deep)" : C.warn
            return (
              <div
                key={i}
                className="fade-in flex items-start gap-2 px-2.5 py-2 rounded-[14px] mb-1.5"
                style={danger ? { background: C.dangerSoft, border: "1px solid var(--c-danger-line)" } : { background: C.warnSoft, border: "1px solid var(--c-warn-line)" }}
              >
                <span className="mt-0.5 flex-none" style={{ color: danger ? C.dangerIcon : C.warnIcon }}>{icons.alert()}</span>
                <div>
                  <p className="text-[12px] font-bold leading-[1.45]" style={{ color: fg }}>
                    {f.a.name} + {f.b.name}
                  </p>
                  <p className="text-[12px] leading-[1.45] mt-0.5" style={{ color: fg }}>{f.rule.text}</p>
                  <CompatSource verified={f.rule.verified} source={f.rule.source} color={fg} />
                </div>
              </div>
            )
          })
        )}

        <p className="text-[12px] leading-[1.45] mt-2 px-2 py-1.5 rounded-lg" style={{ background: C.surfaceAlt, color: "var(--c-text-muted)" }}>
          {COMPAT_DISCLAIMER}
        </p>
      </div>
      )}
    </div>
  )
}

// ─── Nhật ký tính toán ────────────────────────────────────────────────────────

// Chọn được TỪNG mục. Trước đây chỉ có hai nút "Sao chép" và "Xoá nhật ký", cả hai đều tác động
// lên toàn bộ 200 mục: muốn dán một phép tính vào bệnh án thì phải dán cả nhật ký rồi cắt tay, và
// muốn bỏ một phép tính nháp thì phải xoá sạch lịch sử của cả ca trực.
//
// Mặc định là KHÔNG chọn gì; lúc đó hai nút tác động lên toàn bộ như cũ, nên người chỉ cần thao tác
// nhanh không phải học thêm gì. Chạm vào một mục là bật chế độ chọn.
