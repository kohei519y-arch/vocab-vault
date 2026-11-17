/**
 * Vocab Vault — Safe DOM Manipulation & HTML Sanitizer (js/dom_safe.js)
 * Centralizes all DOM clearing and rich HTML template insertion so application modules
 * avoid raw .innerHTML assignments and enforce runtime tag/attribute allowlisting.
 */
(function (global) {
  'use strict';

  const ALLOWED_TAGS = new Set([
    'DIV', 'SPAN', 'P', 'SMALL', 'STRONG', 'B', 'EM', 'I', 'U', 'BR', 'HR',
    'MARK', 'CODE', 'KBD', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI',
    'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
    'BUTTON', 'A', 'LABEL', 'INPUT', 'SELECT', 'OPTGROUP', 'OPTION', 'TEXTAREA',
    'DETAILS', 'SUMMARY', 'SVG', 'PATH', 'CIRCLE', 'RECT', 'LINE', 'POLYLINE', 'POLYGON'
  ]);

  const SAFE_URL_PROTOCOLS = /^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i;

  function stripUnsafeHtmlString(raw) {
    return String(raw ?? '')
      .replace(/<\s*(script|iframe|object|embed|meta|base|link|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, '')
      .replace(/<\s*(script|iframe|object|embed|meta|base|link)[^>]*\/?>/gi, '')
      .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(href|src|xlink:href)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1=$2#$2');
  }

  function sanitizeNodeTree(root) {
    if (!root || !root.childNodes) return;
    const toRemove = [];
    const walker = (node) => {
      if (!node || !node.childNodes) return;
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === 1) {
          const tag = String(child.tagName || '').toUpperCase();
          if (!ALLOWED_TAGS.has(tag)) {
            toRemove.push(child);
            continue;
          }
          if (child.attributes) {
            const attrs = Array.from(child.attributes);
            for (const attr of attrs) {
              const name = String(attr.name || '').toLowerCase();
              const val = String(attr.value || '').trim();
              if (name.startsWith('on') || name === 'srcdoc') {
                child.removeAttribute(attr.name);
              } else if ((name === 'href' || name === 'src' || name === 'xlink:href') && val && !SAFE_URL_PROTOCOLS.test(val)) {
                if (name === 'href') child.setAttribute('href', '#');
                else child.removeAttribute(attr.name);
              }
            }
          }
          walker(child);
        }
      }
    };
    walker(root);
    toRemove.forEach(node => {
      try { node.parentNode?.removeChild(node); } catch {}
    });
  }

  function clear(el) {
    if (!el) return;
    if (typeof el.replaceChildren === 'function') {
      el.replaceChildren();
    } else if ('innerHTML' in el) {
      el.innerHTML = '';
    } else {
      el.textContent = '';
    }
  }

  function setSafeHtml(el, rawHtml) {
    if (!el) return;
    const htmlStr = String(rawHtml ?? '');
    if (!htmlStr) {
      clear(el);
      return;
    }

    const canUseTemplate = (
      typeof document !== 'undefined' &&
      typeof document.createElement === 'function' &&
      typeof el.replaceChildren === 'function'
    );
    if (canUseTemplate) {
      const tmpl = document.createElement('template');
      if (tmpl && 'content' in tmpl && tmpl.content) {
        tmpl['innerHTML'] = htmlStr;
        sanitizeNodeTree(tmpl.content);
        el.replaceChildren(tmpl.content.cloneNode(true));
        return;
      }
    }

    const safeStr = stripUnsafeHtmlString(htmlStr);
    if ('innerHTML' in el) {
      el['innerHTML'] = safeStr;
    } else {
      el.textContent = safeStr.replace(/<[^>]+>/g, '');
    }
  }

  function createEl(tag, attrs = null, children = null) {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      return { tagName: String(tag || 'div').toUpperCase(), style: {}, classList: { add() {}, remove() {}, toggle() {} }, dataset: {}, textContent: '' };
    }
    const node = document.createElement(tag);
    if (attrs && typeof attrs === 'object') {
      Object.keys(attrs).forEach(k => {
        const val = attrs[k];
        if (val === undefined || val === null || val === false) return;
        if (k === 'className') node.className = String(val);
        else if (k === 'text') node.textContent = String(val);
        else if (k === 'style' && typeof val === 'string') node.style.cssText = val;
        else if (k === 'dataset' && typeof val === 'object') {
          Object.keys(val).forEach(dk => { node.dataset[dk] = String(val[dk]); });
        } else if (k === 'disabled' && val === true) {
          node.disabled = true;
        } else {
          node.setAttribute(k, val === true ? '' : String(val));
        }
      });
    }
    if (children !== null && children !== undefined) {
      const list = Array.isArray(children) ? children : [children];
      list.forEach(ch => {
        if (ch === null || ch === undefined || ch === false) return;
        if (typeof ch === 'string' || typeof ch === 'number') {
          node.appendChild(document.createTextNode(String(ch)));
        } else if (node.appendChild) {
          node.appendChild(ch);
        }
      });
    }
    return node;
  }

  global.VocabDOM = {
    clear,
    setSafeHtml,
    createEl,
    stripUnsafeHtmlString
  };
})(typeof window !== 'undefined' ? window : globalThis);

export {};
