import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type {
  CargoPorBancarizar,
  EfectoFiscalDeBancarizacion,
  EvaluacionDeBancarizacion,
} from '../../../../core/contratos/libro-de-compras.contratos.js';
import {
  efectoDelPagoEnEfectivo,
  evaluarBancarizacionEnEfectivo,
  type CargoDelPagoEnEfectivo,
} from '../../../dominio/bancarizacion-en-efectivo.js';
import type {
  BloqueoDeBancarizacion,
  EfectosFiscalesDeDocumentos,
  PagadoAlProveedor,
  UmbralDeBancarizacion,
} from '../../puertos/puertos-de-bancarizacion.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  bloqueo: BloqueoDeBancarizacion;
  umbral: UmbralDeBancarizacion;
  pagado: PagadoAlProveedor;
  efectos: EfectosFiscalesDeDocumentos;
}

/** Lo que pide la orden `libro-de-compras.evaluar_bancarizacion`. */
export interface PedidoDeBancarizacion {
  proveedorId: string;
  proveedorNombre: string;
  /** `AAAA-MM-DD`: la fecha del pago, que fija el mes. */
  fecha: string;
  montoEnEfectivoCentavos: number;
  cargos: readonly CargoPorBancarizar[];
}

/**
 * La bancarización de un pago en efectivo (Decreto 20-2006, art. 20) con lo pagado al proveedor en el mes por todos los
 * módulos que pagan (Cuentas por pagar, Caja chica, Cuentas por liquidar). Toma primero el bloqueo del proveedor; suma lo
 * que cada módulo responde; mira qué perdería la empresa según su régimen y cada documento; y dice si el pago queda libre,
 * solo avisa o bloquea. Qué hace el módulo con `bloquear` es de él. Corre en la transacción del módulo que pregunta.
 */
export class EvaluarBancarizacion {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador, pedido: PedidoDeBancarizacion): Promise<EvaluacionDeBancarizacion> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      await this.dependencias.bloqueo.bloquear(pedido.proveedorId);
      const pagadoEnElMesCentavos = await this.pagadoEnElMes(operador, pedido);
      const cargos = await this.cargos(pedido.cargos);
      const resultado = evaluarBancarizacionEnEfectivo({
        proveedorNombre: pedido.proveedorNombre,
        fecha: pedido.fecha,
        umbralCentavos: await this.dependencias.umbral.centavos(operador),
        montoDelPagoCentavos: pedido.montoEnEfectivoCentavos,
        pagadoEnElMesCentavos,
        cargos,
      });
      const mensaje = resultado.tipo === 'libre' ? null : resultado.mensaje;
      const efecto = efectoDelPagoEnEfectivo(cargos);
      return { resultado: resultado.tipo, mensaje, efecto, pagadoEnElMesCentavos };
    });
  }

  /** Lo que todos los módulos dicen haber pagado al proveedor en el mes del pago (efectivo y bancarizado). */
  private async pagadoEnElMes(operador: Operador, { proveedorId, fecha }: PedidoDeBancarizacion): Promise<number> {
    const respuestas = await this.dependencias.pagado.delMes(operador, proveedorId, `${fecha.slice(0, 7)}-01`);
    return respuestas.reduce((suma, r) => suma + r.efectivoCentavos + r.bancarizadoCentavos, 0);
  }

  /** Cada cargo con lo que perdería: el del documento del libro o, en un saldo inicial, lo que trae quien llama. */
  private async cargos(pedidos: readonly CargoPorBancarizar[]): Promise<CargoDelPagoEnEfectivo[]> {
    const ids = pedidos.flatMap(({ documentoDeCompraId }) => documentoDeCompraId ?? []);
    const delLibro = await this.dependencias.efectos.de(ids);
    return pedidos.map((cargo) => ({
      etiqueta: cargo.etiqueta,
      totalCentavos: cargo.totalCentavos,
      efecto: efectoDelCargo(cargo, delLibro),
      esSaldoInicial: cargo.documentoDeCompraId === null,
    }));
  }
}

function efectoDelCargo(
  cargo: CargoPorBancarizar,
  delLibro: ReadonlyMap<string, EfectoFiscalDeBancarizacion>,
): EfectoFiscalDeBancarizacion | null {
  if (cargo.documentoDeCompraId === null) return cargo.efectoDeSaldoInicial ?? null;
  return delLibro.get(cargo.documentoDeCompraId) ?? null;
}
