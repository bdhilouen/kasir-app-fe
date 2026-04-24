import React, { useState, useEffect } from "react"
import api from "../lib/axios"
import { useAuth } from "../hooks/useAuth"

interface User {
    id: number
    name: string
    email: string
    role: "admin" | "cashier"
    created_at: string
}

interface UserForm {
    name: string
    email: string
    password: string
    password_confirmation: string
    role: "admin" | "cashier"
}

interface ResetForm {
    password: string
    password_confirmation: string
}

const emptyForm: UserForm = {
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    role: "cashier",
}

const emptyResetForm: ResetForm = {
    password: "",
    password_confirmation: "",
}

function AkunKasir() {

    const { isAdmin } = useAuth()

    // Redirect kalau bukan admin
    if (!isAdmin) {
        window.location.href = "/transaksi"
        return null
    }

    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<number | null>(null)

    const [search, setSearch] = useState("")
    const [filterRole, setFilterRole] = useState<"" | "admin" | "cashier">("")

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

    const [showPassword, setShowPassword] = useState(false)

    // Ambil user yang sedang login biar tidak bisa hapus diri sendiri
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}")

    const fetchUsers = () => {
        setLoading(true)
        api.get("/users", {
            params: {
                per_page: 100,
                ...(filterRole ? { role: filterRole } : {}),
            },
        })
            .then(res => setUsers(res.data.data.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        fetchUsers()
    }, [filterRole])

    const displayed = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    )

    const adminCount = users.filter(u => u.role === "admin").length
    const cashierCount = users.filter(u => u.role === "cashier").length

    // Form handlers
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value as any })
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
            role: user.role,
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
            const payload: any = {
                name: form.name,
                email: form.email,
                role: form.role,
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
            fetchUsers()
        } catch (err: any) {
            const errors = err.response?.data?.errors
            if (errors) {
                const first = Object.values(errors)[0] as string[]
                setFormError(first[0])
            } else {
                setFormError(err.response?.data?.message || "Gagal menyimpan akun.")
            }
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (user: User) => {
        if (user.id === currentUser.id) {
            alert("Kamu tidak bisa menghapus akunmu sendiri.")
            return
        }
        if (!confirm(`Yakin ingin menghapus akun "${user.name}"? Akun ini akan langsung logout.`)) return

        setDeleting(user.id)
        try {
            await api.delete(`/users/${user.id}`)
            fetchUsers()
        } catch (err: any) {
            alert(err.response?.data?.message || "Gagal menghapus akun.")
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
            setShowReset(false)
            setResetTarget(null)
            alert(`Password "${resetTarget?.name}" berhasil direset.`)
        } catch (err: any) {
            setResetError(err.response?.data?.message || "Gagal reset password.")
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

    const RoleBadge = ({ role }: { role: "admin" | "cashier" }) => (
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${role === "admin"
            ? "bg-purple-50 text-purple-700"
            : "bg-blue-50 text-blue-600"
            }`}>
            {role === "admin" ? "Admin" : "Kasir"}
        </span>
    )

    return (
        <div className="px-3 md:px-0">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
                <h2 className="text-2xl md:text-3xl font-bold">Kelola Akun</h2>
                <button
                    onClick={openAddForm}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 active:scale-95 transition cursor-pointer w-full md:w-auto"
                >
                    + Tambah Akun
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border p-4">
                    <p className="text-xs text-gray-500">Total Admin</p>
                    <p className="text-xl md:text-2xl font-semibold">{adminCount} akun</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-4">
                    <p className="text-xs text-gray-500">Total Kasir</p>
                    <p className="text-xl md:text-2xl font-semibold">{cashierCount} akun</p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <input
                    type="text"
                    placeholder="Cari nama / email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border p-2 rounded-md text-sm w-full outline-none focus:border-blue-400"
                />
                <div className="flex flex-wrap gap-2">
                    {(["", "admin", "cashier"] as const).map(role => (
                        <button
                            key={role}
                            onClick={() => setFilterRole(role)}
                            className={`px-3 py-2 rounded-md text-sm border ${filterRole === role
                                ? "bg-gray-800 text-white"
                                : "bg-white text-gray-600"
                                }`}
                        >
                            {role === "" ? "Semua" : role === "admin" ? "Admin" : "Kasir"}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-4">
                    <h3 className="text-lg md:text-xl font-bold">Daftar Akun</h3>
                    <p className="bg-slate-100 px-3 py-1 rounded text-xs md:text-sm">
                        Total: <span className="font-bold">{displayed.length}</span>
                    </p>
                </div>

                {loading ? (
                    <p className="text-sm text-gray-400 text-center py-10">Memuat...</p>
                ) : displayed.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-10">Kosong.</p>
                ) : (
                    <div className="space-y-3">
                        {displayed.map((user) => (
                            <div
                                key={user.id}
                                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border p-3 rounded-lg"
                            >

                                {/* Info */}
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm md:text-base">
                                            {user.name}
                                            {user.id === currentUser.id && (
                                                <span className="ml-2 text-xs text-green-600">(Kamu)</span>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>

                                {/* Role */}
                                <div className="text-xs">
                                    <RoleBadge role={user.role} />
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => openEditForm(user)}
                                        className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => openResetPassword(user)}
                                        className="bg-amber-500 text-white px-3 py-1.5 rounded text-xs"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user)}
                                        disabled={user.id === currentUser.id}
                                        className="bg-red-500 text-white px-3 py-1.5 rounded text-xs disabled:bg-gray-300"
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-3">
                    <div className="bg-white p-5 rounded-xl w-full max-w-md shadow-lg relative">
                        {/* isi sama aja */}
                    </div>
                </div>
            )}

            {showReset && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-3">
                    <div className="bg-white p-5 rounded-xl w-full max-w-md shadow-lg relative">
                        {/* isi sama aja */}
                    </div>
                </div>
            )}

        </div>
    )
}

export default AkunKasir