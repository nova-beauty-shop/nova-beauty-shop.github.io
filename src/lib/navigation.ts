import { useSyncExternalStore } from 'react';

const NAVIGATE_EVENT = 'nova:navigate';

function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback);
  window.addEventListener(NAVIGATE_EVENT, callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener(NAVIGATE_EVENT, callback);
  };
}

function currentHref() {
  return window.location.pathname + window.location.search;
}

export function useLocation() {
  const href = useSyncExternalStore(subscribe, currentHref, currentHref);
  const url = new URL(href, window.location.origin);
  return { pathname: url.pathname, searchParams: url.searchParams };
}

export function navigate(to: string, options?: { replace?: boolean }) {
  if (options?.replace) {
    window.history.replaceState({}, '', to);
  } else {
    window.history.pushState({}, '', to);
  }
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
  if (!options?.replace) window.scrollTo({ top: 0 });
}
