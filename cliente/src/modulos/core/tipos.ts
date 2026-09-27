import type { Component } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

/** Dónde va cada opción dentro de su módulo, siempre en este orden. */
export type SeccionMenu = 'operacion' | 'administracion' | 'reportes';

/** Opción del menú lateral. Solo se muestra si el usuario tiene `permiso`. */
export interface EntradaMenu {
  titulo: string;
  ruta: string;
  icono: Component;
  seccion: SeccionMenu;
  permiso?: string;
}

/** Grupo plegable del menú; normalmente uno por módulo, con el nombre que ve el usuario. */
export interface GrupoMenu {
  clave: string;
  titulo: string;
  icono: Component;
  /** Solo para soporte; no depende de los módulos contratados. */
  soloSuperacceso?: boolean;
  entradas: EntradaMenu[];
}

/**
 * Contrato de un módulo del frontend. Su `clave` coincide con la del módulo del
 * servidor: si el módulo no está activo en la cuenta, sus menús no se muestran.
 */
export interface DefinicionModuloCliente {
  clave: string;
  rutas: RouteRecordRaw[];
  menu: GrupoMenu[];
}

declare module 'vue-router' {
  interface RouteMeta {
    /** Ruta accesible sin sesión (p. ej. inicio de sesión). */
    publica?: boolean;
    /** Requiere haber elegido una empresa. Por defecto es `true`. */
    requiereEmpresa?: boolean;
    permiso?: string;
    soloSuperacceso?: boolean;
    titulo?: string;
  }
}
