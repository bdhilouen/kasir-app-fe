export const useAuth = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    
    return {
        user,
        isAdmin:  user?.role === "admin",
        isCashier: user?.role === "cashier",
    }
}