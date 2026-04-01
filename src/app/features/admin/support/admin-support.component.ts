import { Component, inject, signal, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MainLayoutComponent } from '../../../shared/layouts/main-layout/main-layout.component';
import { ApiService, PageResponse } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

interface Ticket {
  id: string;
  userId: string;
  userName: string;
  orderId: string | null;
  subject: string;
  description: string;
  status: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  messageCount: number;
  createdAt: string;
}

interface Message {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  content: string;
  createdAt: string;
  attachmentName: string | null;
  attachmentSize: number | null;
  attachmentType: string | null;
  attachmentUrl: string | null;
}

@Component({
  selector: 'app-admin-support',
  standalone: true,
  imports: [MainLayoutComponent, TranslocoModule, FormsModule, RouterLink],
  styles: [`
    @keyframes fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .anim { animation: fade-up 0.4s ease-out both; }
    .ticket-item { transition: all 0.15s ease; cursor: pointer; }
    .ticket-item:hover { background-color: #f8fafc; }
    .ticket-active { background-color: #eff6ff !important; border-inline-start: 3px solid #2563eb; }
    .chat-bubble { animation: fade-up 0.2s ease-out both; }
  `],
  template: `
    <app-main-layout>
      <div *transloco="let t">
        <!-- Header -->
        <div class="anim flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-slate-900">{{ t('ticket.title') }}</h1>
            <p class="mt-1 text-sm text-slate-500">{{ t('ticket.adminSubtitle') }}</p>
          </div>
        </div>

        <!-- Main layout: list + chat -->
        <div class="flex flex-col lg:flex-row gap-4" style="min-height: 70vh;">

          <!-- LEFT: Ticket list -->
          <div class="w-full lg:w-[380px] shrink-0" [class.hidden]="selectedTicket() && mobileMode()" [class.lg:block]="true">
            <div class="rounded-2xl border border-slate-200 bg-white overflow-hidden h-full flex flex-col">
              <!-- Status filter tabs -->
              <div class="flex items-center gap-1 p-3 border-b border-slate-100 overflow-x-auto">
                @for (tab of statusTabs; track tab.value) {
                  <button (click)="filterStatus.set(tab.value); currentPage.set(0); loadTickets()"
                    class="px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer"
                    [class]="filterStatus() === tab.value ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'">
                    {{ t(tab.label) }}
                  </button>
                }
              </div>

              <!-- Ticket items -->
              <div class="flex-1 overflow-y-auto divide-y divide-slate-50">
                @if (loadingTickets()) {
                  <div class="p-8 text-center">
                    <svg class="w-6 h-6 animate-spin mx-auto text-blue-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                  </div>
                } @else if (tickets().length === 0) {
                  <div class="p-8 text-center">
                    <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <svg class="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                    </div>
                    <p class="text-sm font-medium text-slate-700">{{ t('ticket.noTickets') }}</p>
                  </div>
                } @else {
                  @for (ticket of tickets(); track ticket.id) {
                    <div (click)="selectTicket(ticket)" class="ticket-item px-4 py-3" [class.ticket-active]="selectedTicket()?.id === ticket.id">
                      <div class="flex items-start justify-between gap-2">
                        <p class="text-sm font-semibold text-slate-800 truncate flex-1">{{ ticket.subject }}</p>
                        <span class="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full"
                          [class]="statusBadgeClass(ticket.status)">
                          {{ statusLabel(ticket.status, t) }}
                        </span>
                      </div>
                      <p class="text-[11px] text-slate-400 mt-0.5">{{ t('ticket.by') }} {{ ticket.userName }}</p>
                      @if (ticket.lastMessage) {
                        <p class="text-xs text-slate-500 mt-1 line-clamp-1">{{ ticket.lastMessage }}</p>
                      }
                      <div class="flex items-center gap-3 mt-1.5">
                        <span class="text-[10px] text-slate-400">{{ timeAgo(ticket.lastMessageAt || ticket.createdAt) }}</span>
                        <span class="text-[10px] text-slate-400">{{ ticket.messageCount }} {{ t('ticket.messages') }}</span>
                        @if (ticket.orderId) {
                          <span class="text-[10px] text-blue-500 font-medium">{{ t('ticket.order') }} #{{ ticket.orderId.substring(0, 8) }}</span>
                        }
                      </div>
                    </div>
                  }
                }
              </div>

              <!-- Pagination -->
              @if (totalPages() > 1) {
                <div class="flex justify-center items-center gap-2 p-3 border-t border-slate-100">
                  <button (click)="currentPage.set(currentPage() - 1); loadTickets()" [disabled]="currentPage() === 0"
                    class="px-3 py-1 text-xs border border-slate-200 rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50 cursor-pointer">{{ t('common.previous') }}</button>
                  <span class="text-xs text-slate-500">{{ currentPage() + 1 }} / {{ totalPages() }}</span>
                  <button (click)="currentPage.set(currentPage() + 1); loadTickets()" [disabled]="currentPage() >= totalPages() - 1"
                    class="px-3 py-1 text-xs border border-slate-200 rounded-lg bg-white disabled:opacity-40 hover:bg-slate-50 cursor-pointer">{{ t('common.next') }}</button>
                </div>
              }
            </div>
          </div>

          <!-- RIGHT: Chat view -->
          <div class="flex-1 min-w-0" [class.hidden]="!selectedTicket() && mobileMode()" [class.lg:block]="true">
            @if (!selectedTicket()) {
              <div class="rounded-2xl border border-slate-200 bg-white h-full flex items-center justify-center p-12">
                <div class="text-center">
                  <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                    <svg class="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                  </div>
                  <p class="text-sm text-slate-500">{{ t('ticket.selectTicket') }}</p>
                </div>
              </div>
            } @else {
              <div class="rounded-2xl border border-slate-200 bg-white h-full flex flex-col" style="min-height: 60vh; max-height: 75vh;">
                <!-- Chat header -->
                <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
                  <div class="flex items-center gap-3 min-w-0">
                    <!-- Mobile back button -->
                    <button (click)="selectedTicket.set(null)" class="lg:hidden p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
                      <svg class="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                    </button>
                    <div class="min-w-0">
                      <p class="text-sm font-bold text-slate-800 truncate">{{ selectedTicket()!.subject }}</p>
                      <div class="flex items-center gap-2">
                        <p class="text-[11px] text-slate-400">{{ t('ticket.by') }} {{ selectedTicket()!.userName }}</p>
                        @if (selectedTicket()!.orderId) {
                          <a [routerLink]="'/admin/orders/' + selectedTicket()!.orderId" class="text-[11px] text-blue-600 hover:underline">{{ t('ticket.order') }} #{{ selectedTicket()!.orderId!.substring(0, 8) }}</a>
                        }
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <!-- Status change dropdown -->
                    <div class="flex items-center gap-1.5">
                      <select [(ngModel)]="selectedStatus"
                        class="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
                        <option value="OPEN">{{ t('ticket.open') }}</option>
                        <option value="IN_PROGRESS">{{ t('ticket.inProgress') }}</option>
                        <option value="RESOLVED">{{ t('ticket.resolved') }}</option>
                        <option value="CLOSED">{{ t('ticket.closedTab') }}</option>
                      </select>
                      <button (click)="changeStatus()" [disabled]="changingStatus() || selectedStatus === selectedTicket()!.status"
                        class="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-40 transition-all cursor-pointer">
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Messages -->
                <div #chatContainer class="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  @if (loadingMessages()) {
                    <div class="flex justify-center py-8">
                      <svg class="w-6 h-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    </div>
                  } @else {
                    @for (msg of messages(); track msg.id) {
                      @if (isAdminMessage(msg)) {
                        <!-- Admin message (right, purple) -->
                        <div class="chat-bubble flex justify-end">
                          <div class="max-w-[75%]">
                            <div class="bg-purple-600 text-white rounded-2xl rounded-br-md px-4 py-2.5">
                              @if (msg.content) {
                                <p class="text-sm whitespace-pre-wrap">{{ msg.content }}</p>
                              }
                              @if (msg.attachmentUrl) {
                                @if (msg.attachmentType?.startsWith('image/')) {
                                  <img [src]="msg.attachmentUrl" [alt]="msg.attachmentName" class="rounded-lg max-w-xs max-h-48 mt-2 cursor-pointer border border-white/20" (click)="previewImage.set(msg.attachmentUrl); $event.stopPropagation()">
                                } @else {
                                  <a [href]="msg.attachmentUrl" target="_blank" class="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-white/20 text-white text-xs hover:bg-white/30 transition-all">
                                    <span>📎</span> {{ msg.attachmentName }} ({{ formatFileSize(msg.attachmentSize!) }})
                                  </a>
                                }
                              }
                            </div>
                            <div class="flex items-center justify-end gap-2 mt-1">
                              <span class="text-[10px] text-slate-400">{{ msg.senderName }}</span>
                              <span class="text-[10px] text-slate-400">{{ formatTime(msg.createdAt) }}</span>
                            </div>
                          </div>
                        </div>
                      } @else {
                        <!-- User message (left, blue) -->
                        <div class="chat-bubble flex justify-start">
                          <div class="max-w-[75%]">
                            <p class="text-[10px] font-semibold text-blue-600 mb-1">{{ msg.senderName }} <span class="text-slate-400 font-normal">({{ msg.senderRole }})</span></p>
                            <div class="bg-blue-50 text-slate-800 rounded-2xl rounded-bl-md px-4 py-2.5">
                              @if (msg.content) {
                                <p class="text-sm whitespace-pre-wrap">{{ msg.content }}</p>
                              }
                              @if (msg.attachmentUrl) {
                                @if (msg.attachmentType?.startsWith('image/')) {
                                  <img [src]="msg.attachmentUrl" [alt]="msg.attachmentName" class="rounded-lg max-w-xs max-h-48 mt-2 cursor-pointer border border-slate-200" (click)="previewImage.set(msg.attachmentUrl); $event.stopPropagation()">
                                } @else {
                                  <a [href]="msg.attachmentUrl" target="_blank" class="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-white/50 border border-slate-200 text-xs hover:bg-white/80 transition-all">
                                    <span>📎</span> {{ msg.attachmentName }} ({{ formatFileSize(msg.attachmentSize!) }})
                                  </a>
                                }
                              }
                            </div>
                            <div class="flex items-center gap-2 mt-1">
                              <span class="text-[10px] text-slate-400">{{ formatTime(msg.createdAt) }}</span>
                            </div>
                          </div>
                        </div>
                      }
                    }
                  }
                </div>

                <!-- Message input -->
                <div class="border-t border-slate-100 px-4 py-3">
                  @if (selectedFile()) {
                    <div class="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-700">
                      <span>📎</span>
                      <span class="flex-1 truncate">{{ selectedFile()!.name }} ({{ formatFileSize(selectedFile()!.size) }})</span>
                      <button (click)="selectedFile.set(null)" class="shrink-0 text-purple-500 hover:text-purple-700 font-semibold cursor-pointer">{{ t('ticket.removeFile') }}</button>
                    </div>
                  }
                  <div class="flex items-end gap-2">
                    <textarea [(ngModel)]="newMessage" [placeholder]="t('ticket.messagePlaceholder')"
                      (keydown.enter)="onEnterKey($event)"
                      rows="1"
                      class="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none transition-all"></textarea>
                    <input #fileInput type="file" style="display: none" (change)="onFileSelected($event)">
                    <button (click)="fileInput.click()" [title]="t('ticket.attachFile')"
                      class="shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer">
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                    </button>
                    <button (click)="sendMessage()" [disabled]="sendingMessage() || (!newMessage.trim() && !selectedFile())"
                      class="shrink-0 rounded-xl bg-purple-600 p-2.5 text-white hover:bg-purple-700 disabled:opacity-40 transition-all cursor-pointer">
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
        <!-- Image preview modal -->
        @if (previewImage()) {
          <div class="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4" (click)="previewImage.set(null)">
            <img [src]="previewImage()!" class="max-w-full max-h-full rounded-lg shadow-2xl">
          </div>
        }
      </div>
    </app-main-layout>
  `,
})
export class AdminSupportComponent implements OnInit, AfterViewChecked {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly notifService = inject(NotificationService);

