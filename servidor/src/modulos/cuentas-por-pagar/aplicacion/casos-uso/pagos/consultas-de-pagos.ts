import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { MediosDePago } from '../../../../core/contratos/bancos.contratos.js';
import type { ProveedorPorPagarDto } from '../../dto/cargos-para-pagar.dto.js';
import type { ConsultasDePagos, PagosEnBancos } from '../../puertos/puertos-de-pagos.js';

export interface FiltroDeProveedoresPorPagar {
  buscar?: string;
  pagina: number;
  limite: number;
}

/** Los proveedores con cargos autorizados con saldo en contraseñas vigentes: el selector de la ventana de pago. */
export class ListarProveedoresPorPagar {
  constructor(
    private readonly dependencias: { unidadDeTrabajo: UnidadDeTrabajo; consultasDePagos: ConsultasDePagos },
  ) {}

  ejecutar(
    operador: Operador,
    filtro: FiltroDeProveedoresPorPagar,
  ): Promise<{ elementos: ProveedorPorPagarDto[]; total: number }> {
    const { unidadDeTrabajo, consultasDePagos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { filas, total } = await consultasDePagos.proveedoresPorPagar(filtro);
      const elementos = filas.map(({ porPagarCentavos, ...proveedor }) => ({
        ...proveedor,
        porPagar: deCentavos(porPagarCentavos),
      }));
      return { elementos, total };
    });
  }
}

/** Las cuentas y chequeras activas de Bancos con su siguiente cheque y su saldo a la fecha, para elegir con qué pagar. */
export class ObtenerMediosDePago {
  constructor(
    private readonly dependencias: { unidadDeTrabajo: UnidadDeTrabajo; bancos: PagosEnBancos; reloj: Reloj },
  ) {}

  ejecutar(operador: Operador, fecha?: string): Promise<MediosDePago> {
    const { unidadDeTrabajo, bancos, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () =>
      bancos.medios(operador, fecha ?? (await reloj.hoy(operador))),
    );
  }
}
