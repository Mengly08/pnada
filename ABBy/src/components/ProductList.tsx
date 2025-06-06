import React, { useMemo } from 'react';
import { GameProduct } from '../types';
import { Check, ShoppingCart } from 'lucide-react';

interface Props {
  products: GameProduct[];
  selectedProduct: GameProduct | null;
  onSelect: (product: GameProduct) => void;
  game: 'mlbb' | 'freefire';
}

export function ProductList({ products, selectedProduct, onSelect, game }: Props) {
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

    return groups;
  }, [products]);

  const renderProductCard = (product: GameProduct) => (
    <div
      key={product.id}
      onClick={() => onSelect(product)}
      className={`relative group overflow-hidden rounded-xl transition-all duration-300 cursor-pointer ${
        selectedProduct?.id === product.id
          ? 'border-2 border-pink-400 bg-gradient-to-br from-pink-50 to-pink-100/50 transform scale-[1.02]'
          : 'border border-white/10 hover:border-pink-400/50 bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className="p-3 flex flex-col items-center gap-2"> {/* Reduced padding and gap */}
        <div className="relative">
          <img
            src={product.image}
            alt={product.name}
            className="w-12 h-12 rounded-xl object-cover transform group-hover:scale-105 transition-transform duration-300" // Smaller image
            loading="lazy"
          />
          {selectedProduct?.id === product.id && (
            <div className="absolute -top-2 -right-2 bg-pink-400 text-pink-900 rounded-full p-1">
              <Check className="w-3 h-3" /> {/* Smaller check icon */}
            </div>
          )}
        </div>

        <div className="text-center space-y-1">
          <h3 className="font-medium text-xs text-white">{product.name}</h3> {/* Smaller font size */}
          {product.diamonds && (
            <p className="text-xs text-pink-200">{product.diamonds} Diamonds</p>
          )}
          <p className="text-sm font-bold text-[#FFD700]"> {/* Changed to yellow */}
            ${product.price.toFixed(2)}
          </p>
          {isReseller && product.resellerPrice && (
            <p className="text-xs font-medium text-pink-400"> {/* Changed to pink */}
              Reseller Price: ${product.resellerPrice.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-2">
        <span className="text-xs text-white font-medium flex items-center gap-1">
          <ShoppingCart className="w-3 h-3" /> {/* Smaller cart icon */}
          Select Package
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4"> {/* Reduced space between sections */}
      {/* Diamonds Packages */}
      {groupedProducts.diamonds && (
        <div>
          <h3 className="text-md font-semibold text-white mb-2 flex items-center gap-2"> {/* Smaller heading */}
            💎 Diamond Packages
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"> {/* Reduced gap */}
            {groupedProducts.diamonds.map(renderProductCard)}
          </div>
        </div>
      )}

      {/* Subscription Packages */}
      {groupedProducts.subscription && (
        <div>
          <h3 className="text-md font-semibold text-white mb-2 flex items-center gap-2"> {/* Smaller heading */}
            🎮 Subscription Packages
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"> {/* Reduced gap */}
            {groupedProducts.subscription.map(renderProductCard)}
          </div>
        </div>
      )}

      {/* Special Packages */}
      {groupedProducts.special && (
        <div>
          <h3 className="text-md font-semibold text-white mb-2 flex items-center gap-2"> {/* Smaller heading */}
            ⭐ Special Packages
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"> {/* Reduced gap */}
            {groupedProducts.special.map(renderProductCard)}
          </div>
        </div>
      )}
    </div>
  );
}
