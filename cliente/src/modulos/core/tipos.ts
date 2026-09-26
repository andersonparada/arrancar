import type { Component } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

/** Entrada del menú lateral. Solo se muestra si el usuario tiene `permiso`. */
export interface EntradaMenu {
  titulo: string;
  ruta: string;
  icono: Component;
  permiso?: string;
  soloSuperacceso?: boolean;
  /** Grupo del menú en el que aparece (p. ej. "Administración"). */
  grupo?: string;
}

/**
 * Contrato de un módulo del frontend. Su `clave` coincide con la del módulo del
 * servidor: si el módulo no está activo en la cuenta, sus menús no se muestran.
 */
export interface DefinicionModuloCliente {
  clave: string;
  rutas: RouteRecordRaw[];
  menu: EntradaMenu[];
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
