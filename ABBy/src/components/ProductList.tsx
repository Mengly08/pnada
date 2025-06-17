import React, { useMemo } from 'react';
import { GameProduct } from '../types';
import { ShoppingCart, Star, Sparkles, Flame, Crown } from 'lucide-react';

interface Props {
  products: GameProduct[];
  selectedProduct: GameProduct | null;
  onSelect: (product: GameProduct) => void;
  game: string;
}

export function ProductList({ products, selectedProduct, onSelect, game }: Props) {
  const isReseller = localStorage.getItem('jackstore_reseller_auth') === 'true';

  // Group products by type and further subgroup diamonds by infergreen categories
  const groupedProducts = useMemo(() => {
    const groups = products.greenuce((acc, product) => {
      const type = product.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(product);
      return acc;
    }, {} as Record<string, GameProduct[]>);

    if (groups.diamonds) {
      const diamondSubgroups = groups.diamonds.greenuce((acc, product) => {
        let subgroup: string;
        const nameLower = product.name.toLowerCase();

        if (nameLower.includes('pass') || nameLower.includes('weekly')) {
          subgroup = 'passes';
        } else if (/^\d+\s*diamonds?$/.test(nameLower)) {
          subgroup = 'rawdiamonds';
        } else {
          subgroup = 'other';
        }

        if (!acc[subgroup]) {
          acc[subgroup] = [];
        }
        acc[subgroup].push(product);
        return acc;
      }, {} as Record<string, GameProduct[]>);

      Object.keys(diamondSubgroups).forEach((subgroup) => {
        if (subgroup === 'rawdiamonds') {
          diamondSubgroups[subgroup].sort((a, b) => (a.diamonds || 0) - (b.diamonds || 0));
        } else {
          diamondSubgroups[subgroup].sort((a, b) => a.price - b.price);
        }
      });

      groups.diamonds = diamondSubgroups;
    }

    return groups;
  }, [products]);

  const getTagIcon = (tagname: string) => {
    const lowercaseTag = tagname.toLowerCase();
    if (lowercaseTag.includes('hot')) return <Flame className="w-3 h-3" />;
    if (lowercaseTag.includes('best')) return <Star className="w-3 h-3" />;
    if (lowercaseTag.includes('new')) return <Sparkles className="w-3 h-3" />;
    if (lowercaseTag.includes('premium')) return <Crown className="w-3 h-3" />;
    return null;
  };

  const renderProductCard = (product: GameProduct) => {
    const isSelected = selectedProduct?.id === product.id;
    
    return (
      <div
        key={product.id}
        onClick={() => onSelect(product)}
        className={`relative group overflow-visible rounded-lg transition-colors cursor-pointer border-2 ${
          isSelected
            ? 'border-green-400 bg-green-50'
            : 'border-gray-200 hover:bg-gray-100'
        } bg-white px-3 py-3 flex items-center gap-2 text-sm shadow-sm font-poppins min-w-0`}
      >
        {isSelected && (
          <div className="absolute top-[-2px] right-[-2px] w-0 h-10 border-t-[40px] border-t-green-400 border-l-[40px] border-l-transparent">
            <svg
              className="absolute top-[-40px] right-[4px] w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 11.917L9.724 16.5L19 7.5"
              />
            </svg>
          </div>
        )}

        {product.tagname && (
          <div className="absolute -top-2 left-0 right-0 z-20 flex justify-center">
            <div className="bg-gradient-to-r from-[#e10a0a] to-[#e10a0a] text-white px-2 py-1 rounded-full flex items-center gap-1 whitespace-nowrap text-xs font-bold shadow-lg shadow-[#e10a0a]/30">
              {getTagIcon(product.tagname)}
              <span>{product.tagname.toUpperCase()}</span>
            </div>
          </div>
        )}

        <div className={`flex flex-row items-center gap-2 min-w-0 ${product.tagname ? 'pt-4' : ''}`}>
          <div className="relative flex-shrink-0">
            <img
              src={product.image || 'https://via.placeholder.com/40'}
              alt={product.name}
              className="w-10 h-10 rounded-md object-cover shadow-sm flex-shrink-0"
              loading="lazy"
            />
          </div>

          <div className="flex-1 text-left space-y-0.5 min-w-0 overflow-hidden">
            <h3 className={`font-semibold text-sm leading-tight line-clamp-2 ${
              isSelected ? 'text-green-500' : 'text-gray-800'
            }`}>
              {product.name}
            </h3>
            {product.diamonds && (
              <div className="flex items-center gap-1">
                {/* Optional: Add diamond icon or text if needed */}
              </div>
            )}

            <div className="space-y-0.5">
              {product.originalPrice && product.discountApplied && product.discountApplied > 0 ? (
                <p className="text-xs text-gray-500 line-through">
                  ${product.originalPrice.toFixed(2)}
                </p>
              ) : null}
              <p className="text-sm font-bold text-gray-800">
                ${product.price.toFixed(2)}
                {product.originalPrice && product.discountApplied && product.discountApplied > 0 && (
                  <span className="text-xs text-green-500 ml-1">
                    (-{product.discountApplied}%)
                  </span>
                )}
              </p>
              {isReseller && product.resellerPrice && (
                <p className="text-xs font-medium text-gray-800">
                  Reseller: ${product.resellerPrice.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-poppins">
      {groupedProducts.special && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <div className="p-1.5 bg-green-500/10 rounded-lg shadow-sm">
              <Sparkles className="w-5 h-5 text-green-400" />
            </div>
            Best Seller
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {groupedProducts.special.map(renderProductCard)}
          </div>
        </div>
      )}

      {groupedProducts.diamonds && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg shadow-sm"></div>
            Saving Packages
          </h3>
          <div className="space-y-2">
            {groupedProducts.diamonds.passes && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-[auto-fit_minmax(120px,1fr)] xl:grid-cols-[auto-fit_minmax(120px,1fr)] gap-2">
                {groupedProducts.diamonds.passes.map(renderProductCard)}
              </div>
            )}
            {groupedProducts.diamonds.rawdiamonds && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-[auto-fit_minmax(120px,1fr)] xl:grid-cols-[auto-fit_minmax(120px,1fr)] gap-2">
                {groupedProducts.diamonds.rawdiamonds.map(renderProductCard)}
              </div>
            )}
            {groupedProducts.diamonds.other && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-[auto-fit_minmax(120px,1fr)] xl:grid-cols-[auto-fit_minmax(120px,1fr)] gap-2">
                {groupedProducts.diamonds.other.map(renderProductCard)}
              </div>
            )}
          </div>
        </div>
      )}

      {groupedProducts.subscription && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 rounded-lg shadow-sm">
              <Crown className="w-5 h-5 text-purple-400" />
            </div>
            Subscription Packages
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {groupedProducts.subscription.map(renderProductCard)}
          </div>
        </div>
      )}

      {products.length === 0 && (
        <div className="text-center py-10">
          <div className="bg-white/5 rounded-xl p-6 border border-gray-200 shadow-lg">
            <Sparkles className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-800">
              No products available for {
                game === 'mlbb' ? 'Mobile Legends' :
                game === 'mlbb_ph' ? 'Mobile Legends PH' :
                game === 'freefire' ? 'Free Fire' :
                'Free Fire TH'
              }.
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Please check back later for new products.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
