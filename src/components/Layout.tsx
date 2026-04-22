import { useLocation, Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"

function Layout() {
    const location = useLocation()
    const hideSidebar = location.pathname === "/"

    return (
        <div className="flex h-screen">
            {!hideSidebar && <Sidebar />}
            <div className="flex-1 p-6 bg-gray-100 overflow-y-auto">
                <Outlet />
            </div>
        </div>
    )
}

export default Layout