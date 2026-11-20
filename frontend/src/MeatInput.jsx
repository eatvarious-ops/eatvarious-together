import React from "react";
import { useApp } from "./common";
import { ingredients } from "./domain";

export const meatKinds = ["beef", "pork", "chicken", "other"];

export default function MeatInput({ values, onChange }) {
  const { idx, t } = useApp();
  const noMeat = meatKinds.every((k) => values[k] === "no");
  const unidentified = Boolean(values.unidentifiedMeat);
  const unverified =
    !unidentified && meatKinds.every((k) => values[k] === "unknown");
  const allTypes = (state) =>
    Object.fromEntries(meatKinds.map((k) => [k, state]));
  const selectType = (key) =>
    onChange({
      ...(noMeat ? allTypes("unknown") : {}),
      [key]: values[key] === "yes" ? "unknown" : "yes",
      unidentifiedMeat: false,
    });
  function button(label, pressed, click, key = label) {
    return (
      <button
        type="button"
        key={key}
        aria-label={label}
        aria-pressed={pressed}
        onClick={click}
      >
        {label}
      </button>
    );
  }
  return (
    <div className="meatInput" role="group" aria-label={t("고기", "Meat")}>
      <strong>{t("고기", "Meat")}</strong>
      <small>
        {t(
          "육수·소스를 포함해 확인한 고기를 모두 골라주세요.",
          "Select all confirmed meats, including broth and sauces.",
        )}
      </small>
      <div className="meatChoices">
        {meatKinds.map((k) =>
          button(
            ingredients[k][idx],
            values[k] === "yes",
            () => selectType(k),
            k,
          ),
        )}
      </div>
      <div className="meatChoices meatPresets">
        {button(t("고기 미확인", "Meat unverified"), unverified, () =>
          onChange({ ...allTypes("unknown"), unidentifiedMeat: false }),
        )}
        {button(t("고기 없음", "No meat"), noMeat, () =>
          onChange({ ...allTypes("no"), unidentifiedMeat: false }),
        )}
        {button(
          t("고기 포함 · 종류 모름", "Meat present · type unknown"),
          unidentified,
          () =>
            onChange({
              ...allTypes("unknown"),
              unidentifiedMeat: true,
            }),
        )}
      </div>
      {unidentified && (
        <small>
          {t(
            "종류 미상은 제보 메모에 기록됩니다.",
            "The unspecified meat type will be recorded in your report notes.",
          )}
        </small>
      )}
    </div>
  );
}
