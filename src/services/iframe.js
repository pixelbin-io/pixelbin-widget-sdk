import { DEFAULTS } from '../constants';
import { buildUrl, getDomNode } from '../utils';

export const createIframe = (cfg, logger) => {
  const iframe = document.createElement('iframe');
  iframe.src = buildUrl(cfg.widgetOrigin, cfg.routePath, { ...cfg.params, embedId: cfg.embedId });

  iframe.sandbox = [
    'allow-scripts',
    'allow-forms',
    'allow-popups',
    'allow-same-origin'
  ].join(' ');
  iframe.referrerPolicy = 'origin-when-cross-origin';
  iframe.allow = (cfg.allowedIframeFeatures || []).join('; ');
  iframe.loading = 'eager';
  iframe.setAttribute('aria-label', 'Pixelbin Widget');
  iframe.setAttribute('data-widget-sdk', 'true');
  iframe.setAttribute('data-widget-type', cfg.params.widgetType);
  if (cfg.embedId != null) iframe.setAttribute('data-embed-id', String(cfg.embedId));

  Object.assign(iframe.style, DEFAULTS.style, cfg.style || {});

  const mount = getDomNode(cfg.domNode);
  mount.appendChild(iframe);

  logger('iframe created', iframe.src);
  return iframe;
};

