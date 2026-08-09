import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type RefObject,
} from "react";
import { monthName, weekdayName, type ReportLang } from "../../lib/libre-report/i18n";

/* ------------------------------------------------------------------ */
/* Shared popover behaviour                                            */
/* ------------------------------------------------------------------ */

function useDismiss(open: boolean, close: () => void, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, ref]);
}

/**
 * Popovers are anchored to their field, but on a phone the field may sit in
 * a half-width grid column while the popover has a fixed width — CSS alone
 * cannot know which side has room. Measure once on open and shift the
 * popover back inside the viewport.
 */
function useViewportClamp(open: boolean, ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;
    const margin = 8;
    el.style.transform = "";
    const rect = el.getBoundingClientRect();
    let dx = 0;
    if (rect.right > window.innerWidth - margin) {
      dx = window.innerWidth - margin - rect.right;
    }
    if (rect.left + dx < margin) dx = margin - rect.left;
    if (dx !== 0) el.style.transform = `translateX(${dx}px)`;
  }, [open, ref]);
}

function Chevron(): ReactElement {
  return (
    <svg className="lr-field-chevron" viewBox="0 0 10 6" aria-hidden="true">
      <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Styled select                                                       */
/* ------------------------------------------------------------------ */

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  useDismiss(open, () => setOpen(false), rootRef);
  useViewportClamp(open, listRef);

  const selected = options.findIndex((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${listId}-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  const openList = () => {
    setActive(selected >= 0 ? selected : 0);
    setOpen(true);
  };

  const pick = (idx: number) => {
    onChange(options[idx].value);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(a + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        pick(active);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div className="lr-field" ref={rootRef}>
      <button
        type="button"
        className="lr-field-btn lr-select-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className="lr-field-value">{selected >= 0 ? options[selected].label : ""}</span>
        <Chevron />
      </button>
      {open ? (
        <ul className="lr-popover lr-select-list" role="listbox" aria-label={ariaLabel} ref={listRef}>
          {options.map((opt, i) => (
            <li
              key={opt.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={opt.value === value}
              className={
                "lr-select-option" +
                (opt.value === value ? " lr-select-option-selected" : "") +
                (i === active ? " lr-select-option-active" : "")
              }
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => pick(i)}
              onPointerMove={() => setActive(i)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Styled date field with calendar popover                             */
/* ------------------------------------------------------------------ */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ISO "yyyy-mm-dd" → display "DD/MM/YYYY". */
export function formatDisplayDate(iso: string): string {
  const d = parseIso(iso);
  return d ? `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}` : "";
}

/** Parse typed "DD/MM/YYYY", "DDMMYYYY" or "yyyy-mm-dd" into ISO, or null. */
export function parseDateText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  let day: number, month: number, year: number;
  // bare DDMMYYYY first: phone numeric keypads have no separator keys
  let m = /^(\d{2})(\d{2})(\d{4})$/.exec(trimmed);
  if (!m) m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(trimmed);
  if (m) {
    [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else {
    m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
    if (!m) return null;
    [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return toIsoDate(d);
}

export function DateField({
  value,
  onChange,
  lang,
  ariaLabel,
  clearable = false,
  min,
  max,
}: {
  /** ISO "yyyy-mm-dd" or "" when unset. */
  value: string;
  onChange: (iso: string) => void;
  lang: ReportLang;
  ariaLabel: string;
  clearable?: boolean;
  /** Earliest selectable day, ISO "yyyy-mm-dd". */
  min?: string;
  /** Latest selectable day, ISO "yyyy-mm-dd". */
  max?: string;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => formatDisplayDate(value));
  const [view, setView] = useState<"days" | "years">("days");
  const today = useRef(new Date());
  const initial = parseIso(value) ?? today.current;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), rootRef);
  useViewportClamp(open, popRef);

  // keep the text box in sync when the value changes from outside
  useEffect(() => {
    setText(formatDisplayDate(value));
  }, [value]);

  const openCalendar = () => {
    const d =
      parseIso(value) ?? parseIso(clamp(toIsoDate(today.current))) ?? today.current;
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setView("days");
    setOpen(true);
  };

  // ISO strings compare correctly as plain strings
  const inRange = (iso: string) => (!min || iso >= min) && (!max || iso <= max);
  const clamp = (iso: string) => (min && iso < min ? min : max && iso > max ? max : iso);

  const commitText = () => {
    const iso = parseDateText(text);
    if (iso) {
      const clamped = clamp(iso);
      onChange(clamped);
      setText(formatDisplayDate(clamped));
    } else if (clearable && text.trim() === "") {
      onChange("");
    } else {
      setText(formatDisplayDate(value));
    }
  };

  const moveMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const pickDay = (day: number) => {
    onChange(toIsoDate(new Date(viewYear, viewMonth, day)));
    setOpen(false);
  };

  const selectedIso = value;
  const todayIso = toIsoDate(today.current);
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const yearBase = Math.floor(viewYear / 12) * 12;

  return (
    <div className="lr-field lr-datefield" ref={rootRef}>
      <div className="lr-field-btn lr-date-inputwrap">
        <input
          type="text"
          className="lr-date-input"
          dir="ltr"
          inputMode="numeric"
          placeholder="DD/MM/YYYY"
          aria-label={ariaLabel}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitText();
              setOpen(false);
            }
          }}
        />
        {clearable && value ? (
          <button
            type="button"
            className="lr-date-clear"
            aria-label={lang === "ar" ? "مسح" : "Clear"}
            onClick={() => onChange("")}
          >
            ×
          </button>
        ) : null}
        <button
          type="button"
          className="lr-date-toggle"
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => (open ? setOpen(false) : openCalendar())}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <line x1="1.5" y1="6" x2="14.5" y2="6" stroke="currentColor" strokeWidth="1.3" />
            <line x1="5" y1="1" x2="5" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <line x1="11" y1="1" x2="11" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {open ? (
        <div className="lr-popover lr-pick" role="dialog" aria-label={ariaLabel} ref={popRef}>
          <div className="lr-pick-head">
            <button
              type="button"
              className="lr-pick-nav"
              aria-label={lang === "ar" ? "السابق" : "Previous"}
              onClick={() => (view === "days" ? moveMonth(-1) : setViewYear((y) => y - 12))}
            >
              {"‹"}
            </button>
            <button
              type="button"
              className="lr-pick-title"
              aria-label={lang === "ar" ? "اختيار السنة" : "Choose year"}
              onClick={() => setView(view === "days" ? "years" : "days")}
            >
              {view === "days"
                ? `${monthName(viewMonth, lang)} ${viewYear}`
                : `${yearBase} – ${yearBase + 11}`}
            </button>
            <button
              type="button"
              className="lr-pick-nav"
              aria-label={lang === "ar" ? "التالي" : "Next"}
              onClick={() => (view === "days" ? moveMonth(1) : setViewYear((y) => y + 12))}
            >
              {"›"}
            </button>
          </div>
          {view === "days" ? (
            <div className="lr-pick-grid" role="grid">
              {Array.from({ length: 7 }, (_, i) => (
                <span key={`w${i}`} className="lr-pick-weekday">
                  {weekdayName(i, lang, true)}
                </span>
              ))}
              {Array.from({ length: firstWeekday }, (_, i) => (
                <span key={`b${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const iso = toIsoDate(new Date(viewYear, viewMonth, i + 1));
                const disabled = !inRange(iso);
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={disabled}
                    className={
                      "lr-pick-day" +
                      (iso === selectedIso ? " lr-pick-selected" : "") +
                      (iso === todayIso ? " lr-pick-today" : "")
                    }
                    onClick={() => pickDay(i + 1)}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="lr-pick-years">
              {Array.from({ length: 12 }, (_, i) => yearBase + i).map((y) => {
                const yearDisabled =
                  (min !== undefined && y < Number(min.slice(0, 4))) ||
                  (max !== undefined && y > Number(max.slice(0, 4)));
                return (
                  <button
                    key={y}
                    type="button"
                    disabled={yearDisabled}
                    className={"lr-pick-year" + (y === viewYear ? " lr-pick-selected" : "")}
                    onClick={() => {
                      setViewYear(y);
                      setView("days");
                    }}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
