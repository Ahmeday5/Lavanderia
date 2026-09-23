import { MenuSection } from '../models/menu-item.model';

/**
 * Sidebar navigation, grouped into sections. This is the file to edit when
 * adding/removing pages — the sidebar component only renders what's declared
 * here, filtered reactively by the current user's roles/permissions.
 *
 * `roles`/`permissions` are OR-gates: an item with both shows when the user
 * satisfies *either*. Omit both to make an item visible to everyone.
 */
export const NAV_SECTIONS: MenuSection[] = [
  {
    label: 'الرئيسية',
    items: [
      { id: 'dashboard', label: 'لوحة التحكم', route: '/dashboard', icon: 'home' },
    ],
  },
  {
    label: 'المستخدمون والشركاء',
    items: [
      { id: 'laundries', label: 'المغاسل', route: '/laundries', icon: 'store' },
      { id: 'customers', label: 'العملاء', route: '/customers', icon: 'user-heart' },
    ],
  },
  {
    label: 'الإدارة',
    items: [
      { id: 'cities', label: 'المدن', route: '/cities', icon: 'map-pin' },
      { id: 'services', label: 'الخدمات', route: '/services', icon: 'washing-machine' },
      { id: 'app-users', label: 'المستخدمون', route: '/app-users', icon: 'user-shield' },
      { id: 'settings', label: 'الإعدادات', route: '/settings', icon: 'settings', roles: ['Admin'] },
    ],
  },
];
