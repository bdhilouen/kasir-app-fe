import { useState, useEffect } from "react"
import api from "../lib/axios"

interface TransactionDetail {
    id: number
    product_name: string
    price: number
    quantity: number
    subtotal: number
}

interface Transaction {
    id: number
    invoice_number: string
    transaction_date: string
    customer_name: string | null
    total_amount: number
    paid_amount: number
    change_amount: number
    payment_method: "cash" | "transfer" | "qris"
    status: "paid" | "partial" | "debt"
    is_voided: boolean
    voided_at: string | null
    void_reason: string | null
    voided_by?: { id: number; name: string } | null
    transaction_details: TransactionDetail[]
}

const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric",
    })

const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString("id-ID", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    })

function RiwayatTransaksi() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)
    const [total, setTotal] = useState(0)

    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("")
    const [filterPayment, setFilterPayment] = useState("")
    const [filterVoided, setFilterVoided] = useState("")
    const [fromDate, setFromDate] = useState("")
    const [toDate, setToDate] = useState("")

    const [selected, setSelected] = useState<Transaction | null>(null)
    const [showDetail, setShowDetail] = useState(false)

    const [showVoid, setShowVoid] = useState(false)
    const [voidTarget, setVoidTarget] = useState<Transaction | null>(null)
    const [voidPassword, setVoidPassword] = useState("")
    const [voidReason, setVoidReason] = useState("")
    const [voidError, setVoidError] = useState("")
    const [voidSaving, setVoidSaving] = useState(false)
    const [showVoidPw, setShowVoidPw] = useState(false)

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}")
    const isAdmin = currentUser?.role === "admin"

    const fetchTransactions = (page = 1) => {
        setLoading(true)
        const params: any = { page, per_page: 15 }
        if (filterStatus) params.status = filterStatus
        if (filterPayment) params.payment_method = filterPayment
        if (filterVoided) params.is_voided = filterVoided
        if (fromDate) params.start_date = fromDate
        if (toDate) params.end_date = toDate

        const endpoint = isAdmin ? "/transactions" : "/transactions/cashier/history"
        if (!isAdmin && fromDate) params.date = fromDate

        api.get(endpoint, { params })
            .then(res => {
                const data = res.data.data
                setTransactions(data.data)
                setCurrentPage(data.current_page)
                setLastPage(data.last_page)
                setTotal(data.total)
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        fetchTransactions(1)
    }, [filterStatus, filterPayment, filterVoided, fromDate, toDate])

    // Filter search lokal
    const displayed = transactions.filter(t => {
        const q = search.toLowerCase()
        return (
            t.invoice_number.toLowerCase().includes(q) ||
            (t.customer_name?.toLowerCase() ?? "").includes(q)
        )
    })

    const openDetail = (transaction: Transaction) => {
        setSelected(transaction)
        setShowDetail(true)
    }

    const openVoid = (transaction: Transaction) => {
        setVoidTarget(transaction)
        setVoidPassword("")
        setVoidReason("")
        setVoidError("")
        setShowVoidPw(false)
        setShowVoid(true)
    }

    const handleVoid = async () => {
        if (!voidPassword) {
            setVoidError("Password wajib diisi untuk konfirmasi void.")
            return
        }
        setVoidSaving(true)
        try {
            await api.post(`/transactions/${voidTarget?.id}/void`, {
                password: voidPassword,
                void_reason: voidReason || null,
            })
            setShowVoid(false)
            setVoidTarget(null)
            // Tutup detail kalau sedang buka transaksi yang sama
            if (selected?.id === voidTarget?.id) setShowDetail(false)
            fetchTransactions(currentPage)
        } catch (err: any) {
            setVoidError(err.response?.data?.message || "Gagal membatalkan transaksi.")
        } finally {
            setVoidSaving(false)
        }
    }

    const StatusBadge = ({ status }: { status: Transaction["status"] }) => {
        const map = {
            paid: "bg-green-50 text-green-700",
            partial: "bg-amber-50 text-amber-700",
            debt: "bg-red-50 text-red-600",
        }
        const label = {
            paid: "Lunas", partial: "Sebagian", debt: "Utang"
        }
        return (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${map[status]}`}>
                {label[status]}
            </span>
        )
    }

    const PaymentBadge = ({ method }: { method: Transaction["payment_method"] }) => (
        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-600 uppercase">
            {method}
        </span>
    )

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <h2 className="text-2xl md:text-3xl font-bold">Riwayat Transaksi</h2>
                <p className="bg-slate-100 px-4 py-2 rounded-lg text-sm">
                    Total: <span className="font-bold">{total}</span> transaksi
                </p>
            </div>

            {/* ── Filter ── */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="flex flex-wrap gap-3">
                    <input
                        type="text"
                        placeholder="Cari invoice / nama pelanggan..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border p-2 rounded-md text-sm flex-1 min-w-full sm:min-w-[200px] outline-none focus:border-blue-400"
                    />

                    {/* Filter status */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="border p-2 rounded-md text-sm text-gray-700 outline-none focus:border-blue-400 cursor-pointer w-full sm:w-auto"
                    >
                        <option value="">Semua Status</option>
                        <option value="paid">Lunas</option>
                        <option value="partial">Sebagian</option>
                        <option value="debt">Utang</option>
                    </select>

                    {/* Filter metode bayar */}
                    <select
                        value={filterPayment}
                        onChange={(e) => setFilterPayment(e.target.value)}
                        className="border p-2 rounded-md text-sm text-gray-700 outline-none focus:border-blue-400 cursor-pointer w-full sm:w-auto"
                    >
                        <option value="">Semua Metode</option>
                        <option value="cash">Cash</option>
                        <option value="transfer">Transfer</option>
                        <option value="qris">QRIS</option>
                    </select>

                    {/* Filter void — admin only */}
                    {isAdmin && (
                        <select
                            value={filterVoided}
                            onChange={(e) => setFilterVoided(e.target.value)}
                            className="border p-2 rounded-md text-sm text-gray-700 outline-none focus:border-blue-400 cursor-pointer w-full sm:w-auto"
                        >
                            <option value="">Semua Transaksi</option>
                            <option value="false">Aktif</option>
                            <option value="true">Dibatalkan (Void)</option>
                        </select>
                    )}
                </div>

                {/* Filter tanggal */}
                <div className="flex flex-wrap gap-3 mt-3">
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                        <label className="text-xs text-gray-500">
                            {isAdmin ? "Dari Tanggal" : "Tanggal (maks. 7 hari)"}
                        </label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="border p-2 rounded-md text-sm text-gray-700 outline-none focus:border-blue-400 w-full sm:w-auto"
                        />
                    </div>
                    {isAdmin && (
                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                            <label className="text-xs text-gray-500">Sampai Tanggal</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="border p-2 rounded-md text-sm text-gray-700 outline-none focus:border-blue-400 w-full sm:w-auto"
                            />
                        </div>
                    )}
                    <div className="flex items-end w-full sm:w-auto">
                        <button
                            onClick={() => {
                                setFromDate("")
                                setToDate("")
                                setFilterStatus("")
                                setFilterPayment("")
                                setFilterVoided("")
                                setSearch("")
                            }}
                            className="border border-gray-300 px-4 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition w-full sm:w-auto"
                        >
                            Reset Filter
                        </button>
                    </div>
                </div>
            </div>

            {/* List transaksi */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                {loading ? (
                    <p className="text-sm text-gray-400 text-center py-12">Memuat transaksi...</p>
                ) : displayed.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-12">Tidak ada transaksi ditemukan.</p>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {displayed.map((trx) => (
                            <div
                                key={trx.id}
                                className={`flex items-center justify-between gap-3 py-4 px-2 rounded-lg transition hover:bg-gray-50 ${
                                    trx.is_voided ? "opacity-50" : ""
                                }`}
                            >
                                {/* Info utama */}
                                <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${trx.is_voided
                                        ? "bg-gray-100"
                                        : trx.status === "paid"
                                            ? "bg-green-50"
                                            : trx.status === "partial"
                                                ? "bg-amber-50"
                                                : "bg-red-50"
                                        }`}>
                                        <span className={`text-lg ${trx.is_voided ? "text-gray-400" :
                                            trx.status === "paid" ? "text-green-600" :
                                                trx.status === "partial" ? "text-amber-500" : "text-red-500"
                                            }`}>
                                            {trx.is_voided ? "✕" : trx.status === "paid" ? "✓" : "!"}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-gray-800 text-sm">
                                                {trx.invoice_number}
                                            </p>
                                            {trx.is_voided && (
                                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                                                    VOID
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {formatDateTime(trx.transaction_date)}
                                            {trx.customer_name && ` · ${trx.customer_name}`}
                                        </p>
                                        {trx.is_voided && trx.void_reason && (
                                            <p className="text-xs text-gray-400 mt-0.5 italic">
                                                Alasan: {trx.void_reason}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Badge */}
                                <div className="hidden md:flex items-center gap-2 mx-4 flex-shrink-0">
                                    <PaymentBadge method={trx.payment_method} />
                                    {!trx.is_voided && <StatusBadge status={trx.status} />}
                                </div>

                                {/* Amount */}
                                <div className="hidden md:block text-right mr-4 flex-shrink-0">
                                    <p className="font-semibold text-gray-800 text-sm">{fmt(trx.total_amount)}</p>
                                    {trx.change_amount > 0 && (
                                        <p className="text-xs text-gray-400">Kembalian {fmt(trx.change_amount)}</p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1.5 flex-shrink-0">
                                    <button
                                        onClick={() => openDetail(trx)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 md:px-3 md:py-1.5 rounded-md text-xs md:text-sm cursor-pointer transition"
                                    >
                                        Detail
                                    </button>
                                    {!trx.is_voided && (
                                        <button
                                            onClick={() => openVoid(trx)}
                                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 md:px-3 md:py-1.5 rounded-md text-xs md:text-sm cursor-pointer transition"
                                        >
                                            Detail
                                        </button>
                                        {!trx.is_voided && (
                                            <button
                                                onClick={() => openVoid(trx)}
                                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm cursor-pointer transition"
                                            >
                                                Void
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {lastPage > 1 && (
                    <div className="flex flex-wrap justify-center items-center gap-2 mt-6">
                        <button
                            onClick={() => fetchTransactions(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-md text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                        >
                            ← Sebelumnya
                        </button>
                        <span className="text-sm text-gray-500">
                            Halaman {currentPage} dari {lastPage}
                        </span>
                        <button
                            onClick={() => fetchTransactions(currentPage + 1)}
                            disabled={currentPage === lastPage}
                            className="px-3 py-1.5 rounded-md text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                        >
                            Selanjutnya →
                        </button>
                    </div>
                )}
            </div>

            {/* ── Modal Detail Transaksi ── */}
            {showDetail && selected && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-[calc(100vw-2rem)] max-w-[480px] shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="p-5 md:p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">Detail Transaksi</h3>
                                    <p className="text-sm text-gray-400">{selected.invoice_number}</p>
                                </div>
                                <button
                                    onClick={() => setShowDetail(false)}
                                    className="text-gray-400 hover:text-black text-xl cursor-pointer"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Status void banner */}
                            {selected.is_voided && (
                                <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3 mb-4">
                                    <p className="text-sm font-semibold text-gray-600">Transaksi Dibatalkan (VOID)</p>
                                    {selected.voided_at && (
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {formatDateTime(selected.voided_at)}
                                            {selected.voided_by && ` · oleh ${selected.voided_by.name}`}
                                        </p>
                                    )}
                                    {selected.void_reason && (
                                        <p className="text-xs text-gray-500 mt-1 italic">
                                            Alasan: {selected.void_reason}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Info transaksi */}
                            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                                <div>
                                    <p className="text-xs text-gray-400">Tanggal</p>
                                    <p className="font-medium text-gray-700">{formatDate(selected.transaction_date)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Pelanggan</p>
                                    <p className="font-medium text-gray-700">{selected.customer_name || "Walk-in"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Metode Bayar</p>
                                    <p className="font-medium text-gray-700 uppercase">{selected.payment_method}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Status</p>
                                    {selected.is_voided
                                        ? <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">VOID</span>
                                        : <StatusBadge status={selected.status} />
                                    }
                                </div>
                            </div>

                            {/* Item list */}
                            <div className="border rounded-lg overflow-hidden mb-4">
                                <div className="bg-gray-50 px-3 sm:px-4 py-2 text-xs text-gray-500 grid grid-cols-12 gap-1 sm:gap-2">
                                    <span className="col-span-5">Produk</span>
                                    <span className="col-span-2 text-right">Harga</span>
                                    <span className="col-span-2 text-center">Qty</span>
                                    <span className="col-span-3 text-right">Subtotal</span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {selected.transaction_details.map((item) => (
                                        <div key={item.id} className="px-3 sm:px-4 py-3 text-sm grid grid-cols-12 gap-1 sm:gap-2 items-center">
                                            <span className="col-span-5 text-gray-800 font-medium truncate">{item.product_name}</span>
                                            <span className="col-span-2 text-right text-gray-500 text-xs">{fmt(item.price)}</span>
                                            <span className="col-span-2 text-center text-gray-600">{item.quantity}</span>
                                            <span className="col-span-3 text-right font-semibold text-gray-800">{fmt(item.subtotal)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Ringkasan pembayaran */}
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Total</span>
                                    <span className="font-semibold">{fmt(selected.total_amount)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Dibayar</span>
                                    <span className="font-semibold">{fmt(selected.paid_amount)}</span>
                                </div>
                                {selected.change_amount > 0 && (
                                    <div className="flex justify-between text-gray-600">
                                        <span>Kembalian</span>
                                        <span className="font-semibold text-green-600">{fmt(selected.change_amount)}</span>
                                    </div>
                                )}
                                {selected.status !== "paid" && !selected.is_voided && (
                                    <div className="flex justify-between text-red-500 border-t pt-2 mt-2">
                                        <span>Sisa Utang</span>
                                        <span className="font-bold">{fmt(selected.total_amount - selected.paid_amount)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Tombol void di dalam detail */}
                            {!selected.is_voided && (
                                <button
                                    onClick={() => {
                                        setShowDetail(false)
                                        openVoid(selected)
                                    }}
                                    className="w-full mt-5 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-semibold cursor-pointer transition"
                                >
                                    Batalkan Transaksi (Void)
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Void Transaksi ── */}
            {showVoid && voidTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-5 md:p-6 rounded-xl w-[calc(100vw-2rem)] max-w-96 shadow-xl">
                        <h3 className="text-xl font-bold mb-1">Batalkan Transaksi</h3>
                        <p className="text-sm text-gray-500 mb-1">
                            Invoice: <span className="font-semibold text-gray-700">{voidTarget.invoice_number}</span>
                        </p>
                        <p className="text-xs text-red-500 mb-4">
                            Stok produk akan dikembalikan. Tindakan ini tidak bisa dibatalkan.
                        </p>

                        <div className="grid gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">
                                    Alasan Pembatalan <span className="text-gray-400">(opsional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="contoh: Salah input barang"
                                    value={voidReason}
                                    onChange={(e) => setVoidReason(e.target.value)}
                                    className="w-full border p-2 rounded-md text-sm outline-none focus:border-red-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">
                                    Password Kamu (untuk konfirmasi)
                                </label>
                                <div className="relative">
                                    <input
                                        type={showVoidPw ? "text" : "password"}
                                        placeholder="Masukkan password kamu"
                                        value={voidPassword}
                                        onChange={(e) => {
                                            setVoidPassword(e.target.value)
                                            setVoidError("")
                                        }}
                                        className="w-full border p-2 rounded-md text-sm outline-none focus:border-red-400 pr-24"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowVoidPw(!showVoidPw)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer text-xs"
                                    >
                                        {showVoidPw ? "Sembunyikan" : "Tampilkan"}
                                    </button>
                                </div>
                            </div>

                            {voidError && (
                                <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                                    {voidError}
                                </p>
                            )}

                            <div className="flex gap-3 mt-1">
                                <button
                                    onClick={() => setShowVoid(false)}
                                    disabled={voidSaving}
                                    className="flex-1 border border-gray-300 py-2 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer text-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleVoid}
                                    disabled={voidSaving || !voidPassword}
                                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white py-2 rounded-lg text-sm font-semibold cursor-pointer transition"
                                >
                                    {voidSaving ? "Memproses..." : "Konfirmasi Void"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default RiwayatTransaksi
