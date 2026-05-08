import { NavLink } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useState } from "react"

function Sidebar() {

    const { isAdmin } = useAuth()
    const [open, setOpen] = useState(false)

    const menu = [
        { name: "Transaksi", path: "/Transaksi" },
        { name: "Utang", path: "/utang" },
        { name: "Riwayat", path: "/riwayat" },
    ]

    const adminMenu = [
        { name: "Stok", path: "/stok" },
        { name: "Kategori", path: "/kategori" },
        { name: "Statistik", path: "/statistik" },
        { name: "Kasir", path: "/kasir" },
    ]

    return (
        <>
            {/* HAMBURGER BUTTON (MOBILE) */}
            <button
                onClick={() => setOpen(true)}
                className="md:hidden fixed top-4 left-4 z-50 bg-gray-900 text-white px-3 py-2 rounded-md"
            >
                ☰
            </button>

            {/* OVERLAY */}
            {open && (
                <div
                    onClick={() => setOpen(false)}
                    className="fixed inset-0 bg-black/40 z-40 md:hidden"
                />
            )}

            {/* SIDEBAR */}
            <aside className={`
                fixed md:static top-0 left-0 z-50
                w-64 min-h-screen bg-gray-900 text-white p-5 flex flex-col justify-between
                transform transition-transform duration-300
                ${open ? "translate-x-0" : "-translate-x-full"}
                md:translate-x-0
            `}>

                <div>
                    <h1 className="text-2xl font-bold mb-8">MaKasir</h1>

                    <ul className="space-y-2">
                        {menu.map(item => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    onClick={() => setOpen(false)}
                                    className={({ isActive }) =>
                                        `block p-2 rounded-md text-sm ${isActive
                                            ? "bg-slate-700 text-blue-400"
                                            : "hover:bg-slate-700"
                                        }`
                                    }
                                >
                                    {item.name}
                                </NavLink>
                            </li>
                        ))}

                        {isAdmin && adminMenu.map(item => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    onClick={() => setOpen(false)}
                                    className={({ isActive }) =>
                                        `block p-2 rounded-md text-sm ${isActive
                                            ? "bg-slate-700 text-blue-400"
                                            : "hover:bg-slate-700"
                                        }`
                                    }
                                >
                                    {item.name}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>

                <NavLink
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                        `block p-2 rounded-md text-sm ${isActive
                            ? "bg-slate-700 text-blue-400"
                            : "hover:bg-slate-700"
                        }`
                    }
                >
                    Profile
                </NavLink>
            </aside>
        </>
    )
}

export default Sidebar