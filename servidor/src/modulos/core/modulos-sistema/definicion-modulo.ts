import type { FastifyPluginAsync } from 'fastify';
import type { ZodType } from 'zod';
import type { AlcanceDeRegistros } from '../base-datos/alcance.js';

export interface DefinicionPermiso {
  /** Clave con forma `<modulo>.<recurso>.<accion>` o `<modulo>.<accion>`. */
  clave: string;
  descripcion: string;
  /**
   * Configuración de servidor/instalación: solo la ve y la cambia el superacceso
   * (soporte). Ningún rol, ni siquiera uno con `accesoTotal`, lo recibe ni lo
   * puede asignar.
   */
  soloSuperacceso?: boolean;
}

/**
 * Recurso cuyos registros se asignan uno por uno a los usuarios (permiso de datos).
 * El módulo dueño guarda las asignaciones en su propia tabla `accesos_a_<plural>` y sus
 * tablas llevan las políticas de `core/base-datos/alcance.ts` construidas con `alcance`;
 * así PostgreSQL oculta los registros no asignados.
 */
export interface DefinicionRecursoConAlcance {
  /** Clave del recurso, p. ej. `bancos.cuentas`. */
  clave: string;
  descripcion: string;
  /** Permiso del mismo módulo que da acceso a todos los registros del recurso. */
  permisoVerTodos: string;
  /** Dónde están las asignaciones; `alcance.recurso` debe ser igual a `clave`. */
  alcance: AlcanceDeRegistros;
}

/** Dónde se puede fijar una variable de configuración. */
export type NivelConfiguracion = 'instalacion' | 'cuenta' | 'empresa';

/**
 * Variable de configuración de un módulo. El valor efectivo se resuelve de la
 * más específica a la más general: empresa → cuenta → instalación → predeterminado.
 */
export interface DefinicionConfiguracion<T = unknown> {
  /** Clave con forma `<modulo>.<grupo>.<nombre>`, p. ej. `ganado.identificacion.formato_arete`. */
  clave: string;
  descripcion: string;
  esquema: ZodType<T>;
  predeterminado: T;
  niveles: readonly NivelConfiguracion[];
  /** Se envía al navegador con la sesión (no usar para secretos). */
  publica?: boolean;
}

/**
 * Contrato que cumple cada módulo del sistema. El núcleo solo conoce esta
 * interfaz: con ella arma el catálogo de permisos y de configuración, valida
 * dependencias y registra las rutas.
 */
export interface DefinicionModulo {
  clave: string;
  nombre: string;
  descripcion: string;
  /** Siempre activo en todas las cuentas; no se puede desactivar. */
  esencial?: boolean;
  /** Claves de los módulos que deben estar activos para usar este. */
  dependeDe?: readonly string[];
  permisos: readonly DefinicionPermiso[];
  recursosConAlcance?: readonly DefinicionRecursoConAlcance[];
  configuracion?: readonly DefinicionConfiguracion[];
  rutas?: FastifyPluginAsync;
}

/** Ayuda a declarar una variable conservando el tipo de su valor. */
export function definirConfiguracion<T>(definicion: DefinicionConfiguracion<T>): DefinicionConfiguracion {
  return definicion as DefinicionConfiguracion;
}
