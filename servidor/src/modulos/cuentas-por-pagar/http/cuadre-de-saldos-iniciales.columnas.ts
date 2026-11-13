import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type {
  CuadreDeSaldosInicialesDto,
  TotalesDelCuadreDto,
} from '../aplicacion/dto/cuadre-de-saldos-iniciales.dto.js';

/** Una fila del Excel del cuadre: un proveedor o la del total general. */
export interface FilaExportadaDeCuadre extends TotalesDelCuadreDto {
  proveedorNombre: string;
  proveedorNit: string | null;
}

/** Una fila por proveedor y, al final, la del total general. */
export function aFilasExportadasDeCuadre({
  proveedores,
  general,
}: CuadreDeSaldosInicialesDto): FilaExportadaDeCuadre[] {
  const filas = proveedores.map(({ proveedorId: _id, ...fila }) => fila);
  return [...filas, { proveedorNombre: 'Total', proveedorNit: null, ...general }];
}

/** Las columnas del Excel del cuadre: solo se exporta, nunca se importa. */
export const columnasDelCuadreDeSaldosIniciales: Columna[] = [
  { clave: 'proveedorNombre', titulo: 'Proveedor', requerido: true, tipo: 'texto' },
  { clave: 'proveedorNit', titulo: 'NIT', requerido: false, tipo: 'texto' },
  { clave: 'documentos', titulo: 'Documentos', requerido: true, tipo: 'entero' },
  { clave: 'cargos', titulo: 'Cargos', requerido: true, tipo: 'decimal' },
  { clave: 'notasAFavor', titulo: 'Notas a favor', requerido: true, tipo: 'decimal' },
  { clave: 'neto', titulo: 'Neto', requerido: true, tipo: 'decimal' },
  { clave: 'retencionesPorPracticar', titulo: 'Retenciones por practicar', requerido: true, tipo: 'decimal' },
];
