import type { EstadoDeLaCarga } from '../puertos/puertos-de-saldos-iniciales.js';

/** Los totales de un grupo de saldos iniciales, en quetzales con dos decimales. Suman el saldo al inicio, no el de hoy. */
export interface TotalesDelCuadreDto {
  documentos: number;
  /** Suma de los saldos al inicio de los cargos. */
  cargos: string;
  /** Suma de los saldos al inicio de las notas de crédito. */
  notasAFavor: string;
  /** Cargos menos notas a favor; negativo si la empresa tiene saldo deudor con el proveedor. */
  neto: string;
  retencionesPorPracticar: string;
}

export interface CuadreDeProveedorDto extends TotalesDelCuadreDto {
  proveedorId: string;
  proveedorNombre: string;
  proveedorNit: string | null;
}

/** El cuadre de la carga inicial para comparar con el balance del sistema anterior (C-U8-7). */
export interface CuadreDeSaldosInicialesDto {
  carga: EstadoDeLaCarga;
  proveedores: CuadreDeProveedorDto[];
  general: TotalesDelCuadreDto;
}
