'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaShoppingCart, FaCheck, FaTags } from 'react-icons/fa';
import PageHeader from '@/components/PageHeader';
import AnimatedSection from '@/components/AnimatedSection';
import { Card, Button, Badge } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import { toast } from 'react-toastify';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  features: string[];
  image?: string;
}

export default function TiendaPage() {
  const [lang, setLang] = useState<Lang>('es');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  const categories = [
    { value: 'ALL', label: t(lang, 'shop.categories.all') },
    { value: 'RANK', label: t(lang, 'shop.categories.rank') },
    { value: 'BUNDLES', label: t(lang, 'shop.categories.bundles') },
    { value: 'CURRENCY', label: t(lang, 'shop.categories.currency') },
    { value: 'KEYS', label: t(lang, 'shop.categories.keys') },
    { value: 'SPECIAL', label: t(lang, 'shop.categories.special') },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        toast.error(t(lang, 'shop.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = selectedCategory === 'ALL' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const handlePurchase = (product: Product) => {
    toast.info(t(lang, 'shop.soonPayment'));
  };

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <PageHeader
        title={t(lang, 'shop.title')}
        description={t(lang, 'shop.headerDesc')}
        icon={<FaShoppingCart className="text-6xl text-minecraft-gold" />}
      />

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {categories.map((category) => (
          <button
            key={category.value}
            onClick={() => setSelectedCategory(category.value)}
            className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
              selectedCategory === category.value
                ? 'bg-minecraft-grass text-white'
                : 'bg-gray-900/50 text-gray-300 hover:bg-gray-800'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="shimmer h-96">
              <div></div>
            </Card>
          ))}
        </div>
      ) : (
        <AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product._id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full flex flex-col">
                  {/* Product Image */}
                  <div className="w-full h-48 bg-gradient-to-br from-minecraft-grass/20 to-minecraft-diamond/20 rounded-md mb-4 flex items-center justify-center">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="h-32 object-contain" />
                    ) : (
                      <FaTags className="text-6xl text-minecraft-gold" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-grow">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white min-w-0 truncate">{product.name}</h3>
                      <div className="shrink-0">
                        <Badge variant="info">{product.category}</Badge>
                      </div>
                    </div>
                    <p className="text-gray-400 mb-4">{product.description}</p>

                    {/* Features */}
                    {product.features && product.features.length > 0 && (
                      <ul className="space-y-2 mb-4">
                        {product.features.slice(0, 3).map((feature, i) => (
                          <li key={i} className="flex items-start space-x-2 text-sm text-gray-300">
                            <FaCheck className="text-minecraft-grass mt-1 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Price and Buy Button */}
                  <div className="mt-auto pt-4 border-t border-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-bold text-minecraft-gold">
                        {formatPrice(product.price)}
                      </span>
                      <Button onClick={() => handlePurchase(product)}>
                        <FaShoppingCart />
                        <span>{t(lang, 'shop.buy')}</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">{t(lang, 'shop.emptyCategory')}</p>
            </div>
          )}
        </AnimatedSection>
      )}
    </div>
  );
}
