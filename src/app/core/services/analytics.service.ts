import { Injectable } from '@angular/core';
import posthog, { type PostHog } from 'posthog-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly enabled = environment.production && !!environment.posthog.apiKey;

  init(): void {
    if (!this.enabled) return;
    posthog.init(environment.posthog.apiKey, {
      api_host: environment.posthog.host,
      capture_pageview: true,
      capture_pageleave: true,
      session_recording: {
        maskAllInputs: false,
        maskInputOptions: { password: true },
        maskTextSelector: '[data-ph-mask]',
      },
    });
  }

  identify(userId: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) return;
    posthog.identify(userId, properties);
  }

  reset(): void {
    if (!this.enabled) return;
    posthog.reset();
  }

  track(event: string, properties?: Record<string, unknown>): void {
    if (!this.enabled) return;
    posthog.capture(event, properties);
  }

  isFeatureEnabled(flag: string): boolean {
    if (!this.enabled) return false;
    return posthog.isFeatureEnabled(flag) ?? false;
  }

  getFeatureFlag(flag: string): string | boolean | undefined {
    if (!this.enabled) return undefined;
    return posthog.getFeatureFlag(flag);
  }

  get client(): PostHog | null {
    return this.enabled ? posthog : null;
  }
}
