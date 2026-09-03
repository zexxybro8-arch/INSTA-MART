import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Category, Subcategory, Service } from '../../types';
import { useToast } from '../../context/ToastContext';
import { IconRenderer } from '../../components/common/IconRenderer';
import { CategoryLogo } from '../../components/common/CategoryLogo';
import {
  getEffectiveLogoUrl,
  getSubcategoryLogoUrl,
  getCategoryLogoUrl,
  hasCustomSubcategoryLogo,
} from '../../lib/logoHelper';
import { formatCurrency } from '../../lib/currency';
import {
  Plus,
  Edit2,
  Trash2,
  Layers,
  Zap,
  Check,
  X,
  Flame,
  ChevronRight,
  FolderTree,
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
  CornerDownRight,
} from 'lucide-react';

interface AdminCatalogTabProps {
  currentSection?: 'categories' | 'subcategories' | 'services';
  onSectionChange?: (section: 'categories' | 'subcategories' | 'services') => void;
}

export const AdminCatalogTab: React.FC<AdminCatalogTabProps> = ({
  currentSection,
  onSectionChange,
}) => {
  const { success, error } = useToast();

  const [activeSection, setActiveSection] = useState<'categories' | 'subcategories' | 'services'>(
    currentSection || 'categories'
  );

  useEffect(() => {
    if (currentSection && currentSection !== activeSection) {
      setActiveSection(currentSection);
    }
  }, [currentSection]);

  const handleSectionSwitch = (sec: 'categories' | 'subcategories' | 'services') => {
    setActiveSection(sec);
    if (onSectionChange) onSectionChange(sec);
  };

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Category modal
  const [categoryModal, setCategoryModal] = useState<{ open: boolean; item: Category | null }>({
    open: false,
    item: null,
  });
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catIcon, setCatIcon] = useState('');
  const [catLogoUrl, setCatLogoUrl] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catSort, setCatSort] = useState(0);

  // Subcategory modal
  const [subcategoryModal, setSubcategoryModal] = useState<{ open: boolean; item: Subcategory | null }>({
    open: false,
    item: null,
  });
  const [subCatName, setSubCatName] = useState('');
  const [subCatParentId, setSubCatParentId] = useState('');
  const [subCatIcon, setSubCatIcon] = useState('');
  const [subCatLogoUrl, setSubCatLogoUrl] = useState('');
  const [subCatDesc, setSubCatDesc] = useState('');
  const [subCatSort, setSubCatSort] = useState(0);

  // Service modal
  const [serviceModal, setServiceModal] = useState<{ open: boolean; item: Service | null }>({
    open: false,
    item: null,
  });
  const [srvName, setSrvName] = useState('');
  const [srvCatId, setSrvCatId] = useState('');
  const [srvSubcatId, setSrvSubcatId] = useState('');
  const [srvPrice, setSrvPrice] = useState<number>(10);
  const [srvMin, setSrvMin] = useState<number>(100);
  const [srvMax, setSrvMax] = useState<number>(100000);
  const [srvSpeed, setSrvSpeed] = useState('Instant');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvIsPopular, setSrvIsPopular] = useState(false);
  const [srvSort, setSrvSort] = useState(0);

  // Real-time catalog subscriptions
  useEffect(() => {
    const unsubCats = onSnapshot(query(collection(db, 'categories'), orderBy('sortOrder', 'asc')), (s) => {
      setCategories(s.docs.map((d) => ({ id: d.id, ...d.data() } as Category)));
    });
    const unsubSubs = onSnapshot(query(collection(db, 'subcategories'), orderBy('sortOrder', 'asc')), (s) => {
      setSubcategories(s.docs.map((d) => ({ id: d.id, ...d.data() } as Subcategory)));
    });
    const unsubSrvs = onSnapshot(query(collection(db, 'services'), orderBy('sortOrder', 'asc')), (s) => {
      setServices(s.docs.map((d) => ({ id: d.id, ...d.data() } as Service)));
    });

    return () => {
      unsubCats();
      unsubSubs();
      unsubSrvs();
    };
  }, []);

  const getCategoryName = (catId: string) => categories.find((c) => c.id === catId)?.name || 'Category';
  const getSubcategoryName = (subId: string) => subcategories.find((s) => s.id === subId)?.name || 'Subcategory';

  // Category Actions
  const openCatModal = (cat: Category | null) => {
    if (cat) {
      setCatName(cat.name);
      setCatSlug(cat.slug);
      setCatIcon(cat.icon);
      setCatLogoUrl(cat.logoUrl || '');
      setCatDesc(cat.description);
      setCatSort(cat.sortOrder);
      setCategoryModal({ open: true, item: cat });
    } else {
      setCatName('');
      setCatSlug('');
      setCatIcon('Instagram');
      setCatLogoUrl('');
      setCatDesc('');
      setCatSort(categories.length + 1);
      setCategoryModal({ open: true, item: null });
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (categoryModal.item) {
        await updateDoc(doc(db, 'categories', categoryModal.item.id), {
          name: catName.trim(),
          slug: catSlug.trim() || catName.toLowerCase().replace(/\s+/g, '-'),
          icon: catIcon.trim(),
          logoUrl: catLogoUrl.trim(),
          description: catDesc.trim(),
          sortOrder: Number(catSort),
          updatedAt: Date.now(),
        });
        success('Category updated.');
      } else {
        await addDoc(collection(db, 'categories'), {
          name: catName.trim(),
          slug: (catSlug.trim() || catName.toLowerCase()).replace(/\s+/g, '-'),
          icon: catIcon.trim() || 'Instagram',
          logoUrl: catLogoUrl.trim(),
          description: catDesc.trim(),
          sortOrder: Number(catSort),
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        success('Category created.');
      }
      setCategoryModal({ open: false, item: null });
    } catch (err: any) {
      error(err?.message || 'Failed to save category.');
    }
  };

  const toggleCategoryActive = async (cat: Category) => {
    try {
      await updateDoc(doc(db, 'categories', cat.id), {
        isActive: !cat.isActive,
        updatedAt: Date.now(),
      });
      success(`Category ${!cat.isActive ? 'activated' : 'deactivated'}.`);
    } catch (err: any) {
      error(err?.message || 'Failed to toggle category.');
    }
  };

  const deleteCategory = async (cat: Category) => {
    try {
      await deleteDoc(doc(db, 'categories', cat.id));
      success(`Category "${cat.name}" deleted.`);
    } catch (err: any) {
      error(err?.message || 'Failed to delete category.');
    }
  };

  // Subcategory Actions
  const openSubCatModal = (sub: Subcategory | null) => {
    if (sub) {
      setSubCatName(sub.name);
      setSubCatParentId(sub.categoryId);
      setSubCatIcon(sub.icon);
      setSubCatLogoUrl(sub.logoUrl || '');
      setSubCatDesc(sub.description);
      setSubCatSort(sub.sortOrder);
      setSubcategoryModal({ open: true, item: sub });
    } else {
      setSubCatName('');
      setSubCatParentId(categories[0]?.id || '');
      setSubCatIcon('Zap');
      setSubCatLogoUrl('');
      setSubCatDesc('');
      setSubCatSort(subcategories.length + 1);
      setSubcategoryModal({ open: true, item: null });
    }
  };

  const handleSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parentCat = categories.find((c) => c.id === subCatParentId);
      if (subcategoryModal.item) {
        await updateDoc(doc(db, 'subcategories', subcategoryModal.item.id), {
          name: subCatName.trim(),
          categoryId: subCatParentId,
          categoryName: parentCat?.name || '',
          icon: subCatIcon.trim(),
          logoUrl: subCatLogoUrl.trim(),
          description: subCatDesc.trim(),
          sortOrder: Number(subCatSort),
          updatedAt: Date.now(),
        });
        success('Subcategory updated.');
      } else {
        await addDoc(collection(db, 'subcategories'), {
          name: subCatName.trim(),
          categoryId: subCatParentId,
          categoryName: parentCat?.name || '',
          icon: subCatIcon.trim() || 'Zap',
          logoUrl: subCatLogoUrl.trim(),
          description: subCatDesc.trim(),
          sortOrder: Number(subCatSort),
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        success('Subcategory created.');
      }
      setSubcategoryModal({ open: false, item: null });
    } catch (err: any) {
      error(err?.message || 'Failed to save subcategory.');
    }
  };

  // Service Actions
  const openServiceModal = (srv: Service | null) => {
    if (srv) {
      setSrvName(srv.name);
      setSrvCatId(srv.categoryId);
      setSrvSubcatId(srv.subcategoryId);
      setSrvPrice(srv.pricePer1000);
      setSrvMin(srv.minimumQuantity);
      setSrvMax(srv.maximumQuantity);
      setSrvSpeed(srv.speed || '');
      setSrvDesc(srv.description || '');
      setSrvIsPopular(!!srv.isPopular);
      setSrvSort(srv.sortOrder);
      setServiceModal({ open: true, item: srv });
    } else {
      setSrvName('');
      setSrvCatId(categories[0]?.id || '');
      setSrvSubcatId(subcategories[0]?.id || '');
      setSrvPrice(25);
      setSrvMin(100);
      setSrvMax(50000);
      setSrvSpeed('Fast 50K/Day');
      setSrvDesc('');
      setSrvIsPopular(false);
      setSrvSort(services.length + 1);
      setServiceModal({ open: true, item: null });
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parentCat = categories.find((c) => c.id === srvCatId);
      const parentSub = subcategories.find((s) => s.id === srvSubcatId);

      if (serviceModal.item) {
        await updateDoc(doc(db, 'services', serviceModal.item.id), {
          name: srvName.trim(),
          categoryId: srvCatId,
          categoryName: parentCat?.name || '',
          subcategoryId: srvSubcatId,
          subcategoryName: parentSub?.name || '',
          pricePer1000: Number(srvPrice),
          minimumQuantity: Number(srvMin),
          maximumQuantity: Number(srvMax),
          speed: srvSpeed.trim(),
          description: srvDesc.trim(),
          isPopular: srvIsPopular,
          sortOrder: Number(srvSort),
          updatedAt: Date.now(),
        });
        success('Service updated.');
      } else {
        await addDoc(collection(db, 'services'), {
          name: srvName.trim(),
          categoryId: srvCatId,
          categoryName: parentCat?.name || '',
          subcategoryId: srvSubcatId,
          subcategoryName: parentSub?.name || '',
          pricePer1000: Number(srvPrice),
          minimumQuantity: Number(srvMin),
          maximumQuantity: Number(srvMax),
          speed: srvSpeed.trim(),
          description: srvDesc.trim(),
          isPopular: srvIsPopular,
          icon: 'Zap',
          sortOrder: Number(srvSort),
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        success('Service created.');
      }
      setServiceModal({ open: false, item: null });
    } catch (err: any) {
      error(err?.message || 'Failed to save service.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Nav Pill Switcher */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800">
        <button
          onClick={() => handleSectionSwitch('categories')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
            activeSection === 'categories'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Categories ({categories.length})
        </button>
        <button
          onClick={() => handleSectionSwitch('subcategories')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
            activeSection === 'subcategories'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Subcategories ({subcategories.length})
        </button>
        <button
          onClick={() => handleSectionSwitch('services')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
            activeSection === 'services'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Services ({services.length})
        </button>
      </div>

      {/* SECTION 1: CATEGORIES */}
      {activeSection === 'categories' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                Platform Categories
              </h3>
              <p className="text-[11px] text-slate-500">
                Default logos configured here will be inherited by all child subcategories
              </p>
            </div>
            <button
              onClick={() => openCatModal(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-md shadow-purple-900/30"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 shadow-md hover:border-slate-700/80 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-200 shrink-0 shadow-inner overflow-hidden">
                    <CategoryLogo
                      logoUrl={cat.logoUrl}
                      iconName={cat.icon || cat.name}
                      name={cat.name}
                      className="w-full h-full flex items-center justify-center p-1.5"
                      imageClassName="w-full h-full object-contain"
                      fallbackIconClassName="w-5 h-5 text-purple-400"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white">{cat.name}</span>
                      <span
                        onClick={() => toggleCategoryActive(cat)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition ${
                          cat.isActive
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {cat.isActive ? 'Active' : 'Hidden'}
                      </span>
                      {cat.logoUrl?.trim() ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          Platform Logo Set
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-800/80">
                          Lucide: {cat.icon || 'Default'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{cat.description || 'No description'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openCatModal(cat)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Edit Category"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteCategory(cat)}
                    className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: SUBCATEGORIES */}
      {activeSection === 'subcategories' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                Service Subcategories
              </h3>
              <p className="text-[11px] text-slate-500">
                Subcategories inherit their parent platform logo unless an override logo URL is set
              </p>
            </div>
            <button
              onClick={() => openSubCatModal(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-md shadow-purple-900/30"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subcategory</span>
            </button>
          </div>

          <div className="space-y-2">
            {subcategories.map((sub) => {
              const parentCat = categories.find((c) => c.id === sub.categoryId);
              const effectiveLogo = getSubcategoryLogoUrl(sub, parentCat);
              const isOverridden = hasCustomSubcategoryLogo(sub);

              return (
                <div
                  key={sub.id}
                  className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 shadow-md hover:border-slate-700/80 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-200 shrink-0 shadow-inner overflow-hidden">
                      <CategoryLogo
                        logoUrl={effectiveLogo}
                        iconName={sub.icon || 'Zap'}
                        name={sub.name}
                        className="w-full h-full flex items-center justify-center p-1.5"
                        imageClassName="w-full h-full object-contain"
                        fallbackIconClassName="w-5 h-5 text-purple-400"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-400 uppercase tracking-wide">
                        <span>{parentCat?.name || getCategoryName(sub.categoryId)}</span>
                        <ChevronRight className="w-3 h-3 text-slate-600" />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-white">{sub.name}</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sub.isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {sub.isActive ? 'Active' : 'Hidden'}
                        </span>
                        {isOverridden ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                            Custom Logo Override
                          </span>
                        ) : parentCat?.logoUrl ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/70 flex items-center gap-1">
                            <CornerDownRight className="w-2.5 h-2.5 text-purple-400" />
                            Inherited from {parentCat.name}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{sub.description || 'No description'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openSubCatModal(sub)}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Edit Subcategory"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await deleteDoc(doc(db, 'subcategories', sub.id));
                          success(`Subcategory "${sub.name}" deleted.`);
                        } catch (err: any) {
                          error(err?.message || 'Failed to delete subcategory.');
                        }
                      }}
                      className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
                      title="Delete Subcategory"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: SERVICES */}
      {activeSection === 'services' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
              Services Catalog
            </h3>
            <button
              onClick={() => openServiceModal(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-md shadow-purple-900/30"
            >
              <Plus className="w-4 h-4" />
              <span>Add Service</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {services.map((srv) => {
              const parentCat = categories.find((c) => c.id === srv.categoryId);
              const parentSub = subcategories.find((s) => s.id === srv.subcategoryId);
              const effectiveLogo = getEffectiveLogoUrl(parentSub, parentCat);

              return (
                <div
                  key={srv.id}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 shadow-md hover:border-slate-700/80 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-200 shrink-0 shadow-inner overflow-hidden mt-0.5">
                        <CategoryLogo
                          logoUrl={effectiveLogo}
                          iconName={srv.icon || 'Zap'}
                          name={srv.name}
                          className="w-full h-full flex items-center justify-center p-1"
                          imageClassName="w-full h-full object-contain"
                          fallbackIconClassName="w-4 h-4 text-purple-400"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-purple-400 block truncate">
                          {getCategoryName(srv.categoryId)} → {getSubcategoryName(srv.subcategoryId)}
                        </span>
                        <h4 className="font-bold text-sm text-white leading-snug">{srv.name}</h4>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-sm text-emerald-400">
                        {formatCurrency(srv.pricePer1000, 'INR')}
                      </span>
                      <span className="block text-[10px] text-slate-500">/ 1000</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 text-slate-400 font-mono">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>Min: {srv.minimumQuantity}</span>
                      <span>·</span>
                      <span>Max: {srv.maximumQuantity}</span>
                      {srv.isPopular && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-sans font-bold">
                          Popular
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openServiceModal(srv)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Edit Service"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await deleteDoc(doc(db, 'services', srv.id));
                            success(`Service "${srv.name}" deleted.`);
                          } catch (err: any) {
                            error(err?.message || 'Failed to delete service.');
                          }
                        }}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
                        title="Delete Service"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {categoryModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-3.5 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-white text-sm">
                  {categoryModal.item ? 'Edit Platform Category' : 'New Platform Category'}
                </h4>
                <p className="text-[11px] text-slate-400">Manage category information & default platform logo</p>
              </div>
              <button
                onClick={() => setCategoryModal({ open: false, item: null })}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Instagram, YouTube, Telegram"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* LOGO URL FIELD & PREVIEW */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-purple-400" />
                    <span>Default Platform Logo URL</span>
                  </label>
                  {catLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setCatLogoUrl('')}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-bold hover:underline"
                    >
                      Clear URL
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  value={catLogoUrl}
                  onChange={(e) => setCatLogoUrl(e.target.value)}
                  placeholder="https://example.com/instagram-logo.png"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 text-xs font-mono"
                />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  All subcategories under this platform (e.g. Instagram Views, Likes, Followers) will automatically inherit this logo.
                </p>

                {/* Live Preview Box */}
                <div className="flex items-center gap-3 pt-2 border-t border-slate-800/60">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 shrink-0 shadow-inner overflow-hidden p-1.5">
                    <CategoryLogo
                      logoUrl={catLogoUrl}
                      iconName={catIcon || catName}
                      name={catName || 'Preview'}
                      className="w-full h-full flex items-center justify-center"
                      imageClassName="w-full h-full object-contain"
                      fallbackIconClassName="w-6 h-6 text-purple-400"
                    />
                  </div>
                  <div className="text-[11px] min-w-0">
                    <span className="font-semibold text-slate-200 block">
                      {catLogoUrl?.trim() ? 'Active Logo Preview' : 'Fallback Icon Preview'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {catLogoUrl?.trim()
                        ? 'Image URL loaded successfully'
                        : 'Using Lucide icon as fallback'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Fallback Icon Name (Lucide)</label>
                <input
                  type="text"
                  value={catIcon}
                  onChange={(e) => setCatIcon(e.target.value)}
                  placeholder="e.g. Instagram, Youtube, Send, Zap"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <input
                  type="text"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Likes, views & followers"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Sort Order</label>
                <input
                  type="number"
                  value={catSort}
                  onChange={(e) => setCatSort(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCategoryModal({ open: false, item: null })}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow-lg shadow-purple-900/30"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBCATEGORY MODAL */}
      {subcategoryModal.open && (() => {
        const selectedParent = categories.find((c) => c.id === subCatParentId);
        const hasOverride = !!subCatLogoUrl?.trim();
        const effectivePreviewLogo = hasOverride ? subCatLogoUrl : (selectedParent?.logoUrl || '');

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-3.5 text-xs max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {subcategoryModal.item ? 'Edit Subcategory' : 'New Subcategory'}
                  </h4>
                  <p className="text-[11px] text-slate-400">Configure subcategory & optional custom logo override</p>
                </div>
                <button
                  onClick={() => setSubcategoryModal({ open: false, item: null })}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSubcategory} className="space-y-3.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Parent Platform Category</label>
                  <select
                    value={subCatParentId}
                    onChange={(e) => setSubCatParentId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.logoUrl ? '(Has Platform Logo)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subcategory Name</label>
                  <input
                    type="text"
                    required
                    value={subCatName}
                    onChange={(e) => setSubCatName(e.target.value)}
                    placeholder="e.g. Instagram Reel Views, YouTube Watch Time"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* LOGO URL INHERITANCE / OVERRIDE BOX */}
                <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                      <span>Custom Subcategory Logo URL</span>
                    </label>
                    {hasOverride && (
                      <button
                        type="button"
                        onClick={() => setSubCatLogoUrl('')}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold hover:underline flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Revert to Parent Logo
                      </button>
                    )}
                  </div>

                  <input
                    type="url"
                    value={subCatLogoUrl}
                    onChange={(e) => setSubCatLogoUrl(e.target.value)}
                    placeholder={
                      selectedParent?.logoUrl
                        ? `Leave empty to inherit from ${selectedParent.name}`
                        : 'Optional custom logo image URL'
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 text-xs font-mono"
                  />

                  {/* Inheritance Live Preview Card */}
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-200 shrink-0 shadow-inner overflow-hidden p-1">
                      <CategoryLogo
                        logoUrl={effectivePreviewLogo}
                        iconName={subCatIcon || 'Zap'}
                        name={subCatName || 'Preview'}
                        className="w-full h-full flex items-center justify-center"
                        imageClassName="w-full h-full object-contain"
                        fallbackIconClassName="w-5 h-5 text-purple-400"
                      />
                    </div>

                    <div className="text-[11px] min-w-0">
                      {hasOverride ? (
                        <div>
                          <div className="flex items-center gap-1 text-amber-300 font-bold">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Custom Subcategory Override</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Overrides {selectedParent?.name || 'Parent'}'s logo specifically for this subcategory.
                          </span>
                        </div>
                      ) : selectedParent?.logoUrl ? (
                        <div>
                          <div className="flex items-center gap-1 text-purple-300 font-semibold">
                            <CornerDownRight className="w-3 h-3 text-purple-400" />
                            <span>Inheriting from Parent ({selectedParent.name})</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Automatic platform branding applied.
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-semibold text-slate-300 block">Default Icon Fallback</span>
                          <span className="text-[10px] text-slate-500">
                            No custom or parent logo URL set.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Description</label>
                  <input
                    type="text"
                    value={subCatDesc}
                    onChange={(e) => setSubCatDesc(e.target.value)}
                    placeholder="High retention reel views"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={subCatSort}
                    onChange={(e) => setSubCatSort(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSubcategoryModal({ open: false, item: null })}
                    className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow-lg shadow-purple-900/30"
                  >
                    Save Subcategory
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* SERVICE MODAL */}
      {serviceModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-3 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white text-sm">
                {serviceModal.item ? 'Edit Service' : 'New Service'}
              </h4>
              <button onClick={() => setServiceModal({ open: false, item: null })}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Parent Category</label>
                <select
                  value={srvCatId}
                  onChange={(e) => setSrvCatId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Parent Subcategory</label>
                <select
                  value={srvSubcatId}
                  onChange={(e) => setSrvSubcatId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  {subcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {getCategoryName(s.categoryId)} → {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  value={srvName}
                  onChange={(e) => setSrvName(e.target.value)}
                  placeholder="e.g. IG Reel Views | 500K/Day Speed"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Price (₹/1000)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={srvPrice}
                    onChange={(e) => setSrvPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Min Qty</label>
                  <input
                    type="number"
                    required
                    value={srvMin}
                    onChange={(e) => setSrvMin(parseInt(e.target.value) || 1)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max Qty</label>
                  <input
                    type="number"
                    required
                    value={srvMax}
                    onChange={(e) => setSrvMax(parseInt(e.target.value) || 1000)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Delivery Speed</label>
                <input
                  type="text"
                  value={srvSpeed}
                  onChange={(e) => setSrvSpeed(e.target.value)}
                  placeholder="e.g. 500K/Day"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={srvDesc}
                  onChange={(e) => setSrvDesc(e.target.value)}
                  placeholder="Quality details, start time..."
                  className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-white resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="srv-popular"
                  checked={srvIsPopular}
                  onChange={(e) => setSrvIsPopular(e.target.checked)}
                  className="rounded border-slate-800 text-purple-600 focus:ring-0"
                />
                <label htmlFor="srv-popular" className="text-slate-300 cursor-pointer">
                  Mark as "Most Popular"
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setServiceModal({ open: false, item: null })}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
