import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { DetalleDeEgresoDeCuentasPorPagar } from '../../../../core/contratos/cuentas-por-pagar.contratos.js';
import type { AplicacionDeLaFichaDto } from '../../dto/ficha-de-pago.dto.js';
import type { RepositorioDePagos } from '../../puertos/puertos-de-pagos.js';
import type { ArmadorDeLaFichaDelPago } from './ficha-del-pago.js';

interface DependenciasDelDetalle {
  pagos: Pick<RepositorioDePagos, 'delMovimiento'>;
  armador: ArmadorDeLaFichaDelPago;
}

/** Un documento del pago; las retenciones salen solo donde este pago las descuenta (como en el comprobante de pago). */
function documentoDelDetalle(linea: AplicacionDeLaFichaDto): DetalleDeEgresoDeCuentasPorPagar['documentos'][number] {
  const descuenta = aCentavos(linea.retencionDescontada) > 0;
  return {
    tipo: linea.tipo,
    serie: linea.serie,
    numero: linea.numero,
    montoCentavos: aCentavos(linea.monto),
    retenciones: descuenta
      ? linea.retencionesDelLibro.map((retencion) => ({
          impuesto: retencion.impuesto,
          montoCentavos: aCentavos(retencion.monto),
          constanciaNumero: retencion.constanciaNumero,
        }))
      : [],
  };
}

/**
 * La orden `cuentas-por-pagar.detalle_para_comprobante_de_egreso`: Bancos pregunta por el pago de uno de sus cheques y
 * recibe el número del pago, sus documentos, las retenciones y el total retenido. Corre dentro de la transacción de quien
 * pregunta y no cambia nada.
 */
export class DetalleParaComprobanteDeEgreso {
  constructor(private readonly dependencias: DependenciasDelDetalle) {}

  async ejecutar(
    operador: Operador,
    { movimientoId }: { movimientoId: string },
  ): Promise<DetalleDeEgresoDeCuentasPorPagar | null> {
    const { pagos, armador } = this.dependencias;
    const delMovimiento = await pagos.delMovimiento(movimientoId);
    const pago = delMovimiento.find(({ estado }) => estado === 'vigente') ?? delMovimiento[0];
    if (!pago) return null;
    const ficha = await armador.armarDe(operador, pago.id);
    const total = ficha.aplicaciones.reduce((suma, linea) => suma + aCentavos(linea.retencionDescontada), 0);
    return {
      pagoNumero: ficha.numero,
      documentos: ficha.aplicaciones.map(documentoDelDetalle),
      totalRetenidoCentavos: total,
    };
  }
}
