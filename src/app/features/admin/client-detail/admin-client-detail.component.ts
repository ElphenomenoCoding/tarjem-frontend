import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateLangPipe } from '../../../shared/pipes/translate-lang.pipe';

interface UserDetail { id: string; firstName: string; lastName: string; email: string; phone: string | null; role: string; status: string; wilaya: string | null; address: string; preferredLanguage: string | null; createdAt: string; }
interface OrderItem { id: string; documentType: string; sourceLanguage: string; targetLanguage: string; status: string; totalPrice: number; createdAt: string; }

@Component({
  selector: 'app-admin-client-detail',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, RouterLink, DecimalPipe, TranslateLangPipe],
  styles: [`@keyframes fade-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.anim{animation:fade-up .35s ease-out both}.anim-1{animation-delay:.05s}.anim-2{animation-delay:.1s}`],
  template: `
    <app-main-layout>
      <div *transloco="let t">
        <a routerLink="/admin/clients" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 cursor-pointer">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          {{ t('nav.clients') }}
        </a>

        @if (loading()) {
          <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center"><svg class="w-6 h-6 animate-spin text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></div>
        } @else if (user()) {
          <!-- Profile Card -->
          <div class="anim rounded-2xl border border-slate-200 bg-white p-6 mb-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-600">{{ initials() }}</div>
                <div>
                  <h1 class="text-xl font-bold text-slate-900">{{ user()!.firstName }} {{ user()!.lastName }}</h1>
                  <p class="text-sm text-slate-500">{{ user()!.email }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold px-2.5 py-1 rounded-full" [class]="statusBadge(user()!.status)">{{ user()!.status }}</span>
                @if (user()!.status !== 'SUSPENDED') {
                  <button (click)="updateStatus('SUSPENDED')" class="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer">{{ t('admin.suspend') }}</button>
                }
                @if (user()!.status === 'SUSPENDED') {
                  <button (click)="updateStatus('ACTIVE')" class="px-3 py-1.5 text-xs font-semibold text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 cursor-pointer">{{ t('admin.activate') }}</button>
                }
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><p class="text-slate-400 text-xs">{{ t('auth.phone') }}</p><p class="font-medium text-slate-800">{{ user()!.phone ?? '-' }}</p></div>
              <div><p class="text-slate-400 text-xs">{{ t('auth.wilaya') }}</p><p class="font-medium text-slate-800">{{ user()!.wilaya ?? '-' }}</p></div>
              <div><p class="text-slate-400 text-xs">{{ t('profile.preferredLanguage') }}</p><p class="font-medium text-slate-800">{{ user()!.preferredLanguage ?? '-' }}</p></div>
              <div><p class="text-slate-400 text-xs">{{ t('admin.joinedAt') }}</p><p class="font-medium text-slate-800">{{ formatDate(user()!.createdAt) }}</p></div>
            </div>
          </div>

          <!-- Client Stats -->
          <div class="anim anim-1 grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div class="rounded-xl border border-slate-200 bg-white p-4">
              <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{{ t('admin.totalOrders') }}</p>
              <p class="text-xl font-black text-slate-800 mt-0.5">{{ orders().length }}</p>
            </div>
            <div class="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4">
              <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{{ t('admin.totalSpent') }}</p>
              <p class="text-xl font-black text-emerald-700 mt-0.5">{{ totalSpent() | number }} {{ t('common.currency') }}</p>
            </div>
            <div class="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4">
              <p class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{{ t('admin.delivered') }}</p>
              <p class="text-xl font-black text-blue-700 mt-0.5">{{ deliveredCount() }}</p>
            </div>
            <div class="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
              <p class="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{{ t('admin.inProgress') }}</p>
              <p class="text-xl font-black text-amber-700 mt-0.5">{{ activeCount() }}</p>
            </div>
          </div>

          <!-- Orders -->
          <div class="anim anim-2 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 class="text-sm font-bold text-slate-900">{{ t('nav.orders') }}</h2>
              <span class="text-xs text-slate-400">{{ orders().length }}</span>
            </div>
            @if (orders().length === 0) {
              <p class="text-sm text-slate-400 text-center py-8">{{ t('common.noData') }}</p>
            } @else {
              <table class="w-full">
                <thead class="bg-slate-50/80">
                  <tr>
                    <th class="px-4 py-2 text-start text-[10px] font-bold text-slate-500 uppercase">ID</th>
                    <th class="px-4 py-2 text-start text-[10px] font-bold text-slate-500 uppercase">{{ t('order.documentType') }}</th>
                    <th class="px-4 py-2 text-start text-[10px] font-bold text-slate-500 uppercase">{{ t('order.languages') }}</th>
                    <th class="px-4 py-2 text-start text-[10px] font-bold text-slate-500 uppercase">{{ t('common.status') }}</th>
                    <th class="px-4 py-2 text-end text-[10px] font-bold text-slate-500 uppercase">{{ t('order.price') }}</th>
                    <th class="px-4 py-2 text-end text-[10px] font-bold text-slate-500 uppercase">{{ t('common.date') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (o of orders(); track o.id) {
                    <tr class="hover:bg-slate-50/50 cursor-pointer" [routerLink]="['/admin/orders', o.id]">
                      <td class="px-4 py-2.5 text-xs font-mono text-blue-600">#{{ o.id.substring(0,8) }}</td>
                      <td class="px-4 py-2.5 text-sm text-slate-700">{{ o.documentType }}</td>
                      <td class="px-4 py-2.5 text-sm text-slate-600"><bdi dir="ltr">{{ o.sourceLanguage | translateLang }} &rarr; {{ o.targetLanguage | translateLang }}</bdi></td>
                      <td class="px-4 py-2.5"><span class="text-[10px] font-bold px-2 py-0.5 rounded-full" [class]="orderStatusBadge(o.status)">{{ t('status.' + camelCase(o.status)) }}</span></td>
                      <td class="px-4 py-2.5 text-sm font-bold text-slate-800 text-end">{{ o.totalPrice | number }} {{ t('common.currency') }}</td>
                      <td class="px-4 py-2.5 text-xs text-slate-500 text-end">{{ formatDate(o.createdAt) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        }
      </div>
    </app-main-layout>
  `,
})
export class AdminClientDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  loading = signal(true);
  user = signal<UserDetail | null>(null);
  orders = signal<OrderItem[]>([]);

  totalSpent = computed(() => this.orders().reduce((sum, o) => sum + o.totalPrice, 0));
  deliveredCount = computed(() => this.orders().filter(o => o.status === 'DELIVERED').length);
  activeCount = computed(() => this.orders().filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)).length);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.get<UserDetail>(`/api/v1/admin/users/${id}`).subscribe({
      next: (r) => { if (r.data) this.user.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.get<any>(`/api/v1/admin/clients/${id}/orders`, { size: 50, sort: 'createdAt,desc' }).subscribe({
      next: (r) => this.orders.set(r.data?.content ?? []),
    });
  }

  updateStatus(status: string) {
    const id = this.user()?.id; if (!id) return;
    this.api.patch(`/api/v1/admin/users/${id}/status`, { status }).subscribe({
      next: () => { this.user.update(u => u ? { ...u, status } : u); this.toast.success(this.transloco.translate('common.success')); },
      error: (e: HttpErrorResponse) => this.toast.error(e.error?.message || this.transloco.translate('common.error')),
    });
  }

  initials(): string { const u = this.user(); return ((u?.firstName?.[0]||'')+(u?.lastName?.[0]||'')).toUpperCase(); }
  statusBadge(s: string): string { const m: Record<string,string>={ACTIVE:'bg-emerald-100 text-emerald-700',PENDING:'bg-amber-100 text-amber-700',SUSPENDED:'bg-red-100 text-red-700',REJECTED:'bg-red-100 text-red-700'}; return m[s]||'bg-slate-100 text-slate-600'; }
  orderStatusBadge(s: string): string { const m: Record<string,string>={PAID:'bg-green-100 text-green-700',IN_PROGRESS:'bg-blue-100 text-blue-700',PENDING_REVIEW:'bg-purple-100 text-purple-700',DELIVERED:'bg-emerald-100 text-emerald-700',CANCELLED:'bg-red-100 text-red-700',APPROVED:'bg-emerald-100 text-emerald-700'}; return m[s]||'bg-slate-100 text-slate-600'; }
  camelCase(s: string): string { return s.toLowerCase().replaceAll(/_([a-z])/g,(_:string,c:string)=>c.toUpperCase()); }
  formatDate(d: string): string { if(!d) return ''; try { return new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'2-digit'}); } catch { return d; } }
}
