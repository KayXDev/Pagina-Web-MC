'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaEdit, FaTrash, FaShoppingCart, FaUpload } from 'react-icons/fa';
import { Card, Button, Input, Textarea, Select, Badge } from '@/components/ui';
import { toast } from 'react-toastify';
import { formatPrice } from '@/lib/utils';
import { getClientLangFromCookie, t, type Lang } from '@/lib/i18n';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  features: string[];
  image?: string;
  deliveryCommands?: string[];
  isActive: boolean;
  isUnlimited: boolean;
  stock?: number;
}

export default function AdminProductsPage() {
  const [lang, setLang] = useState<Lang>('es');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'RANK',
    features: [''],
    image: '',
    deliveryCommandsText: '',
    isActive: true,
    isUnlimited: true,
    stock: 0,
  });

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products');
      if (!response.ok) throw new Error(t(lang, 'admin.products.loadError'));
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      toast.error(t(lang, 'admin.products.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const rawPrice = String((formData as any).price ?? '').trim();
      const normalizedPriceText = rawPrice.replace(',', '.');
      const priceValue = Number(normalizedPriceText);
      if (!Number.isFinite(priceValue) || priceValue < 0) {
        toast.error(lang === 'es' ? 'Precio inválido' : 'Invalid price');
        return;
      }

      const url = editingProduct ? '/api/admin/products' : '/api/admin/products';
      const method = editingProduct ? 'PATCH' : 'POST';

      const deliveryCommands = String((formData as any).deliveryCommandsText || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      const payload = {
        ...formData,
        price: priceValue,
        deliveryCommands,
      };

      const body = editingProduct
        ? { productId: editingProduct._id, updates: payload }
        : payload;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error(t(lang, 'admin.products.saveError'));

      toast.success(
        editingProduct
          ? t(lang, 'admin.products.saveSuccessUpdate')
          : t(lang, 'admin.products.saveSuccessCreate')
      );
      setShowForm(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error(t(lang, 'admin.products.saveError'));
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: String(product.price ?? ''),
      category: product.category,
      features: product.features.length > 0 ? product.features : [''],
      image: String(product.image || ''),
      deliveryCommandsText: Array.isArray(product.deliveryCommands) ? product.deliveryCommands.join('\n') : '',
      isActive: product.isActive,
      isUnlimited: product.isUnlimited,
      stock: product.stock || 0,
    });
    setShowForm(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm(t(lang, 'admin.products.deleteConfirm'))) return;

    try {
      const response = await fetch(`/api/admin/products?id=${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error(t(lang, 'admin.products.deleteError'));

      toast.success(t(lang, 'admin.products.deleteSuccess'));
      fetchProducts();
    } catch (error) {
      toast.error(t(lang, 'admin.products.deleteError'));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'RANK',
      features: [''],
      image: '',
      deliveryCommandsText: '',
      isActive: true,
      isUnlimited: true,
      stock: 0,
    });
    setImageFile(null);
  };

  const uploadProductImageFile = async (file: File) => {
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/admin/uploads/product-image', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || (lang === 'es' ? 'Error al subir imagen' : 'Upload error'));

      const url = typeof (data as any).url === 'string' ? (data as any).url : '';
      if (!url) throw new Error(lang === 'es' ? 'URL inválida' : 'Invalid URL');

      setFormData((prev) => ({ ...prev, image: url }));
      toast.success(lang === 'es' ? 'Imagen subida' : 'Image uploaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (lang === 'es' ? 'Error al subir imagen' : 'Upload error'));
    } finally {
      setUploadingImage(false);
    }
  };

  const addFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ''] });
  };

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const removeFeature = (index: number) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures });
  };

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-gray-950/25 rounded-2xl" hover={false}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-white">
              <FaShoppingCart />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent truncate">
                {t(lang, 'admin.products.title')}
              </h1>
              <p className="text-gray-400 text-sm md:text-base">{t(lang, 'admin.products.subtitle')}</p>
            </div>
          </div>

          <Button onClick={() => setShowForm(true)} className="w-full md:w-auto">
            <FaPlus />
            <span>{t(lang, 'admin.products.new')}</span>
          </Button>
        </div>
      </Card>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-950/95 border border-white/10 rounded-2xl p-6 md:p-8 max-w-2xl w-full my-8 max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingProduct
                ? t(lang, 'admin.products.form.editTitle')
                : t(lang, 'admin.products.form.newTitle')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t(lang, 'admin.products.form.name')}
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t(lang, 'admin.products.form.price')}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    inputMode="decimal"
                    placeholder="0.50"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t(lang, 'admin.products.form.description')}
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {lang === 'es' ? 'Imagen del producto' : 'Product image'}
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Input
                      value={(formData as any).image}
                      onChange={(e) => setFormData({ ...(formData as any), image: e.target.value })}
                      placeholder={lang === 'es' ? 'URL de la imagen (opcional)' : 'Image URL (optional)'}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      {lang === 'es'
                        ? 'Puedes pegar una URL o subir un archivo.'
                        : 'You can paste a URL or upload a file.'}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        disabled={uploadingImage}
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!imageFile || uploadingImage}
                        onClick={() => imageFile && uploadProductImageFile(imageFile)}
                        className="whitespace-nowrap"
                      >
                        <FaUpload />
                        <span>{uploadingImage ? (lang === 'es' ? 'Subiendo…' : 'Uploading…') : (lang === 'es' ? 'Subir' : 'Upload')}</span>
                      </Button>
                    </div>

                    {(formData as any).image ? (
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl border border-white/10 bg-white/5 overflow-hidden grid place-items-center">
                          <img
                            src={(formData as any).image}
                            alt="Preview"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setFormData({ ...(formData as any), image: '' })}
                        >
                          <FaTrash />
                          <span>{lang === 'es' ? 'Quitar' : 'Remove'}</span>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t(lang, 'admin.products.form.category')}
                  </label>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="!rounded-lg"
                  >
                    <option value="RANK">{t(lang, 'admin.products.category.ranks')}</option>
                    <option value="BUNDLES">{t(lang, 'admin.products.category.bundles')}</option>
                    <option value="CURRENCY">{t(lang, 'admin.products.category.currency')}</option>
                    <option value="KEYS">{t(lang, 'admin.products.category.keys')}</option>
                    <option value="SPECIAL">{t(lang, 'admin.products.category.special')}</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t(lang, 'admin.products.form.stock')}
                  </label>
                  <Input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                    disabled={formData.isUnlimited}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t(lang, 'admin.products.form.features')}
                </label>
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => updateFeature(index, e.target.value)}
                        placeholder={t(lang, 'admin.products.form.featurePlaceholder')}
                      />
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => removeFeature(index)}
                      >
                        <FaTrash />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="secondary" onClick={addFeature} className="mt-2">
                  <FaPlus />
                  <span>{t(lang, 'admin.products.addFeature')}</span>
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {lang === 'es' ? 'Comandos (entrega automática)' : 'Commands (auto delivery)'}
                </label>
                <Textarea
                  value={(formData as any).deliveryCommandsText}
                  onChange={(e) => setFormData({ ...(formData as any), deliveryCommandsText: e.target.value })}
                  rows={4}
                  placeholder={
                    lang === 'es'
                      ? '1 comando por línea. Usa {player} (y opcional {qty}).\nEj: lp user {player} parent add vip'
                      : '1 command per line. Use {player} (and optional {qty}).\nEx: lp user {player} parent add vip'
                  }
                />
              </div>

              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-300">{t(lang, 'admin.products.active')}</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isUnlimited}
                    onChange={(e) => setFormData({ ...formData, isUnlimited: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-300">{t(lang, 'admin.products.unlimitedStock')}</span>
                </label>
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  {editingProduct
                    ? t(lang, 'admin.products.form.submitUpdate')
                    : t(lang, 'admin.products.form.submitCreate')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  {t(lang, 'common.cancel')}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product._id}>
            {product.image ? (
              <div className="mb-3 h-28 w-full rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
              </div>
            ) : null}
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-xl font-bold text-white">{product.name}</h3>
              <Badge variant={product.isActive ? 'success' : 'default'}>
                {product.isActive ? t(lang, 'admin.products.active') : t(lang, 'admin.products.inactive')}
              </Badge>
            </div>
            <p className="text-gray-400 text-sm mb-4">{product.description}</p>
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl font-bold text-minecraft-gold">
                {formatPrice(product.price)}
              </span>
              <Badge variant="info">{product.category}</Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => handleEdit(product)} className="flex-1">
                <FaEdit />
                <span>{t(lang, 'common.edit')}</span>
              </Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(product._id)} className="flex-1">
                <FaTrash />
                <span>{t(lang, 'common.delete')}</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {products.length === 0 && !loading && (
        <div className="text-center py-20">
          <FaShoppingCart className="text-6xl text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">{t(lang, 'admin.products.empty')}</p>
        </div>
      )}
    </div>
  );
}
