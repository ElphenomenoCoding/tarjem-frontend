import { Component, inject, signal, OnInit, HostListener, effect } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { NotificationService, LiveNotification } from '../../../core/services/notification.service';
import { LanguageSwitcherComponent } from '../../components/language-switcher/language-switcher.component';
import { TranslocoService } from '@jsverse/transloco';

interface NavLink { path: string; label: string; icon: string; mobileOnly?: boolean; }

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslocoModule, LanguageSwitcherComponent],
  styles: [`
    .nav-link { transition: all 0.15s ease; }
    .nav-link:hover { background-color: #f1f5f9; color: #1e293b; }
    .nav-active { background-color: #eff6ff !important; color: #2563eb !important; font-weight: 600; }
    .mobile-link { transition: all 0.15s ease; }
    .mobile-active { color: #2563eb !important; }
  `],
  template: `
    <div class="min-h-screen bg-slate-50" *transloco="let t">

      <!-- Top Navbar -->
      <nav class="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-14">
            <div class="flex items-center gap-6">
              <a routerLink="/" class="text-lg font-black tracking-tight text-blue-600">{{ t('common.appName') }}</a>
              <div class="hidden md:flex items-center gap-0.5">
                @for (link of navLinks(); track link.path) {
                  @if (!link.mobileOnly) {
                    <a [routerLink]="link.path" routerLinkActive="nav-active"
                      class="nav-link px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600">
                      {{ t(link.label) }}
                    </a>
                  }
                }
              </div>
            </div>
            <div class="flex items-center gap-2">
              <!-- Notification bell + dropdown -->
              <div class="relative">
                <button (click)="toggleNotifDropdown($event)" class="relative p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                  @if (unreadCount() > 0) {
                    <span class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{{ unreadCount() > 9 ? '9+' : unreadCount() }}</span>
                  }
                </button>

                @if (notifOpen()) {
                  <div class="absolute end-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[100] overflow-hidden" (click)="$event.stopPropagation()">
                    <!-- Header -->
                    <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                      <span class="text-sm font-bold text-slate-800">{{ t('nav.notifications') }}</span>
                      <div class="flex items-center gap-1">
                        @if (notifItems().length > 0) {
                          <button (click)="markAllNotifRead()" class="text-[10px] font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 cursor-pointer">{{ t('notif.markAllRead') }}</button>
                          <button (click)="clearAllNotifs()" class="text-[10px] font-semibold text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer">{{ t('notif.clearAll') }}</button>
                        }
                      </div>
                    </div>
                    <!-- List -->
                    <div class="max-h-80 overflow-y-auto divide-y divide-slate-50">
                      @if (notifItems().length === 0) {
                        <div class="py-10 text-center">
                          <svg class="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                          <p class="text-xs text-slate-400">{{ t('notif.empty') }}</p>
                        </div>
                      }
                      @for (n of notifItems(); track n.id) {
                        <button (click)="onNotifClick(n)" class="w-full text-start px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer" [class.bg-blue-50/40]="!n.isRead">
                          <div class="flex gap-2.5">
                            <div class="mt-1 shrink-0">
                              @if (!n.isRead) { <div class="w-2 h-2 rounded-full bg-blue-500"></div> }
                              @else { <div class="w-2 h-2 rounded-full bg-slate-200"></div> }
                            </div>
                            <div class="flex-1 min-w-0">
                              <p class="text-xs truncate" [class]="n.isRead ? 'text-slate-600 font-medium' : 'text-slate-900 font-bold'">{{ t(n.title) }}</p>
                              <p class="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{{ t(n.body) }}</p>
                              <p class="text-[10px] text-slate-400 mt-1">{{ notifTimeAgo(n.createdAt) }}</p>
                            </div>
                          </div>
                        </button>
                      }
                    </div>
                    <!-- Footer -->
                    <a [routerLink]="notifPath()" (click)="notifOpen.set(false)" class="block text-center py-2.5 border-t border-slate-100 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors">
                      {{ t('common.viewAll') }}
                    </a>
                  </div>
                }
              </div>
              <div class="hidden sm:flex items-center gap-2">
                <div class="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">{{ getInitials() }}</div>
                <span class="text-sm font-medium text-slate-700 max-w-[120px] truncate">{{ auth.currentUser()?.firstName }}</span>
              </div>
              <button (click)="auth.logout()" class="hidden sm:flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                {{ t('auth.logout') }}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Mobile bottom nav -->
      <nav class="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-50">
        <div class="flex justify-around items-center h-14 px-1">
          @for (link of mobileLinks(); track link.path) {
            <a [routerLink]="link.path" routerLinkActive="mobile-active"
              class="mobile-link flex flex-col items-center justify-center gap-0.5 text-slate-400 px-2 py-1 rounded-lg min-w-[48px]">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="link.icon" />
              </svg>
              <span class="text-[10px] font-medium leading-none">{{ t(link.label) }}</span>
            </a>
          }
          <button (click)="cycleMobileLang()" class="mobile-link flex flex-col items-center justify-center gap-0.5 text-slate-400 px-2 py-1 rounded-lg min-w-[48px]">
            <img class="w-5 h-4 rounded-sm object-cover" [src]="'https://flagcdn.com/w40/' + mobileLangFlag() + '.png'" [alt]="mobileLangCode()" />
            <span class="text-[10px] font-medium leading-none">{{ mobileLangCode().toUpperCase() }}</span>
          </button>
          <button (click)="auth.logout()" class="mobile-link flex flex-col items-center justify-center gap-0.5 text-slate-400 px-2 py-1 rounded-lg min-w-[48px]">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            <span class="text-[10px] font-medium leading-none">{{ t('auth.logout') }}</span>
          </button>
        </div>
      </nav>

      <!-- Floating language switcher (always bottom-right, unaffected by RTL) -->
      <app-language-switcher />

      <!-- Content -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <ng-content />
      </main>
    </div>
  `,
})
export class MainLayoutComponent implements OnInit {
  auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  readonly notifService = inject(NotificationService);
  navLinks = signal<NavLink[]>([]);
  mobileLinks = signal<NavLink[]>([]);

