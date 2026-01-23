import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  show(message: string, type: 'success' | 'error') {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0 show`;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '9999';

    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button class="btn-close btn-close-white me-2 m-auto"></button>
      </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }
}
