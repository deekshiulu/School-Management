import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function AdminModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = "md",
}) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll(FOCUSABLE))
        .filter((element) => element.offsetParent !== null);

      if (!focusable.length) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panelRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target = panel.querySelector("[data-autofocus]")
        || panel.querySelector(FOCUSABLE)
        || panel;
      target.focus();
    }, 30);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const sizeClass = size === "lg" ? "aw-modal--lg" : size === "sm" ? "aw-modal--sm" : "";

  return createPortal(
    <div
      className="aw-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        className={`aw-modal ${sizeClass}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <div className="aw-modal__head">
          <div>
            <span className="aw-eyebrow">Administration</span>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId} className="aw-modal__description">{description}</p>}
          </div>
          <button
            type="button"
            className="aw-icon-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={17} />
          </button>
        </div>
        <div className="aw-modal__body">{children}</div>
        {footer && <div className="aw-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
