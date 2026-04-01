import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    const role = auth.userRole();
    switch (role) {
      case 'TRANSLATOR': router.navigate(['/translator/dashboard']); break;
      case 'ADMIN': router.navigate(['/admin/dashboard']); break;
      default: router.navigate(['/client/dashboard']); break;
    }
    return false;
  }
  return true;
};

export const roleGuard =
  (...roles: string[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      router.navigate(['/auth/login']);
      return false;
    }

    const userRole = auth.userRole();
    if (userRole && roles.includes(userRole)) {
      return true;
    }

    router.navigate(['/']);
    return false;
  };
