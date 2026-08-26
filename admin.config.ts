// ─────────────────────────────────────────────────────────────────────────────
// TU STUDIO — admin suite config
// Used at: https://tu-studio-app.web.app
// ─────────────────────────────────────────────────────────────────────────────

import { defineConfig } from './admin-suite/config/schema';

const crossApps = [
  { slug: 'sf-park',          name: 'SF Park',          url: 'https://sf-park-urban.web.app',        color: '#10b981' },
  { slug: 'vibe-x',           name: 'Vibe-X',           url: 'https://vibe-x-app.web.app',           color: '#8b5cf6' },
  { slug: 'tu-studio',        name: 'TU Studio',        url: 'https://tu-studio-app.web.app',        color: '#f59e0b' },
  { slug: 'toyverse',         name: 'ToyVerse',         url: 'https://toyverse-app.web.app',         color: '#ec4899' },
  { slug: 'my-new-look',      name: 'My New Look',      url: 'https://my-new-look-app.web.app',      color: '#3b82f6' },
  { slug: 'price-n-inventory',name: 'Price N Inventory',url: 'https://price-n-inventory.vercel.app', color: '#06b6d4' },
];

const baseNav = [
  { id: 'METRICS' as const,           label: 'Metrics',       icon: '📊' },
  { id: 'PROJECTS' as const,          label: 'Projects',      icon: '🎨' },
  { id: 'ENGAGEMENT' as const,        label: 'Engagement',    icon: '📈' },
  { id: 'GROWTH' as const,            label: 'Growth Funnel', icon: '🚀' },
  { id: 'CUSTOMERS' as const,         label: 'Clients',       icon: '👥' },
  { id: 'FAVORITES' as const,         label: 'Favorites',     icon: '⭐' },
  { id: 'REVIEWS' as const,           label: 'Reviews',       icon: '💬' },
  { id: 'COUPONS' as const,           label: 'Coupons',       icon: '🎟️' },
  { id: 'CROSS_PROMO' as const,       label: 'Cross-Promo',   icon: '🔄' },
  { id: 'REFERRALS' as const,         label: 'Referrals',     icon: '🎁' },
  { id: 'PUSH_NOTIFICATIONS' as const,label: 'Push',          icon: '📣' },
  { id: 'AB_TESTS' as const,          label: 'A/B Tests',     icon: '🧪' },
  { id: 'CONTENT_CMS' as const,       label: 'Content',       icon: '📝' },
  { id: 'INBOX' as const,             label: 'Inbox',         icon: '📥' },
  { id: 'FEATURE_FLAGS' as const,     label: 'Feature Flags', icon: '🚩' },
  { id: 'SETTINGS' as const,          label: 'Settings',      icon: '⚙️' },
];

const baseSections = [
  'METRICS', 'PROJECTS', 'ENGAGEMENT', 'GROWTH', 'CUSTOMERS', 'FAVORITES', 'REVIEWS',
  'COUPONS', 'CROSS_PROMO', 'REFERRALS', 'PUSH_NOTIFICATIONS', 'AB_TESTS',
  'CONTENT_CMS', 'FEATURE_FLAGS', 'SETTINGS',
];

export const tuStudioConfig = defineConfig({
  branding: { appName: 'TU Studio', appSlug: 'tu-studio', tagline: 'Idea and Reality · T.U Empire', logoLetter: 'T', primaryColor: 'amber' },
  nav: baseNav, enabledSections: baseSections,
  data: { collections: {} },
  auth: { superAdmin: ['3dma369@proton.me'], accounting: ['cfo@tangibleunion.com'], employee: [] },
  crossApps, defaultRole: 'ADMIN',
  features: { refunds: true, capturePayments: true, authorizePayouts: true, createCoupons: true, sendPush: true, manageFeatureFlags: true, abTestControl: true },
});
