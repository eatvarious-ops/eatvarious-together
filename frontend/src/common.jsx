import React, { useContext, useEffect, useRef, useState } from "react";
import { X, Leaf, Fish, Egg, Milk, Beef, Ham, Utensils } from "lucide-react";
import { tags } from "./domain";
import { photoUrl } from "./store";
export const Context = React.createContext(null);
export const useApp = () => useContext(Context);
export const icons = [Ham, Beef, Leaf, Fish, Egg, Milk];
export function Chip({ tag, selected, onClick, small = false }) {
  const { idx } = useApp(),
    I = icons[tags.indexOf(tag)],
    style = { "--tone": tag.color, "--tint": tag.bg };
  return onClick ? (
    <button
      type="button"
      aria-pressed={selected}
      className={"chip choice " + (selected ? "selected" : "")}
      onClick={onClick}
      style={style}
    >
      <I size={16} />
      {tag.label[idx]}
    </button>
  ) : (
    <span className={"chip " + (small ? "tiny" : "")} style={style}>
      {!small && <I size={15} />}
      {tag.label[idx]}
    </span>
  );
}
export function Photo({ path, alt = "", className = "" }) {
  const [url, set] = useState("");
  useEffect(() => {
    let active = true;
    set("");
    if (path)
      photoUrl(path)
        .then((s) => active && set(s))
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [path]);
  return url ? (
    <img className={className} src={url} alt={alt} />
  ) : (
    <span className={"photoPlaceholder " + className}>
      <Utensils size={22} />
    </span>
  );
}
export function Dialog({ children, onClose, title, wide = false }) {
  const ref = useRef(null),
    close = useRef(onClose),
    { t } = useApp();
  close.current = onClose;
  useEffect(() => {
    const prev = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current.focus();
    const handle = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
      }
      if (e.key === "Tab") {
        const els = [
          ...ref.current.querySelectorAll(
            'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
          ),
        ].filter((el) => el.getClientRects().length);
        if (!els.length) {
          e.preventDefault();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === els[0] ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          els.at(-1).focus();
        } else if (!e.shiftKey && document.activeElement === els.at(-1)) {
          e.preventDefault();
          els[0].focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = overflow;
      if (prev?.isConnected) prev.focus();
    };
  }, []);
  return (
    <div
      className="scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={"dialog " + (wide ? "wide" : "")}
        ref={ref}
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="dialogHead">
          <strong>{title}</strong>
          <button
            className="iconbtn"
            onClick={onClose}
            aria-label={t("닫기", "Close")}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export const notices = {
  requiredLocation: [
    "식당 이름과 위치를 입력해주세요.",
    "Enter a restaurant name and choose a location.",
  ],
  requiredName: ["메뉴 이름을 입력해주세요.", "Enter a menu name."],
  outside: [
    "학내 식당만 등록할 수 있습니다.",
    "Choose a location inside the campus.",
  ],
  method: ["확인 방법을 선택해주세요.", "Choose a verification method."],
  duplicateMenu: [
    "이미 등록된 메뉴입니다.",
    "This menu is already registered.",
  ],
  duplicateRestaurant: [
    "이미 등록된 식당입니다.",
    "This restaurant is already registered.",
  ],
  duplicateReport: [
    "이미 신고한 항목입니다.",
    "You already reported this item.",
  ],
  photoType: [
    "4MB 이하의 JPG, PNG, WebP 사진을 선택해주세요.",
    "Choose a JPG, PNG or WebP under 4 MB.",
  ],
  photoFail: [
    "사진을 업로드하지 못했습니다. 사진을 지우거나 다시 시도해주세요.",
    "Photo upload failed. Remove the photo or try again.",
  ],
  missing: ["해당 정보를 찾을 수 없습니다.", "This item is unavailable."],
  reason: ["반려 사유를 선택해주세요.", "Choose a rejection reason."],
  already: [
    "이미 처리된 제보입니다.",
    "This report has already been reviewed.",
  ],
  conflict: [
    "확인 방법의 우선순위 또는 제출 시각이 앞서는 상충 제보가 있습니다. 해당 항목을 제외하거나 우선 제보를 검토해주세요.",
    "A higher-priority report conflicts with these fields. Review it first or exclude those fields.",
  ],
  applyFailed: [
    "반영에 실패했습니다. 공개 정보는 보존되었습니다. 재시도할 수 있습니다.",
    "Could not apply the report. Public data was preserved. You can retry.",
  ],
  unauthorized: ["운영진 권한이 필요합니다.", "Reviewer access is required."],
  admin_required: ["운영진 권한이 필요합니다.", "Reviewer access is required."],
  login_required: ["다시 로그인해주세요.", "Please sign in again."],
  notConfigured: [
    "이 환경에서는 자동 검색·추출을 쓸 수 없습니다. 직접 입력해주세요.",
    "Automatic lookup is unavailable here. Enter the details manually.",
  ],
  search_not_configured: [
    "식당 검색이 아직 설정되지 않았습니다. 지도에서 직접 위치를 지정해주세요.",
    "Restaurant search is not set up yet. Pick the location on the map.",
  ],
  search_failed: [
    "식당 검색에 실패했습니다. 다시 시도해주세요.",
    "Restaurant search failed. Please try again.",
  ],
  extract_not_configured: [
    "메뉴 추출이 아직 설정되지 않았습니다. 직접 입력해주세요.",
    "Menu extraction is not set up yet. Enter menus manually.",
  ],
  extract_failed: [
    "메뉴 추출에 실패했습니다. 다시 시도해주세요.",
    "Menu extraction failed. Please try again.",
  ],
  invalid_images: [
    "5MB 이하의 JPG, PNG, WebP 사진을 1~5장 선택해주세요.",
    "Choose 1–5 JPG, PNG or WebP photos under 5 MB.",
  ],
};
export function message(e, idx, fallback) {
  return notices[e?.message]?.[idx] || fallback;
}
