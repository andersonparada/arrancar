import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import {
  NOTA_DEL_CONTEO_FISICO,
  numerosDelReporte,
  resumenDelReporte,
} from '../../calculo-de-correlativos-de-cheques.js';
import type {
  FiltroDeCorrelativosDeCheques,
  ReporteDeCorrelativosDeChequesDto,
} from '../../dto/correlativos-de-cheques.dto.js';
import type { ConsultasDeCorrelativosDeCheques } from '../../puertos/consultas-de-correlativos-de-cheques.js';

interface DependenciasDelReporteDeCorrelativosDeCheques {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeCorrelativosDeCheques;
}

/**
 * El reporte de correlativos de una chequera (`correlativos-de-cheques.ver`): todos sus números con su estado, la causa de
 * cada anulación, a qué número pasó cada inutilizado y un resumen que debe dar el total del rango; si no, alerta de un
 * número sin fila. El conteo físico del papel en blanco se imprime aparte: lo hace otra persona y no se guarda.
 */
export class ReporteDeCorrelativosDeCheques {
  constructor(private readonly dependencias: DependenciasDelReporteDeCorrelativosDeCheques) {}

  /** @throws RecursoNoEncontrado si la chequera no existe o no es de la empresa. */
  ejecutar(operador: Operador, filtro: FiltroDeCorrelativosDeCheques): Promise<ReporteDeCorrelativosDeChequesDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const encabezado = await consultas.chequera(filtro.chequeraId);
      if (!encabezado) throw new RecursoNoEncontrado('La chequera');
      const cheques = await consultas.cheques(filtro.chequeraId);
      const inutilizados = cheques.filter(({ causa }) => causa === 'inutilizado').map(({ id }) => id);
      const pasaron = await consultas.adondePasaron(inutilizados);
      const { chequera } = encabezado;
      const numeros = numerosDelReporte(cheques, chequera, pasaron);
      const resumen = resumenDelReporte(numeros, chequera);
      return {
        ...encabezado,
        resumen,
        cheques: filtro.estado ? numeros.filter(({ estado }) => estado === filtro.estado) : numeros,
        conteoFisico: { disponiblesSegunElSistema: resumen.disponibles, nota: NOTA_DEL_CONTEO_FISICO },
      };
    });
  }
}
