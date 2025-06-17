import React, { useMemo, useState } from 'react';
import {
  Check,
  ShoppingCart,
  Star,
  Sparkles,
  Flame,
  Crown,
  Box,
} from 'lucide-react';

export interface GameProduct {
  id: string;
  name: string;
  type: string;
  price: number;
  originalPrice?: number;
  discountApplied?: number;
  resellerPrice?: number;
  diamonds?: number;
  image?: string;
  tagname?: string;
}

interface Props {
  products: GameProduct[];
  selectedProduct: GameProduct | null;
  onSelect: (product: GameProduct) => void;
  game: string;
}

export function ProductList({ products, selectedProduct, onSelect, game }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const isReseller = localStorage.getItem('jackstore_reseller_auth') === 'true';

  // Memoize grouped products to optimize rendering
  const groupedProducts = useMemo(() => {
    const groups = products.reduce((acc, product) => {
      const type = product.type || 'unknown';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(product);
      return acc;
    }, {} as Record<string, GameProduct[]>);

    // Sort products within each group
    Object.keys(groups).forEach((type) => {
      groups[type].sort((a, b) => {
        if (type === 'diamonds') return (a.diamonds || 0) - (b.diamonds || 0);
        return a.price - b.price;
      });
    });

    return groups;
  }, [products]);

  // Get icon for product tags
  const getTagIcon = (tagname: string) => {
    const lowercaseTag = tagname?.toLowerCase() || '';
    if (lowercaseTag.includes('hot')) return <Flame className="w-3 h-3" />;
    if (lowercaseTag.includes('best')) return <Star className="w-3 h-3" />;
    if (lowercaseTag.includes('new')) return <Sparkles className="w-3 h-3" />;
    if (lowercaseTag.includes('premium')) return <Crown className="w-3 h-3" />;
    return null;
  };

  // Get icon for product type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'special':
        return <Sparkles className="w-5 h-5 text-black" />;
      case 'diamonds':
        return (
          <img
            src="https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG"
            alt="Diamonds"
            className="w-5 h-5"
          />
        );
      case 'subscription':
        return <Crown className="w-5 h-5 text-purple-400" />;
      default:
        return <Box className="w-5 h-5 text-gray-400" />;
    }
  };

  // Render individual product card
  const renderProductCard = (product: GameProduct) => (
    <div
      key={product.id}
      onClick={() => {
        setIsLoading(true);
        setTimeout(() => {
          onSelect(product);
          setIsLoading(false);
        }, 300);
      }}
      className={`relative group flex items-center border rounded-md cursor-pointer transition-all duration-300 px-2 py-2 w-full ${
        selectedProduct?.id === product.id
          ? 'border-2 border-green-500 bg-[#9cff93] shadow-green-500/50 shadow-lg'
          : 'border-black/10 hover:border-black/50 bg-white hover:bg-gray-100'
      }`}
      style={{ minHeight: '50px' }}
    >
      {/* Price badge */}
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
        <div className="bg-[#15ff00] text-white px-2 py-0.5 rounded-full shadow-lg text-xs font-bold border border-white w-[50px] h-[20px] flex items-center justify-center">
          ${product.price.toFixed(2)}
        </div>
      </div>

      {/* Product image */}
      <img
        src={product.image || 'https://via.placeholder.com/30'}
        alt={product.name}
        className="w-6 h-6 rounded-lg object-cover mr-2"
      />

      {/* Product name and tag */}
      <div className="flex-1 text-center overflow-hidden">
        <div className="flex items-center justify-center gap-1">
          <h3 className="font-medium text-black text-xs">
            {product.diamonds ? `${product.diamonds} Diamonds` : product.name}
          </h3>
          {product.tagname && getTagIcon(product.tagname)}
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-1">
        <span className="text-xs text-white font-medium flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
          <ShoppingCart className="w-3 h-3" />
          {isLoading && selectedProduct?.id === product.id ? 'Selecting...' : 'Select Package'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 bg-[#9cff93] px-2 py-4 rounded-md w-full">
      <div className="w-full">
        {isLoading && products.length === 0 && (
          <div className="text-center py-4">
            <p className="text-black text-sm animate-pulse">Loading products, hold tight...</p>
          </div>
        )}

        {/* Dynamically render all groups */}
        {Object.entries(groupedProducts).map(([type, items]) => (
          <div key={type} className="mb-6">
            <h3 className="text-lg font-semibold text-black mb-3 flex items-center gap-2">
              <div className="p-1.5 bg-black/10 rounded-lg">{getTypeIcon(type)}</div>
              {type === 'diamonds'
                ? 'Diamond Packages'
                : type === 'subscription'
                ? 'Subscription Packages'
                : type === 'special'
                ? 'Top Seller'
                : `${type[0].toUpperCase()}${type.slice(1)} Packages`}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
              {items.map(renderProductCard)}
            </div>
            {items.length === 0 && (
              <p className="text-gray-500 text-sm text-center">No items in this category.</p>
            )}
          </div>
        ))}

        {products.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="bg-black/80 rounded-xl p-8 border border-black/10">
              <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-black text-lg font-medium">
                No products available for{' '}
                {game === 'mlbb'
                  ? 'Mobile Legends'
                  : game === 'mlbb_ph'
                  ? 'Mobile Legends PH'
                  : 'Free Fire'}
              </p>
              <p className="text-gray-400 mt-2">Check back later for new stuff.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
