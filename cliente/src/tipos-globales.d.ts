import type { vPermiso } from './modulos/core/directivas/permiso';

declare module 'vue' {
  interface GlobalDirectives {
    vPermiso: typeof vPermiso;
  }
}

export {};
