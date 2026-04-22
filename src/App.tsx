import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";

import Stok from "./pages/Stok";
import Statistik from "./pages/Statistik";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Transaksi from "./pages/Transaksi";
import Kategori from "./pages/Kategori";
import Kasir from "./pages/Kasir";
import RiwayatTransaksi from "./pages/RiwayatTransaksi";
import Utang from "./pages/utang";

function App() {
  return (
    <Routes>

      {/* PUBLIC ROUTE */}
      <Route path="/" element={<Login />} />

      {/* PRIVATE ROUTE (pakai Layout) */}
      <Route element={<Layout />}>
        <Route path="/transaksi" element={<Transaksi />} />
        <Route path="/stok" element={<Stok />} />
        <Route path="/kategori" element={<Kategori />} />
        <Route path="/utang" element={<Utang />} />
        <Route path="/riwayat" element={<RiwayatTransaksi />} />
        <Route path="/statistik" element={<Statistik />} />
        <Route path="/kasir" element={<Kasir />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

    </Routes>
  );
}

export default App;