  private readonly langCycle = [
    { code: 'fr', flag: 'fr', dir: 'ltr' },
    { code: 'ar', flag: 'dz', dir: 'rtl' },
    { code: 'en', flag: 'gb', dir: 'ltr' },
  ];
  mobileLangCode = signal(this.transloco.getActiveLang());
  mobileLangFlag = signal(this.langCycle.find(l => l.code === this.transloco.getActiveLang())?.flag || 'fr');
  unreadCount = this.notifService.unreadCount;
  notifOpen = signal(false);
  notifItems = signal<LiveNotification[]>([]);

  // Push live notifications into dropdown
  private liveEffect = effect(() => {
    const live = this.notifService.latestNotification();
    if (live) {
      const exists = this.notifItems().some(n => n.id === live.id);
      if (!exists) {
        this.notifItems.update(list => [live, ...list].slice(0, 20));
      }
    }
  });

  @HostListener('document:click')
  onDocumentClick() { this.notifOpen.set(false); }

  private icons = {
    dashboard: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
    orders: 'M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
    support: 'M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z',
    notifications: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0',
    profile: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
    search: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
    work: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z',
    money: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
    users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
    finance: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    config: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  };

  constructor() {
    const role = this.auth.userRole();
    switch (role) {
      case 'CLIENT':
        this.navLinks.set([
          { path: '/client/dashboard', label: 'nav.dashboard', icon: this.icons.dashboard },
          { path: '/client/orders', label: 'nav.orders', icon: this.icons.orders },
          { path: '/client/support', label: 'nav.support', icon: this.icons.support },
          { path: '/client/notifications', label: 'nav.notifications', icon: this.icons.notifications },
          { path: '/client/profile', label: 'nav.profile', icon: this.icons.profile },
        ]);
        break;
      case 'TRANSLATOR':
        this.navLinks.set([
          { path: '/translator/dashboard', label: 'nav.dashboard', icon: this.icons.dashboard },
          { path: '/translator/orders/available', label: 'order.availableOrders', icon: this.icons.search },
          { path: '/translator/orders/mine', label: 'order.myOrders', icon: this.icons.work },
          { path: '/translator/commissions', label: 'nav.commissions', icon: this.icons.money },
          { path: '/translator/support', label: 'nav.support', icon: this.icons.support },
          { path: '/translator/profile', label: 'nav.profile', icon: this.icons.profile },
        ]);
        break;
      case 'ADMIN':
        this.navLinks.set([
          { path: '/admin/dashboard', label: 'nav.dashboard', icon: this.icons.dashboard },
          { path: '/admin/orders', label: 'nav.orders', icon: this.icons.orders },
          { path: '/admin/clients', label: 'nav.clients', icon: this.icons.users },
          { path: '/admin/translators', label: 'nav.translators', icon: this.icons.work },
          { path: '/admin/finance', label: 'nav.finance', icon: this.icons.finance },
          { path: '/admin/config', label: 'nav.config', icon: this.icons.config },
          { path: '/admin/notifications', label: 'nav.notifications', icon: this.icons.notifications },
          { path: '/admin/support', label: 'nav.support', icon: this.icons.support },
        ]);
        break;
    }
    this.mobileLinks.set(this.navLinks().slice(0, 3));
  }

