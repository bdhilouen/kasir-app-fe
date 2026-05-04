import { useState, useEffect, useRef } from "react"
import Chart from "chart.js/auto"
import api from "../lib/axios"
import { useAuth } from "../hooks/useAuth"

interface ChartPoint {
    date: string
    revenue: number
    total_transactions: number
}

interface DailySummary {
    total_transactions: number
    total_revenue: number
    total_collected: number
    by_payment_method: {
        cash: number
        transfer: number
        qris: number
    }
}

interface TopProduct {
    product_name: string
    total_quantity: number
    total_revenue: number
}

interface Category {
    id: number
    name: string
}

const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID")

const pct = (n: number, base: number) => {
    if (base === 0) return "+0%"
    const val = Math.round(((n - base) / base) * 100)
    return (val >= 0 ? "+" : "") + val + "%"
}

const getLocalDate = (date: Date): string => {
    const offset = date.getTimezoneOffset()
    const local = new Date(date.getTime() - offset * 60 * 1000)
    return local.toISOString().split("T")[0]
}

const today = getLocalDate(new Date())
const sevenDaysAgo = getLocalDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))

function Statistik() {
    
    const { isAdmin } = useAuth()

    // Redirect kalau bukan admin
    if (!isAdmin) {
        window.location.href = "/transaksi"
        return null
    }

    const [fromDate, setFromDate] = useState(sevenDaysAgo)
    const [toDate, setToDate] = useState(today)
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
    const [categories, setCategories] = useState<Category[]>([])

    const [chartData, setChartData] = useState<ChartPoint[]>([])
    const [todaySummary, setTodaySummary] = useState<DailySummary | null>(null)
    const [yesterdaySummary, setYesterdaySummary] = useState<DailySummary | null>(null)
    const [topProducts, setTopProducts] = useState<TopProduct[]>([])

    const [loadingChart, setLoadingChart] = useState(false)
    const [loadingCards, setLoadingCards] = useState(true)

    const chartRef = useRef<HTMLCanvasElement>(null)
    const chartInstance = useRef<Chart | null>(null)

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    // Fetch kategori untuk dropdown filter
    useEffect(() => {
        api.get("/categories", { params: { all: true } })
            .then(res => setCategories(res.data.data))
            .catch(err => console.error(err))
    }, [])

    // Fetch kartu hari ini & kemarin
    useEffect(() => {
        setLoadingCards(true)
        Promise.all([
            api.get("/reports/daily", { params: { date: today } }),
            api.get("/reports/daily", { params: { date: yesterday } }),
        ])
            .then(([todayRes, yesterdayRes]) => {
                setTodaySummary(todayRes.data.data.summary)
                setYesterdaySummary(yesterdayRes.data.data.summary)
            })
            .catch(err => console.error(err))
            .finally(() => setLoadingCards(false))
    }, [])

    // Fetch chart + top products
    const fetchChartData = () => {
        setLoadingChart(true)
        Promise.all([
            api.get("/reports/chart", {
                params: {
                    start_date: fromDate,
                    end_date: toDate,
                    ...(selectedCategory ? { category_id: selectedCategory } : {}),
                },
            }),
            api.get("/reports/top-products", {
                params: {
                    start_date: fromDate,
                    end_date: toDate,
                    limit: 5,
                },
            }),
        ])
            .then(([chartRes, topRes]) => {
                setChartData(chartRes.data.data.chart)
                setTopProducts(topRes.data.data)
            })
            .catch(err => console.error(err))
            .finally(() => setLoadingChart(false))
    }

    // Fetch chart saat pertama kali load
    useEffect(() => {
        fetchChartData()
    }, [])

    // Kalkulasi summary dari chart data
    const totalRevenue = chartData.reduce((a, d) => a + d.revenue, 0)
    const totalTrx = chartData.reduce((a, d) => a + d.total_transactions, 0)
    const avgPerTrx = totalTrx > 0 ? Math.round(totalRevenue / totalTrx) : 0

    // Render chart
    useEffect(() => {
        if (!chartRef.current || chartData.length === 0) return

        if (chartInstance.current) {
            chartInstance.current.destroy()
        }

        chartInstance.current = new Chart(chartRef.current, {
            type: "line",
            data: {
                labels: chartData.map((d) => d.date.slice(5)),
                datasets: [
                    {
                        label: "Pendapatan",
                        data: chartData.map((d) => d.revenue),
                        borderColor: "#2563eb",
                        backgroundColor: "rgba(37,99,235,0.08)",
                        tension: 0.35,
                        pointRadius: 3,
                        pointBackgroundColor: "#2563eb",
                        fill: true,
                    },
                    {
                        label: "Transaksi (×50k)",
                        data: chartData.map((d) => d.total_transactions * 50000),
                        borderColor: "#f59e0b",
                        backgroundColor: "rgba(245,158,11,0.07)",
                        tension: 0.35,
                        pointRadius: 3,
                        pointBackgroundColor: "#f59e0b",
                        fill: true,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        grid: { color: "rgba(0,0,0,0.05)" },
                        ticks: { font: { size: 11 }, color: "#94a3b8" },
                    },
                    y: {
                        grid: { color: "rgba(0,0,0,0.05)" },
                        ticks: {
                            font: { size: 11 },
                            color: "#94a3b8",
                            callback: (v) => "Rp " + (Number(v) / 1000).toFixed(0) + "k",
                        },
                    },
                },
            },
        })

        return () => { chartInstance.current?.destroy() }
    }, [chartData])

    const Badge = ({ value, base }: { value: number; base: number }) => {
        const text = pct(value, base)
        const isNeg = value < base
        return (
            <span className={`inline-block text-xs px-2 py-0.5 rounded mt-1 font-medium ${isNeg ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                {text}
            </span>
        )
    }

    useEffect(() => {
        // Lihat apa yang dikirim ke API
        console.log("Fetching chart:", { fromDate, toDate, selectedCategory })

        // Lihat raw response
        api.get("/reports/chart", {
            params: { start_date: fromDate, end_date: toDate }
        }).then(res => console.log("Chart response:", res.data))

        api.get("/reports/daily", {
            params: { date: today }
        }).then(res => console.log("Daily response:", res.data))
    }, [])

    return (
        <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Statistik</h2>

            {/* Kartu hari ini */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 mb-1">Pendapatan Hari Ini</p>
                    <p className="text-xl md:text-2xl font-semibold text-gray-800">
                        {loadingCards ? "—" : fmt(todaySummary?.total_revenue ?? 0)}
                    </p>
                    {!loadingCards && todaySummary && yesterdaySummary && (
                        <Badge value={todaySummary.total_revenue} base={yesterdaySummary.total_revenue} />
                    )}
                    <p className="text-xs text-gray-400 mt-1">dibanding kemarin</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 mb-1">Total Transaksi Hari Ini</p>
                    <p className="text-xl md:text-2xl font-semibold text-gray-800">
                        {loadingCards ? "—" : `${todaySummary?.total_transactions ?? 0} transaksi`}
                    </p>
                    {!loadingCards && todaySummary && yesterdaySummary && (
                        <Badge value={todaySummary.total_transactions} base={yesterdaySummary.total_transactions} />
                    )}
                    <p className="text-xs text-gray-400 mt-1">dibanding kemarin</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 mb-1">Pendapatan per Metode</p>
                    {loadingCards ? (
                        <p className="text-2xl font-semibold text-gray-800">—</p>
                    ) : (
                        <div className="mt-1 space-y-1">
                            {(["cash", "transfer", "qris"] as const).map(method => (
                                <div key={method} className="flex justify-between text-sm">
                                    <span className="text-gray-500 uppercase text-xs">{method}</span>
                                    <span className="font-medium text-gray-700">
                                        {fmt(todaySummary?.by_payment_method[method] ?? 0)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Filter tanggal + kategori */}
            <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Dari Tanggal</label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 outline-none focus:border-gray-400"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Sampai Tanggal</label>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 outline-none focus:border-gray-400"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Kategori</label>
                    <select
                        value={selectedCategory ?? ""}
                        onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
                        className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 outline-none focus:border-gray-400"
                    >
                        <option value="">Semua Kategori</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={fetchChartData}
                    disabled={loadingChart}
                    className="self-end bg-gray-800 text-white px-5 py-2 rounded-md text-sm hover:bg-gray-900 active:scale-95 transition cursor-pointer disabled:bg-gray-400"
                >
                    {loadingChart ? "Memuat..." : "Terapkan"}
                </button>
            </div>

            {/* Kartu rentang */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 mb-1">Total Pendapatan</p>
                    <p className="text-xl font-semibold text-gray-800">
                        {loadingChart ? "—" : fmt(totalRevenue)}
                    </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 mb-1">Total Transaksi</p>
                    <p className="text-xl font-semibold text-gray-800">
                        {loadingChart ? "—" : `${totalTrx} transaksi`}
                    </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 mb-1">Rata-rata per Transaksi</p>
                    <p className="text-xl font-semibold text-gray-800">
                        {loadingChart ? "—" : fmt(avgPerTrx)}
                    </p>
                </div>
            </div>

            {/* Grafik */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                    <h3 className="text-base font-semibold text-gray-800">Grafik Pendapatan</h3>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                            Pendapatan
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                            Transaksi
                        </span>
                    </div>
                </div>
                <div className="relative w-full h-64 md:h-60">
                    {loadingChart ? (
                        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                            Memuat grafik...
                        </div>
                    ) : chartData.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                            Tidak ada data untuk rentang ini.
                        </div>
                    ) : (
                        <canvas ref={chartRef}></canvas>
                    )}
                </div>
            </div>

            {/* Top 5 Produk Terlaris */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
                <h3 className="text-base font-semibold text-gray-800 mb-4">
                    Top 5 Produk Terlaris
                </h3>
                {loadingChart ? (
                    <p className="text-sm text-gray-400">Memuat...</p>
                ) : topProducts.length === 0 ? (
                    <p className="text-sm text-gray-400">Tidak ada data.</p>
                ) : (
                    <div className="space-y-3">
                        {topProducts.map((product, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800">{product.product_name}</p>
                                    <p className="text-xs text-gray-400">{product.total_quantity} terjual</p>
                                </div>
                                <span className="text-sm font-semibold text-gray-700">
                                    {fmt(product.total_revenue)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Statistik
