import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, collection, query, orderBy, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SiteSettings, MenuItemConfig } from '../types';
import { DEFAULT_SITE_SETTINGS, INITIAL_MENU_ITEMS, seedInitialCatalogIfEmpty } from '../lib/initialData';

interface SettingsContextType {
  settings: SiteSettings;
  menuItems: MenuItemConfig[];
  isLoadingSettings: boolean;
  updateSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
  updateMenuItem: (itemId: string, updates: Partial<MenuItemConfig>) => Promise<void>;
  updateMenuItems: (items: MenuItemConfig[]) => Promise<void>;
  reseedCatalog: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

function sanitizeSiteSettings(data: SiteSettings): SiteSettings {
  const sanitize = (val: string | undefined) =>
    val ? val.replace(/\bSMM PANEL\b/gi, 'MARKETING PANEL').replace(/\bSMM\b/gi, '').replace(/\s+/g, ' ').trim() : val;

  return {
    ...data,
    mainHeading: sanitize(data.mainHeading) || 'INSTA MART Marketing Panel',
    tagline: sanitize(data.tagline) || 'World’s Fastest Social Media Marketing Panel',
    welcomeMessage: sanitize(data.welcomeMessage),
    description: sanitize(data.description),
  };
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [menuItems, setMenuItems] = useState<MenuItemConfig[]>(INITIAL_MENU_ITEMS);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    // Seed catalog on initial load if database is empty
    seedInitialCatalogIfEmpty().catch(console.warn);

    // 1. Subscribe to Site Settings
    const settingsRef = doc(db, 'siteSettings', 'general');
    const unsubSettings = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        setSettings(sanitizeSiteSettings(snap.data() as SiteSettings));
      } else {
        setSettings(sanitizeSiteSettings(DEFAULT_SITE_SETTINGS));
      }
      setIsLoadingSettings(false);
    }, (err) => {
      console.warn('Settings subscription error:', err);
      setIsLoadingSettings(false);
    });

    // 2. Subscribe to Menu Items
    const menuColl = collection(db, 'menuItems');
    const q = query(menuColl, orderBy('sortOrder', 'asc'));
    const unsubMenu = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const items = snap.docs.map((d) => d.data() as MenuItemConfig);
        setMenuItems(items);
      } else {
        setMenuItems(INITIAL_MENU_ITEMS);
      }
    }, (err) => {
      console.warn('Menu subscription error:', err);
    });

    return () => {
      unsubSettings();
      unsubMenu();
    };
  }, []);

  const updateSettings = async (newSettings: Partial<SiteSettings>) => {
    const settingsRef = doc(db, 'siteSettings', 'general');
    await updateDoc(settingsRef, {
      ...newSettings,
      updatedAt: Date.now(),
    });
  };

  const updateMenuItem = async (itemId: string, updates: Partial<MenuItemConfig>) => {
    const itemRef = doc(db, 'menuItems', itemId);
    await updateDoc(itemRef, updates);
  };

  const updateMenuItems = async (items: MenuItemConfig[]) => {
    for (const item of items) {
      const itemRef = doc(db, 'menuItems', item.id);
      await setDoc(itemRef, item, { merge: true });
    }
  };

  const reseedCatalog = async () => {
    await seedInitialCatalogIfEmpty();
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        menuItems,
        isLoadingSettings,
        updateSettings,
        updateMenuItem,
        updateMenuItems,
        reseedCatalog,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
