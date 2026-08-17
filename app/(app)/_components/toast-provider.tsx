"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Notify = (message: string) => void;

const ToastContext = createContext<Notify | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState("");
  const notify: Notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3600);
  };

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <span>✓</span>{toast}
          <button aria-label="Close notification" onClick={() => setToast("")}>×</button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("useToast must be used within ToastProvider");
  return notify;
}
