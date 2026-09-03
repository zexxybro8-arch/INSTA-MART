import React from 'react';
import { ShoppingBag, PlusCircle, Menu as MenuIcon } from 'lucide-react';

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  orderCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate, orderCount }) => {
  return (
    <nav
      id="bottom-navigation-bar"
      className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-xl px-4 py-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* Orders Button */}
        <button
          id="nav-btn-orders"
          onClick={() => onNavigate('orders')}
          className={`relative flex flex-col items-center justify-center py-1 px-4 rounded-xl transition ${
            currentView === 'orders' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <ShoppingBag className={`w-5 h-5 transition ${currentView === 'orders' ? 'scale-110' : ''}`} />
            {typeof orderCount === 'number' && orderCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-emerald-500 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {orderCount > 99 ? '99+' : orderCount}
              </span>
            )}
          </div>
          <span className="text-xs mt-1">Orders</span>
          {currentView === 'orders' && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" />
          )}
        </button>

        {/* Create Order Button (Center highlight) */}
        <button
          id="nav-btn-create"
          onClick={() => onNavigate('create')}
          className={`flex flex-col items-center justify-center py-1 px-5 rounded-2xl transition group ${
            currentView === 'create' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30 group-active:scale-95 transition -mt-3">
            <PlusCircle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-xs mt-1">Create</span>
        </button>

        {/* Menu Button */}
        <button
          id="nav-btn-menu"
          onClick={() => onNavigate('menu')}
          className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl transition ${
            currentView === 'menu' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MenuIcon className={`w-5 h-5 transition ${currentView === 'menu' ? 'scale-110' : ''}`} />
          <span className="text-xs mt-1">Menu</span>
          {currentView === 'menu' && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" />
          )}
        </button>
      </div>
    </nav>
  );
};
