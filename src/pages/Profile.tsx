import { useState, useEffect } from "react"
import { ArrowLeft, User, Lock, Eye, EyeOff, LogOut } from "lucide-react"
import api from "../lib/axios"

interface UserProfile {
    id: number
    name: string
    email: string
    role: "admin" | "cashier"
}

function Profile() {
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)

    const [form, setForm] = useState({
        name: "",
        email: "",
    })

    const [passwordForm, setPasswordForm] = useState({
        current_password: "",
        password: "",
        password_confirmation: "",
    })

    const [showPass, setShowPass] = useState({
        current_password: false,
        password: false,
        password_confirmation: false,
    })

    const [activeTab, setActiveTab] = useState<"profil" | "password">("profil")
    const [saving, setSaving] = useState(false)
    const [profileSuccess, setProfileSuccess] = useState("")
    const [profileError, setProfileError] = useState("")
    const [passwordSuccess, setPasswordSuccess] = useState("")
    const [passwordError, setPasswordError] = useState("")
    const [showLogoutModal, setShowLogoutModal] = useState(false)

    // Fetch profil dari API
    useEffect(() => {
        api.get("/auth/me")
            .then(res => {
                const user: UserProfile = res.data.data
                setProfile(user)
                setForm({ name: user.name, email: user.email })
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [])

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value })
        setProfileError("")
        setProfileSuccess("")
    }

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value })
        setPasswordError("")
        setPasswordSuccess("")
    }

    // Simpan perubahan nama & email
    const handleSaveProfile = async () => {
        if (!form.name || !form.email) {
            setProfileError("Nama dan email wajib diisi.")
            return
        }

        setSaving(true)
        try {
            await api.patch(`/users/${profile?.id}`, {
                name: form.name,
                email: form.email,
            })

            // Update localStorage supaya sidebar langsung terupdate
            const stored = JSON.parse(localStorage.getItem("user") || "{}")
            localStorage.setItem("user", JSON.stringify({
                ...stored,
                name: form.name,
                email: form.email,
            }))

            setProfile(prev => prev ? { ...prev, name: form.name, email: form.email } : prev)
            setProfileSuccess("Profil berhasil diperbarui.")
            setTimeout(() => setProfileSuccess(""), 3000)
        } catch (err: any) {
            const errors = err.response?.data?.errors
            if (errors) {
                const first = Object.values(errors)[0] as string[]
                setProfileError(first[0])
            } else {
                setProfileError(err.response?.data?.message || "Gagal menyimpan profil.")
            }
        } finally {
            setSaving(false)
        }
    }

    // Ganti password sendiri
    const handleSavePassword = async () => {
        if (!passwordForm.current_password || !passwordForm.password || !passwordForm.password_confirmation) {
            setPasswordError("Semua field wajib diisi.")
            return
        }
        if (passwordForm.password.length < 8) {
            setPasswordError("Password baru minimal 8 karakter.")
            return
        }
        if (passwordForm.password !== passwordForm.password_confirmation) {
            setPasswordError("Konfirmasi password tidak cocok.")
            return
        }

        setSaving(true)
        try {
            await api.patch("/users/change-password", passwordForm)
            setPasswordForm({
                current_password: "",
                password: "",
                password_confirmation: "",
            })
            setPasswordSuccess("Password berhasil diubah.")
            setTimeout(() => setPasswordSuccess(""), 3000)
        } catch (err: any) {
            const errors = err.response?.data?.errors
            if (errors) {
                const first = Object.values(errors)[0] as string[]
                setPasswordError(first[0])
            } else {
                setPasswordError(err.response?.data?.message || "Gagal mengubah password.")
            }
        } finally {
            setSaving(false)
        }
    }

    const handleLogout = async () => {
        try {
            await api.post("/auth/logout")
        } catch (_) {
            // Tetap logout meski request gagal
        } finally {
            localStorage.removeItem("token")
            localStorage.removeItem("user")
            window.location.href = "/login"
        }
    }

    const passwordFields: {
        label: string
        name: keyof typeof passwordForm
        placeholder: string
    }[] = [
            { label: "Password Lama", name: "current_password", placeholder: "Masukkan password lama" },
            { label: "Password Baru", name: "password", placeholder: "Minimal 8 karakter" },
            { label: "Konfirmasi Password", name: "password_confirmation", placeholder: "Ulangi password baru" },
        ]

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-gray-400 text-sm">Memuat profil...</p>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition cursor-pointer"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <p className="text-xs text-gray-400 leading-none">Pengaturan</p>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 leading-tight">Kelola Akun</h2>
                    </div>
                </div>
                <button
                    onClick={() => setShowLogoutModal(true)}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium cursor-pointer transition active:scale-95"
                >
                    <LogOut size={15} />
                    <span className="hidden xs:inline">Logout</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 min-h-0">

                {/* Kartu Kiri */}
                <div className="md:col-span-4 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center p-5 md:p-8 gap-4">

                    {/* Avatar */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                            background: profile?.role === "admin"
                                ? "#f3e8ff"
                                : "#eff6ff"
                        }}
                    >
                        <span className="font-bold text-2xl sm:text-3xl"
                            style={{ color: profile?.role === "admin" ? "#9333ea" : "#2563eb" }}
                        >
                            {profile?.name.charAt(0).toUpperCase()}
                        </span>
                    </div>

                    {/* Info singkat */}
                    <div className="text-center">
                        <p className="font-semibold text-gray-800 text-base">{profile?.name}</p>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium mt-1 inline-block ${profile?.role === "admin"
                                ? "bg-purple-50 text-purple-700"
                                : "bg-blue-50 text-blue-600"
                            }`}>
                            {profile?.role === "admin" ? "Admin" : "Kasir"}
                        </span>
                    </div>

                    <div className="w-full border-t border-gray-100 pt-4 space-y-2 text-sm">
                        <div className="flex justify-between text-gray-500">
                            <span>Email</span>
                            <span className="text-gray-700 font-medium truncate ml-2 max-w-[60%] text-right">{profile?.email}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                            <span>Role</span>
                            <span className="text-gray-700 font-medium capitalize">{profile?.role}</span>
                        </div>
                    </div>

                    {/* Tab navigasi — horizontal on mobile, vertical on lg */}
                    <div className="w-full mt-2 lg:mt-auto pt-4 border-t border-gray-100 flex flex-row lg:flex-col gap-1">
                        <button
                            onClick={() => setActiveTab("profil")}
                            className={`flex-1 lg:flex-none flex items-center justify-center lg:justify-start gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition ${activeTab === "profil"
                                    ? "bg-blue-50 text-blue-600 font-medium"
                                    : "text-gray-500 hover:bg-gray-50"
                                }`}
                        >
                            <User size={15} />
                            <span>Edit Profil</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("password")}
                            className={`flex-1 lg:flex-none flex items-center justify-center lg:justify-start gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition ${activeTab === "password"
                                    ? "bg-blue-50 text-blue-600 font-medium"
                                    : "text-gray-500 hover:bg-gray-50"
                                }`}
                        >
                            <Lock size={15} />
                            <span>Ubah Password</span>
                        </button>
                    </div>
                </div>

                {/* Kartu Kanan */}
                <div className="md:col-span-8 bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-6 flex flex-col">

                    {/* Tab: Edit Profil */}
                    {activeTab === "profil" && (
                        <>
                            <h3 className="font-semibold text-gray-700 mb-1">Informasi Akun</h3>
                            <p className="text-xs text-gray-400 mb-5">Perubahan nama dan email akan langsung diterapkan.</p>

                            <div className="flex flex-col gap-4 w-full max-w-sm">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-gray-500 font-medium">Nama Lengkap</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleFormChange}
                                        placeholder="Masukkan nama lengkap"
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 transition bg-gray-50 focus:bg-white"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-gray-500 font-medium">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleFormChange}
                                        placeholder="Masukkan email"
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 transition bg-gray-50 focus:bg-white"
                                    />
                                </div>

                                {/* Role — read only */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-gray-500 font-medium">Role</label>
                                    <input
                                        type="text"
                                        value={profile?.role === "admin" ? "Admin" : "Kasir"}
                                        disabled
                                        className="border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-gray-400">Role tidak bisa diubah sendiri.</p>
                                </div>
                            </div>

                            {profileError && (
                                <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg mt-4 w-full max-w-sm">
                                    {profileError}
                                </p>
                            )}
                            {profileSuccess && (
                                <p className="text-xs text-green-600 bg-green-50 border border-green-100 px-3 py-2 rounded-lg mt-4 w-full max-w-sm">
                                    ✓ {profileSuccess}
                                </p>
                            )}

                            <div className="mt-6 flex flex-col sm:flex-row justify-start gap-3">
                                <button
                                    onClick={() => {
                                        setForm({ name: profile?.name ?? "", email: profile?.email ?? "" })
                                        setProfileError("")
                                        setProfileSuccess("")
                                    }}
                                    className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={saving}
                                    className="px-6 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer transition active:scale-95 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
                                >
                                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                                </button>
                            </div>
                        </>
                    )}

                    {/* Tab: Ubah Password */}
                    {activeTab === "password" && (
                        <>
                            <h3 className="font-semibold text-gray-700 mb-1">Ubah Password</h3>
                            <p className="text-xs text-gray-400 mb-6">
                                Setelah password diubah, sesi lain akan otomatis logout.
                                Password minimal 8 karakter.
                            </p>

                            <div className="flex flex-col gap-4 w-full max-w-sm">
                                {passwordFields.map((field) => (
                                    <div key={field.name} className="flex flex-col gap-1">
                                        <label className="text-xs text-gray-500 font-medium">{field.label}</label>
                                        <div className="relative">
                                            <input
                                                type={showPass[field.name] ? "text" : "password"}
                                                name={field.name}
                                                value={passwordForm[field.name]}
                                                onChange={handlePasswordChange}
                                                placeholder={field.placeholder}
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm text-gray-800 outline-none focus:border-blue-400 transition bg-gray-50 focus:bg-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowPass(prev => ({
                                                        ...prev,
                                                        [field.name]: !prev[field.name],
                                                    }))
                                                }
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                            >
                                                {showPass[field.name] ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {passwordError && (
                                    <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                                        {passwordError}
                                    </p>
                                )}
                                {passwordSuccess && (
                                    <p className="text-xs text-green-600 bg-green-50 border border-green-100 px-3 py-2 rounded-lg">
                                        ✓ {passwordSuccess}
                                    </p>
                                )}
                            </div>

                            <div className="mt-6">
                                <button
                                    onClick={handleSavePassword}
                                    disabled={saving}
                                    className="px-6 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer transition active:scale-95 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
                                >
                                    {saving ? "Menyimpan..." : "Simpan Password"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal Logout */}
            {showLogoutModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-5 md:p-6 w-[calc(100vw-2rem)] max-w-80 shadow-xl">
                        <div className="flex items-center justify-center w-12 h-12 bg-red-50 rounded-full mx-auto mb-4">
                            <LogOut size={20} className="text-red-500" />
                        </div>
                        <h3 className="text-center font-bold text-gray-800 text-lg mb-1">Logout</h3>
                        <p className="text-center text-sm text-gray-500 mb-6">
                            Kamu yakin ingin keluar dari akun ini?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                className="flex-1 border border-gray-200 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-semibold cursor-pointer transition active:scale-95"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Profile
