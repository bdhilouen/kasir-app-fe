import React, { useState, useEffect } from "react"
import api from "../lib/axios"
import { useAuth } from "../hooks/useAuth"
import NotificationBanner, { type Notice } from "../components/NotificationBanner"

interface User {
    id: number
    name: string
    email: string
    role: "cashier"
    created_at: string
}

interface UserForm {
    name: string
    email: string
    password: string
    password_confirmation: string
}

interface ResetForm {
    password: string
    password_confirmation: string
}

interface UserPayload {
    name: string
    email: string
    role?: "cashier"
    password?: string
    password_confirmation?: string
}

interface ApiErrorResponse {
    response?: {
        data?: {
            message?: string
            errors?: Record<string, string[]>
        }
    }
}

const emptyForm: UserForm = {
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
}

const emptyResetForm: ResetForm = {
    password: "",
    password_confirmation: "",
}

function AkunKasir() {

    const { isAdmin } = useAuth()

    const [users, setUsers]       = useState<User[]>([])
    const [loading, setLoading]   = useState(true)
    const [saving, setSaving]     = useState(false)
    const [deleting, setDeleting] = useState<number | null>(null)

    const [search, setSearch] = useState("")

    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<number | null>(null)
    const [form, setForm] = useState<UserForm>(emptyForm)
    const [formError, setFormError] = useState("")

    const [showReset, setShowReset] = useState(false)
    const [resetTarget, setResetTarget] = useState<User | null>(null)
    const [resetForm, setResetForm] = useState<ResetForm>(emptyResetForm)
    const [resetError, setResetError] = useState("")
    const [resetSaving, setResetSaving] = useState(false)
    const [showResetPw, setShowResetPw] = useState(false)

    const [showPassword, setShowPassword]   = useState(false)
    const [notice, setNotice]               = useState<Notice | null>(null)

    // Ambil user yang sedang login biar tidak bisa hapus diri sendiri
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}")

    const fetchUsers = () => {
        setLoading(true)
        api.get("/users", {
            params: {
                per_page: 100,
            },
        })
            .then(res => setUsers(res.data.data.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        if (!isAdmin) {
            window.location.href = "/transaksi"
            return
        }

        fetchUsers()
    }, [isAdmin])

    const displayed = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    )

    const cashierCount = users.length

    // Form handlers
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value })
        setFormError("")
    }

    const handleResetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setResetForm({ ...resetForm, [e.target.name]: e.target.value })
        setResetError("")
    }

    const openAddForm = () => {
        setForm(emptyForm)
        setEditId(null)
        setFormError("")
        setShowPassword(false)
        setShowForm(true)
    }

    const openEditForm = (user: User) => {
        setForm({
            name: user.name,
            email: user.email,
            password: "",
            password_confirmation: "",
        })
        setEditId(user.id)
        setFormError("")
        setShowPassword(false)
        setShowForm(true)
    }

    const handleSubmit = async () => {
        if (!form.name || !form.email) {
            setFormError("Nama dan email wajib diisi.")
            return
        }

        if (!editId && !form.password) {
            setFormError("Password wajib diisi untuk akun baru.")
            return
        }

        if (form.password && form.password !== form.password_confirmation) {
            setFormError("Konfirmasi password tidak cocok.")
            return
        }

        if (form.password && form.password.length < 8) {
            setFormError("Password minimal 8 karakter.")
            return
        }

        setSaving(true)
        try {
            const payload: UserPayload = {
                name:  form.name,
                email: form.email,
            }

            if (editId === null) {
                payload.role = "cashier"
            }

            if (!editId || form.password) {
                payload.password = form.password
                payload.password_confirmation = form.password_confirmation
            }

            if (editId !== null) {
                await api.patch(`/users/${editId}`, payload)
            } else {
                await api.post("/users", payload)
            }

            setShowForm(false)
            setEditId(null)
            setForm(emptyForm)
            setNotice({
                type:    "success",
                message: editId ? "Akun kasir berhasil diperbarui." : "Akun kasir berhasil ditambahkan.",
            })
            fetchUsers()
        } catch (err: unknown) {
            const apiError = err as ApiErrorResponse
            const errors = apiError.response?.data?.errors
            if (errors) {
                const first = Object.values(errors)[0]
                setFormError(first[0])
            } else {
                setFormError(apiError.response?.data?.message || "Gagal menyimpan akun.")
            }
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (user: User) => {
        if (user.id === currentUser.id) {
            setNotice({ type: "warning", message: "Kamu tidak bisa menghapus akunmu sendiri." })
            return
        }
        if (!confirm(`Yakin ingin menghapus akun kasir "${user.name}"? Akun ini akan langsung logout.`)) return

        setDeleting(user.id)
        try {
            await api.delete(`/users/${user.id}`)
            setNotice({ type: "success", message: `Akun kasir "${user.name}" berhasil dihapus.` })
            fetchUsers()
        } catch (err: unknown) {
            const apiError = err as ApiErrorResponse
            setNotice({ type: "error", message: apiError.response?.data?.message || "Gagal menghapus akun." })
        } finally {
            setDeleting(null)
        }
    }

    const openResetPassword = (user: User) => {
        setResetTarget(user)
        setResetForm(emptyResetForm)
        setResetError("")
        setShowResetPw(false)
        setShowReset(true)
    }

    const handleResetPassword = async () => {
        if (!resetForm.password) {
            setResetError("Password baru wajib diisi.")
            return
        }
        if (resetForm.password.length < 8) {
            setResetError("Password minimal 8 karakter.")
            return
        }
        if (resetForm.password !== resetForm.password_confirmation) {
            setResetError("Konfirmasi password tidak cocok.")
            return
        }

        setResetSaving(true)
        try {
            await api.patch(`/users/${resetTarget?.id}/reset-password`, resetForm)
            const targetName = resetTarget?.name
            setShowReset(false)
            setResetTarget(null)
            setNotice({ type: "success", message: `Password "${targetName}" berhasil direset.` })
        } catch (err: unknown) {
            const apiError = err as ApiErrorResponse
            setResetError(apiError.response?.data?.message || "Gagal reset password.")
        } finally {
            setResetSaving(false)
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        })
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <h2 className="text-2xl md:text-3xl font-bold">Kelola Akun Kasir</h2>
                <button
                    onClick={openAddForm}
                    className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 active:scale-95 transition cursor-pointer"
                >
                    + Tambah Kasir
                </button>
            </div>

            <NotificationBanner
                notice={notice}
                onClose={() => setNotice(null)}
                className="mb-6"
            />

            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 mb-1">Total Kasir</p>
                    <p className="text-xl md:text-2xl font-semibold text-gray-800">{cashierCount} akun</p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
                <input
                    type="text"
                    placeholder="Cari nama / email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border p-2 rounded-md text-sm flex-1 min-w-full sm:min-w-[180px] outline-none focus:border-blue-400"
                />
            </div>

            {/* List akun */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                    <h3 className="text-lg md:text-xl font-bold">Daftar Kasir</h3>
                    <p className="bg-slate-100 px-4 py-2 rounded-lg text-sm">
                        Total: <span className="font-bold">{displayed.length}</span> akun
                    </p>
                </div>

                {loading ? (
                    <p className="text-sm text-gray-400 text-center py-12">Memuat akun kasir...</p>
                ) : displayed.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-12">Tidak ada akun kasir ditemukan.</p>
                ) : (
                    <div className="space-y-3">
                        {displayed.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between gap-3 py-4 hover:bg-gray-50 px-2 rounded-lg transition"
                            >
                                {/* Avatar + info */}
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                                        <span className="font-bold text-sm text-blue-600">
                                            {user.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-gray-800">{user.name}</p>
                                            {user.id === currentUser.id && (
                                                <span className="ml-2 text-xs text-green-600">(Kamu)</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 truncate">
                                            {user.email} · Dibuat {formatDate(user.created_at)}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1.5 flex-shrink-0">
                                    <button
                                        onClick={() => openEditForm(user)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 md:px-3 md:py-1.5 rounded-md text-xs md:text-sm cursor-pointer transition"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => openResetPassword(user)}
                                        className="bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 md:px-3 md:py-1.5 rounded-md text-xs md:text-sm cursor-pointer transition"
                                    >
                                        <span className="sm:hidden">Reset</span>
                                        <span className="hidden sm:inline">Reset Password</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user)}
                                        disabled={deleting === user.id || user.id === currentUser.id}
                                        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white px-2 py-1 md:px-3 md:py-1.5 rounded-md text-xs md:text-sm cursor-pointer transition"
                                    >
                                        Hapus
                                    </button>
                                </div>

                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal fix */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-5 md:p-6 rounded-xl w-[calc(100vw-2rem)] max-w-[420px] shadow-lg relative">
                        <button
                            onClick={() => setShowForm(false)}
                            className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl cursor-pointer"
                        >
                            ×
                        </button>

                        <h3 className="text-xl font-bold mb-4">
                            {editId ? "Edit Kasir" : "Tambah Kasir"}
                        </h3>

                        <div className="grid gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Nama</label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Nama lengkap"
                                    value={form.name}
                                    onChange={handleChange}
                                    className="w-full border p-2 rounded-md text-sm outline-none focus:border-blue-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="email@warung.com"
                                    value={form.email}
                                    onChange={handleChange}
                                    className="w-full border p-2 rounded-md text-sm outline-none focus:border-blue-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">
                                    Password {editId && <span className="text-gray-400">(kosongkan jika tidak ingin mengubah)</span>}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder="Minimal 8 karakter"
                                        value={form.password}
                                        onChange={handleChange}
                                        className="w-full border p-2 rounded-md text-sm outline-none focus:border-blue-400 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer text-xs"
                                    >
                                        {showPassword ? "Sembunyikan" : "Tampilkan"}
                                    </button>
                                </div>
                            </div>
                            {form.password && (
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Konfirmasi Password</label>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password_confirmation"
                                        placeholder="Ulangi password"
                                        value={form.password_confirmation}
                                        onChange={handleChange}
                                        className="w-full border p-2 rounded-md text-sm outline-none focus:border-blue-400"
                                    />
                                </div>
                            )}

                            {formError && (
                                <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                                    {formError}
                                </p>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-2 rounded-md text-sm transition cursor-pointer mt-1"
                            >
                                {saving ? "Menyimpan..." : "Simpan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Reset Password */}
            {showReset && resetTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-5 md:p-6 rounded-xl w-[calc(100vw-2rem)] max-w-96 shadow-lg relative">
                        <button
                            onClick={() => setShowReset(false)}
                            className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl cursor-pointer"
                        >
                            ×
                        </button>

                        <h3 className="text-xl font-bold mb-1">Reset Password</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Akun: <span className="font-semibold text-gray-700">{resetTarget.name}</span>
                            <br />
                            <span className="text-xs text-amber-600">Setelah direset, akun ini akan otomatis logout dari semua sesi.</span>
                        </p>

                        <div className="grid gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Password Baru</label>
                                <div className="relative">
                                    <input
                                        type={showResetPw ? "text" : "password"}
                                        name="password"
                                        placeholder="Minimal 8 karakter"
                                        value={resetForm.password}
                                        onChange={handleResetChange}
                                        className="w-full border p-2 rounded-md text-sm outline-none focus:border-blue-400 pr-24"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowResetPw(!showResetPw)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer text-xs"
                                    >
                                        {showResetPw ? "Sembunyikan" : "Tampilkan"}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Konfirmasi Password Baru</label>
                                <input
                                    type={showResetPw ? "text" : "password"}
                                    name="password_confirmation"
                                    placeholder="Ulangi password baru"
                                    value={resetForm.password_confirmation}
                                    onChange={handleResetChange}
                                    className="w-full border p-2 rounded-md text-sm outline-none focus:border-blue-400"
                                />
                            </div>

                            {resetError && (
                                <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                                    {resetError}
                                </p>
                            )}

                            <div className="flex gap-3 mt-1">
                                <button
                                    onClick={() => setShowReset(false)}
                                    className="flex-1 border border-gray-300 py-2 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer text-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleResetPassword}
                                    disabled={resetSaving}
                                    className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white py-2 rounded-lg text-sm font-semibold cursor-pointer transition"
                                >
                                    {resetSaving ? "Memproses..." : "Reset Password"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

export default AkunKasir
