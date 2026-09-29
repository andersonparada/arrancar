import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { ReporteDeCorrelativos } from '../aplicacion/casos-uso/correlativos/reporte-de-correlativos.js';
import type { FiltroDeCorrelativos } from '../aplicacion/dto/correlativo.dto.js';
import {
  aFilasExportadasDeCorrelativos,
  columnasDelReporteDeCorrelativos,
  type FilaExportadaDeCorrelativo,
} from '../http/correlativos.columnas.js';
import { CorrelativosControlador } from '../http/correlativos.controlador.js';
import { rutasCorrelativos } from '../http/correlativos.rutas.js';
import { ConsultasDeCorrelativosDrizzle } from '../infraestructura/persistencia/consultas-de-correlativos.drizzle.js';

/** Exporta el reporte con el mismo filtro que la pantalla; nunca se importa (es reporte). */
function intercambioDelReporte(reporte: ReporteDeCorrelativos) {
  return crearIntercambio<FilaExportadaDeCorrelativo, never, FiltroDeCorrelativos>({
    nombre: 'Correlativos',
    columnas: columnasDelReporteDeCorrelativos,
    validar: () => ({ errores: [] }),
    listar: async (operador, filtro) => aFilasExportadasDeCorrelativos(await reporte.ejecutar(operador, filtro ?? {})),
    crear: () => {
      throw new Error('El reporte de correlativos no se importa.');
    },
  });
}

/** Raíz de composición del reporte de correlativos: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeCorrelativos() {
  const { unidadDeTrabajo } = dependenciasCompartidas();
  const reporte = new ReporteDeCorrelativos({ unidadDeTrabajo, consultas: new ConsultasDeCorrelativosDrizzle() });
  return rutasCorrelativos(new CorrelativosControlador({ reporte }), intercambioDelReporte(reporte));
}
