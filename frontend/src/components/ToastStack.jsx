import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react";

let toastSequence = 0;

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((message, tone = "success", duration = 4500) => {
    const id = `aw-toast-${++toastSequence}`;
    setToasts((current) => [...current, { id, message, tone }].slice(-4));
    if (duration > 0) {
      timers.current.set(
        id,
        window.setTimeout(() => {
          timers.current.delete(id);
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, duration),
      );
    }
    return id;
  }, []);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  return { toasts, push, dismiss };
}

const TONE_ICON = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export default function ToastStack({ toasts, onDismiss }) {
  if (typeof document === "undefined" || !toasts.length) return null;

  return createPortal(
    <div className="aw-toasts" role="region" aria-label="Notifications">
      {toasts.map((toast) => {
        const Icon = TONE_ICON[toast.tone] || Info;
        return (
          <div
            key={toast.id}
            className={`aw-toast aw-toast--${toast.tone}`}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            <span className="aw-toast__icon">
              <Icon size={18} />
            </span>
            <p>{toast.message}</p>
            <button
              type="button"
              className="aw-icon-btn aw-icon-btn--sm aw-toast__close"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
