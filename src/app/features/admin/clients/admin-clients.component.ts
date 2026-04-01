import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService } from '../../../core/services/api.service';

interface Client { id: string; firstName: string | null; lastName: string | null; email: string; phone: string | null; status: string; wilaya: string | null; createdAt: string; }

@Component({
  selector: 'app-admin-clients',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, RouterLink, FormsModule],
  styles: [`@keyframes fade-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.anim{animation:fade-up .35s ease-out both}.anim-1{animation-delay:.05s}.anim-2{animation-delay:.1s}`],
  template: `
    <app-main-layout>
      <div *transloco="let t">
        <div class="anim flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold text-slate-900">{{ t('nav.clients') }}</h1>
            <p class="text-sm text-slate-500 mt-0.5">{{ totalElements() }} {{ t('adminClients.results') }}</p>
          </div>
        </div>

        <!-- Filters -->
        <div class="anim anim-1 flex flex-col sm:flex-row gap-2 mb-5">
          <div class="relative flex-1">
            <svg class="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
            <input type="text" [(ngModel)]="search" (keyup.enter)="applyFilters()" class="w-full ps-9 pe-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500" [placeholder]="t('adminClients.searchPlaceholder')"/>
          </div>
          <select [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()" class="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 min-w-[140px]">
            <option value="">{{ t('common.allStatuses') }}</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PENDING">PENDING</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </select>
          @if (hasFilters()) {
            <button (click)="clearFilters()" class="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              {{ t('adminOrders.clearFilters') }}
            </button>
          }
        </div>

        @if (loading()) {
          <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center"><svg class="w-6 h-6 animate-spin text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></div>
        } @else if (clients().length === 0) {
          <div class="anim anim-2 rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <svg class="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>
            <p class="text-sm font-semibold text-slate-500">{{ t('common.noData') }}</p>
          </div>
        } @else {
          <!-- Mobile Cards -->
          <div class="anim anim-2 sm:hidden space-y-2">
            @for (c of clients(); track c.id) {
              <a [routerLink]="['/admin/clients', c.id]" class="block rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 transition-colors">
                <div class="flex items-center justify-between mb-1">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">{{ (c.firstName?.[0]||'')+(c.lastName?.[0]||'') }}</div>
                    <div><p class="text-sm font-medium text-slate-800">{{ c.firstName }} {{ c.lastName }}</p><p class="text-xs text-slate-500">{{ c.email }}</p></div>
                  </div>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" [class]="statusBadge(c.status)">{{ c.status }}</span>
                </div>
              </a>
            }
          </div>

          <!-- Desktop Table -->
          <div class="anim anim-2 hidden sm:block rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <table class="w-full">
              <thead class="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th class="px-4 py-2.5 text-start text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('profile.name') }}</th>
                  <th class="px-4 py-2.5 text-start text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('auth.email') }}</th>
                  <th class="px-4 py-2.5 text-start text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('auth.phone') }}</th>
                  <th class="px-4 py-2.5 text-start text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('auth.wilaya') }}</th>
                  <th class="px-4 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('common.status') }}</th>
                  <th class="px-4 py-2.5 text-end text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('admin.joinedAt') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (c of clients(); track c.id) {
                  <tr class="hover:bg-slate-50/50 cursor-pointer transition-colors" [routerLink]="['/admin/clients', c.id]">
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">{{ (c.firstName?.[0]||'')+(c.lastName?.[0]||'') }}</div>
                        <span class="text-sm font-medium text-slate-800">{{ c.firstName }} {{ c.lastName }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-sm text-slate-600">{{ c.email }}</td>
                    <td class="px-4 py-3 text-sm text-slate-600">{{ c.phone ?? '-' }}</td>
                    <td class="px-4 py-3 text-sm text-slate-600">{{ c.wilaya ?? '-' }}</td>
                    <td class="px-4 py-3 text-center"><span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [class]="statusBadge(c.status)">{{ c.status }}</span></td>
                    <td class="px-4 py-3 text-xs text-slate-500 text-end">{{ formatDate(c.createdAt) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="flex items-center justify-between mt-4 px-1">
              <p class="text-xs text-slate-500">{{ t('table.showing') }} {{ currentPage() * pageSize + 1 }}-{{ min((currentPage() + 1) * pageSize, totalElements()) }} {{ t('table.of') }} {{ totalElements() }}</p>
              <div class="flex gap-1">
                <button (click)="goToPage(0)" [disabled]="currentPage()===0" class="px-2 py-1 rounded-lg border border-slate-200 text-xs disabled:opacity-30">&laquo;</button>
                <button (click)="goToPage(currentPage()-1)" [disabled]="currentPage()===0" class="px-3 py-1 rounded-lg border border-slate-200 text-xs disabled:opacity-30">{{ t('table.prev') }}</button>
                @for (p of visiblePages(); track p) {
                  <button (click)="goToPage(p)" class="px-3 py-1 rounded-lg border text-xs font-medium" [class]="p === currentPage() ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'">{{ p + 1 }}</button>
                }
                <button (click)="goToPage(currentPage()+1)" [disabled]="currentPage()>=totalPages()-1" class="px-3 py-1 rounded-lg border border-slate-200 text-xs disabled:opacity-30">{{ t('table.next') }}</button>
                <button (click)="goToPage(totalPages()-1)" [disabled]="currentPage()>=totalPages()-1" class="px-2 py-1 rounded-lg border border-slate-200 text-xs disabled:opacity-30">&raquo;</button>
              </div>
            </div>
          }
        }
      </div>
    </app-main-layout>
  `,
})
export class AdminClientsComponent implements OnInit {
  private readonly api = inject(ApiService);
  loading = signal(true);
  clients = signal<Client[]>([]);
  currentPage = signal(0); totalPages = signal(1); totalElements = signal(0);
  pageSize = 15;
  statusFilter = ''; search = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const p: Record<string, string | number> = { page: this.currentPage(), size: this.pageSize, sort: 'createdAt,desc' };
    if (this.statusFilter) p['status'] = this.statusFilter;
    if (this.search.trim()) p['search'] = this.search.trim();
    this.api.get<any>('/api/v1/admin/clients', p).subscribe({
      next: (r) => { this.clients.set(r.data?.content ?? []); this.totalPages.set(r.data?.totalPages ?? 1); this.totalElements.set(r.data?.totalElements ?? 0); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  applyFilters() { this.currentPage.set(0); this.load(); }
  clearFilters() { this.statusFilter = ''; this.search = ''; this.applyFilters(); }
  hasFilters(): boolean { return !!(this.statusFilter || this.search.trim()); }
  goToPage(p: number) { if (p >= 0 && p < this.totalPages()) { this.currentPage.set(p); this.load(); } }
  visiblePages(): number[] { const t = this.totalPages(), c = this.currentPage(), pages: number[] = []; for (let i = Math.max(0, c - 2); i <= Math.min(t - 1, c + 2); i++) pages.push(i); return pages; }
  min(a: number, b: number) { return Math.min(a, b); }
  statusBadge(s: string): string { const m: Record<string,string> = { ACTIVE:'bg-emerald-100 text-emerald-700', PENDING:'bg-amber-100 text-amber-700', SUSPENDED:'bg-red-100 text-red-700', REJECTED:'bg-red-100 text-red-700' }; return m[s]||'bg-slate-100 text-slate-600'; }
  formatDate(d: string): string { if (!d) return ''; try { return new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'2-digit'}); } catch { return d; } }
}
