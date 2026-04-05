import { trapFocus } from './html';

interface ModalOptions {
  ariaLabel: string;
  className?: string;
  style?: string;
  parent?: HTMLElement;
}

interface ModalResult {
  overlay: HTMLElement;
  content: HTMLElement;
  close: () => void;
}

/**
 * Create an accessible modal with overlay, focus trap, and Escape-to-close.
 * Returns the overlay element, the inner content div, and a close function.
 */
export function createModal(options: ModalOptions): ModalResult {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', options.ariaLabel);

  const content = document.createElement('div');
  content.className = options.className ?? 'modal';
  if (options.style) {
    content.style.cssText = options.style;
  }
  overlay.appendChild(content);

  let cleanupFocus: (() => void) | null = null;

  const close = () => {
    if (cleanupFocus) {
      cleanupFocus();
      cleanupFocus = null;
    }
    overlay.remove();
  };

  // Close on Escape
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };
  overlay.addEventListener('keydown', onKeyDown);

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const parent = options.parent ?? document.body;
  parent.appendChild(overlay);

  // Defer focus trap to after caller sets innerHTML
  requestAnimationFrame(() => {
    cleanupFocus = trapFocus(overlay);
  });

  return { overlay, content, close };
}
