import { crearIntercambio } from '../../core/intercambio/contexto.js';
import {
  ReporteDeTiposDeCambio,
  type FiltroDeTiposDeCambio,
} from '../aplicacion/casos-uso/reporte-de-tipos-de-cambio.js';
import {
  aFilasExportadasDeTipos,
  columnasDeTiposDeCambio,
  NOTA_DE_LA_POLITICA_DE_CRUCES,
  type FilaExportadaDeTipo,
} from '../http/tipos-de-cambio.columnas.js';
import { TiposDeCambioControlador } from '../http/tipos-de-cambio.controlador.js';
import { rutasTiposDeCambio } from '../http/tipos-de-cambio.rutas.js';
import { SerieDelNucleo } from '../infraestructura/nucleo-de-monedas.js';

/** Exporta el reporte con el mismo filtro que la pantalla; nunca se importa (es reporte). */
function intercambioDelReporte(reporte: ReporteDeTiposDeCambio) {
  return crearIntercambio<FilaExportadaDeTipo, never, FiltroDeTiposDeCambio>({
    nombre: 'Tipos de cambio',
    columnas: columnasDeTiposDeCambio,
    validar: () => ({ errores: [] }),
    listar: async (_operador, filtro) => (filtro ? aFilasExportadasDeTipos(await reporte.ejecutar(filtro)) : []),
    soloExportar: true,
    notasDeInstrucciones: ['Fuente: Banco de Guatemala.', NOTA_DE_LA_POLITICA_DE_CRUCES],
    crear: () => {
      throw new Error('El reporte de tipos de cambio no se importa.');
    },
  });
}

/** Raíz de composición del reporte de tipos de cambio: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeTiposDeCambio() {
  const reporte = new ReporteDeTiposDeCambio({ serie: new SerieDelNucleo() });
  return rutasTiposDeCambio(new TiposDeCambioControlador({ reporte }), intercambioDelReporte(reporte));
}
