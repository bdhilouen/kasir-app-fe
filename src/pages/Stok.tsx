import React, { useState, useEffect } from "react"
import api from "../lib/axios"
import { useAuth } from "../hooks/useAuth"

interface Category {
    id: number
    name: string
}

interface Product {
    id: number
    name: string
    sku: string
    category_id: number | null
    category?: { id: number; name: string }
    price: number
    stock: number
    min_stock: number
    description: string
}

interface ProductForm {
    name: string
    sku: string
    category_id: string
    price: string
    stock: string
    min_stock: string
    description: string
}

const emptyForm: ProductForm = {
    name:        "",
    sku:         "",
    category_id: "",
    price:       "",
    stock:       "",
    min_stock:   "",
    description: "",
}

const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID")

function Stok() {

    const { isAdmin } = useAuth()

    // Redirect kalau bukan admin
    if (!isAdmin) {
        window.location.href = "/transaksi"
        return null
    }
    
    const [products, setProducts]     = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading]       = useState(true)
    const [saving, setSaving]         = useState(false)
    const [deleting, setDeleting]     = useState<number | null>(null)

    const [search, setSearch]         = useState("")
    const [sortOrder, setSortOrder]   = useState<"asc" | "desc">("asc")
    const [filterCategory, setFilterCategory] = useState<string>("")
    const [filterLowStock, setFilterLowStock] = useState(false)

    const [showForm, setShowForm]     = useState(false)
    const [editId, setEditId]         = useState<number | null>(null)
    const [form, setForm]             = useState<ProductForm>(emptyForm)
    const [formError, setFormError]   = useState<string>("")

    const [showStockModal, setShowStockModal]   = useState(false)
    const [stockTarget, setStockTarget]         = useState<Product | null>(null)
    const [newStock, setNewStock]               = useState("")

    // Fetch produk & kategori
    const fetchProducts = () => {
        setLoading(true)
        api.get("/products", {
            params: {
                per_page:  100,
                low_stock: filterLowStock || undefined,
            },
        })
            .then(res => setProducts(res.data.data.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        api.get("/categories", { params: { all: true } })
            .then(res => setCategories(res.data.data))
            .catch(err => console.error(err))
    }, [])

    useEffect(() => {
        fetchProducts()
    }, [filterLowStock])

    // Filter + sort lokal
    const displayed = products
        .filter(p => {
            const matchSearch   = p.name.toLowerCase().includes(search.toLowerCase()) ||
                                  p.sku.toLowerCase().includes(search.toLowerCase())
            const matchCategory = filterCategory ? String(p.category_id) === filterCategory : true
            return matchSearch && matchCategory
        })
        .sort((a, b) => sortOrder === "asc" ? a.price - b.price : b.price - a.price)

    const lowStockCount = products.filter(p => p.stock <= p.min_stock && p.min_stock > 0).length

    // Form handlers
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value })
        setFormError("")
    }

    const openAddForm = () => {
        setForm(emptyForm)
        setEditId(null)
        setFormError("")
        setShowForm(true)
    }

    const openEditForm = (product: Product) => {
        setForm({
            name:        product.name,
            sku:         product.sku,
            category_id: product.category_id ? String(product.category_id) : "",
            price:       String(product.price),
            stock:       String(product.stock),
            min_stock:   String(product.min_stock),
            description: product.description ?? "",
        })
        setEditId(product.id)
        setFormError("")
        setShowForm(true)
    }

    const handleSubmit = async () => {
        if (!form.name || !form.sku || !form.price) {
            setFormError("Nama, SKU, dan harga wajib diisi.")
            return
        }

        setSaving(true)
        try {
            const payload = {
                name:        form.name,
                sku:         form.sku,
                category_id: form.category_id ? Number(form.category_id) : null,
                price:       Number(form.price),
                stock:       Number(form.stock) || 0,
                min_stock:   Number(form.min_stock) || 0,
                description: form.description || null,
            }

            if (editId !== null) {
                await api.put(`/products/${editId}`, payload)
            } else {
                await api.post("/products", payload)
            }

            setShowForm(false)
            setEditId(null)
            setForm(emptyForm)
            fetchProducts()

        } catch (err: any) {
            const errors = err.response?.data?.errors
            if (errors) {
                const first = Object.values(errors)[0] as string[]
                setFormError(first[0])
            } else {
                setFormError(err.response?.data?.message || "Gagal menyimpan produk.")
            }
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm("Yakin ingin menghapus produk ini?")) return
        setDeleting(id)
        try {
            await api.delete(`/products/${id}`)
            fetchProducts()
        } catch (err: any) {
            alert(err.response?.data?.message || "Gagal menghapus produk.")
        } finally {
            setDeleting(null)
        }
    }

    // Update stok langsung
    const openStockModal = (product: Product) => {
        setStockTarget(product)
        setNewStock(String(product.stock))
        setShowStockModal(true)
    }

    const handleUpdateStock = async () => {
        if (!stockTarget) return
        try {
            await api.patch(`/products/${stockTarget.id}/stock`, {
                stock: Number(newStock),
            })
            setShowStockModal(false)
            setStockTarget(null)
            fetchProducts()
        } catch (err: any) {
            alert(err.response?.data?.message || "Gagal update stok.")
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Cek Stok</h2>
                <button
                    onClick={openAddForm}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 active:scale-95 transition cursor-pointer"
                >
                    + Tambah Produk
                </button>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
                <input
                    type="text"
                    placeholder="Cari nama / SKU..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border p-2 rounded-md text-sm flex-1 min-w-[180px] outline-none focus:border-blue-400"
                />
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="border p-2 rounded-md text-sm text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
                >
                    <option value="">Semua Kategori</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                    ))}
                </select>
                <button
                    onClick={() => setFilterLowStock(!filterLowStock)}
                    className={`px-4 py-2 rounded-md text-sm transition cursor-pointer border ${
                        filterLowStock
                            ? "bg-red-600 text-white border-red-600"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                >
                    Stok Menipis {lowStockCount > 0 && `(${lowStockCount})`}
                </button>
                <button
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="bg-gray-700 text-white px-4 py-2 rounded-md text-sm cursor-pointer hover:bg-gray-800 active:scale-95 transition"
                >
                    Sort Harga ({sortOrder})
                </button>
            </div>

            {/* Grid produk */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Stok Barang</h3>
                    <p className="bg-slate-100 px-4 py-2 rounded-lg text-sm">
                        Total Produk: <span className="font-bold">{displayed.length}</span>
                    </p>
                </div>

                {loading ? (
                    <p className="text-sm text-gray-400 text-center py-12">Memuat produk...</p>
                ) : displayed.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-12">Tidak ada produk ditemukan.</p>
                ) : (
                    <div className="grid grid-cols-3 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {displayed.map((product) => {
                            const isLow = product.min_stock > 0 && product.stock <= product.min_stock
                            return (
                                <div
                                    key={product.id}
                                    className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg hover:-translate-y-1 transition duration-200 border border-gray-100"
                                >
                                    <div className="h-32 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                                        <span className="text-gray-400 text-sm">Gambar</span>
                                    </div>

                                    {product.category && (
                                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full mb-2 inline-block">
                                            {product.category.name}
                                        </span>
                                    )}

                                    <h3 className="font-semibold text-lg">{product.name}</h3>
                                    <p className="text-xs text-gray-400 mb-1">SKU: {product.sku}</p>
                                    <p className="text-gray-600 font-medium">{fmt(product.price)}</p>

                                    <p className={`text-sm mt-1 ${isLow ? "text-red-600 font-bold" : "text-gray-600"}`}>
                                        Stok: {product.stock}
                                        {isLow && " ⚠️ Menipis"}
                                    </p>

                                    <div className="flex gap-2 mt-3 flex-wrap">
                                        <button
                                            onClick={() => openEditForm(product)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm cursor-pointer"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => openStockModal(product)}
                                            className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-md text-sm cursor-pointer"
                                        >
                                            Stok
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            disabled={deleting === product.id}
                                            className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-3 py-1 rounded-md text-sm cursor-pointer"
                                        >
                                            {deleting === product.id ? "..." : "Hapus"}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Modal Tambah / Edit Produk */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-[420px] shadow-lg relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setShowForm(false)}
                            className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl cursor-pointer"
                        >
                            ×
                        </button>

                        <h3 className="text-xl font-bold mb-4">
                            {editId ? "Edit Produk" : "Tambah Produk"}
                        </h3>

                        <div className="grid gap-3">
                            <input
                                type="text"
                                name="name"
                                placeholder="Nama Produk"
                                value={form.name}
                                onChange={handleChange}
                                className="border p-2 rounded-md text-sm outline-none focus:border-blue-400"
                            />
                            <input
                                type="text"
                                name="sku"
                                placeholder="SKU (contoh: IMI-001)"
                                value={form.sku}
                                onChange={handleChange}
                                className="border p-2 rounded-md text-sm outline-none focus:border-blue-400"
                            />
                            <select
                                name="category_id"
                                value={form.category_id}
                                onChange={handleChange}
                                className="border p-2 rounded-md text-sm text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
                            >
                                <option value="">Pilih Kategori (opsional)</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                name="price"
                                placeholder="Harga"
                                value={form.price}
                                onChange={handleChange}
                                className="border p-2 rounded-md text-sm outline-none focus:border-blue-400"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="number"
                                    name="stock"
                                    placeholder="Stok"
                                    value={form.stock}
                                    onChange={handleChange}
                                    className="border p-2 rounded-md text-sm outline-none focus:border-blue-400"
                                />
                                <input
                                    type="number"
                                    name="min_stock"
                                    placeholder="Min. Stok"
                                    value={form.min_stock}
                                    onChange={handleChange}
                                    className="border p-2 rounded-md text-sm outline-none focus:border-blue-400"
                                />
                            </div>
                            <textarea
                                name="description"
                                placeholder="Deskripsi (opsional)"
                                value={form.description}
                                onChange={handleChange}
                                rows={2}
                                className="border p-2 rounded-md text-sm outline-none focus:border-blue-400 resize-none"
                            />

                            {formError && (
                                <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                                    {formError}
                                </p>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-2 rounded-md text-sm transition cursor-pointer"
                            >
                                {saving ? "Menyimpan..." : "Simpan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Update Stok */}
            {showStockModal && stockTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-80 shadow-lg">
                        <h3 className="text-lg font-bold mb-1">Update Stok</h3>
                        <p className="text-sm text-gray-500 mb-4">{stockTarget.name}</p>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 mb-1 block">Stok Saat Ini</label>
                                <p className="text-lg font-bold text-gray-700">{stockTarget.stock}</p>
                            </div>
                            <div className="text-gray-400 text-xl">→</div>
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 mb-1 block">Stok Baru</label>
                                <input
                                    type="number"
                                    value={newStock}
                                    onChange={(e) => setNewStock(e.target.value)}
                                    min={0}
                                    className="w-full border p-2 rounded-md text-sm outline-none focus:border-blue-400"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowStockModal(false)}
                                className="flex-1 border border-gray-300 py-2 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer text-sm"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleUpdateStock}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-sm font-semibold cursor-pointer"
                            >
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Stok