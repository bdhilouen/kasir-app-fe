import { useState } from "react"
import { Eye, EyeOff, Lock, Mail } from "lucide-react"
import api from "../lib/axios"

function Login() {
    const [form, setForm] = useState({ email: "", password: "" })
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const registerSuccess = new URLSearchParams(window.location.search).get("registered") === "1"

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value })
        setError("")
    }

    const handleLogin = async () => {
        if (!form.email || !form.password) {
            setError("Email dan password wajib diisi.")
            return
        }

        setLoading(true)

        try {
            const response = await api.post("/auth/login", {
                email: form.email,
                password: form.password,
            })

            const { token, user } = response.data.data

            // Simpan token dan info user ke localStorage
            localStorage.setItem("token", token)
            localStorage.setItem("user", JSON.stringify(user))

            // Redirect berdasarkan role
            if (user.role === "admin") {
                window.location.href = "/Statistik"
            } else {
                window.location.href = "/Transaksi"
            }

        } catch (err: any) {
            const message = err.response?.data?.message

            if (err.response?.status === 401) {
                setError("Email atau password salah.")
            } else if (err.response?.status === 422) {
                // Validasi error dari Laravel
                const errors = err.response?.data?.errors
                if (errors) {
                    const firstError = Object.values(errors)[0] as string[]
                    setError(firstError[0])
                } else {
                    setError(message || "Terjadi kesalahan validasi.")
                }
            } else if (!err.response) {
                setError("Tidak dapat terhubung ke server. Cek koneksi kamu.")
            } else {
                setError(message || "Terjadi kesalahan. Coba lagi.")
            }
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleLogin()
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-6 sm:px-6">
            <div className="w-full max-w-4xl bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row md:min-h-[500px]">

                {/* Sisi Kiri — Branding */}
                <div className="w-full md:w-1/2 bg-slate-800 flex flex-col items-center justify-center p-6 sm:p-8 md:p-12 gap-5 md:gap-6">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">MK</span>
                    </div>
                    <div className="text-center">
                        <h1 className="text-white text-xl sm:text-2xl font-bold">MaKasir</h1>
                        <p className="text-slate-400 text-sm mt-2">Sistem Kasir & Manajemen Stok</p>
                    </div>
                    <div className="w-full border-t border-white/10 pt-5 md:pt-6 space-y-3">
                        {["Kelola stok barang dengan mudah", "Laporan penjualan harian", "Transaksi kasir cepat"].map((text) => (
                            <div key={text} className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                                <p className="text-slate-400 text-sm">{text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sisi Kanan — Form Login */}
                <div className="w-full md:w-1/2 flex flex-col justify-center px-5 py-7 sm:px-8 sm:py-9 md:px-12 md:py-10">
                    <div className="mb-6 md:mb-8">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Selamat Datang</h2>
                        <p className="text-sm text-gray-400 mt-1">Masuk ke akun kamu untuk melanjutkan</p>
                    </div>

                    {registerSuccess && (
                        <div className="mb-4 text-xs text-green-600 bg-green-50 border border-green-100 px-3 py-2 rounded-lg">
                            Akun berhasil dibuat! Silakan login dengan akun kamu.
                        </div>
                    )}

                    <div className="space-y-4">

                        {/* Email */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Email</label>
                            <div className="relative">
                                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Masukkan email"
                                    className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-3 sm:py-2.5 text-sm text-gray-800 bg-gray-50 focus:bg-white focus:border-blue-400 outline-none transition"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-gray-500">Password</label>
                            <div className="relative">
                                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Masukkan password"
                                    className="w-full border border-gray-200 rounded-lg pl-9 pr-10 py-3 sm:py-2.5 text-sm text-gray-800 bg-gray-50 focus:bg-white focus:border-blue-400 outline-none transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                                {error}
                            </p>
                        )}

                        {/* Tombol Login */}
                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 sm:py-2.5 rounded-lg font-semibold text-sm cursor-pointer transition active:scale-95 mt-2"
                        >
                            {loading ? "Masuk..." : "Masuk"}
                        </button>
                    </div>

                    <p className="text-xs text-gray-400 text-center mt-8">
                        Belum punya akun?{" "}
                        <a href="/register" className="text-blue-600 hover:underline font-medium">
                            Daftar sebagai admin
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Login
