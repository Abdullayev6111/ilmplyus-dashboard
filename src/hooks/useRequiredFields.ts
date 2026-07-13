import { useCallback, useEffect, useRef, useState } from 'react';

/** Bo'sh qolgan majburiy maydonga qo'yiladigan sinf — chegarani qizil qiladi. */
export const INVALID_CLASS = 'sc-invalid';

const FIELD_SELECTOR = 'input, select, textarea';

/**
 * Formadagi majburiy maydonlar `<label>` ichidagi `*` bilan belgilanadi, shuning
 * uchun har bir input'ga alohida `error` prop qo'shish shart emas — tekshiruv
 * DOM'dan o'qiydi.
 */
function isRequiredLabel(label: HTMLLabelElement) {
  return label.textContent?.includes('*') ?? false;
}

function isFillable(field: Element): field is HTMLInputElement {
  const el = field as HTMLInputElement;
  if (el.disabled || el.readOnly) return false;
  if (el.tagName === 'INPUT' && ['hidden', 'file', 'checkbox', 'radio'].includes(el.type)) {
    return false;
  }
  return true;
}

/**
 * Majburiy maydonlarni saqlash bosilganda tekshiradi: bo'shlari qizil chegara
 * oladi va birinchisiga scroll qilinadi. Bir marta tekshirilgach, keyingi har
 * bir render'da qayta belgilanadi — foydalanuvchi to'ldirgani bilan qizil yo'qoladi
 * (kalendardan tanlangan sana ham, chunki `input` hodisasi emas, render kuzatiladi).
 */
export function useRequiredFields<T extends HTMLElement = HTMLDivElement>() {
  const formRef = useRef<T>(null);
  const [armed, setArmed] = useState(false);

  const mark = useCallback((scroll: boolean) => {
    const root = formRef.current;
    if (!root) return true;

    let firstInvalid: HTMLElement | null = null;

    root.querySelectorAll<HTMLLabelElement>('label').forEach((label) => {
      const group = label.parentElement;
      if (!group) return;
      const required = isRequiredLabel(label);

      group.querySelectorAll(FIELD_SELECTOR).forEach((field) => {
        if (!isFillable(field)) return;
        const blank = !field.value.trim();
        field.classList.toggle(INVALID_CLASS, required && blank);
        if (required && blank && !firstInvalid) firstInvalid = field;
      });
    });

    if (!firstInvalid) return true;

    if (scroll) {
      const target = firstInvalid as HTMLElement;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Scroll tugagach fokuslaymiz — `preventScroll` sakrashning oldini oladi.
      window.setTimeout(() => target.focus({ preventScroll: true }), 400);
    }
    return false;
  }, []);

  // Tekshiruv yoqilgach har bir renderda qayta belgilanadi.
  useEffect(() => {
    if (armed) mark(false);
  });

  /** Saqlash/keyingi bosqich tugmasida chaqiriladi. To'liq bo'lsa `true`. */
  const validate = useCallback(() => {
    setArmed(true);
    return mark(true);
  }, [mark]);

  /** Boshqa bosqichga o'tkazib, o'sha yerdagi bo'sh maydonlarni belgilash uchun. */
  const arm = useCallback(() => setArmed(true), []);

  return { formRef, validate, arm };
}

export default useRequiredFields;
