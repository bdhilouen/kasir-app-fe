import { useEffect, useState } from "react";
import api from "../lib/axios";
import NotificationBanner, { type Notice } from "../components/NotificationBanner";

interface Category {
    id: number;
    name: string;
    products: Product[];
}

interface Product {
    id: number;
    name: string;
    price: number;
    stock: number;
    category_id: number | null;
}

interface CartItem {
    product_id: number;
    name: string;
    price: number;
    quantity: number;
    max_stock: number;
}

type PaymentMethod = "cash" | "transfer" | "qris";

function Transaksi() {
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategory, setActiveCategory] = useState<number | null>(null); // null = semua
    const [cart, setCart] = useState<CartItem[]>([]);
    const [paidAmount, setPaidAmount] = useState(0);
    const [customerName, setCustomerName] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
    const [search, setSearch] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [notice, setNotice] = useState<Notice | null>(null);

    const fmt = (val: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

    // Fetch produk + kategori sekaligus
    useEffect(() => {
        setLoadingProducts(true);
        api.get("/products/by-category")
            .then(res => {
                const { all, categories } = res.data.data;
                setAllProducts(all);
                setCategories(categories);
            })
            .catch(err => console.error(err))
            .finally(() => setLoadingProducts(false));
    }, []);

    // Produk yang ditampilkan berdasarkan tab aktif + search
    const displayedProducts = (() => {
        let source: Product[] = [];

        if (activeCategory === null) {
            source = allProducts;
        } else {
            const cat = categories.find(c => c.id === activeCategory);
            source = cat ? cat.products : [];
        }

        if (!search) return source;

        return source.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase())
        );
    })();

    // Tambah ke cart dengan validasi stok
    const addToCart = (product: Product) => {
        setCart(prev => {
            const exist = prev.find(p => p.product_id === product.id);

            if (exist) {
                // Jangan tambah kalau sudah melebihi stok
                if (exist.quantity >= product.stock) return prev;
                return prev.map(p =>
                    p.product_id === product.id
                        ? { ...p, quantity: p.quantity + 1 }
                        : p
                );
            }

            if (product.stock === 0) return prev;

            return [
                ...prev,
                {
                    product_id: product.id,
                    name:       product.name,
                    price:      product.price,
                    quantity:   1,
                    max_stock:  product.stock,
                },
            ];
        });
    };

    // Update quantity dengan validasi stok
    const updateQty = (product_id: number, delta: number) => {
        setCart(prev =>
            prev
                .map(p => {
                    if (p.product_id !== product_id) return p;
                    const newQty = p.quantity + delta;
                    if (newQty > p.max_stock) return p; // jangan melebihi stok
                    return { ...p, quantity: newQty };
                })
                .filter(p => p.quantity > 0)
        );
    };

    const removeFromCart = (product_id: number) => {
        setCart(prev => prev.filter(p => p.product_id !== product_id));
    };

    const total  = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const change = paidAmount - total;

    const handleBayar = () => {
        if (cart.length === 0) return;
        setShowConfirm(true);
    };

    // Submit transaksi ke API
    const handleKonfirmasi = async () => {
        setLoading(true);
        try {
            const payload = {
                customer_name:  customerName || null,
                payment_method: paymentMethod,
                paid_amount:    paidAmount,
                items: cart.map(item => ({
                    product_id: item.product_id,
                    quantity:   item.quantity,
                })),
            };

            const res = await api.post("/transactions", payload);
            const invoice = res.data.data.invoice_number;

            // Reset semua state setelah berhasil
            setCart([]);
            setPaidAmount(0);
            setCustomerName("");
            setPaymentMethod("cash");
            setShowConfirm(false);

            // Refresh produk biar stok terupdate
            const updated = await api.get("/products/by-category");
            setAllProducts(updated.data.data.all);
            setCategories(updated.data.data.categories);

            setNotice({ type: "success", message: `Transaksi ${invoice} berhasil.` });

        } catch (err: any) {
            const message = err.response?.data?.message || "Gagal melakukan transaksi.";
            setNotice({ type: "error", message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-0 flex-col md:h-[calc(100vh-3rem)]">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Kasir</h2>

            <NotificationBanner
                notice={notice}
                onClose={() => setNotice(null)}
                className="mb-4"
            />

            <div className="flex flex-col-reverse md:grid md:grid-cols-12 gap-4 md:flex-1 md:min-h-0 md:overflow-hidden">

                {/* Keranjang */}
                <div className="md:col-span-8 bg-white p-4 md:p-5 flex flex-col rounded-xl shadow-sm border border-gray-100 min-h-[420px] max-h-[70vh] md:max-h-none md:min-h-0">
                    <h3 className="font-semibold text-gray-700 mb-3">Keranjang</h3>

                    <div className="flex-1 overflow-y-auto min-h-0">
                        {cart.length === 0 ? (
                            <div className="h-full border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400 text-sm">
                                Keranjang masih kosong
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {cart.map((item) => (
                                    <div
                                        key={item.product_id}
                                        className="flex flex-wrap md:flex-nowrap items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 md:px-4 py-3 border border-gray-100"
                                    >
                                        <div className="flex-1 min-w-[160px]">
                                            <p className="font-medium text-gray-800">{item.name}</p>
                                            <p className="text-sm text-gray-500">{fmt(item.price)} / pcs</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateQty(item.product_id, -1)}
                                                className="w-7 h-7 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-sm cursor-pointer transition"
                                            >
                                                −
                                            </button>
                                            <span className="w-6 text-center font-semibold text-gray-800">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => updateQty(item.product_id, 1)}
                                                disabled={item.quantity >= item.max_stock}
                                                className="w-7 h-7 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 font-bold text-sm cursor-pointer transition"
                                            >
                                                +
                                            </button>
                                        </div>

                                        <p className="w-24 md:w-28 text-right font-semibold text-gray-800">
                                            {fmt(item.price * item.quantity)}
                                        </p>

                                        <button
                                            onClick={() => removeFromCart(item.product_id)}
                                            className="md:ml-1 text-red-400 hover:text-red-600 text-lg cursor-pointer transition"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Total & Bayar */}
                    <div className="mt-4 border-t pt-4 bg-white">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-gray-500 text-sm">Total Item</span>
                            <span className="text-gray-700">{cart.reduce((s, c) => s + c.quantity, 0)} pcs</span>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-semibold text-gray-800">Total</span>
                            <span className="text-xl font-bold text-gray-900">{fmt(total)}</span>
                        </div>
                        <button
                            onClick={handleBayar}
                            disabled={cart.length === 0}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition cursor-pointer active:scale-95"
                        >
                            Bayar
                        </button>
                    </div>
                </div>

                {/* Daftar Produk */}
                <div className="md:col-span-4 bg-white p-4 flex flex-col rounded-xl shadow-sm border border-gray-100 min-h-[320px] max-h-[45vh] md:max-h-none md:min-h-0">
                    <h3 className="font-semibold text-gray-700 mb-3">Produk</h3>

                    {/* Tab Kategori */}
                    <div className="flex gap-1.5 mb-3 flex-wrap">
                        <button
                            onClick={() => setActiveCategory(null)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                                activeCategory === null
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            Semua
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                                    activeCategory === cat.id
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    <input
                        type="text"
                        placeholder="Cari barang..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="mb-3 p-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400"
                    />

                    <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
                        {loadingProducts ? (
                            <p className="text-sm text-gray-400 text-center mt-4">Memuat produk...</p>
                        ) : displayedProducts.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center mt-4">Produk tidak ditemukan.</p>
                        ) : (
                            displayedProducts.map((product) => {
                                const inCart    = cart.find((c) => c.product_id === product.id);
                                const outOfStock = product.stock === 0;
                                return (
                                    <div
                                        key={product.id}
                                        onClick={() => !outOfStock && addToCart(product)}
                                        className={`flex items-center gap-3 border rounded-lg p-3 transition duration-150 ${
                                            outOfStock
                                                ? "bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed"
                                                : "bg-gray-50 hover:bg-blue-50 border-gray-100 hover:border-blue-200 cursor-pointer"
                                        }`}
                                    >
                                        <div className="w-1 h-1  rounded-lg flex items-center justify-center flex-shrink-0">
                                            
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-gray-800 truncate">{product.name}</p>
                                            <p className="text-xs text-gray-500">{fmt(product.price)}</p>
                                        </div>
                                        {inCart ? (
                                            <span className="text-xs bg-blue-600 text-white rounded-full px-2 py-0.5 font-semibold">
                                                {inCart.quantity}
                                            </span>
                                        ) : outOfStock ? (
                                            <span className="text-xs text-red-400">Habis</span>
                                        ) : (
                                            <span className="text-xs text-gray-400">Stok {product.stock}</span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Konfirmasi Pembayaran */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-5 md:p-6 w-[calc(100vw-2rem)] max-w-96 shadow-xl">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">Konfirmasi Pembayaran</h3>

                        <div className="space-y-2 mb-4 max-h-36 overflow-y-auto">
                            {cart.map((item) => (
                                <div key={item.product_id} className="flex justify-between text-sm text-gray-700">
                                    <span>{item.name} × {item.quantity}</span>
                                    <span>{fmt(item.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t pt-3 mb-4 flex justify-between font-bold text-gray-900">
                            <span>Total</span>
                            <span>{fmt(total)}</span>
                        </div>

                        {/* Nama pelanggan */}
                        <div className="mb-3">
                            <label className="text-sm text-gray-600 mb-1 block">Nama Pelanggan <span className="text-gray-400">(opsional)</span></label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Contoh: Bu Sari"
                                className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-blue-400"
                            />
                        </div>

                        {/* Metode pembayaran */}
                        <div className="mb-3">
                            <label className="text-sm text-gray-600 mb-1 block">Metode Pembayaran</label>
                            <div className="flex gap-2">
                                {(["cash", "transfer", "qris"] as PaymentMethod[]).map(method => (
                                    <button
                                        key={method}
                                        onClick={() => setPaymentMethod(method)}
                                        className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer border ${
                                            paymentMethod === method
                                                ? "bg-blue-600 text-white border-blue-600"
                                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                        }`}
                                    >
                                        {method.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Jumlah bayar */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <label className="text-sm text-gray-600 block">Jumlah Bayar</label>
                                <button
                                    type="button"
                                    onClick={() => setPaidAmount(total)}
                                    disabled={total <= 0}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:text-gray-300 disabled:cursor-not-allowed cursor-pointer transition"
                                >
                                    Uang Pas
                                </button>
                            </div>
                            <input
                                type="number"
                                value={paidAmount || ""}
                                onChange={(e) => setPaidAmount(Number(e.target.value))}
                                placeholder="Masukkan jumlah bayar..."
                                className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-blue-400"
                            />
                            {paidAmount > 0 && (
                                <p className={`text-sm mt-1 ${change >= 0 ? "text-green-600" : "text-red-500"}`}>
                                    {change >= 0
                                        ? `Kembalian: ${fmt(change)}`
                                        : `Kurang: ${fmt(Math.abs(change))} — akan dicatat sebagai utang`
                                    }
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={loading}
                                className="flex-1 border border-gray-300 py-2 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleKonfirmasi}
                                disabled={loading || paidAmount < 0}
                                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 rounded-lg font-semibold cursor-pointer transition"
                            >
                                {loading ? "Memproses..." : "Konfirmasi"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Transaksi;
