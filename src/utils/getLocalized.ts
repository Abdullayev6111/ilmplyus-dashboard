// Backenddan kelgan obyekt ichidan kerakli tildagi maydonni ajratib beradi.
// Masalan: obj agar { title_uz: "Salom", title_ru: "" } bo'lsa, 
// getLocalized(obj, 'title', 'ru') -> "-" qaytaradi.
export const getLocalized = (obj: any, fieldName: string, lang: string): string => {
  if (!obj) return '-';
  
  // Ensure we just use the first two letters of the language code (e.g. "ru-RU" -> "ru")
  const shortLang = lang?.substring(0, 2).toLowerCase() || 'uz';
  
  const value = obj?.[`${fieldName}_${shortLang}`];
  if (value && String(value).trim() !== '') {
    return String(value);
  }
  
  return '-';
};
