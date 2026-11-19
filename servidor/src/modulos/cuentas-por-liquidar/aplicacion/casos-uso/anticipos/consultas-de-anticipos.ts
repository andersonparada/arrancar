import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { AnticipoDto, PaginaDeAnticiposDto } from '../../dto/anticipos.dto.js';
import type { FilaDeAnticipo, FiltroDeAnticipos } from '../../puertos/puertos-de-anticipos.js';
import { resumenDelAnticipo } from './armado-del-anticipo.js';
import type { DependenciasDeAnticipos } from './dependencias-de-anticipos.js';
import { LectorDelAnticipo } from './lector-del-anticipo.js';

/** Lo que pide la lista: el filtro sin el día de hoy, que lo pone el caso de uso. */
export type ListaDeAnticiposPedida = Omit<FiltroDeAnticipos, 'hoy'>;

/** Una fila de la lista; con corte, el anticipo sigue abierto a esa fecha aunque hoy ya no. */
function filaDeLaLista({ anticipo, ...fila }: FilaDeAnticipo, { al, alCorte }: { al: string; alCorte: boolean }) {
  return resumenDelAnticipo({
    anticipo,
    movimiento: { id: anticipo.movimientoId, cuentaBancariaId: fila.cuentaBancariaId, numero: fila.numeroDelDocumento },
    gastadoCentavos: fila.gastadoCentavos,
    al,
    abierto: alCorte || anticipo.estado === 'abierto',
  });
}

/**
 * La lista de anticipos (`anticipos.ver`). Por omisión los abiertos; con `corte`, los anticipos por liquidar a esa fecha (de
 * esa fecha o antes, vigentes y aún abiertos entonces) con lo que faltaba por justificar entonces y su antigüedad, y el total.
 * Se puede filtrar por beneficiario y solo por vencidos.
 */
export class ListarAnticipos {
  constructor(
    private readonly dependencias: Pick<DependenciasDeAnticipos, 'unidadDeTrabajo' | 'consultas' | 'reloj'>,
  ) {}

  ejecutar(operador: Operador, pedido: ListaDeAnticiposPedida): Promise<PaginaDeAnticiposDto> {
    const { unidadDeTrabajo, consultas, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const hoy = await reloj.hoy(operador);
      const { filas, total, totalPorJustificarCentavos } = await consultas.listar({ ...pedido, hoy });
      const mirada = { al: pedido.corte ?? hoy, alCorte: pedido.corte !== undefined };
      return {
        elementos: filas.map((fila) => filaDeLaLista(fila, mirada)),
        total,
        totalPorJustificar: deCentavos(totalPorJustificarCentavos),
      };
    });
  }
}

/** La ficha de un anticipo con su liquidación y sus avisos (`anticipos.ver`). */
export class ObtenerAnticipo {
  private readonly lector: LectorDelAnticipo;

  constructor(
    private readonly dependencias: Pick<
      DependenciasDeAnticipos,
      'unidadDeTrabajo' | 'anticipos' | 'consultas' | 'movimientos' | 'reloj'
    >,
  ) {
    this.lector = new LectorDelAnticipo(dependencias);
  }

  /** @throws RecursoNoEncontrado */
  ejecutar(operador: Operador, anticipoId: string): Promise<AnticipoDto> {
    const { unidadDeTrabajo, anticipos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const anticipo = await anticipos.buscar(anticipoId);
      if (!anticipo) throw new RecursoNoEncontrado('El anticipo');
      return this.lector.leer(operador, anticipo);
    });
  }
}
