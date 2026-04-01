import { Routes } from '@angular/router';
import { guestGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'estimate',
    loadComponent: () => import('./features/estimator/estimator.component').then((m) => m.EstimatorComponent),
  },
  {
    path: 'verify',
    loadComponent: () => import('./features/verify/verify.component').then((m) => m.VerifyComponent),
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent,
          ),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register-client/register-client.component').then(
            (m) => m.RegisterClientComponent,
          ),
      },
      {
        path: 'register/translator',
        loadComponent: () =>
          import('./features/auth/register-translator/register-translator.component').then(
            (m) => m.RegisterTranslatorComponent,
          ),
      },
      {
        path: 'verify-email',
        loadComponent: () =>
          import('./features/auth/verify-email/verify-email.component').then(
            (m) => m.VerifyEmailComponent,
          ),
      },
    ],
  },
  {
    path: 'client',
    canActivate: [roleGuard('CLIENT')],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/client/dashboard/client-dashboard.component').then(
            (m) => m.ClientDashboardComponent,
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/client/orders/client-orders.component').then((m) => m.ClientOrdersComponent),
      },
      {
        path: 'orders/new',
        loadComponent: () =>
          import('./features/client/new-order/new-order.component').then((m) => m.NewOrderComponent),
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./features/client/order-detail/order-detail.component').then((m) => m.OrderDetailComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/client/profile/client-profile.component').then((m) => m.ClientProfileComponent),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/client/notifications/client-notifications.component').then(
            (m) => m.ClientNotificationsComponent,
          ),
      },
      {
        path: 'support',
        loadComponent: () =>
          import('./features/client/support/client-support.component').then(
            (m) => m.ClientSupportComponent,
          ),
      },
    ],
  },
  {
    path: 'translator',
    canActivate: [roleGuard('TRANSLATOR')],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/translator/dashboard/translator-dashboard.component').then(
            (m) => m.TranslatorDashboardComponent,
          ),
      },
      {
        path: 'orders/available',
        loadComponent: () =>
          import('./features/translator/available-orders/available-orders.component').then(
            (m) => m.AvailableOrdersComponent,
          ),
      },
      {
        path: 'orders/mine',
        loadComponent: () =>
          import('./features/translator/my-orders/translator-my-orders.component').then(
            (m) => m.TranslatorMyOrdersComponent,
          ),
      },
      {
        path: 'orders/:id/detail',
        loadComponent: () =>
          import('./features/translator/order-detail/translator-order-detail.component').then(
            (m) => m.TranslatorOrderDetailComponent,
          ),
      },
      {
        path: 'orders/:id/workspace',
        loadComponent: () =>
          import('./features/translator/workspace/translator-workspace.component').then(
            (m) => m.TranslatorWorkspaceComponent,
          ),
      },
      {
        path: 'commissions',
        loadComponent: () =>
          import('./features/translator/commissions/translator-commissions.component').then(
            (m) => m.TranslatorCommissionsComponent,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/client/notifications/client-notifications.component').then(
            (m) => m.ClientNotificationsComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/translator/profile/translator-profile.component').then(
            (m) => m.TranslatorProfileComponent,
          ),
      },
      {
        path: 'support',
        loadComponent: () =>
          import('./features/client/support/client-support.component').then(
            (m) => m.ClientSupportComponent,
          ),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [roleGuard('ADMIN')],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./features/admin/clients/admin-clients.component').then((m) => m.AdminClientsComponent),
      },
      {
        path: 'clients/:id',
        loadComponent: () =>
          import('./features/admin/client-detail/admin-client-detail.component').then(
            (m) => m.AdminClientDetailComponent,
          ),
      },
      {
        path: 'users',
        redirectTo: 'clients',
        pathMatch: 'full',
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./features/admin/client-detail/admin-client-detail.component').then(
            (m) => m.AdminClientDetailComponent,
          ),
      },
      {
        path: 'translators',
        loadComponent: () =>
          import('./features/admin/translators/admin-translators.component').then(
            (m) => m.AdminTranslatorsComponent,
          ),
      },
      {
        path: 'translators/:id',
        loadComponent: () =>
          import('./features/admin/translator-detail/admin-translator-detail.component').then(
            (m) => m.AdminTranslatorDetailComponent,
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/admin/orders/admin-orders.component').then((m) => m.AdminOrdersComponent),
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./features/admin/order-detail/admin-order-detail.component').then(
            (m) => m.AdminOrderDetailComponent,
          ),
      },
      {
        path: 'finance',
        loadComponent: () =>
          import('./features/admin/finance/admin-finance.component').then((m) => m.AdminFinanceComponent),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/client/notifications/client-notifications.component').then(
            (m) => m.ClientNotificationsComponent,
          ),
      },
      {
        path: 'config',
        loadComponent: () =>
          import('./features/admin/config/admin-config.component').then((m) => m.AdminConfigComponent),
      },
      {
        path: 'support',
        loadComponent: () =>
          import('./features/admin/support/admin-support.component').then(
            (m) => m.AdminSupportComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
