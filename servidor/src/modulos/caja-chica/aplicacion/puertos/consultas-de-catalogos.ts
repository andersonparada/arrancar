import type { ChequeraParaElFondoDto, OpcionDeCatalogoDto } from '../dto/catalogos.dto.js';

/** Lecturas de otros módulos que Caja chica ofrece sin pedir los permisos de ese módulo; todas dentro de la unidad de trabajo. */
export interface ConsultasDeCatalogos {
  /** Cuentas bancarias activas. */
  cuentas(): Promise<OpcionDeCatalogoDto[]>;
  /** Chequeras activas (no la de apertura) con los cheques que les quedan. */
  chequeras(): Promise<ChequeraParaElFondoDto[]>;
  localidades(): Promise<OpcionDeCatalogoDto[]>;
  /** Usuarios activos que entran a la empresa, para elegir al custodio. */
  usuarios(): Promise<OpcionDeCatalogoDto[]>;
  conceptosDeGasto(): Promise<OpcionDeCatalogoDto[]>;
}
