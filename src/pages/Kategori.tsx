import React, { useState, useEffect } from "react"
import api from "../lib/axios"
import { useAuth } from "../hooks/useAuth"

interface Category {
    id: number
    name: string
    slug: string
    description: string | null
    products_count: number
}

interface CategoryForm {
    name: string
    description: string
}

const emptyForm: CategoryForm = {
    name:        "",
    description: "",
}

function Kategori() {

    const { isAdmin } = useAuth()

    // Redirect kalau bukan admin
    if (!isAdmin) {
        window.location.href = "/transaksi"
        return null
    }
    
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading]       = useState(true)
    const [saving, setSaving]         = useState(false)
    const [deleting, setDeleting]     = useState<number | null>(null)

    const [search, setSearch]         = useState("")
    const [showForm, setShowForm]     = useState(false)
    const [editId, setEditId]         = useState<number | null>(null)
    const [form, setForm]             = useState<CategoryForm>(emptyForm)
    const [formError, setFormError]   = useState("")

    const [showMerge, setShowMerge]         = useState(false)
    const [mergeSource, setMergeSource]     = useState<Category | null>(null)
    const [mergeTargetId, setMergeTargetId] = useState("")
    const [mergeSaving, setMergeSaving]     = useState(false)

    const fetchCategories = () => {
        setLoading(true)
        api.get("/categories", { params: { all: true } })
            .then(res => {
                // all=true return array langsung, withCount dari index
                // Fetch ulang dengan pagination biar dapat products_count
                return api.get("/categories", { params: { per_page: 100 } })
            })
            .then(res => setCategories(res.data.data.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        fetchCategories()
    }, [])

    const displayed = categories.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    )

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value })
        setFormError("")
    }

    const openAddForm = () => {
        setForm(emptyForm)
        setEditId(null)
        setFormError("")
        setShowForm(true)
    }

    const openEditForm = (category: Category) => {
        setForm({
            name:        category.name,
            description: category.description ?? "",
        })
        setEditId(category.id)
        setFormError("")
        setShowForm(true)
    }

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            setFormError("Nama kategori wajib diisi.")
            return
        }

        setSaving(true)
        try {
            if (editId !== null) {
                await api.put(`/categories/${editId}`, form)
            } else {
                await api.post("/categories", form)
            }
            setShowForm(false)
            setEditId(null)
            setForm(emptyForm)
            fetchCategories()
        } catch (err: any) {
            const errors = err.response?.data?.errors
            if (errors) {
                const first = Object.values(errors)[0] as string[]
                setFormError(first[0])
            } else {
                setFormError(err.response?.data?.message || "Gagal menyimpan kategori.")
            }
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (category: Category) => {
        if (category.products_count > 0) {
            alert(`Kategori "${category.name}" masih memiliki ${category.products_count} produk. Hapus atau pindahkan produknya terlebih dahulu, atau gunakan fitur Gabung.`)
            return
        }
        if (!confirm(`Yakin ingin menghapus kategori "${category.name}"?`)) return

        setDeleting(category.id)
        try {
            await api.delete(`/categories/${category.id}`)
            fetchCategories()
        } catch (err: any) {
            alert(err.response?.data?.message || "Gagal menghapus kategori.")
        } finally {
            setDeleting(null)
        }
    }

    const openMerge = (category: Category) => {
        setMergeSource(category)
        setMergeTargetId("")
        setShowMerge(true)
    }

    const handleMerge = async () => {
        if (!mergeSource || !mergeTargetId) return
        if (!confirm(`Semua produk dari "${mergeSource.name}" akan dipindahkan dan kategori ini akan dihapus. Lanjutkan?`)) return

        setMergeSaving(true)
        try {
            await api.post(`/categories/${mergeSource.id}/merge`, {
                target_category_id: Number(mergeTargetId),
            })
            setShowMerge(false)
            setMergeSource(null)
            fetchCategories()
        } catch (err: any) {
            alert(err.response?.data?.message || "Gagal menggabungkan kategori.")
        } finally {
            setMergeSaving(false)
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Kategori</h2>
                <button
                    onClick={openAddForm}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 active:scale-95 transition cursor-pointer"
                >
                    + Tambah Kategori
                </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3 mb-6">
                <input
                    type="text"
                    placeholder="Cari kategori..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border p-2 rounded-md text-sm flex-1 outline-none focus:border-blue-400"
                />
            </div>

            {/* List Kategori */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Daftar Kategori</h3>
                    <p className="bg-slate-100 px-4 py-2 rounded-lg text-sm">
                        Total: <span className="font-bold">{displayed.length}</span> kategori
                    </p>
                </div>

                {loading ? (
                    <p className="text-sm text-gray-400 text-center py-12">Memuat kategori...</p>
                ) : displayed.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-12">
                        {search ? "Kategori tidak ditemukan." : "Belum ada kategori. Tambahkan kategori pertama kamu."}
                    </p>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {displayed.map((category) => (
                            <div
                                key={category.id}
                                className="flex items-center justify-between py-4 hover:bg-gray-50 px-2 rounded-lg transition"
                            >
                                {/* Info */}
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <span className="text-blue-600 font-bold text-sm">
                                            {category.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">{category.name}</p>
                                        <p className="text-xs text-gray-400">
                                            {category.description || "Tidak ada deskripsi"}
                                            {" · "}
                                            <span className="text-gray-500">slug: {category.slug}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Badge jumlah produk */}
                                <div className="mx-6">
                                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                        category.products_count > 0
                                            ? "bg-green-50 text-green-700"
                                            : "bg-gray-100 text-gray-400"
                                    }`}>
                                        {category.products_count} produk
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openEditForm(category)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm cursor-pointer transition"
                                    >
                                        Edit
                                    </button>
                                    {category.products_count > 0 && (
                                        <button
                                            onClick={() => openMerge(category)}
                                            className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-md text-sm cursor-pointer transition"
                                        >
                                            Gabung
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(category)}
                                        disabled={deleting === category.id}
                                        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-3 py-1.5 rounded-md text-sm cursor-pointer transition"
                                    >
                                        {deleting === category.id ? "..." : "Hapus"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Tambah / Edit */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-96 shadow-lg relative">
                        <button
                            onClick={() => setShowForm(false)}
                            className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl cursor-pointer"
                        >
                            ×
                        </button>

                        <h3 className="text-xl font-bold mb-4">
                            {editId ? "Edit Kategori" : "Tambah Kategori"}
                        </h3>

                        <div className="grid gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Nama Kategori</label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="contoh: Minuman"
                                    value={form.name}
                                    onChange={handleChange}
                                    className="w-full border p-2 rounded-md text-sm outline-none focus:border-blue-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">
                                    Deskripsi <span className="text-gray-400">(opsional)</span>
                                </label>
                                <textarea
                                    name="description"
                                    placeholder="Deskripsi singkat kategori..."
                                    value={form.description}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full border p-2 rounded-md text-sm outline-none focus:border-blue-400 resize-none"
                                />
                            </div>

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

            {/* Modal Gabung Kategori */}
            {showMerge && mergeSource && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-96 shadow-lg relative">
                        <button
                            onClick={() => setShowMerge(false)}
                            className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl cursor-pointer"
                        >
                            ×
                        </button>

                        <h3 className="text-xl font-bold mb-1">Gabung Kategori</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Semua produk dari <span className="font-semibold text-gray-700">"{mergeSource.name}"</span> akan dipindahkan ke kategori tujuan, lalu kategori ini dihapus.
                        </p>

                        <div className="mb-4">
                            <label className="text-xs text-gray-500 mb-1 block">Pindahkan ke kategori</label>
                            <select
                                value={mergeTargetId}
                                onChange={(e) => setMergeTargetId(e.target.value)}
                                className="w-full border p-2 rounded-md text-sm text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
                            >
                                <option value="">Pilih kategori tujuan</option>
                                {categories
                                    .filter(c => c.id !== mergeSource.id)
                                    .map(c => (
                                        <option key={c.id} value={String(c.id)}>
                                            {c.name} ({c.products_count} produk)
                                        </option>
                                    ))
                                }
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowMerge(false)}
                                className="flex-1 border border-gray-300 py-2 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer text-sm"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleMerge}
                                disabled={!mergeTargetId || mergeSaving}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white py-2 rounded-lg text-sm font-semibold cursor-pointer transition"
                            >
                                {mergeSaving ? "Memproses..." : "Gabungkan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Kategori