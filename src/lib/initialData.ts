import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { SiteSettings, Category, Subcategory, Service, MenuItemConfig, DepositAmountConfig } from '../types';

export const DEFAULT_DEPOSIT_AMOUNTS: DepositAmountConfig[] = [
  100, 120, 150, 170, 200, 250, 300, 450, 500, 650, 700, 750, 800, 850, 900, 950, 1000
].map((amount, idx) => ({
  id: `amt_${amount}`,
  amount: amount,
  qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('upi://pay?pa=instamart@upi&pn=INSTAMART&am=' + amount + '&cu=INR&tn=Deposit%20%E2%82%B9' + amount)}`,
  isActive: true,
  sortOrder: idx + 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
}));

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: 'general',
  siteName: 'INSTA MART',
  tagline: 'World’s Fastest Social Media Marketing Panel',
  logoUrl: '',
  primaryColor: '#10b981',
  secondaryColor: '#059669',
  welcomeMessage: 'Sign in to access premium social media services with instant processing and dedicated 24/7 support.',
  mainHeading: 'INSTA MART Marketing Panel',
  description: 'Boost your social media presence with top-tier engagement, views, likes, and followers.',
  buttonText: 'Sign In to Dashboard',
  announcement: '🔥 Mega Sale: Instagram Reel Views at ₹0.41/1K! Instant manual fulfillment 24/7.',
  whatsappNumber: '+919876543210',
  supportEmail: 'support@instamart.com',
  termsOfService: `1. Service Fulfillment: All orders on INSTA MART are fulfilled manually with high precision and care.
2. Link Accuracy: Ensure all submitted social media URLs/usernames are 100% public and correct. Private profiles cannot receive delivery.
3. Wallet & Payments: Deposits once approved cannot be transferred or withdrawn to bank accounts. Balance is solely for services on INSTA MART.
4. Refill Policy: Services designated with refill guarantees will be restored if drops occur within the stated guarantee period.
5. Zero Spam: Any unauthorized misuse of services for harassment or illegal activities will result in immediate termination of the account.`,
  privacyPolicy: `At INSTA MART, we respect your confidentiality.
- We never ask for your social media account passwords.
- We do not share your contact details, orders, or payment reference IDs with third parties.
- All database records are stored with high security standards.`,
  defaultCurrency: 'INR',
  exchangeRates: {
    INR: 1,
    USD: 0.0118,
    EUR: 0.011,
    GBP: 0.0094,
  },
  currencySymbols: {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
  },
  upiId: 'instamart@upi',
  bankDetails: 'Bank: HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0001234 | Name: INSTA MART PVT LTD',
};

export const INITIAL_MENU_ITEMS: MenuItemConfig[] = [
  { id: 'discount', name: 'Discount & Offers', icon: 'Percent', page: 'discount', description: 'Exclusive discounts on bulk orders', isEnabled: true, sortOrder: 1 },
  { id: 'mass-order', name: 'Mass Order', icon: 'Layers', page: 'mass-order', description: 'Place multiple orders in batch format', isEnabled: true, sortOrder: 2 },
  { id: 'api-doc', name: 'API Docs', icon: 'Code', page: 'api-doc', description: 'API reference documentation', isEnabled: true, sortOrder: 3 },
  { id: 'top-10', name: 'TOP-10 Services', icon: 'TrendingUp', page: 'top-10', description: 'Most ordered trending services this week', isEnabled: true, sortOrder: 4 },
  { id: 'support', name: 'Support Tickets', icon: 'Headphones', page: 'support', description: 'Get 24/7 help with your orders and payments', isEnabled: true, sortOrder: 5 },
  { id: 'bonus', name: 'Deposit Bonus', icon: 'Gift', page: 'bonus', description: 'Get 5% extra on deposits above ₹1,000', isEnabled: true, sortOrder: 6 },
  { id: 'profile', name: 'Profile & Currency', icon: 'User', page: 'profile', description: 'Manage account credentials & default currency', isEnabled: true, sortOrder: 7 },
];

export interface SeedCatalogData {
  categories: Category[];
  subcategories: Subcategory[];
  services: Service[];
}

export const INITIAL_CATALOG: SeedCatalogData = {
  categories: [
    {
      id: 'cat-instagram',
      name: 'Instagram',
      slug: 'instagram',
      icon: 'Instagram',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/600px-Instagram_icon.png',
      description: 'Followers, Likes, Reel Views, Comments & Story Engagements',
      sortOrder: 1,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'cat-youtube',
      name: 'YouTube',
      slug: 'youtube',
      icon: 'Youtube',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/640px-YouTube_full-color_icon_%282017%29.svg.png',
      description: 'Views, Subscribers, Watch Hours, Likes & Comments',
      sortOrder: 2,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'cat-telegram',
      name: 'Telegram',
      slug: 'telegram',
      icon: 'Send',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Telegram_logo.svg/600px-Telegram_logo.svg.png',
      description: 'Channel Members, Group Members, Post Views & Reactions',
      sortOrder: 3,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'cat-facebook',
      name: 'Facebook',
      slug: 'facebook',
      icon: 'Facebook',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/600px-Facebook_Logo_%282019%29.png',
      description: 'Page Followers, Post Likes, Video Views & Shares',
      sortOrder: 4,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'cat-tiktok',
      name: 'TikTok',
      slug: 'tiktok',
      icon: 'Video',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/TikTok_Logo.svg/600px-TikTok_Logo.svg.png',
      description: 'Video Views, Followers, Likes, Saves & Shares',
      sortOrder: 5,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'cat-twitter',
      name: 'Twitter / X',
      slug: 'twitter-x',
      icon: 'Twitter',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/X_logo_2023.svg/600px-X_logo_2023.svg.png',
      description: 'Followers, Retweets, Likes, Poll Votes & Impressions',
      sortOrder: 6,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'cat-spotify',
      name: 'Spotify',
      slug: 'spotify',
      icon: 'Music',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/600px-Spotify_logo_without_text.svg.png',
      description: 'Track Plays, Monthly Listeners, Playlist Followers',
      sortOrder: 7,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ],
  subcategories: [
    // Instagram
    {
      id: 'subcat-ig-views',
      categoryId: 'cat-instagram',
      name: 'Instagram Views',
      slug: 'instagram-views',
      icon: 'PlayCircle',
      description: 'High speed reel and video views',
      sortOrder: 1,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'subcat-ig-followers',
      categoryId: 'cat-instagram',
      name: 'Instagram Followers',
      slug: 'instagram-followers',
      icon: 'Users',
      description: 'Real & high-quality followers with refill options',
      sortOrder: 2,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'subcat-ig-likes',
      categoryId: 'cat-instagram',
      name: 'Instagram Likes',
      slug: 'instagram-likes',
      icon: 'Heart',
      description: 'Instant and organic delivery likes',
      sortOrder: 3,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'subcat-ig-comments',
      categoryId: 'cat-instagram',
      name: 'Instagram Comments',
      slug: 'instagram-comments',
      icon: 'MessageSquare',
      description: 'Custom, emoji, and verified style comments',
      sortOrder: 4,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'subcat-ig-story',
      categoryId: 'cat-instagram',
      name: 'Instagram Story Views',
      slug: 'instagram-story-views',
      icon: 'Eye',
      description: 'Instant story impressions & poll votes',
      sortOrder: 5,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },

    // YouTube
    {
      id: 'subcat-yt-views',
      categoryId: 'cat-youtube',
      name: 'YouTube Views',
      slug: 'youtube-views',
      icon: 'Play',
      description: 'High retention and monetizable views',
      sortOrder: 1,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'subcat-yt-subs',
      categoryId: 'cat-youtube',
      name: 'YouTube Subscribers',
      slug: 'youtube-subscribers',
      icon: 'UserPlus',
      description: 'Non-drop active channel subscribers',
      sortOrder: 2,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },

    // Telegram
    {
      id: 'subcat-tg-members',
      categoryId: 'cat-telegram',
      name: 'Telegram Channel Members',
      slug: 'telegram-channel-members',
      icon: 'Send',
      description: 'High quality channel and group members',
      sortOrder: 1,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'subcat-tg-views',
      categoryId: 'cat-telegram',
      name: 'Telegram Post Views',
      slug: 'telegram-post-views',
      icon: 'Eye',
      description: 'Fast views for single and last N posts',
      sortOrder: 2,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ],
  services: [
    // Instagram Reel Views
    {
      id: 'srv-ig-views-1',
      subcategoryId: 'subcat-ig-views',
      categoryId: 'cat-instagram',
      name: 'IG Reel Views | 500K/Day Speed | Super Fast',
      description: 'Provide Instagram Reel public link. Instant start with smooth natural flow.',
      icon: 'Zap',
      pricePer1000: 0.41,
      minimumQuantity: 100,
      maximumQuantity: 1000000,
      speed: '500K/Day',
      startTime: 'Instant (0-5 min)',
      refill: 'No Drop Guarantee',
      guarantee: 'Lifetime',
      notes: 'Ensure account is strictly public. Do not submit duplicate links concurrently.',
      isPopular: true,
      isActive: true,
      sortOrder: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'srv-ig-views-2',
      subcategoryId: 'subcat-ig-views',
      categoryId: 'cat-instagram',
      name: 'IG Reel/Video Views | 6M/Day Ultra High Speed',
      description: 'Ultra fast server. Ideal for viral video pushes and rapid reach expansion.',
      icon: 'Flame',
      pricePer1000: 0.43,
      minimumQuantity: 1000,
      maximumQuantity: 5000000,
      speed: '6M/Day',
      startTime: 'Instant',
      refill: 'Stable',
      guarantee: 'Lifetime',
      notes: 'Works on both Reels and standard IG Video posts.',
      isPopular: true,
      isActive: true,
      sortOrder: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'srv-ig-views-3',
      subcategoryId: 'subcat-ig-views',
      categoryId: 'cat-instagram',
      name: 'Instagram Reel Views | 2 Million Per Hour Turbo',
      description: 'Fastest delivery server in the industry. Direct high-velocity delivery.',
      icon: 'Rocket',
      pricePer1000: 0.56,
      minimumQuantity: 500,
      maximumQuantity: 2000000,
      speed: '2M/Hour',
      startTime: '0-5 min',
      refill: 'Non-Drop',
      guarantee: '30 Days',
      notes: 'High speed surge server. Great for immediate traction.',
      isPopular: false,
      isActive: true,
      sortOrder: 3,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },

    // Instagram Followers
    {
      id: 'srv-ig-followers-1',
      subcategoryId: 'subcat-ig-followers',
      categoryId: 'cat-instagram',
      name: 'Instagram Followers [High Quality - Non Drop - 30 Days Refill]',
      description: 'Profile must be public. Organic looking profiles with profile picture and posts.',
      icon: 'Award',
      pricePer1000: 42.00,
      minimumQuantity: 50,
      maximumQuantity: 100000,
      speed: '10K-25K/Day',
      startTime: '0-30 min',
      refill: '30 Days Auto-Refill',
      guarantee: '30 Days Guarantee',
      notes: 'Link format: https://instagram.com/username',
      isPopular: true,
      isActive: true,
      sortOrder: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'srv-ig-followers-2',
      subcategoryId: 'subcat-ig-followers',
      categoryId: 'cat-instagram',
      name: 'Instagram Followers [Indian Target - Active Real Profiles]',
      description: 'Targeted Indian audience profiles for local creator/business growth.',
      icon: 'Users',
      pricePer1000: 89.00,
      minimumQuantity: 50,
      maximumQuantity: 25000,
      speed: '2K-5K/Day',
      startTime: '10-45 min',
      refill: '60 Days Refill',
      guarantee: '60 Days',
      notes: 'High quality genuine-looking accounts with active stories.',
      isPopular: false,
      isActive: true,
      sortOrder: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },

    // Instagram Likes
    {
      id: 'srv-ig-likes-1',
      subcategoryId: 'subcat-ig-likes',
      categoryId: 'cat-instagram',
      name: 'Instagram Likes [Instant - Super Clean - Non Drop]',
      description: 'Fast delivery likes from genuine looking accounts. Instant activation.',
      icon: 'Heart',
      pricePer1000: 7.80,
      minimumQuantity: 50,
      maximumQuantity: 50000,
      speed: '50K/Day',
      startTime: 'Instant',
      refill: 'Non Drop',
      guarantee: 'Lifetime',
      notes: 'Provide direct post/reel URL.',
      isPopular: true,
      isActive: true,
      sortOrder: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },

    // YouTube Views
    {
      id: 'srv-yt-views-1',
      subcategoryId: 'subcat-yt-views',
      categoryId: 'cat-youtube',
      name: 'YouTube High Retention Views [Monetizable - Lifetime Guarantee]',
      description: 'High watch time views. Safe for monetization with full watch duration.',
      icon: 'CheckCircle',
      pricePer1000: 95.00,
      minimumQuantity: 500,
      maximumQuantity: 1000000,
      speed: '5K-10K/Day',
      startTime: '1-3 hours',
      refill: 'Lifetime Refill',
      guarantee: 'Lifetime',
      notes: 'Video duration must be at least 3 minutes.',
      isPopular: true,
      isActive: true,
      sortOrder: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },

    // Telegram Members
    {
      id: 'srv-tg-members-1',
      subcategoryId: 'subcat-tg-members',
      categoryId: 'cat-telegram',
      name: 'Telegram Channel Members [Non Drop - Zero Drop Rate]',
      description: 'Permanent Telegram channel/group members. Instant delivery.',
      icon: 'Send',
      pricePer1000: 32.00,
      minimumQuantity: 100,
      maximumQuantity: 50000,
      speed: '20K/Day',
      startTime: 'Instant (0-15m)',
      refill: 'Non-Drop',
      guarantee: 'Lifetime',
      notes: 'Channel must be public.',
      isPopular: true,
      isActive: true,
      sortOrder: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ],
};

/**
 * Checks if the database contains initial catalog and settings, and creates them if empty.
 */
export async function seedInitialCatalogIfEmpty(): Promise<boolean> {
  try {
    // 1. Check/Seed Site Settings
    const settingsRef = doc(db, 'siteSettings', 'general');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, DEFAULT_SITE_SETTINGS);
    }

    // 2. Check/Seed Menu Items
    const menuColl = collection(db, 'menuItems');
    const menuSnap = await getDocs(menuColl);
    if (menuSnap.empty) {
      const batch = writeBatch(db);
      for (const item of INITIAL_MENU_ITEMS) {
        batch.set(doc(db, 'menuItems', item.id), item);
      }
      await batch.commit();
    }

    // 2b. Check/Seed Deposit Amounts
    const depositAmountsColl = collection(db, 'depositAmounts');
    const depositAmountsSnap = await getDocs(depositAmountsColl);
    if (depositAmountsSnap.empty) {
      const batch = writeBatch(db);
      for (const item of DEFAULT_DEPOSIT_AMOUNTS) {
        batch.set(doc(db, 'depositAmounts', item.id), item);
      }
      await batch.commit();
    }

    // 3. Check/Seed Categories, Subcategories, Services
    const catColl = collection(db, 'categories');
    const catSnap = await getDocs(catColl);
    if (catSnap.empty) {
      const batch = writeBatch(db);

      for (const cat of INITIAL_CATALOG.categories) {
        batch.set(doc(db, 'categories', cat.id), cat);
      }
      for (const subcat of INITIAL_CATALOG.subcategories) {
        batch.set(doc(db, 'subcategories', subcat.id), subcat);
      }
      for (const srv of INITIAL_CATALOG.services) {
        batch.set(doc(db, 'services', srv.id), srv);
      }

      await batch.commit();
      return true;
    } else {
      // Safe non-destructive logo backfill for pre-existing catalog categories that lack logoUrl
      const initialMap = new Map(INITIAL_CATALOG.categories.map((c) => [c.id, c.logoUrl]));
      const batch = writeBatch(db);
      let needsUpdate = false;

      for (const docSnap of catSnap.docs) {
        const data = docSnap.data();
        if (data && (!('logoUrl' in data) || data.logoUrl === undefined || data.logoUrl === '')) {
          const defaultLogo = initialMap.get(docSnap.id) || (data.slug ? initialMap.get(`cat-${data.slug}`) : undefined);
          if (defaultLogo) {
            batch.update(docSnap.ref, { logoUrl: defaultLogo });
            needsUpdate = true;
          }
        }
      }
      if (needsUpdate) {
        await batch.commit();
      }
    }

    return false;
  } catch (err) {
    console.warn('Initial seeding note:', err);
    return false;
  }
}
