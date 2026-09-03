import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Category, Subcategory, Service, Order } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency } from '../../lib/currency';
import { INITIAL_CATALOG } from '../../lib/initialData';
import { IconRenderer } from '../../components/common/IconRenderer';
import { CategoryLogo } from '../../components/common/CategoryLogo';
import { getEffectiveLogoUrl, getSubcategoryLogoUrl } from '../../lib/logoHelper';
import { OrderFormModal } from '../../components/order/OrderFormModal';
import { OrderSuccessModal } from '../../components/order/OrderSuccessModal';
import {
  Search,
  ChevronRight,
  ArrowLeft,
  Zap,
  Flame,
  Clock,
  RotateCcw,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';

interface CreateOrderViewProps {
  onOpenDeposit: () => void;
  onNavigate: (view: string) => void;
}

export const CreateOrderView: React.FC<CreateOrderViewProps> = ({ onOpenDeposit, onNavigate }) => {
  const { profile, isBlocked } = useAuth();
  const { settings } = useSettings();

  // Navigation hierarchy state
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);

  // Modal states
  const [activeServiceForOrder, setActiveServiceForOrder] = useState<Service | null>(null);
  const [latestPlacedOrder, setLatestPlacedOrder] = useState<Order | null>(null);

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // Subscribe to active categories in real-time
  useEffect(() => {
    const q = query(
      collection(db, 'categories'),
      where('isActive', '==', true),
      orderBy('sortOrder', 'asc')
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
          list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          setCategories(list);
        } else {
          setCategories(INITIAL_CATALOG.categories);
        }
        setIsLoadingCatalog(false);
      },
      (err) => {
        console.warn('Categories query notice, using default catalog:', err);
        setCategories(INITIAL_CATALOG.categories);
        setIsLoadingCatalog(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Subscribe to subcategories when a category is selected
  useEffect(() => {
    if (!selectedCategory) {
      setSubcategories([]);
      return;
    }
    const q = query(
      collection(db, 'subcategories'),
      where('categoryId', '==', selectedCategory.id),
      where('isActive', '==', true)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Subcategory));
          list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          setSubcategories(list);
        } else {
          const fallbackSubs = INITIAL_CATALOG.subcategories.filter((s) => s.categoryId === selectedCategory.id);
          setSubcategories(fallbackSubs);
        }
      },
      (err) => {
        console.warn('Subcategories query notice:', err);
        const fallbackSubs = INITIAL_CATALOG.subcategories.filter((s) => s.categoryId === selectedCategory.id);
        setSubcategories(fallbackSubs);
      }
    );
    return () => unsubscribe();
  }, [selectedCategory]);

  // Subscribe to services when a subcategory is selected
  useEffect(() => {
    if (!selectedSubcategory) {
      setServices([]);
      return;
    }
    const q = query(
      collection(db, 'services'),
      where('subcategoryId', '==', selectedSubcategory.id),
      where('isActive', '==', true)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Service));
          list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          setServices(list);
        } else {
          const fallbackSrvs = INITIAL_CATALOG.services.filter((s) => s.subcategoryId === selectedSubcategory.id);
          setServices(fallbackSrvs);
        }
      },
      (err) => {
        console.warn('Services query notice:', err);
        const fallbackSrvs = INITIAL_CATALOG.services.filter((s) => s.subcategoryId === selectedSubcategory.id);
        setServices(fallbackSrvs);
      }
    );
    return () => unsubscribe();
  }, [selectedSubcategory]);

  // Global search filtering
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  const userCurrency = profile?.currency || 'INR';

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 pb-28">
      {/* Blocked User Notice */}
      {isBlocked && (
        <div className="mb-4 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <span className="font-bold text-white block">Your account has been suspended</span>
            <span>You cannot place new orders. Please contact customer support.</span>
          </div>
        </div>
      )}

      {/* Announcement Banner from Admin Settings */}
      {settings.announcement && (
        <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-emerald-950/70 to-slate-900 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2 shadow-lg shadow-emerald-950/20">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium truncate">{settings.announcement}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          id="search-input-catalog"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search services or categories..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 focus:border-emerald-500 focus:outline-none text-white text-sm placeholder:text-slate-500 transition shadow-lg shadow-slate-950/40"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
          >
            Clear
          </button>
        )}
      </div>

      {/* Breadcrumb / Navigation Bar */}
      {(selectedCategory || selectedSubcategory) && (
        <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-slate-400">
          <button
            onClick={() => {
              setSelectedCategory(null);
              setSelectedSubcategory(null);
            }}
            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 p-1 rounded transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Categories</span>
          </button>

          {selectedCategory && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <button
                onClick={() => setSelectedSubcategory(null)}
                className={`hover:text-white transition ${
                  !selectedSubcategory ? 'text-white' : 'text-slate-400'
                }`}
              >
                {selectedCategory.name}
              </button>
            </>
          )}

          {selectedSubcategory && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-white truncate max-w-[140px]">
                {selectedSubcategory.name}
              </span>
            </>
          )}
        </div>
      )}

      {/* VIEW LEVEL 1: CATEGORY LIST (Default) */}
      {!selectedCategory && !selectedSubcategory && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1 mb-2">
            <h2 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
              Social Platforms
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {filteredCategories.length} available
            </span>
          </div>

          {isLoadingCatalog ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-2xl bg-slate-900/60 border border-slate-800/60 animate-pulse"
                />
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
              <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">No categories found</p>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery ? 'Try matching another keyword' : 'Categories will be added soon.'}
              </p>
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <div
                key={cat.id}
                id={`cat-card-${cat.slug}`}
                onClick={() => setSelectedCategory(cat)}
                className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/85 hover:bg-slate-850 border border-slate-800/90 hover:border-emerald-500/40 cursor-pointer transition shadow-md active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-slate-800 group-hover:bg-emerald-500/15 border border-slate-700/60 group-hover:border-emerald-500/30 flex items-center justify-center text-slate-300 group-hover:text-emerald-400 transition shadow-inner overflow-hidden p-1.5">
                    <CategoryLogo
                      logoUrl={cat.logoUrl}
                      iconName={cat.icon || cat.name}
                      name={cat.name}
                      className="w-full h-full flex items-center justify-center"
                      imageClassName="w-full h-full object-contain"
                      fallbackIconClassName="w-5 h-5 text-emerald-400"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                      {cat.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {cat.description || 'Explore services'}
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-800/80 group-hover:bg-emerald-500/20 flex items-center justify-center text-slate-400 group-hover:text-emerald-300 transition">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW LEVEL 2: SUBCATEGORIES FOR SELECTED CATEGORY */}
      {selectedCategory && !selectedSubcategory && (
        <div className="space-y-2.5">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 mb-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 overflow-hidden p-1.5 shrink-0">
              <CategoryLogo
                logoUrl={selectedCategory.logoUrl}
                iconName={selectedCategory.icon || selectedCategory.name}
                name={selectedCategory.name}
                className="w-full h-full flex items-center justify-center"
                imageClassName="w-full h-full object-contain"
                fallbackIconClassName="w-6 h-6 text-emerald-400"
              />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">{selectedCategory.name} Services</h2>
              <p className="text-xs text-slate-400">{selectedCategory.description}</p>
            </div>
          </div>

          <div className="px-1 mb-1">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
              Select Subcategory
            </h3>
          </div>

          {subcategories.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
              <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">No subcategories available</p>
              <p className="text-xs text-slate-500 mt-1">Please check back shortly.</p>
            </div>
          ) : (
            subcategories.map((subcat) => {
              const effectiveSubLogo = getSubcategoryLogoUrl(subcat, selectedCategory);

              return (
                <div
                  key={subcat.id}
                  id={`subcat-card-${subcat.id}`}
                  onClick={() => setSelectedSubcategory(subcat)}
                  className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/85 hover:bg-slate-850 border border-slate-800/90 hover:border-emerald-500/40 cursor-pointer transition shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-emerald-500/15 border border-slate-700/60 group-hover:border-emerald-500/30 flex items-center justify-center text-slate-300 group-hover:text-emerald-400 transition overflow-hidden p-1 shrink-0">
                      <CategoryLogo
                        logoUrl={effectiveSubLogo}
                        iconName={subcat.icon || 'Zap'}
                        name={subcat.name}
                        className="w-full h-full flex items-center justify-center"
                        imageClassName="w-full h-full object-contain"
                        fallbackIconClassName="w-4 h-4 text-emerald-400"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                        {subcat.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{subcat.description}</p>
                    </div>
                  </div>

                  <div className="w-7 h-7 rounded-full bg-slate-800/80 group-hover:bg-emerald-500/20 flex items-center justify-center text-slate-400 group-hover:text-emerald-300 transition">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW LEVEL 3: SERVICE LIST FOR SELECTED SUBCATEGORY */}
      {selectedCategory && selectedSubcategory && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 overflow-hidden p-1 shrink-0">
                <CategoryLogo
                  logoUrl={getEffectiveLogoUrl(selectedSubcategory, selectedCategory)}
                  iconName={selectedSubcategory.icon || 'Zap'}
                  name={selectedSubcategory.name}
                  className="w-full h-full flex items-center justify-center"
                  imageClassName="w-full h-full object-contain"
                  fallbackIconClassName="w-5 h-5 text-emerald-400"
                />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                  {selectedCategory.name}
                </span>
                <h2 className="text-base font-extrabold text-white leading-tight">
                  {selectedSubcategory.name}
                </h2>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {services.length} services
            </span>
          </div>

          <div className="px-1">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
              Select Service
            </h3>
          </div>

          {services.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
              <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">No active services in this subcategory</p>
              <p className="text-xs text-slate-500 mt-1">Admin will configure services soon.</p>
            </div>
          ) : (
            services.map((srv) => {
              const effectiveServiceLogo = getEffectiveLogoUrl(selectedSubcategory, selectedCategory);

              return (
                <div
                  key={srv.id}
                  id={`service-card-${srv.id}`}
                  onClick={() => setActiveServiceForOrder(srv)}
                  className="group relative p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800/90 hover:border-emerald-500/40 cursor-pointer transition shadow-lg active:scale-[0.99] space-y-3"
                >
                  {/* Header Row: Icon, Name, Price */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-emerald-500/15 border border-slate-700/60 group-hover:border-emerald-500/30 flex items-center justify-center text-slate-300 group-hover:text-emerald-400 transition shrink-0 overflow-hidden p-1">
                        <CategoryLogo
                          logoUrl={effectiveServiceLogo}
                          iconName={srv.icon || 'Zap'}
                          name={srv.name}
                          className="w-full h-full flex items-center justify-center"
                          imageClassName="w-full h-full object-contain"
                          fallbackIconClassName="w-5 h-5 text-emerald-400"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition leading-snug">
                          {srv.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {srv.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-extrabold text-sm text-emerald-400">
                        {formatCurrency(srv.pricePer1000, userCurrency)}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-medium">per 1000</span>
                    </div>
                  </div>

                  {/* Badges & Speeds */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      {srv.isPopular && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Flame className="w-3 h-3 text-amber-400" />
                          Most Popular
                        </span>
                      )}
                      <span className="text-slate-400 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-emerald-400" />
                        {srv.speed || 'Fast'}
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-400 font-mono">
                        Min: {srv.minimumQuantity.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:translate-x-0.5 transition">
                      <span>Order</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Order Placement Modal */}
      <OrderFormModal
        isOpen={!!activeServiceForOrder}
        service={activeServiceForOrder}
        category={selectedCategory}
        subcategory={selectedSubcategory}
        onClose={() => setActiveServiceForOrder(null)}
        onOpenDeposit={onOpenDeposit}
        onOrderSuccess={(order) => {
          setActiveServiceForOrder(null);
          setLatestPlacedOrder(order);
        }}
      />

      {/* Order Success Screen */}
      <OrderSuccessModal
        order={latestPlacedOrder}
        onClose={() => setLatestPlacedOrder(null)}
        onViewOrder={(orderId) => {
          setLatestPlacedOrder(null);
          onNavigate('orders');
        }}
        onCreateNew={() => {
          setLatestPlacedOrder(null);
        }}
      />
    </div>
  );
};
