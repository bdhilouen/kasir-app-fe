import type { ReactNode } from "react"
import { useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import {
    BarChart2,
    CreditCard,
    Menu,
    Package,
    ShoppingCart,
    Tag,
    User,
    Users,
    X,
} from "lucide-react"
import { useAuth } from "../hooks/useAuth"
import { useIsMobile } from "../hooks/useIsMobile"

interface NavItem {
    label: string
    path: string
    icon: ReactNode
    adminOnly?: boolean
}

const navItems: NavItem[] = [
    { label: "Kasir", path: "/transaksi", icon: <ShoppingCart size={20} /> },
    { label: "Riwayat", path: "/riwayat", icon: <CreditCard size={20} /> },
    { label: "Utang", path: "/utang", icon: <CreditCard size={20} /> },
    { label: "Stok", path: "/stok", icon: <Package size={20} />, adminOnly: true },
    { label: "Kategori", path: "/kategori", icon: <Tag size={20} />, adminOnly: true },
    { label: "Statistik", path: "/statistik", icon: <BarChart2 size={20} />, adminOnly: true },
    { label: "Akun", path: "/kasir", icon: <Users size={20} />, adminOnly: true },
    { label: "Profile", path: "/profile", icon: <User size={20} /> },
]

function Layout() {
    const isMobile = useIsMobile()
    const location = useLocation()
    const { isAdmin } = useAuth()
    const [drawerOpen, setDrawerOpen] = useState(false)

    const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin)
    const currentItem = visibleItems.find(item => item.path === location.pathname)

    const bottomNavItems = isAdmin
        ? navItems.filter(item => ["/transaksi", "/stok", "/statistik", "/kasir", "/profile"].includes(item.path))
        : navItems.filter(item => ["/transaksi", "/riwayat", "/utang", "/profile"].includes(item.path))

    if (isMobile) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col">
                <div className="bg-gray-900 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
                    <p className="text-white font-bold text-base">
                        {currentItem?.label ?? "MaKasir"}
                    </p>
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => setDrawerOpen(true)}
                            className="text-white cursor-pointer"
                            aria-label="Buka menu lengkap"
                        >
                            <Menu size={22} />
                        </button>
                    )}
                </div>

                <main className="flex-1 p-4 pb-24 overflow-y-auto">
                    <Outlet />
                </main>

                <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
                    <div className="flex">
                        {bottomNavItems.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition ${
                                        isActive
                                            ? "text-blue-600"
                                            : "text-gray-400 hover:text-gray-600"
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <span className={isActive ? "text-blue-600" : "text-gray-400"}>
                                            {item.icon}
                                        </span>
                                        <span className={`text-[10px] leading-tight ${isActive ? "font-semibold" : ""}`}>
                                            {item.label}
                                        </span>
                                        <span className={`w-1 h-1 rounded-full ${isActive ? "bg-blue-600" : "bg-transparent"}`} />
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </nav>

                {drawerOpen && (
                    <div className="fixed inset-0 z-50 flex">
                        <button
                            type="button"
                            className="flex-1 bg-black/50"
                            onClick={() => setDrawerOpen(false)}
                            aria-label="Tutup menu lengkap"
                        />
                        <aside className="w-64 bg-white h-full shadow-xl flex flex-col">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <p className="font-bold text-gray-800">Menu </p>
                                <button
                                    type="button"
                                    onClick={() => setDrawerOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                                    aria-label="Tutup menu lengkap"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                                {visibleItems.map(item => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setDrawerOpen(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                                                isActive
                                                    ? "bg-blue-50 text-blue-600 font-medium"
                                                    : "text-gray-600 hover:bg-gray-50"
                                            }`
                                        }
                                    >
                                        {item.icon}
                                        {item.label}
                                    </NavLink>
                                ))}
                            </div>
                        </aside>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 flex">
            <aside className="w-64 min-h-screen bg-gray-900 text-white p-5 flex flex-col justify-between fixed left-0 top-0">
                <div>
                    <h1 className="text-2xl font-bold mb-8">MaKasir</h1>
                    <nav className="space-y-2">
                        {visibleItems.filter(item => item.path !== "/profile").map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 p-3 rounded-md text-sm transition ${
                                        isActive
                                            ? "bg-slate-700 text-blue-400"
                                            : "text-slate-200 hover:bg-slate-700 hover:text-blue-400"
                                    }`
                                }
                            >
                                {item.icon}
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>
                <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                        `flex items-center gap-3 p-3 rounded-md text-sm transition ${
                            isActive
                                ? "bg-slate-700 text-blue-400"
                                : "text-slate-200 hover:bg-slate-700 hover:text-blue-400"
                        }`
                    }
                >
                    <User size={20} />
                    Profile
                </NavLink>
            </aside>

            <div className="ml-64 flex-1 p-6 bg-gray-100 overflow-y-auto min-h-screen">
                <Outlet />
            </div>
        </div>
    )
}

export default Layout
