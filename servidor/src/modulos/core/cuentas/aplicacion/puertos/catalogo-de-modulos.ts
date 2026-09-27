import type { EstadoDeModuloDto } from '../dto/cuenta.dto.js';

/** Los módulos instalados y las reglas para contratarlos. */
export interface CatalogoDeModulos {
  /** Los contratados más los esenciales y sus dependencias. */
  activos(contratados: string[]): ReadonlySet<string>;
  esEsencial(modulo: string): boolean;
  /** @throws ModuloDesconocido o FaltanDependenciasDelModulo. */
  exigirQueSePuedaActivar(modulo: string, activos: ReadonlySet<string>): void;
  /** @throws ModuloEsencial o ModuloEnUso. */
  exigirQueSePuedaDesactivar(modulo: string, activos: ReadonlySet<string>): void;
  estados(activos: ReadonlySet<string>): EstadoDeModuloDto[];
}
