import { InjectionToken } from '@angular/core';
import { ContentPageDefinition } from './models/content-page.model';

/**
 * Every rich-text content page in Settings. Adding one is a new entry here —
 * the route and the settings tab are generated from this list.
 */
export const CONTENT_PAGES: readonly ContentPageDefinition[] = [
  {
    path: 'privacy-policy',
    endpoint: 'dashboard/privacy-policy',
    title: 'سياسة الخصوصية',
    hint: 'المحتوى المعروض في التطبيق',
    icon: 'fa-shield-halved',
    placeholder: 'اكتب سياسة الخصوصية هنا… استخدم العناوين والقوائم لتنظيم المحتوى',
  },
  {
    path: 'scope-of-service',
    endpoint: 'dashboard/scope-of-service',
    title: 'نطاق الخدمة',
    hint: 'حدود الخدمة المقدَّمة',
    icon: 'fa-map-location-dot',
    placeholder: 'اكتب نطاق الخدمة هنا… استخدم العناوين والقوائم لتنظيم المحتوى',
  },
  {
    path: 'service-provider',
    endpoint: 'dashboard/service-provider',
    title: 'مقدم الخدمة',
    hint: 'بيانات الجهة المقدِّمة للخدمة',
    icon: 'fa-building',
    placeholder: 'اكتب بيانات مقدم الخدمة هنا… استخدم العناوين والقوائم لتنظيم المحتوى',
  },
];

/** The page a `ContentPageSettingsComponent` instance edits — provided per route. */
export const CONTENT_PAGE = new InjectionToken<ContentPageDefinition>('CONTENT_PAGE');
