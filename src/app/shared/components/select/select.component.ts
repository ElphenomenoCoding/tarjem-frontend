import { Component, input, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';

export interface SelectOption {
  value: string | number;
  label: string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [ReactiveFormsModule, TranslocoModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
  styles: [],
  template: `
    <div class="w-full">
      @if (label()) {
        <label
          [for]="selectId"
          class="block text-sm font-medium text-gray-700 mb-1"
        >
          {{ label() }}
          @if (required()) {
            <span class="text-red-500 ms-0.5">*</span>
          }
        </label>
      }
      <div class="relative">
        <select
          [id]="selectId"
          [disabled]="isDisabled()"
          [required]="required()"
          [multiple]="multiple()"
          (change)="onSelectChange($event)"
          (blur)="onTouched()"
          class="block w-full appearance-none rounded-lg border bg-white pe-10 ps-3 py-2.5 text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1"
          [class]="error() ? 'border-red-400 text-red-900 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'"
        >
          @if (placeholder() && !multiple()) {
            <option value="" disabled [selected]="!value()">
              {{ placeholder() }}
            </option>
          }
          @for (option of options(); track option.value) {
            <option [value]="option.value" [selected]="isSelected(option.value)">
              {{ translateOptions() ? (option.label | transloco) : option.label }}
            </option>
          }
        </select>
        @if (!multiple()) {
          <div class="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3">
            <svg class="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        }
      </div>
      @if (error()) {
        <p class="mt-1 text-xs text-red-600">{{ error() }}</p>
      }
    </div>
  `
})
export class SelectComponent implements ControlValueAccessor {
  label = input('');
  options = input<SelectOption[]>([]);
  placeholder = input('');
  error = input('');
  multiple = input(false);
  required = input(false);
  translateOptions = input(true);

  value = signal<string | string[]>('');
  isDisabled = signal(false);

  selectId = 'select-' + Math.random().toString(36).substring(2, 9);

  private onChange: (value: string | string[]) => void = () => {};
  onTouched: () => void = () => {};

  isSelected(optionValue: string | number): boolean {
    const current = this.value();
    if (Array.isArray(current)) {
      return current.includes(String(optionValue));
    }
    return String(current) === String(optionValue);
  }

  onSelectChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (this.multiple()) {
      const selectedValues = Array.from(select.selectedOptions).map(o => o.value);
      this.value.set(selectedValues);
      this.onChange(selectedValues);
    } else {
      this.value.set(select.value);
      this.onChange(select.value);
    }
  }

  writeValue(value: string | string[]): void {
    this.value.set(value ?? (this.multiple() ? [] : ''));
  }

  registerOnChange(fn: (value: string | string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }
}
