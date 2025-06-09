import React, { useMemo, useState } from 'react';
import { Check, ShoppingCart, Star, Sparkles, Flame, Crown } from 'lucide-react';

// Define the GameProduct type
export interface GameProduct {
  id: string;
  name: string;
  type: 'diamonds' | 'subscription' | 'special';
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

  // Group products by type
  const groupedProducts = useMemo(() => {
    const groups = products.reduce((acc, product) => {
      const type = product.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(product);
      return acc;
    }, {} as Record<string, GameProduct[]>);

    // Sort diamonds packages by amount
    if (groups.diamonds) {
      groups.diamonds.sort((a, b) => (a.diamonds || 0) - (b.diamonds || 0));
    }

    // Sort other groups by price
    if (groups.subscription) {
      groups.subscription.sort((a, b) => a.price - b.price);
    }
    if (groups.special) {
      groups.special.sort((a, b) => a.price - b.price);
    }

    return groups;
  }, [products]);

  // Helper function to get tagname icon
  const getTagIcon = (tagname: string) => {
    const lowercaseTag = tagname.toLowerCase();
    if (lowercaseTag.includes('hot')) return <Flame className="w-3 h-3" />;
    if (lowercaseTag.includes('best')) return <Star className="w-3 h-3" />;
    if (lowercaseTag.includes('new')) return <Sparkles className="w-3 h-3" />;
    if (lowercaseTag.includes('premium')) return <Crown className="w-3 h-3" />;
    return null;
  };

  const renderProductCard = (product: GameProduct) => (
    <div
      key={product.id}
      onClick={() => {
        setIsLoading(true);
        setTimeout(() => {
          onSelect(product);
          setIsLoading(false);
        }, 300); // Simulate async selection
      }}
      className={`relative group overflow-visible rounded-xl transition-all duration-300 cursor-pointer transform hover:scale-105 border ${
        selectedProduct?.id === product.id
          ? 'border-2 border-blue-500 bg-[#ADD8E6] shadow-blue-500/50 shadow-lg'
          : 'border-black/10 hover:border-black/50 bg-white hover:bg-gray-100'
      }`}
    >
      {/* Tagname badge with dynamic styling */}
      {product.tagname && (
        <div className="absolute -top-3 left-0 right-0 z-20 flex justify-center">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-blue-500 blur opacity-50 rounded-full"></div>
            <div className="relative bg-gradient-to-r from-blue-500 to-black-500 text-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap text-xs font-bold">
              {getTagIcon(product.tagname)}
              <span className="relative z-10">{product.tagname.toUpperCase()}</span>
            </div>
          </div>
        </div>
      )}
      {/* Product content with horizontal layout */}
      <div className={`p-2 flex flex-row items-center gap-2 ${product.tagname ? 'pt-6' : ''} h-16`}>
        {/* Product image */}
        <div className="relative flex-shrink-0">
          <img
            src={product.image || 'https://via.placeholder.com/40'}
            alt={product.name}
            className="w-10 h-10 rounded-lg object-cover transform group-hover:scale-110 transition-transform relative z-10"
            loading="lazy"
          />
        </div>
        {/* Product details in a vertical stack */}
        <div className="text-left space-y-0.5 flex-1 overflow-hidden">
          <h3 className="font-medium text-xs text-black leading-tight truncate">{product.name}</h3>
          {product.diamonds && (
            <div className="flex items-center gap-1">
              <img
                src="https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG"
                alt="Diamond"
                className="w-3 h-3 object-contain"
              />
              <span className="text-xs font-semibold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
                {product.diamonds.toLocaleString()}
              </span>
            </div>
          )}
          {/* Price section */}
          <div className="space-y-0">
            {product.originalPrice && product.discountApplied && product.discountApplied > 0 ? (
              <p className="text-[10px] text-gray-400 line-through decoration-blue-500/50">
                ${product.originalPrice.toFixed(2)}
              </p>
            ) : null}
            <p className="text-sm font-bold text-black">
              ${product.price.toFixed(2)}
              {product.originalPrice && product.discountApplied && product.discountApplied > 0 && (
                <span className="text-[10px] text-green-400 ml-1">
                  (-{product.discountApplied}%)
                </span>
              )}
            </p>
            {isReseller && product.resellerPrice && (
              <p className="text-[10px] font-medium text-black/80">
                Reseller: ${product.resellerPrice.toFixed(2)}
              </p>
            )}
          </div>
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
    <div className="space-y-6 bg-[#ADD8E6] p-4 rounded-md">
      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-4">
          <p className="text-black text-sm animate-pulse">Loading products, hold tight...</p>
        </div>
      )}
      {/* TOP SELLER */}
      {groupedProducts.special && (
        <div>
          <h3 className="text-lg font-semibold text-black mb-3 flex items-center gap-2">
            <div className="p-1.5 bg-black/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-black-400" />
            </div>
            TOP SELLER
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {groupedProducts.special.map(renderProductCard)}
          </div>
        </div>
      )}
      {/* Diamonds Packages */}
      {groupedProducts.diamonds && (
        <div>
          <h3 className="text-lg font-semibold text-black mb-3 flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg">
              <img
                src="https://raw.githubusercontent.com/Cheagjihvg/jackstore-asssets/refs/heads/main/IMG_3979.PNG"
                alt="Diamonds"
                className="w-5 h-5"
              />
            </div>
            Diamond Packages
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {groupedProducts.diamonds.map(renderProductCard)}
          </div>
        </div>
      )}
      {/* Subscription Packages */}
      {groupedProducts.subscription && (
        <div>
          <h3 className="text-lg font-semibold text-black mb-3 flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 rounded-lg">
              <Crown className="w-5 h-5 text-purple-400" />
            </div>
            Subscription Packages
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {groupedProducts.subscription.map(renderProductCard)}
          </div>
        </div>
      )}
      {/* Empty State */}
      {products.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="bg-black/80 rounded-xl p-8 border border-black/10">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-black text-lg font-medium">
              No products available for{' '}
              {game === 'mlbb' ? 'Mobile Legends' : game === 'mlbb_ph' ? 'Mobile Legends PH' : 'Free Fire'}.
            </p>
            <p className="text-gray-400 mt-2">Check back later for new stuff.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Example usage component (for testing)
export const ProductListDemo = () => {
  const [selectedProduct, setSelectedProduct] = useState<GameProduct | null>(null);
  const demoProducts: GameProduct[] = [
    {
      id: '1',
      name: '333 Diamonds',
      type: 'diamonds',
      price: 4.49,
      originalPrice: 5.99,
      discountApplied: 25,
      resellerPrice: 4.29,
      diamonds: 333,
      image: 'https://via.placeholder.com/40',
      tagname: 'Hot',
    },
    {
      id: '2',
      name: 'Monthly Pass',
      type: 'subscription',
      price: 5.99,
      resellerPrice: 5.39,
      image: 'https://via.placeholder.com/40',
      tagname: 'Premium',
    },
    {
      id: '3',
      name: 'Special Bundle',
      type: 'special',
      price: 12.50,
      originalPrice: 16.00,
      discountApplied: 21,
      diamonds: 500,
      image: 'https://via.placeholder.com/40',
      tagname: 'New',
    },
  ];

  return (
    <div
      className="min-h-screen bg-fixed bg-cover bg-center flex flex-col relative"
      style={{ backgroundImage: `url("https://via.placeholder.com/1920x1080")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <ProductList
        products={demoProducts}
        selectedProduct={selectedProduct}
        onSelect={setSelectedProduct}
        game="mlbb"
      />
    </div>
  );
};
