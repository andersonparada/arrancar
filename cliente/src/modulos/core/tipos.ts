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

/** El formulario o la ficha que recibe la sección: el de una empresa o el de un proveedor. */
export type DondeSeAporta = 'empresa' | 'proveedor';

/**
 * Sección que un módulo aporta al formulario de Empresas o al de Proveedores (y a la ficha del proveedor). Solo se
 * muestra si el módulo está activo. Su valor viaja en `secciones[<clave del módulo>]` del cuerpo del formulario y
 * el servidor lo guarda con el formulario, todo o nada.
 *
 * El componente del formulario recibe `registroId` (`null` si el registro es nuevo) y `errores` (por campo, sin
 * prefijo) y lleva su valor en `v-model`: empieza en `undefined` y la propia sección lo llena (con lo guardado o
 * con sus valores por omisión). Un valor `undefined` no se envía. El de la ficha solo recibe `registroId`.
 */
export interface SeccionAportada {
  en: DondeSeAporta;
  titulo: string;
  /** Menor primero; entre módulos con el mismo número, el orden del índice de módulos. */
  orden: number;
  formulario: () => Promise<{ default: Component }>;
  ficha?: () => Promise<{ default: Component }>;
}

/**
 * Contrato de un módulo del frontend. Su `clave` coincide con la del módulo del
 * servidor: si el módulo no está activo en la cuenta, sus menús no se muestran.
 */
export interface DefinicionModuloCliente {
  clave: string;
  rutas: RouteRecordRaw[];
  menu: GrupoMenu[];
  /** Secciones que aporta a formularios y fichas de otros módulos. */
  secciones?: SeccionAportada[];
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

/** Un dato de un registro tal como se muestra en su tarjeta: "Peso: 12.50". */
export interface DetalleDeRegistro {
  etiqueta: string;
  valor: string;
}
