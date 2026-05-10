import { useState } from "react"
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft } from "lucide-react"
import api from "../lib/axios"

type Step = "form" | "otp"

function Register() {
    const [step, setStep]       = useState<Step>("form")
    const [loading, setLoading] = useState(false)
    const [error, setError]     = useState("")

    const [form, setForm] = useState({
        name:                  "",
        email:                 "",
        password:              "",
        password_confirmation: "",
    })

    const [otp, setOtp]               = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm]   = useState(false)
    const [countdown, setCountdown]       = useState(0)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value })
        setError("")
    }

    // Mulai countdown resend OTP
    const startCountdown = () => {
        setCountdown(60)
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { clearInterval(interval); return 0 }
                return prev - 1
            })
        }, 1000)
    }

    // Step 1 — Kirim OTP
    const handleSendOtp = async () => {
        if (!form.name || !form.email || !form.password || !form.password_confirmation) {
            setError("Semua field wajib diisi.")
            return
        }
        if (form.password.length < 8) {
            setError("Password minimal 8 karakter.")
            return
        }
        if (form.password !== form.password_confirmation) {
            setError("Konfirmasi password tidak cocok.")
            return
        }

        setLoading(true)
        try {
            await api.post("/register/send-otp", { email: form.email })
            setStep("otp")
            startCountdown()
            setError("")
        } catch (err: any) {
            const errors = err.response?.data?.errors
            if (errors) {
                const first = Object.values(errors)[0] as string[]
                setError(first[0])
            } else {
                setError(err.response?.data?.message || "Gagal mengirim OTP.")
            }
        } finally {
            setLoading(false)
        }
    }

    // Resend OTP
    const handleResendOtp = async () => {
        if (countdown > 0) return
        setLoading(true)
        setError("")
        try {
            await api.post("/register/send-otp", { email: form.email })
            startCountdown()
        } catch (err: any) {
            setError(err.response?.data?.message || "Gagal mengirim ulang OTP.")
        } finally {
            setLoading(false)
        }
    }

    // Step 2 — Register
    const handleRegister = async () => {
        if (otp.length !== 6) {
            setError("Masukkan kode OTP 6 digit.")
            return
        }

        setLoading(true)
        try {
            await api.post("/register", {
                name:                  form.name,
                email:                 form.email,
                password:              form.password,
                password_confirmation: form.password_confirmation,
                otp,
            })
            // Redirect ke login setelah berhasil
            window.location.href = "/login?registered=1"
        } catch (err: any) {
            setError(err.response?.data?.message || "Gagal membuat akun.")
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            step === "form" ? handleSendOtp() : handleRegister()
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-6 sm:px-6">
            <div className="w-full max-w-4xl bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row md:min-h-[520px]">

                {/* Sisi Kiri — Branding */}
                <div className="w-full md:w-1/2 bg-slate-800 flex flex-col items-center justify-center p-6 sm:p-8 md:p-12 gap-5 md:gap-6">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">MK</span>
                    </div>
                    <div className="text-center">
                        <h1 className="text-white text-xl sm:text-2xl font-bold">MaKasir</h1>
                        <p className="text-slate-400 text-sm mt-2">Buat akun admin baru</p>
                    </div>
                    <div className="w-full border-t border-white/10 pt-5 md:pt-6 space-y-3">
                        {[
                            "Verifikasi email dengan OTP",
                            "Akun langsung aktif sebagai admin",
                            "Kelola kasir dan stok setelah login",
                        ].map((text) => (
                            <div key={text} className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                                <p className="text-slate-400 text-sm">{text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sisi Kanan — Form */}
                <div className="w-full md:w-1/2 flex flex-col justify-center px-5 py-7 sm:px-8 sm:py-9 md:px-12 md:py-10">

                    {/* Step: Form Data Diri */}
                    {step === "form" && (
                        <>
                            <div className="mb-6 md:mb-8">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Daftar Akun</h2>
                                <p className="text-sm text-gray-400 mt-1">Isi data diri kamu untuk membuat akun admin</p>
                            </div>

                            <div className="space-y-4">
                                {/* Nama */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-500">Nama Lengkap</label>
                                    <div className="relative">
                                        <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Masukkan nama lengkap"
                                            className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-3 sm:py-2.5 text-sm text-gray-800 bg-gray-50 focus:bg-white focus:border-blue-400 outline-none transition"
                                        />
                                    </div>
                                </div>

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
                                            placeholder="Masukkan email aktif"
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
                                            placeholder="Minimal 8 karakter"
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

                                {/* Konfirmasi Password */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-500">Konfirmasi Password</label>
                                    <div className="relative">
                                        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type={showConfirm ? "text" : "password"}
                                            name="password_confirmation"
                                            value={form.password_confirmation}
                                            onChange={handleChange}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Ulangi password"
                                            className="w-full border border-gray-200 rounded-lg pl-9 pr-10 py-3 sm:py-2.5 text-sm text-gray-800 bg-gray-50 focus:bg-white focus:border-blue-400 outline-none transition"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                        >
                                            {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                                        {error}
                                    </p>
                                )}

                                <button
                                    onClick={handleSendOtp}
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 sm:py-2.5 rounded-lg font-semibold text-sm cursor-pointer transition active:scale-95 mt-2"
                                >
                                    {loading ? "Mengirim OTP..." : "Kirim Kode OTP"}
                                </button>
                            </div>

                            <p className="text-xs text-gray-400 text-center mt-6">
                                Sudah punya akun?{" "}
                                <a href="/login" className="text-blue-600 hover:underline font-medium">
                                    Masuk di sini
                                </a>
                            </p>
                        </>
                    )}

                    {/* Step: Verifikasi OTP */}
                    {step === "otp" && (
                        <>
                            <button
                                onClick={() => { setStep("form"); setOtp(""); setError("") }}
                                className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-sm mb-5 md:mb-6 cursor-pointer transition"
                            >
                                <ArrowLeft size={15} />
                                Kembali
                            </button>

                            <div className="mb-6 md:mb-8">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Verifikasi OTP</h2>
                                <p className="text-sm text-gray-400 mt-1">
                                    Kode OTP telah dikirim ke
                                </p>
                                <p className="text-sm font-semibold text-gray-700 mt-0.5 break-all">{form.email}</p>
                            </div>

                            <div className="space-y-4">
                                {/* Input OTP */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-500">Kode OTP</label>
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, "").slice(0, 6)
                                            setOtp(val)
                                            setError("")
                                        }}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Masukkan 6 digit kode"
                                        maxLength={6}
                                        className="w-full border border-gray-200 rounded-lg px-3 sm:px-4 py-3 text-center text-xl sm:text-2xl font-bold font-mono tracking-[0.25em] sm:tracking-[0.5em] text-gray-800 bg-gray-50 focus:bg-white focus:border-blue-400 outline-none transition"
                                    />
                                    <p className="text-xs text-gray-400 text-center mt-1">
                                        Berlaku selama 10 menit
                                    </p>
                                </div>

                                {error && (
                                    <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                                        {error}
                                    </p>
                                )}

                                <button
                                    onClick={handleRegister}
                                    disabled={loading || otp.length !== 6}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 sm:py-2.5 rounded-lg font-semibold text-sm cursor-pointer transition active:scale-95"
                                >
                                    {loading ? "Memproses..." : "Buat Akun"}
                                </button>

                                {/* Resend OTP */}
                                <div className="text-center">
                                    {countdown > 0 ? (
                                        <p className="text-xs text-gray-400">
                                            Kirim ulang OTP dalam{" "}
                                            <span className="font-semibold text-gray-600">{countdown}s</span>
                                        </p>
                                    ) : (
                                        <button
                                            onClick={handleResendOtp}
                                            disabled={loading}
                                            className="text-xs text-blue-600 hover:underline cursor-pointer disabled:text-gray-400"
                                        >
                                            Kirim ulang kode OTP
                                        </button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Register
