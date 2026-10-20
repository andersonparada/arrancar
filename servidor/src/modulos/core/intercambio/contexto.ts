import { dependenciasCompartidas } from '../compartido/infraestructura/dependencias-compartidas.js';
import { interpretarErrorDePostgres } from '../compartido/infraestructura/errores-de-postgres.js';
import { IntercambioDeRecurso, type DatosDelRecurso } from './aplicacion/intercambio-de-recurso.js';
import { LectorDeFilasDeArchivo } from './infraestructura/lector-de-filas-de-archivo.js';
import { LibroDeExcelJs } from './infraestructura/libro-de-excel.exceljs.js';

const libro = new LibroDeExcelJs();

/** Lector de `.xlsx` y CSV por contenido, para quien necesite filas crudas (por ejemplo la bandeja de DTE). */
export const crearLectorDeFilas = () => new LectorDeFilasDeArchivo(libro);

/** El intercambio en Excel de un recurso: el módulo da sus columnas y cómo listar y crear; el resto lo pone el core. */
export function crearIntercambio<Registro, Solicitud, Filtro = void>(
  recurso: DatosDelRecurso<Registro, Solicitud, Filtro>,
): IntercambioDeRecurso<Registro, Solicitud, Filtro> {
  return new IntercambioDeRecurso({
    ...recurso,
    libro,
    unidadDeTrabajo: dependenciasCompartidas().unidadDeTrabajo,
    interpretarError: interpretarErrorDePostgres,
  });
}
