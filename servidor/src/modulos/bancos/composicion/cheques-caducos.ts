import { dependenciasCompartidas } from '../../core/compartido/infraestructura/dependencias-compartidas.js';
import { crearIntercambio } from '../../core/intercambio/contexto.js';
import { AnularCheque } from '../aplicacion/casos-uso/cheques/anular-cheque.js';
import { AnularChequesCaducos } from '../aplicacion/casos-uso/cheques/anular-cheques-caducos.js';
import { ReporteDeChequesCaducos } from '../aplicacion/casos-uso/cheques/reporte-de-cheques-caducos.js';
import type { FiltroDeChequesCaducos } from '../aplicacion/dto/cheque-en-circulacion.dto.js';
import {
  aFilasExportadasDeChequesCaducos,
  columnasDelReporteDeChequesCaducos,
  type FilaExportadaDeChequeCaduco,
} from '../http/cheques-caducos.columnas.js';
import { ChequesCaducosControlador } from '../http/cheques-caducos.controlador.js';
import { rutasChequesCaducos } from '../http/cheques-caducos.rutas.js';
import { dependenciasDeCheques } from './cheques.js';
import { ConsultasDeChequesEnCirculacionDrizzle } from '../infraestructura/persistencia/consultas-de-cheques-en-circulacion.drizzle.js';
import { PoliticaDeVencimientoDeChequesEnConfiguracion } from '../infraestructura/politica-de-vencimiento-de-cheques.configuracion.js';

/** Exporta el reporte con el mismo filtro que la pantalla; nunca se importa (es reporte). */
function intercambioDelReporte(reporte: ReporteDeChequesCaducos) {
  return crearIntercambio<FilaExportadaDeChequeCaduco, never, FiltroDeChequesCaducos>({
    nombre: 'Cheques caducos',
    columnas: columnasDelReporteDeChequesCaducos,
    validar: () => ({ errores: [] }),
    listar: async (operador, filtro) =>
      aFilasExportadasDeChequesCaducos(await reporte.ejecutar(operador, filtro ?? {})),
    crear: () => {
      throw new Error('El reporte de cheques caducos no se importa.');
    },
  });
}

/** Raíz de composición del reporte de cheques caducos: el único lugar donde se eligen las implementaciones concretas. */
export function rutasDeChequesCaducos() {
  const { unidadDeTrabajo, reloj } = dependenciasCompartidas();
  const consultas = new ConsultasDeChequesEnCirculacionDrizzle();
  const politicaDeVencimiento = new PoliticaDeVencimientoDeChequesEnConfiguracion();
  const reporte = new ReporteDeChequesCaducos({ unidadDeTrabajo, reloj, consultas, politicaDeVencimiento });
  const anularEnLote = new AnularChequesCaducos({
    unidadDeTrabajo,
    reloj,
    consultas,
    politicaDeVencimiento,
    anularCheque: new AnularCheque(dependenciasDeCheques()),
  });
  return rutasChequesCaducos(new ChequesCaducosControlador({ reporte, anularEnLote }), intercambioDelReporte(reporte));
}
