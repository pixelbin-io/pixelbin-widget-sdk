export interface BootstrapConfig {
  token?: string | null;
  getToken?: (() => Promise<string>) | null;
  endpoint?: string | null;
  method?: 'GET' | 'POST' | string;
  headers?: Record<string, string>;
  payload?: any;
  timeoutMs?: number;
}

export type WidgetType = "ai-editor" | "image-editor" | "ai-headshot" | "batch-editor";

export interface Params {
  widgetType: WidgetType;
  theme?: 'dark' | 'light';
  locale?: 'en-IN' | 'en-US';
  [key: string]: any;
}

export interface WidgetConfig {
  domNode: HTMLElement | string;
  widgetOrigin: string;
  embedId?: string;
  params?: Params;
  autostart?: boolean;
  allowedIframeFeatures?: string[];
  style?: Record<string, string>;
  debug?: boolean;
  autoDestroyOnFatalError?: boolean;
  bootstrap?: BootstrapConfig;
}

export interface NavigateOptions {
  widgetType?: string;
  timeout?: number;
}

export declare class WidgetController {
  constructor(userConfig: WidgetConfig);
  
  open(): this;
  close(): this;
  navigate(options: NavigateOptions): Promise<any>;
  updateConfig(patch: Partial<WidgetConfig>): this;
  destroy(options?: { force?: boolean }): void;
  
  on(event: string, callback: (payload?: any) => void): this;
  off(event: string, callback: (payload?: any) => void): this;
  once(event: string, callback: (payload?: any) => void): this;
}

export declare function init(config: WidgetConfig): WidgetController;
export declare const VERSION: string;

declare const _default: {
  init: typeof init;
};

export default _default;
