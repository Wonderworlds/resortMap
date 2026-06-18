import { GlobalWindow } from 'happy-dom';

const window = new GlobalWindow({ url: 'http://localhost/' });
(globalThis as Record<string, unknown>).window = window;
(globalThis as Record<string, unknown>).document = window.document;
(globalThis as Record<string, unknown>).navigator = window.navigator;
(globalThis as Record<string, unknown>).HTMLElement = window.HTMLElement;
(globalThis as Record<string, unknown>).HTMLInputElement = window.HTMLInputElement;
(globalThis as Record<string, unknown>).Event = window.Event;