  @ViewChild('chatContainer') chatContainer!: ElementRef;

  // State
  tickets = signal<Ticket[]>([]);
  selectedTicket = signal<Ticket | null>(null);
  messages = signal<Message[]>([]);
  loadingTickets = signal(true);
  loadingMessages = signal(false);
  sendingMessage = signal(false);
  changingStatus = signal(false);
  selectedFile = signal<File | null>(null);
  previewImage = signal<string | null>(null);
  filterStatus = signal('OPEN');
  currentPage = signal(0);
  totalPages = signal(1);
  mobileMode = signal(false);

  newMessage = '';
  selectedStatus = 'OPEN';

  private readonly basePath = '/api/v1/admin/support';
  private shouldScroll = false;

  statusTabs = [
    { value: '', label: 'ticket.all' },
    { value: 'OPEN', label: 'ticket.open' },
    { value: 'IN_PROGRESS', label: 'ticket.inProgress' },
    { value: 'RESOLVED', label: 'ticket.resolved' },
    { value: 'CLOSED', label: 'ticket.closedTab' },
  ];

  ngOnInit() {
    this.checkMobile();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.checkMobile());
    }
    this.loadTickets();

    const ticketId = this.route.snapshot.queryParamMap.get('ticket');
    if (ticketId) {
      this.api.get<Ticket>('/api/v1/admin/support/tickets/' + ticketId).subscribe({
        next: (res) => { if (res.data) this.selectTicket(res.data); },
      });
    }
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private checkMobile() {
    if (typeof window !== 'undefined') {
      this.mobileMode.set(window.innerWidth < 1024);
    }
  }

  loadTickets() {
    this.loadingTickets.set(true);
    const params: Record<string, string | number> = { page: this.currentPage(), size: 20 };
    if (this.filterStatus()) params['status'] = this.filterStatus();

    this.api.get<PageResponse<Ticket>>(this.basePath + '/tickets', params).subscribe({
      next: (res) => {
        this.tickets.set(res.data?.content ?? []);
        this.totalPages.set(res.data?.totalPages ?? 1);
        this.loadingTickets.set(false);
      },
      error: () => this.loadingTickets.set(false),
    });
  }

  selectTicket(ticket: Ticket) {
    this.selectedTicket.set(ticket);
    this.selectedStatus = ticket.status;
    this.loadMessages(ticket.id);
  }

  loadMessages(ticketId: string) {
    this.loadingMessages.set(true);
    this.api.get<Message[]>(this.basePath + '/tickets/' + ticketId + '/messages').subscribe({
      next: (res) => {
        this.messages.set(res.data ?? []);
        this.loadingMessages.set(false);
        this.shouldScroll = true;
      },
      error: () => this.loadingMessages.set(false),
    });
  }

  sendMessage() {
    const ticket = this.selectedTicket();
    if (!ticket || (!this.newMessage.trim() && !this.selectedFile())) return;

    this.sendingMessage.set(true);
    const formData = new FormData();
    formData.append('content', this.newMessage.trim() || '');
    if (this.selectedFile()) {
      formData.append('file', this.selectedFile()!);
    }

    this.http.post<any>(this.basePath + '/tickets/' + ticket.id + '/messages', formData, {
      headers: { 'Authorization': 'Bearer ' + this.auth.getToken() }
    }).subscribe({
      next: (res) => {
        const msg = res.data ?? res;
        if (msg) {
          this.messages.update(list => [...list, msg]);
        }
        this.newMessage = '';
        this.selectedFile.set(null);
        this.sendingMessage.set(false);
        this.shouldScroll = true;
        this.toast.success(this.transloco.translate('ticket.messageSent'));
      },
      error: (err: HttpErrorResponse) => {
        this.sendingMessage.set(false);
        this.toast.error(err.error?.message || 'Error sending message');
      },
    });
  }

  changeStatus() {
    const ticket = this.selectedTicket();
    if (!ticket || this.selectedStatus === ticket.status) return;

    this.changingStatus.set(true);
    this.api.patch<Ticket>(this.basePath + '/tickets/' + ticket.id + '/status', { status: this.selectedStatus }).subscribe({
      next: (res) => {
        this.changingStatus.set(false);
        if (res.data) {
          this.selectedTicket.set(res.data);
          this.selectedStatus = res.data.status;
        } else {
          this.selectedTicket.update(t => t ? { ...t, status: this.selectedStatus } : null);
        }
        this.toast.success(this.transloco.translate('ticket.statusChanged'));
        this.loadTickets();
      },
      error: (err: HttpErrorResponse) => {
        this.changingStatus.set(false);
        this.toast.error(err.error?.message || 'Error changing status');
      },
    });
  }

  onEnterKey(event: Event) {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      ke.preventDefault();
      this.sendMessage();
    }
  }

  isAdminMessage(msg: Message): boolean {
    return msg.senderRole === 'ADMIN';
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'OPEN': return 'bg-amber-100 text-amber-700';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
      case 'RESOLVED': return 'bg-emerald-100 text-emerald-700';
      case 'CLOSED': return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  }

  statusLabel(status: string, t: (key: string) => string): string {
    switch (status) {
      case 'OPEN': return t('ticket.open');
      case 'IN_PROGRESS': return t('ticket.inProgress');
      case 'RESOLVED': return t('ticket.resolved');
      case 'CLOSED': return t('ticket.closedTab');
      default: return status;
    }
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '< 1 min';
    if (mins < 60) return mins + ' min';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h';
    const days = Math.floor(hours / 24);
    return days + 'j';
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.size > 10 * 1024 * 1024) {
        this.toast.error(this.transloco.translate('ticket.fileTooBig'));
        input.value = '';
        return;
      }
      this.selectedFile.set(file);
      input.value = '';
    }
  }

  private scrollToBottom() {
    try {
      if (this.chatContainer?.nativeElement) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    } catch (e) {
      // Do nothing
    }
  }
}
