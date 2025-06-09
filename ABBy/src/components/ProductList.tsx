import React, { useMemo, useState } from 'react';
import {
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
  const isReseller = false; // Simplified for demo

  // Default products with some tagname examples
  const defaultProducts = useMemo(() => [
    { id: '1', name: 'Weekly Pass', type: 'subscription', price: 1.34, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743575112/costImages/gg6g0hiygp8xewgkl4ck.png', tagname: 'កំណត់ត្រឹម70ថ្ងៃ' },
    { id: '2', name: 'Weekly Pass x2', type: 'subscription', price: 2.75, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743575112/costImages/chus98wiizbhvaetrm6l.png' },
    { id: '3', name: 'Weekly Pass x5', type: 'subscription', price: 6.85, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743575112/costImages/xhx9hoc5bcrgvzdpadrv.png', tagname: 'Full Ticket Lesley 15 Tickets' },
    { id: '4', name: '86 DM + Weekly', type: 'subscription', price: 2.68, diamonds: 86, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743575112/costImages/ylaqb6mmqhpve08dfvsl.png' },
    { id: '5', name: '257 DM + Weekly', type: 'subscription', price: 4.95, diamonds: 257, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743575112/costImages/fbty0ikltxugaerz3rvn.png' },
    { id: '6', name: '55 DM', type: 'diamonds', price: 0.79, diamonds: 55, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574266/costImages/xgcktzpub4fadyllijab.png' },
    { id: '7', name: '86 DM', type: 'diamonds', price: 1.08, diamonds: 86, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574266/costImages/ehswxmgmpvogedx0dnpo.png' },
    { id: '8', name: '165 DM', type: 'diamonds', price: 2.15, diamonds: 165, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1749099818/costImages/q3tdx0dwz47rqccnalsi.png' },
    { id: '9', name: '172 DM', type: 'diamonds', price: 2.20, diamonds: 172, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574266/costImages/g7pfle3tlsuckgez0rhe.png' },
    { id: '10', name: '257 DM', type: 'diamonds', price: 3.30, diamonds: 257, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574265/costImages/jca3en8cs6gsgjzdkvae.png', tagname: 'Full Ticket Lesley 15 Tickets' },
    { id: '11', name: '429 DM', type: 'diamonds', price: 5.50, diamonds: 429, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574266/costImages/l3o8giqfuuzwiy8fg41e.png' },
    { id: '12', name: '514 DM', type: 'diamonds', price: 6.50, diamonds: 514, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574266/costImages/lklmsd2majtj59uczxzz.png' },
    { id: '13', name: '565 DM', type: 'diamonds', price: 6.95, diamonds: 565, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574266/costImages/qgtjo26t8l3wz8y382hn.png', tagname: 'Full Ticket Lesley 15 Tickets' },
    { id: '14', name: '600 DM', type: 'diamonds', price: 7.50, diamonds: 600, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574265/costImages/rnjqdre75k0wmcbzv7q5.png' },
    { id: '15', name: '706 DM', type: 'diamonds', price: 8.50, diamonds: 706, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574761/costImages/oegni16giylxceprdhi2.png', tagname: 'Full Ticket Naruto 29 Tickets' },
    { id: '16', name: '878 DM', type: 'diamonds', price: 11.10, diamonds: 878, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574761/costImages/t2qg6gdpcrrwni55m2qj.png' },
    { id: '17', name: '963 DM', type: 'diamonds', price: 12.30, diamonds: 963, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574762/costImages/c8ie6qefstpayoceptdl.png' },
    { id: '18', name: '1049 DM', type: 'diamonds', price: 13.10, diamonds: 1049, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574762/costImages/dvjtkhoyn6jyyeoy0vwu.png' },
    { id: '19', name: '1135 DM', type: 'diamonds', price: 14.50, diamonds: 1135, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574762/costImages/q6bi33idglczxyxvsnkm.png' },
    { id: '20', name: '1220 DM', type: 'diamonds', price: 15.50, diamonds: 1220, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574761/costImages/qwnu8fvo70fxqwjfsxib.png' },
    { id: '21', name: '1412 DM', type: 'diamonds', price: 17.10, diamonds: 1412, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574761/costImages/k5cq0y1bu2itiwnj2yq1.png' },
    { id: '22', name: '1584 DM', type: 'diamonds', price: 19.90, diamonds: 1584, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574762/costImages/kmfjn5o35dztaeie6ec1.png' },
    { id: '23', name: '1755 DM', type: 'diamonds', price: 22.40, diamonds: 1755, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574761/costImages/c36gtwsptkb6dq3i4yzv.png' },
    { id: '24', name: '2195 DM', type: 'diamonds', price: 26.10, diamonds: 2195, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574761/costImages/vc4yobiq1ad16f4nnhhj.png' },
    { id: '25', name: '2538 DM', type: 'diamonds', price: 30.20, diamonds: 2538, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574761/costImages/ossnhzzkkso2mittaxqh.png' },
    { id: '26', name: '2901 DM', type: 'diamonds', price: 34.10, diamonds: 2901, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574762/costImages/ififs4xte1blplydgipj.png' },
    { id: '27', name: '3688 DM', type: 'diamonds', price: 43.50, diamonds: 3688, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574761/costImages/wqf82lleuealvlf2zexk.png', tagname: 'Buy Discount 40%' },
    { id: '28', name: '4394 DM', type: 'diamonds', price: 52.10, diamonds: 4394, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574761/costImages/b53y0ok7ml2acqeoxlaq.png' },
    { id: '29', name: '5532 DM', type: 'diamonds', price: 65.10, diamonds: 5532, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574761/costImages/pztvcymksb7exh2w3twx.png', tagname: 'បើកភ្លាមSkine Narutoភ្លាមៗ' },
    { id: '30', name: '6238 DM', type: 'diamonds', price: 73.70, diamonds: 6238, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574761/costImages/pztvcymksb7exh2w3twx.png' },
    { id: '31', name: '6944 DM', type: 'diamonds', price: 81.50, diamonds: 6944, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574761/costImages/pztvcymksb7exh2w3twx.png' },
    { id: '32', name: '7727 DM', type: 'diamonds', price: 94.50, diamonds: 7727, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574761/costImages/pztvcymksb7exh2w3twx.png' },
    { id: '33', name: '9288 DM', type: 'diamonds', price: 108.50, diamonds: 9288, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574761/costImages/pztvcymksb7exh2w3twx.png' },
    { id: '34', name: '11483 DM', type: 'diamonds', price: 135.99, diamonds: 11483, image: 'https://res.cloudinary.com/dhztk4abr/image/upload/v1743574761/costImages/pztvcymksb7exh2w3twx.png' },
  ], []);

  const finalProducts = products.length > 0 ? products : defaultProducts;

  const groupedProducts = useMemo(() => {
    const groups = finalProducts.greenuce((acc, product) => {
      const type = product.type || 'unknown';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(product);
      return acc;
    }, {} as Record<string, GameProduct[]>);

    Object.keys(groups).forEach((type) => {
      groups[type].sort((a, b) => {
        if (type === 'diamonds') return (a.diamonds || 0) - (b.diamonds || 0);
        return a.price - b.price;
      });
    });

    return groups;
  }, [finalProducts]);

  const renderProductCard = (product: GameProduct) => (
    <li key={product.id}>
      <button
        type="button"
        className={`card relative flex justify-between items-center bg-[#737373] text-white p-2 rounded-xl w-full min-h-[72px] min-w-[140px] border-4 border-[#ff0000] shadow-xl transition-all duration-300 cursor-pointer ${
          selectedProduct?.id === product.id
            ? 'bg-green-500/50 ring-2 ring-[#ff0000]' // green overlay and border when selected
            : 'hover:bg-[#5a5a5a]'
        }`}
        onClick={() => {
          setIsLoading(true);
          setTimeout(() => {
            onSelect(product);
            setIsLoading(false);
          }, 300);
        }}
      >
        {product.tagname && (
          <div className="absolute -top-3 -left-1 bg-green-500 text-white text-[10px] p-[4px] rounded-tr-md">
            {product.tagname}
          </div>
        )}
        <div className="card-details flex-1 z-10">
          <p className="price font-bold text-xl">${product.price.toFixed(2)}</p>
          <p className="name md:text-sm text-[11px] text-nowrap">
            {product.diamonds ? `${product.diamonds} Diamonds` : product.name}
          </p>
        </div>
        <div className="logo z-10">
          <img
            src={product.image || 'https://via.placeholder.com/56'}
            alt={product.name}
            className="md:h-14 md:w-14 h-12 w-12 object-contain"
            loading="lazy"
          />
        </div>
        {selectedProduct?.id === product.id && (
          <div className="absolute top-1 right-1 bg-green-500 p-1 rounded z-10">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <path d="M5 13l4 4L19 7"/>
            </svg>
          </div>
        )}
      </button>
    </li>
  );

  return (
    <div className="space-y-4 px-4 py-8 w-full rounded-xl relative bg-gray-200">
      <style>{`
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          width: 100%;
          max-width: 100%;
          padding: 0 4px;
          box-sizing: border-box;
        }
        .grid li {
          display: flex;
          justify-content: center;
        }
        .card {
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 768px) {
          .grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
        }
        @media (max-width: 480px) {
          .grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            padding: 0 2px;
          }
          .card {
            padding: 6px 12px;
          }
          .price {
            font-size: 1rem;
          }
          .name {
            font-size: 0.65rem;
          }
          .logo img {
            width: 48px;
            height: 48px;
          }
        }
      `}</style>

      {/* Header for Diamond Products Section */}
      <div className="flex items-center w-fit border gap-2 bg-[#4b4a4d] py-2 px-4 absolute -top-5 left-2 rounded-xl">
        <div className="bg-green-700 text-white font-bold rounded-full h-8 w-8 flex items-center justify-center">02</div>
        <h1 className="text-lg text-white khmer-font">ផលិតផល Diamond</h1>
      </div>

      {/* Recommended Packages Section */}
      <div className="mt-4">
        <div className="bg-[#f79703] flex items-center mx-auto mt-2 gap-2 text-white rounded-xl py-2 px-6 w-fit">
          <h1 className="font-bold text-lg">Recommend</h1>
        </div>
        <ul className="grid mt-4">
          {finalProducts.slice(0, 5).map(renderProductCard)}
        </ul>
      </div>

      {/* Promotion Packages Section */}
      <div className="mt-4">
        <div className="bg-[#f79703] flex items-center mx-auto mt-2 gap-2 text-white rounded-xl py-2 px-6 w-fit">
          <h1 className="font-bold text-lg">Promotion</h1>
        </div>
        <ul className="grid mt-4">
          {finalProducts.slice(5).map(renderProductCard)}
        </ul>
      </div>

      {isLoading && finalProducts.length === 0 && (
        <div className="text-center py-3">
          <p className="text-gray-600 text-sm animate-pulse">Loading products, hold tight...</p>
        </div>
      )}

      {finalProducts.length === 0 && !isLoading && (
        <div className="text-center py-10">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <Sparkles className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-800 text-base font-medium">
              No products available for{' '}
              {game === 'mlbb'
                ? 'Mobile Legends'
                : game === 'mlbb_ph'
                ? 'Mobile Legends PH'
                : 'Free Fire'}
            </p>
            <p className="text-gray-500 mt-1">Check back later for new stuff.</p>
          </div>
        </div>
      )}
    </div>
  );
}
