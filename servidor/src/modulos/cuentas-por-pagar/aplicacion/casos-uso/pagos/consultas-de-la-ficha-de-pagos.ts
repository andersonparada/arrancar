import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { dtoDeResumenDePago } from '../../dto/dto-de-ficha-de-pago.js';
import { dtoDelComprobante } from '../../dto/dto-de-comprobante-de-pago.js';
import type { ComprobanteDePagoDto } from '../../dto/comprobante-de-pago.dto.js';
import type { FichaDePagoDto, PaginaDePagosDto } from '../../dto/ficha-de-pago.dto.js';
import type { DatosDeLaEmpresa } from '../../puertos/puertos-de-impresion-de-contrasenas.js';
import type { FiltroDeListaDePagos, ListaDePagos } from '../../puertos/puertos-de-lista-de-pagos.js';
import type { ArmadorDeLaFichaDelPago } from './ficha-del-pago.js';

/**
 * La lista de pagos (`pagos.ver`): por omisión los vigentes. El filtro de posfechados deja los vigentes con fecha posterior
 * a hoy (cheques comprometidos); `contrasenaId` busca por las líneas, porque un pago puede cubrir varias contraseñas.
 */
export class ListarPagos {
  constructor(private readonly dependencias: { unidadDeTrabajo: UnidadDeTrabajo; lista: ListaDePagos; reloj: Reloj }) {}

  ejecutar(operador: Operador, filtro: FiltroDeListaDePagos): Promise<PaginaDePagosDto> {
    const { unidadDeTrabajo, lista, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const hoy = await reloj.hoy(operador);
      const { filas, total } = await lista.listar(filtro, hoy);
      return { elementos: filas.map((fila) => dtoDeResumenDePago(fila, hoy)), total };
    });
  }
}

interface DependenciasDeLaFichaDelPago {
  unidadDeTrabajo: UnidadDeTrabajo;
  armador: ArmadorDeLaFichaDelPago;
}

/** La ficha completa de un pago (`pagos.ver`). */
export class ObtenerPago {
  constructor(private readonly dependencias: DependenciasDeLaFichaDelPago) {}

  /** @throws RecursoNoEncontrado si no existe o es de otra empresa. */
  ejecutar(operador: Operador, id: string): Promise<FichaDePagoDto> {
    const { unidadDeTrabajo, armador } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => armador.armarDe(operador, id));
  }
}

/**
 * El comprobante del pago para imprimir (`pagos.ver`), con los datos de la empresa que da Empresas por el mediador. No
 * cambia nada: se puede imprimir las veces que haga falta, también de un pago anulado (sale marcado).
 */
export class ObtenerComprobanteDePago {
  constructor(private readonly dependencias: DependenciasDeLaFichaDelPago & { empresa: DatosDeLaEmpresa }) {}

  /** @throws RecursoNoEncontrado si no existe o es de otra empresa. */
  ejecutar(operador: Operador, id: string): Promise<ComprobanteDePagoDto> {
    const { unidadDeTrabajo, armador, empresa } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () =>
      dtoDelComprobante(await armador.armarDe(operador, id), await empresa.obtener(operador)),
    );
  }
}