  private rolePrefix = '/api/v1/client';

  ngOnInit() {
    const role = this.auth.userRole();
    if (role === 'TRANSLATOR') this.rolePrefix = '/api/v1/translator';
    else if (role === 'ADMIN') this.rolePrefix = '/api/v1/admin';

    // Load initial count + connect SSE
    this.api.get<number>(this.rolePrefix + '/notifications/unread-count').subscribe({
      next: (res) => { if (res.data != null) this.notifService.setUnreadCount(res.data); },
    });
    this.notifService.connect();

  }

  notifPath(): string {
    const role = this.auth.userRole();
    if (role === 'TRANSLATOR') return '/translator/notifications';
    if (role === 'ADMIN') return '/admin/notifications';
    return '/client/notifications';
  }

  getInitials(): string {
    const u = this.auth.currentUser();
    return ((u?.firstName?.[0] || '') + (u?.lastName?.[0] || '')).toUpperCase();
  }

  toggleNotifDropdown(event: Event) {
    event.stopPropagation();
    const wasOpen = this.notifOpen();
    this.notifOpen.set(!wasOpen);
    if (!wasOpen) this.loadNotifDropdown();
  }

  private loadNotifDropdown() {
    this.api.get<any>(this.rolePrefix + '/notifications', { page: 0, size: 10, sort: 'createdAt,desc' }).subscribe({
      next: (res) => this.notifItems.set(res.data?.content ?? []),
    });
  }

  onNotifClick(n: LiveNotification) {
    // Mark as read
    if (!n.isRead) {
      this.api.patch(this.rolePrefix + '/notifications/' + n.id + '/read').subscribe();
      n.isRead = true;
      this.notifItems.set([...this.notifItems()]);
      this.notifService.decrementUnread();
    }
    this.notifOpen.set(false);

    // Navigate based on entity type
    if (n.relatedEntityId) {
      const role = this.auth.userRole();
      if (n.relatedEntityType === 'ORDER') {
        if (role === 'ADMIN') this.router.navigate(['/admin/orders', n.relatedEntityId]);
        else if (role === 'TRANSLATOR') this.router.navigate(['/translator/orders', n.relatedEntityId, 'workspace']);
        else this.router.navigate(['/client/orders', n.relatedEntityId]);
      } else if (n.relatedEntityType === 'WITHDRAWAL') {
        this.router.navigate(['/admin/finance']);
      } else if (n.relatedEntityType === 'USER') {
        this.router.navigate(['/admin/translators', n.relatedEntityId]);
      } else if (n.relatedEntityType === 'TICKET' || n.relatedEntityType === 'SUPPORT_TICKET') {
        if (role === 'ADMIN') this.router.navigate(['/admin/support'], { queryParams: { ticket: n.relatedEntityId } });
        else if (role === 'TRANSLATOR') this.router.navigate(['/translator/support'], { queryParams: { ticket: n.relatedEntityId } });
        else this.router.navigate(['/client/support'], { queryParams: { ticket: n.relatedEntityId } });
      } else if (n.relatedEntityType === 'LANGUAGE_PAIR') {
        if (role === 'ADMIN') this.router.navigate(['/admin/config']);
        else this.router.navigate(['/translator/profile']);
      } else if (n.relatedEntityType === 'RATING') {
        this.router.navigate(['/translator/dashboard']);
      } else {
        this.router.navigate([this.notifPath()]);
      }
    } else {
      this.router.navigate([this.notifPath()]);
    }
  }

  markAllNotifRead() {
    this.api.patch(this.rolePrefix + '/notifications/read-all').subscribe({
      next: () => {
        this.notifItems.update(list => list.map(n => ({ ...n, isRead: true })));
        this.notifService.resetUnread();
      },
    });
  }

  clearAllNotifs() {
    this.api.delete(this.rolePrefix + '/notifications').subscribe({
      next: () => {
        this.notifItems.set([]);
        this.notifService.resetUnread();
      },
    });
  }

  cycleMobileLang(): void {
    const currentIdx = this.langCycle.findIndex(l => l.code === this.mobileLangCode());
    const next = this.langCycle[(currentIdx + 1) % this.langCycle.length];
    localStorage.setItem('tarjem_lang', next.code);
    this.transloco.setActiveLang(next.code);
    this.mobileLangCode.set(next.code);
    this.mobileLangFlag.set(next.flag);
    document.documentElement.setAttribute('dir', next.dir);
    document.documentElement.setAttribute('lang', next.code);
  }

  notifTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'A l\'instant';
    if (mins < 60) return mins + ' min';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h';
    const days = Math.floor(hours / 24);
    return days + 'j';
  }
}
