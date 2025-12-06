import { useToast } from "@/hooks/use-toast"
import { X } from "lucide-react"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`relative flex items-start gap-3 rounded-md border p-4 shadow-lg transition-all duration-300 animate-in slide-in-from-right-full ${
            toast.variant === "destructive"
              ? "border-destructive/50 bg-destructive/10 text-destructive"
              : "border-border bg-card text-foreground"
          }`}
          data-testid={`toast-${toast.id}`}
        >
          <div className="flex-1">
            {toast.title && (
              <p className="text-sm font-semibold">{toast.title}</p>
            )}
            {toast.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {toast.description}
              </p>
            )}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
            data-testid={`button-dismiss-toast-${toast.id}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
