import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import type { FiltroDeIntereses } from '../aplicacion/dto/intereses.dto.js';
import { ReporteDeIntereses } from '../aplicacion/casos-uso/reportes-por-concepto/reporte-de-intereses.js';
import {
  aFilasExportadasDeIntereses,
  columnasDeIntereses,
  type FilaExportadaDeInteres,
} from '../http/intereses.columnas.js';
import { InteresesControlador } from '../http/intereses.controlador.js';
import { rutasIntereses } from '../http/intereses.rutas.js';
import { ConsultasDeInteresesDrizzle } from '../infraestructura/persistencia/consultas-de-intereses.drizzle.js';

/** Exporta el reporte con el mismo filtro que la pantalla (las rutas lo validan antes); nunca se importa. */
function intercambioDelReporte(reporte: ReporteDeIntereses) {
  return crearIntercambio<FilaExportadaDeInteres, never, FiltroDeIntereses>({
    nombre: 'Intereses y retenciones',
    columnas: columnasDeIntereses,
    validar: () => ({ errores: [] }),
    listar: async (operador, filtro) => {
      if (!filtro) throw new Error('El reporte necesita su filtro.');
      return aFilasExportadasDeIntereses(await reporte.ejecutar(operador, filtro));
    },
    crear: () => {
      throw new Error('El reporte de intereses no se importa.');
    },
  });
}

/** Raíz de composición del reporte de intereses y retenciones: solo lectura, con su Excel. */
export function rutasDeIntereses() {
  const { unidadDeTrabajo } = dependenciasCompartidas();
  const reporte = new ReporteDeIntereses({ unidadDeTrabajo, consultas: new ConsultasDeInteresesDrizzle() });
  return rutasIntereses(new InteresesControlador({ reporte }), intercambioDelReporte(reporte));
}
