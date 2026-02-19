'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaEdit, FaTrash, FaShoppingCart } from 'react-icons/fa';
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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'RANK',
    features: [''],
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
      const url = editingProduct ? '/api/admin/products' : '/api/admin/products';
      const method = editingProduct ? 'PATCH' : 'POST';
      const body = editingProduct
        ? { productId: editingProduct._id, updates: formData }
        : formData;

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
      price: product.price,
      category: product.category,
      features: product.features.length > 0 ? product.features : [''],
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
      price: 0,
      category: 'RANK',
      features: [''],
      isActive: true,
      isUnlimited: true,
      stock: 0,
    });
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
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t(lang, 'admin.products.title')}</h1>
          <p className="text-gray-400">{t(lang, 'admin.products.subtitle')}</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <FaPlus />
          <span>{t(lang, 'admin.products.new')}</span>
        </Button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-lg p-8 max-w-2xl w-full my-8"
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
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t(lang, 'admin.products.form.category')}
                  </label>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="RANK">{t(lang, 'admin.products.category.ranks')}</option>
                    <option value="ITEMS">{t(lang, 'admin.products.category.items')}</option>
                    <option value="KEYS">{t(lang, 'admin.products.category.keys')}</option>
                    <option value="BUNDLES">{t(lang, 'admin.products.category.bundles')}</option>
                    <option value="OTHER">{t(lang, 'admin.products.category.other')}</option>
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
