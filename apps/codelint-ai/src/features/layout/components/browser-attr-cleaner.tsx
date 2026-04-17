'use client';

import { useEffect } from 'react';

const EXTENSION_ATTRS = [
  'bis_skin_checked',
  'data-bitwarden-form-status',
  'data-1p-ignore',
  'data-lpignore',
  'data-form-type',
];

export function BrowserAttrCleaner() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stripExtensionAttrs = (root: ParentNode) => {
      const elements = root.querySelectorAll<HTMLElement>('*');
      elements.forEach((element) => {
        EXTENSION_ATTRS.forEach((attr) => {
          if (element.hasAttribute(attr)) {
            element.removeAttribute(attr);
          }
        });
      });
    };

    // Clean already-present attributes before hydration-sensitive updates.
    stripExtensionAttrs(document);

    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      if (EXTENSION_ATTRS.includes(name)) return this;
      return originalSetAttribute.call(this, name, value);
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type !== 'attributes') return;
        const attributeName = mutation.attributeName;
        if (!attributeName || !EXTENSION_ATTRS.includes(attributeName)) return;
        const target = mutation.target as Element;
        target.removeAttribute(attributeName);
      });
    });

    observer.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: EXTENSION_ATTRS,
    });

    return () => {
      observer.disconnect();
      Element.prototype.setAttribute = originalSetAttribute;
    };
  }, []);

  return null;
}
