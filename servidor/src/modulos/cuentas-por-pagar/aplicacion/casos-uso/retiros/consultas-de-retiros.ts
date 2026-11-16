import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { avisoDeRetiroDeMesAnterior } from '../../../dominio/avisos-de-retiros.js';
import { esDeMesAnterior, numeroDelRetiro } from '../../../dominio/retiros.js';
import type { PaginaDeRetirosDto, RetiroDto, RetiroResumenDto } from '../../dto/retiros.dto.js';
import type { FilaDeRetiro, FiltroDeRetiros } from '../../puertos/puertos-de-retiros.js';
import type { DependenciasDeRetiros } from './dependencias-de-retiros.js';
import { LectorDelRetiro } from './lector-del-retiro.js';

/** Una fila de la lista como la ve la pantalla; con corte, el retiro sigue abierto a esa fecha aunque hoy ya no. */
function resumenDe({ retiro, ...fila }: FilaDeRetiro, hoy: string): RetiroResumenDto {
  const deMesAnterior = esDeMesAnterior(retiro.fecha, hoy) && retiro.estado === 'abierto';
  return {
    id: retiro.id,
    numero: numeroDelRetiro(retiro.numero, retiro.anioDeNumero),
    forma: retiro.forma,
    documento: fila.numeroDelDocumento,
    cuentaBancariaId: fila.cuentaBancariaId,
    fecha: retiro.fecha,
    custodio: retiro.custodio,
    monto: deCentavos(retiro.montoCentavos),
    pagado: deCentavos(fila.pagadoCentavos),
    disponible: deCentavos(fila.disponibleCentavos),
    estado: retiro.estado,
    deMesAnterior,
    aviso: deMesAnterior ? avisoDeRetiroDeMesAnterior(retiro, fila.disponibleCentavos) : null,
  };
}

/**
 * La lista de retiros (`retiros.ver`). Por omisión los abiertos; con `corte`, los retiros por liquidar a esa fecha (de esa
 * fecha o antes, vigentes y aún abiertos entonces) con su disponible al corte y el total: el efectivo en manos de
 * custodios al cierre.
 */
export class ListarRetiros {
  constructor(private readonly dependencias: Pick<DependenciasDeRetiros, 'unidadDeTrabajo' | 'consultas' | 'reloj'>) {}

  ejecutar(operador: Operador, filtro: FiltroDeRetiros): Promise<PaginaDeRetirosDto> {
    const { unidadDeTrabajo, consultas, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const hoy = await reloj.hoy(operador);
      const { filas, total, totalDisponibleCentavos } = await consultas.listar(filtro);
      return {
        elementos: filas.map((fila) => resumenDe(fila, hoy)),
        total,
        totalDisponible: deCentavos(totalDisponibleCentavos),
      };
    });
  }
}

/** La ficha de un retiro con sus pagos, su liquidación y sus avisos (`retiros.ver`). */
export class ObtenerRetiro {
  private readonly lector: LectorDelRetiro;

  constructor(
    private readonly dependencias: Pick<
      DependenciasDeRetiros,
      'unidadDeTrabajo' | 'retiros' | 'consultas' | 'movimientos' | 'reloj'
    >,
  ) {
    this.lector = new LectorDelRetiro(dependencias);
  }

  /** @throws RecursoNoEncontrado */
  ejecutar(operador: Operador, retiroId: string): Promise<RetiroDto> {
    const { unidadDeTrabajo, retiros } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const retiro = await retiros.buscar(retiroId);
      if (!retiro) throw new RecursoNoEncontrado('El retiro');
      return this.lector.leer(operador, retiro);
    });
  }
}
