import { useState, useEffect } from "react"
import api from "../lib/axios"

interface Transaction {
    id: number
    invoice_number: string
    transaction_date: string
}

interface Debt {
    id: number
    transaction_id: number
    customer_name: string
    total_debt: number
    paid_amount: number
    remaining_debt: number
    status: "unpaid" | "partial" | "paid"
    due_date: string | null
    notes: string | null
    created_at: string
    transaction: Transaction
}

const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric",
    })

function Utang() {
    const [debts, setDebts] = useState<Debt[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)
    const [totalRemaining, setTotalRemaining] = useState(0)

    const [search, setSearch] = useState("")
    const [filterStatus, setFilterStatus] = useState("")
    const [filterOverdue, setFilterOverdue] = useState(false)

    const [selected, setSelected] = useState<Debt | null>(null)
    const [showDetail, setShowDetail] = useState(false)

    const [showPay, setShowPay] = useState(false)
    const [payTarget, setPayTarget] = useState<Debt | null>(null)
    const [payAmount, setPayAmount] = useState("")
    const [payNotes, setPayNotes] = useState("")
    const [payError, setPayError] = useState("")
    const [paySaving, setPaySaving] = useState(false)

    const [showEdit, setShowEdit] = useState(false)
    const [editTarget, setEditTarget] = useState<Debt | null>(null)
    const [editDueDate, setEditDueDate] = useState("")
    const [editNotes, setEditNotes] = useState("")
    const [editSaving, setEditSaving] = useState(false)
    const [editError, setEditError] = useState("")

    const fetchDebts = (page = 1) => {
        setLoading(true)
        const params: any = { page, per_page: 15 }
        if (filterStatus) params.status = filterStatus
        if (filterOverdue) params.overdue = true
        if (search) params.search = search

        api.get("/debts", { params })
            .then(res => {
                const data = res.data.data
                setDebts(data.data)
                setCurrentPage(data.current_page)
                setLastPage(data.last_page)
                setTotalRemaining(res.data.meta?.total_remaining_debt ?? 0)
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        fetchDebts(1)
    }, [filterStatus, filterOverdue])

    const handleSearch = () => fetchDebts(1)

    const openDetail = (debt: Debt) => {
        setSelected(debt)
        setShowDetail(true)
    }

    const openPay = (debt: Debt) => {
        setPayTarget(debt)
        setPayAmount("")
        setPayNotes("")
        setPayError("")
        setShowPay(true)
    }

    const openEdit = (debt: Debt) => {
        setEditTarget(debt)
        setEditDueDate(debt.due_date ?? "")
        setEditNotes(debt.notes ?? "")
        setEditError("")
        setShowEdit(true)
    }

    const handlePay = async () => {
        const amount = Number(payAmount)
        if (!amount || amount <= 0) {
            setPayError("Jumlah bayar harus lebih dari 0.")
            return
        }
        if (amount > (payTarget?.remaining_debt ?? 0)) {
            setPayError(`Jumlah tidak boleh melebihi sisa utang ${fmt(payTarget?.remaining_debt ?? 0)}.`)
            return
        }

        setPaySaving(true)
        try {
            await api.post(`/debts/${payTarget?.id}/pay`, {
                amount: amount,
                notes: payNotes || null,
            })
            setShowPay(false)
            setPayTarget(null)
            if (selected?.id === payTarget?.id) setShowDetail(false)
            fetchDebts(currentPage)
        } catch (err: any) {
            setPayError(err.response?.data?.message || "Gagal memproses pembayaran.")
        } finally {
            setPaySaving(false)
        }
    }

    const handleEdit = async () => {
        setEditSaving(true)
        try {
            await api.patch(`/debts/${editTarget?.id}`, {
                due_date: editDueDate || null,
                notes: editNotes || null,
            })
            setShowEdit(false)
            setEditTarget(null)
            fetchDebts(currentPage)
        } catch (err: any) {
            setEditError(err.response?.data?.message || "Gagal memperbarui utang.")
        } finally {
            setEditSaving(false)
        }
    }

    const isOverdue = (debt: Debt) =>
        debt.due_date &&
        new Date(debt.due_date) < new Date() &&
        debt.status !== "paid"

    const StatusBadge = ({ status }: { status: Debt["status"] }) => {
        const map = {
            unpaid: "bg-red-50 text-red-600",
            partial: "bg-amber-50 text-amber-700",
            paid: "bg-green-50 text-green-700",
        }
        const label = {
            unpaid: "Belum Bayar", partial: "Sebagian", paid: "Lunas"
        }
        return (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${map[status]}`}>
                {label[status]}
            </span>
        )
    }

    const unpaidCount = debts.filter(d => d.status === "unpaid").length
    const partialCount = debts.filter(d => d.status === "partial").length

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold">Kelola Utang</h2>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 mb-1">Total Sisa Utang</p>
                    <p className="text-xl md:text-2xl font-semibold text-red-600">{fmt(totalRemaining)}</p>
                    <p className="text-xs text-gray-400 mt-1">belum terlunasi</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 mb-1">Belum Bayar</p>
                    <p className="text-xl md:text-2xl font-semibold text-gray-800">{unpaidCount} Utang</p>
                    <p className="text-xs text-gray-400 mt-1">dalam halaman ini</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 mb-1">Bayar Sebagian</p>
                    <p className="text-xl md:text-2xl font-semibold text-gray-800">{partialCount} Utang</p>
                    <p className="text-xs text-gray-400 mt-1">dalam halaman ini</p>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                    <input
                        type="text"
                        placeholder="Cari nama pelanggan..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="border p-2 rounded-md text-sm flex-1 min-w-full sm:min-w-[200px] outline-none focus:border-blue-400"
                    />
                    <button
                        onClick={handleSearch}
                        className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-900 cursor-pointer transition w-full sm:w-auto"
                    >
                        Cari
                    </button>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="border p-2 rounded-md text-sm text-gray-700 outline-none focus:border-blue-400 cursor-pointer w-full sm:w-auto"
                    >
                        <option value="">Semua Status</option>
                        <option value="unpaid">Belum Bayar</option>
                        <option value="partial">Sebagian</option>
                        <option value="paid">Lunas</option>
                    </select>
                    <button
                        onClick={() => setFilterOverdue(!filterOverdue)}
                        className={`px-4 py-2 rounded-md text-sm transition cursor-pointer border w-full sm:w-auto ${filterOverdue
                                ? "bg-red-600 text-white border-red-600"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                            }`}
                    >
                        Jatuh Tempo
                    </button>
                    <button
                        onClick={() => {
                            setSearch("")
                            setFilterStatus("")
                            setFilterOverdue(false)
                            fetchDebts(1)
                        }}
                        className="border border-gray-300 px-4 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition w-full sm:w-auto"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* List utang */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg md:text-xl font-bold">Daftar Utang</h3>
                </div>

                {loading ? (
                    <p className="text-sm text-gray-400 text-center py-12">Memuat data utang...</p>
                ) : debts.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-12">Tidak ada utang ditemukan.</p>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {debts.map((debt) => (
                            <div
                                key={debt.id}
                                className="flex items-center justify-between gap-3 py-4 px-2 rounded-lg hover:bg-gray-50 transition"
                            >
                                {/* Avatar + info */}
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${debt.status === "paid"
                                            ? "bg-green-50"
                                            : isOverdue(debt)
                                                ? "bg-red-100"
                                                : "bg-amber-50"
                                        }`}>
                                        <span className={`font-bold text-sm ${debt.status === "paid"
                                                ? "text-green-600"
                                                : isOverdue(debt)
                                                    ? "text-red-600"
                                                    : "text-amber-600"
                                            }`}>
                                            {debt.customer_name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-gray-800 text-sm">
                                                {debt.customer_name}
                                            </p>
                                            {isOverdue(debt) && (
                                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                                                    Jatuh Tempo
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {debt.transaction?.invoice_number}
                                            {debt.due_date && ` · Jatuh tempo ${formatDate(debt.due_date)}`}
                                        </p>
                                        {debt.notes && (
                                            <p className="text-xs text-gray-400 italic mt-0.5 truncate max-w-xs">
                                                {debt.notes}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Badge status */}
                                <div className="hidden sm:block mx-4 flex-shrink-0">
                                    <StatusBadge status={debt.status} />
                                </div>

                                {/* Amount */}
                                <div className="hidden md:block text-right mr-4 flex-shrink-0">
                                    <p className="font-semibold text-gray-800 text-sm">{fmt(debt.remaining_debt)}</p>
                                    <p className="text-xs text-gray-400">dari {fmt(debt.total_debt)}</p>
                                </div>

                                {/* Progress bar */}
                                <div className="hidden md:block w-24 mr-4 flex-shrink-0">
                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                        <div
                                            className={`h-1.5 rounded-full ${
                                                debt.status === "paid" ? "bg-green-500" : "bg-amber-400"
                                            }`}
                                            style={{
                                                width: `${Math.min(100, (debt.paid_amount / debt.total_debt) * 100)}%`
                                            }}
                                        />
                                    </div>

                                {/* Actions */}
                                <div className="flex gap-1.5 flex-shrink-0">
                                    <button
                                        onClick={() => openDetail(debt)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 md:px-3 md:py-1.5 rounded-md text-xs md:text-sm cursor-pointer transition"
                                    >
                                        Detail
                                    </button>
                                    {debt.status !== "paid" && (
                                        <>
                                            <button
                                                onClick={() => openPay(debt)}
                                                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 md:px-3 md:py-1.5 rounded-md text-xs md:text-sm cursor-pointer transition"
                                            >
                                                Bayar
                                            </button>
                                            <button
                                                onClick={() => openEdit(debt)}
                                                className="bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 md:px-3 md:py-1.5 rounded-md text-xs md:text-sm cursor-pointer transition"
                                            >
                                                Edit
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {lastPage > 1 && (
                    <div className="flex flex-wrap justify-center items-center gap-2 mt-6">
                        <button
                            onClick={() => fetchDebts(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-md text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                        >
                            ← Sebelumnya
                        </button>
                        <span className="text-sm text-gray-500 text-center">
                            Halaman {currentPage} dari {lastPage}
                        </span>
                        <button
                            onClick={() => fetchDebts(currentPage + 1)}
                            disabled={currentPage === lastPage}
                            className="px-3 py-1.5 rounded-md text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                        >
                            Selanjutnya →
                        </button>
                    </div>
                )}
            </div>

            {/* Modal Detail utang */}
            {showDetail && selected && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl w-[calc(100vw-2rem)] max-w-[440px] shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="p-5 md:p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold">Detail Utang</h3>
                                    <p className="text-sm text-gray-400">{selected.customer_name}</p>
                                </div>
                                <button
                                    onClick={() => setShowDetail(false)}
                                    className="text-gray-400 hover:text-black text-xl cursor-pointer"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
                                <div>
                                    <p className="text-xs text-gray-400">Invoice</p>
                                    <p className="font-medium text-gray-700">{selected.transaction?.invoice_number}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Status</p>
                                    <StatusBadge status={selected.status} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Jatuh Tempo</p>
                                    <p className={`font-medium ${isOverdue(selected) ? "text-red-600" : "text-gray-700"}`}>
                                        {selected.due_date ? formatDate(selected.due_date) : "Tidak ditentukan"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Catatan</p>
                                    <p className="font-medium text-gray-700">{selected.notes || "-"}</p>
                                </div>
                            </div>

                            {/* Progress pembayaran */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-500">Progress Pembayaran</span>
                                    <span className="font-semibold text-gray-700">
                                        {Math.round((selected.paid_amount / selected.total_debt) * 100)}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                                    <div
                                        className={`h-2 rounded-full ${selected.status === "paid" ? "bg-green-500" : "bg-amber-400"}`}
                                        style={{ width: `${Math.min(100, (selected.paid_amount / selected.total_debt) * 100)}%` }}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                                    <div className="text-left sm:text-center">
                                        <p className="text-xs text-gray-400">Total Utang</p>
                                        <p className="font-semibold text-gray-800 text-sm">{fmt(selected.total_debt)}</p>
                                    </div>
                                    <div className="text-left sm:text-center">
                                        <p className="text-xs text-gray-400">Sudah Bayar</p>
                                        <p className="font-semibold text-green-600 text-sm">{fmt(selected.paid_amount)}</p>
                                    </div>
                                    <div className="text-left sm:text-center">
                                        <p className="text-xs text-gray-400">Sisa</p>
                                        <p className="font-semibold text-red-500 text-sm">{fmt(selected.remaining_debt)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Tombol aksi */}
                            {selected.status !== "paid" && (
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={() => {
                                            setShowDetail(false)
                                            openEdit(selected)
                                        }}
                                        className="flex-1 border border-gray-300 py-2 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer text-sm transition"
                                    >
                                        Edit Utang
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowDetail(false)
                                            openPay(selected)
                                        }}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-semibold cursor-pointer transition"
                                    >
                                        Proses Pembayaran
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Bayar utang */}
            {showPay && payTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-5 md:p-6 rounded-xl w-[calc(100vw-2rem)] max-w-96 shadow-xl">
                        <h3 className="text-xl font-bold mb-1">Proses Pembayaran</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Pelanggan: <span className="font-semibold text-gray-700">{payTarget.customer_name}</span>
                        </p>

                        {/* Info sisa utang */}
                        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">
                            <p className="text-xs text-gray-500">Sisa Utang</p>
                            <p className="text-xl font-bold text-red-600">{fmt(payTarget.remaining_debt)}</p>
                        </div>

                        <div className="grid gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Jumlah Bayar</label>
                                <input
                                    type="number"
                                    placeholder={`Maks. ${fmt(payTarget.remaining_debt)}`}
                                    value={payAmount}
                                    onChange={(e) => {
                                        setPayAmount(e.target.value)
                                        setPayError("")
                                    }}
                                    max={payTarget.remaining_debt}
                                    className="w-full border p-2 rounded-md text-sm outline-none focus:border-green-400"
                                />
                                {/* Shortcut lunas */}
                                <button
                                    onClick={() => setPayAmount(String(payTarget.remaining_debt))}
                                    className="text-xs text-blue-600 hover:underline mt-1 cursor-pointer"
                                >
                                    Bayar lunas ({fmt(payTarget.remaining_debt)})
                                </button>
                            </div>

                            {payAmount && Number(payAmount) > 0 && (
                                <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Sisa setelah bayar</span>
                                        <span className={`font-semibold ${payTarget.remaining_debt - Number(payAmount) <= 0
                                                ? "text-green-600"
                                                : "text-amber-600"
                                            }`}>
                                            {fmt(Math.max(0, payTarget.remaining_debt - Number(payAmount)))}
                                        </span>
                                    </div>
                                    {payTarget.remaining_debt - Number(payAmount) <= 0 && (
                                        <p className="text-xs text-green-600 mt-1">✓ Utang akan lunas</p>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">
                                    Catatan <span className="text-gray-400">(opsional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="contoh: Bayar sebagian"
                                    value={payNotes}
                                    onChange={(e) => setPayNotes(e.target.value)}
                                    className="w-full border p-2 rounded-md text-sm outline-none focus:border-green-400"
                                />
                            </div>

                            {payError && (
                                <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                                    {payError}
                                </p>
                            )}

                            <div className="flex gap-3 mt-1">
                                <button
                                    onClick={() => setShowPay(false)}
                                    disabled={paySaving}
                                    className="flex-1 border border-gray-300 py-2 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer text-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handlePay}
                                    disabled={paySaving || !payAmount || Number(payAmount) <= 0}
                                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-2 rounded-lg text-sm font-semibold cursor-pointer transition"
                                >
                                    {paySaving ? "Memproses..." : "Konfirmasi Bayar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Edit utang */}
            {showEdit && editTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-5 md:p-6 rounded-xl w-[calc(100vw-2rem)] max-w-96 shadow-xl relative">
                        <button
                            onClick={() => setShowEdit(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-black text-xl cursor-pointer"
                        >
                            ×
                        </button>

                        <h3 className="text-xl font-bold mb-1">Edit Utang</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            {editTarget.customer_name}
                        </p>

                        <div className="grid gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">
                                    Jatuh Tempo <span className="text-gray-400">(opsional)</span>
                                </label>
                                <input
                                    type="date"
                                    value={editDueDate}
                                    onChange={(e) => setEditDueDate(e.target.value)}
                                    min={new Date().toISOString().split("T")[0]}
                                    className="w-full border p-2 rounded-md text-sm outline-none focus:border-blue-400"
                                />
                                {editDueDate && (
                                    <button
                                        onClick={() => setEditDueDate("")}
                                        className="text-xs text-gray-400 hover:text-red-500 mt-1 cursor-pointer block"
                                    >
                                        Hapus jatuh tempo
                                    </button>
                                )}
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">
                                    Catatan <span className="text-gray-400">(opsional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    placeholder="Tambahkan catatan..."
                                    className="w-full border p-2 rounded-md text-sm outline-none focus:border-blue-400"
                                />
                            </div>

                            {editError && (
                                <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                                    {editError}
                                </p>
                            )}

                            <div className="flex gap-3 mt-2">
                                <button
                                    onClick={() => setShowEdit(false)}
                                    disabled={editSaving}
                                    className="flex-1 border border-gray-300 py-2 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer text-sm transition"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleEdit}
                                    disabled={editSaving}
                                    className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white py-2 rounded-lg text-sm font-semibold cursor-pointer transition"
                                >
                                    {editSaving ? "Menyimpan..." : "Simpan Perubahan"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Utang
