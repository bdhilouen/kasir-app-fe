import { NavLink } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"

function Sidebar() {

    const { isAdmin } = useAuth()

    return (
        <aside className="w-64 min-h-screen bg-gray-900 text-white p-5 flex flex-col justify-between">

            <h1 className="text-2xl font-bold mb-8">MaKasir</h1>

            <ul className="space-y-4">
                <li className="hover:text-blue-400 p-1 rounded transition cursor-pointer duration-200"><NavLink to="/Transaksi" className={({ isActive }) =>
                    `block p-2 rounded-md transition ${isActive
                        ? "bg-slate-700 text-blue-400"
                        : "hover:bg-slate-700"
                    }`
                }>Transaksi</NavLink></li>
                <li className="hover:text-blue-400 p-1 rounded transition cursor-pointer duration-200"><NavLink to="/utang" className={({ isActive }) =>
                    `block p-2 rounded-md transition ${isActive
                        ? "bg-slate-700 text-blue-400"
                        : "hover:bg-slate-700"
                    }`
                }>Utang</NavLink></li>
                <li className="hover:text-blue-400 p-1 rounded transition cursor-pointer duration-200"><NavLink to="/riwayat" className={({ isActive }) =>
                    `block p-2 rounded-md transition ${isActive
                        ? "bg-slate-700 text-blue-400"
                        : "hover:bg-slate-700"
                    }`
                }>Riwayat Transaksi</NavLink></li>

                {isAdmin && (
                    <>
                        <li className="hover:text-blue-400  p-1 rounded transition cursor-pointer duration-200"><NavLink to="/stok" className={({ isActive }) =>
                            `block p-2 rounded-md transition ${isActive
                                ? "bg-slate-700 text-blue-400"
                                : "hover:bg-slate-700"
                            }`
                        }>Stok</NavLink></li>
                        <li className="hover:text-blue-400 p-1 rounded transition cursor-pointer duration-200"><NavLink to="/kategori" className={({ isActive }) =>
                            `block p-2 rounded-md transition ${isActive
                                ? "bg-slate-700 text-blue-400"
                                : "hover:bg-slate-700"
                            }`
                        }>Kategori</NavLink></li>
                        <li className="hover:text-blue-400  p-1 rounded transition cursor-pointer duration-200"><NavLink to="/statistik" className={({ isActive }) =>
                            `block p-2 rounded-md transition ${isActive
                                ? "bg-slate-700 text-blue-400"
                                : "hover:bg-slate-700"
                            }`
                        }>Statistik</NavLink></li>
                        <li className="hover:text-blue-400 p-1 rounded transition cursor-pointer duration-200"><NavLink to="/kasir" className={({ isActive }) =>
                            `block p-2 rounded-md transition ${isActive
                                ? "bg-slate-700 text-blue-400"
                                : "hover:bg-slate-700"
                            }`
                        }>Kasir</NavLink></li>
                    </>
                )}


            </ul>
            <div className="mt-auto">
                <NavLink to="/profile" className={({ isActive }) =>
                    `block p-2 rounded-md transition ${isActive
                        ? "bg-slate-700 text-blue-400"
                        : "hover:bg-slate-700"
                    }`
                }>Profile</NavLink>
            </div>
        </aside >
    )
}

export default Sidebar