export type Notice = {
    type: "success" | "error" | "warning"
    message: string
}

interface NotificationBannerProps {
    notice: Notice | null
    onClose?: () => void
    className?: string
}

function NotificationBanner({ notice, onClose, className = "" }: NotificationBannerProps) {
    if (!notice) return null

    const styles = {
        success: "bg-green-50 text-green-700 border-green-100",
        error:   "bg-red-50 text-red-600 border-red-100",
        warning: "bg-amber-50 text-amber-700 border-amber-100",
    }

    return (
        <div className={`flex items-start justify-between gap-3 border px-4 py-3 rounded-lg text-sm ${styles[notice.type]} ${className}`}>
            <p>{notice.message}</p>
            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    className="text-xs font-semibold opacity-70 hover:opacity-100 cursor-pointer"
                >
                    Tutup
                </button>
            )}
        </div>
    )
}

export default NotificationBanner
