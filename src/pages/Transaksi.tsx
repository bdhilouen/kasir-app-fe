import { useEffect, useState } from "react";
import api from "../lib/axios";

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
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    max_stock: product.stock,
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

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
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
                customer_name: customerName || null,
                payment_method: paymentMethod,
                paid_amount: paidAmount,
                items: cart.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
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

            alert(`Transaksi ${invoice} berhasil!`);

        } catch (err: any) {
            const message = err.response?.data?.message || "Gagal melakukan transaksi.";
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col px-3 md:px-0 pt-14 md:pt-0 pb-4">

            <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Kasir</h2>

            <div className="flex flex-col md:grid md:grid-cols-12 gap-4 flex-1 min-h-0">

                {/* PRODUK (mobile dulu, desktop kanan) */}
                <div className="order-1 md:order-2 md:col-span-4 bg-white p-4 flex flex-col rounded-xl shadow-sm border min-h-[250px] md:min-h-0">

                    <h3 className="font-semibold text-gray-700 mb-3">Produk</h3>

                    {/* kategori */}
                    <div className="flex gap-1.5 mb-3 flex-wrap overflow-x-auto">
                        <button
                            onClick={() => setActiveCategory(null)}
                            className={`px-2.5 py-1 rounded-md text-xs ${activeCategory === null
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100"
                                }`}
                        >
                            Semua
                        </button>

                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-2.5 py-1 rounded-md text-xs ${activeCategory === cat.id
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-100"
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
                        className="mb-3 p-2 border rounded-lg text-sm"
                    />

                    <div className="flex-1 overflow-y-auto space-y-2">
                        {displayedProducts.map(product => {
                            const inCart = cart.find(c => c.product_id === product.id)
                            const out = product.stock === 0

                            return (
                                <div
                                    key={product.id}
                                    onClick={() => !out && addToCart(product)}
                                    className={`flex items-center gap-3 p-3 rounded-lg border ${out ? "opacity-50" : "hover:bg-blue-50 cursor-pointer"
                                        }`}
                                >
                                    <div className="w-10 h-10 bg-gray-200 rounded" />

                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{product.name}</p>
                                        <p className="text-xs text-gray-500">{fmt(product.price)}</p>
                                    </div>

                                    {inCart ? (
                                        <span className="text-xs bg-blue-600 text-white px-2 rounded-full">
                                            {inCart.quantity}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-400">
                                            {out ? "Habis" : `Stok ${product.stock}`}
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* KERANJANG */}
                <div className="order-2 md:order-1 md:col-span-8 bg-white p-4 md:p-5 flex flex-col rounded-xl shadow-sm border min-h-[250px] md:min-h-0">

                    <h3 className="font-semibold text-gray-700 mb-3">Keranjang</h3>

                    <div className="flex-1 overflow-y-auto space-y-2">
                        {cart.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                Kosong bro
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.product_id} className="flex justify-between items-center border p-2 rounded">

                                    <div>
                                        <p className="text-sm font-medium">{item.name}</p>
                                        <p className="text-xs text-gray-400">{fmt(item.price)}</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button onClick={() => updateQty(item.product_id, -1)}>−</button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => updateQty(item.product_id, 1)}>+</button>
                                    </div>

                                    <p className="text-sm font-semibold">
                                        {fmt(item.price * item.quantity)}
                                    </p>

                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-3 border-t pt-3">
                        <p className="flex justify-between text-sm">
                            <span>Total</span>
                            <span className="font-bold">{fmt(total)}</span>
                        </p>

                        <button
                            onClick={handleBayar}
                            className="w-full mt-3 bg-blue-600 text-white py-2 rounded-lg"
                        >
                            Bayar
                        </button>
                    </div>
                </div>

            </div>

            {/* MODAL MOBILE FIX */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
                    <div className="bg-white w-full md:w-96 rounded-t-2xl md:rounded-xl p-5 max-h-[90vh] overflow-y-auto">

                        <h3 className="font-bold mb-3">Konfirmasi</h3>

                        {/* isi lu tetap */}

                        <button
                            onClick={handleKonfirmasi}
                            className="w-full mt-3 bg-green-600 text-white py-2 rounded"
                        >
                            Bayar
                        </button>

                    </div>
                </div>
            )}

        </div>
    );
}

export default Transaksi;