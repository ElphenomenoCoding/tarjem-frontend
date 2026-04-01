import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApiResponse } from './auth.service';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  get<T>(url: string, params?: Record<string, string | number>): Observable<BaseApiResponse<T>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    return this.http.get<BaseApiResponse<T>>(url, { params: httpParams });
  }

  post<T>(url: string, body?: unknown): Observable<BaseApiResponse<T>> {
    return this.http.post<BaseApiResponse<T>>(url, body);
  }

  patch<T>(url: string, body?: unknown): Observable<BaseApiResponse<T>> {
    return this.http.patch<BaseApiResponse<T>>(url, body);
  }

  delete<T>(url: string): Observable<BaseApiResponse<T>> {
    return this.http.delete<BaseApiResponse<T>>(url);
  }

  upload<T>(url: string, file: File, fieldName = 'file', extraFields?: Record<string, string>): Observable<BaseApiResponse<T>> {
    const formData = new FormData();
    formData.append(fieldName, file);
    if (extraFields) {
      Object.entries(extraFields).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
    return this.http.post<BaseApiResponse<T>>(url, formData);
  }
}
