import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { ReporteDeCorrelativosDeCheques } from '../aplicacion/casos-uso/chequeras/reporte-de-correlativos-de-cheques.js';
import type { FiltroDeCorrelativosDeCheques } from '../aplicacion/dto/correlativos-de-cheques.dto.js';
import {
  aFilasExportadasDeCorrelativosDeCheques,
  columnasDeCorrelativosDeCheques,
  type FilaExportadaDeCorrelativoDeCheque,
} from '../http/correlativos-de-cheques.columnas.js';
import { CorrelativosDeChequesControlador } from '../http/correlativos-de-cheques.controlador.js';
import { rutasCorrelativosDeCheques } from '../http/correlativos-de-cheques.rutas.js';
import { ConsultasDeCorrelativosDeChequesDrizzle } from '../infraestructura/persistencia/consultas-de-correlativos-de-cheques.drizzle.js';

/** Exporta el reporte de la chequera con el mismo filtro que la pantalla; nunca se importa (es reporte). */
function intercambioDeCorrelativosDeCheques(reporte: ReporteDeCorrelativosDeCheques) {
  return crearIntercambio<FilaExportadaDeCorrelativoDeCheque, never, FiltroDeCorrelativosDeCheques>({
    nombre: 'Correlativos de cheques',
    columnas: columnasDeCorrelativosDeCheques,
    validar: () => ({ errores: [] }),
    listar: async (operador, filtro) =>
      aFilasExportadasDeCorrelativosDeCheques(
        await reporte.ejecutar(operador, filtro as FiltroDeCorrelativosDeCheques),
      ),
    crear: () => {
      throw new Error('El reporte de correlativos de cheques no se importa.');
    },
  });
}

/** Raíz de composición de «Correlativos de cheques»: solo lectura, con su Excel. */
export function rutasDeCorrelativosDeCheques() {
  const { unidadDeTrabajo } = dependenciasCompartidas();
  const reporte = new ReporteDeCorrelativosDeCheques({
    unidadDeTrabajo,
    consultas: new ConsultasDeCorrelativosDeChequesDrizzle(),
  });
  return rutasCorrelativosDeCheques(
    new CorrelativosDeChequesControlador(reporte),
    intercambioDeCorrelativosDeCheques(reporte),
  );
}
