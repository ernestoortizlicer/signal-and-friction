const CONSENT_KEY = "sf-cookie-consent";

export type ConsentValue = "accepted" | "rejected";

export const CONSENT_CHANGE_EVENT = "sf-consent-change";
export const SHOW_BANNER_EVENT = "sf-show-cookie-banner";

export function getConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(CONSENT_KEY);
  return v === "accepted" || v === "rejected" ? v : null;
}

export function setConsent(value: ConsentValue) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent<ConsentValue>(CONSENT_CHANGE_EVENT, { detail: value }));
}
