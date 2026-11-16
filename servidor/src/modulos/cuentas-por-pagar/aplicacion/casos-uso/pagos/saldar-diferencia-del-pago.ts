import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { exigirFechaDeDiferencia } from '../../../dominio/anulacion-de-pagos.js';
import { etiquetaDe, type DocumentoConAplicaciones } from '../../../dominio/documento-por-pagar.js';
import { DiferenciaFueraDelPago } from '../../../dominio/errores-de-registro-de-pago.js';
import { numeroDelPago } from '../../../dominio/pagos.js';
import { exigirDiferenciasValidas } from '../../../dominio/registro-de-pago.js';
import type { PagoDto } from '../../dto/registro-de-pago.dto.js';
import { bloquear } from '../acciones/dependencias-de-acciones.js';
import { saldoDeLaFila } from '../aplicaciones/dependencias-de-aplicaciones.js';
import { pagoVigenteBloqueado } from './anular-pago.js';
import type { DependenciasDeCambiarPagos } from './dependencias-de-pagos.js';
import { LectorDelPago } from './lector-del-pago.js';
import { RegistradorDeDiferencias } from './registrador-de-diferencias.js';

export interface PeticionParaSaldarDiferencia {
  pagoId: string;
  cargoId: string;
  /** Dinero como texto con dos decimales. */
  monto: string;
  /** `AAAA-MM-DD`: la del pago o posterior, sin pasar de hoy; por omisión, hoy. */
  fecha?: string;
}

/**
 * Da por saldada la diferencia de centavos de un cargo desde la ficha de un pago **vigente** (§5.4): el mismo residuo que se
 * ofrece al pagar, para cuando se olvidó la casilla. Es un ajuste del cargo (causa `diferencia_menor`, motivo fijo, efecto
 * `ingreso`) ligado al pago, auditado como `ajustar`. Solo si el cargo es de este pago, le queda saldo y el monto cabe en él
 * y en el tope (`cuentas-por-pagar.pagos.tope_diferencia`). Fuera de un pago no hay ajuste de un cargo.
 */
export class SaldarDiferenciaDelPago {
  private readonly lector: LectorDelPago;
  private readonly registrador: RegistradorDeDiferencias;

  constructor(private readonly dependencias: DependenciasDeCambiarPagos) {
    this.lector = new LectorDelPago(dependencias);
    this.registrador = new RegistradorDeDiferencias(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado, PagoYaAnulado, DiferenciaFueraDelPago, MontoDePagoInvalido, DiferenciaDePagoSobreElTope,
   * DiferenciaMayorQueElSaldo, FechaDeDiferenciaInvalida.
   */
  async ejecutar(operador: Operador, pedido: PeticionParaSaldarDiferencia): Promise<PagoDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, evento } = await unidadDeTrabajo.ejecutar(operador, () => this.saldar(operador, pedido));
    await publicadorEventos.publicar([evento]);
    return dto;
  }

  private async saldar(operador: Operador, pedido: PeticionParaSaldarDiferencia) {
    const { pagos, reloj } = this.dependencias;
    const pago = await pagoVigenteBloqueado(this.dependencias, pedido.pagoId);
    if (!pago.lineas.some(({ cargoId }) => cargoId === pedido.cargoId)) throw new DiferenciaFueraDelPago(0);
    const cargo = await bloquear(this.dependencias.documentos, pedido.cargoId);
    const hoy = await reloj.hoy(operador);
    const fecha = pedido.fecha ?? hoy;
    exigirFechaDeDiferencia(fecha, { fechaDelPago: pago.fecha, hoy });
    const montoCentavos = await this.exigirResiduo(operador, { cargo, monto: pedido.monto });
    const evento = await this.registrador.registrar(operador, {
      pagoId: pago.id,
      numeroDelPago: numeroDelPago(pago.numero, pago.anioDeNumero),
      fecha,
      cargo,
      montoCentavos,
    });
    return { dto: (await this.lector.leer(operador, (await pagos.buscar(pago.id))!)).dto, evento };
  }

  /** El monto es un residuo: cabe en lo que le queda al cargo y en el tope. Devuelve el monto en centavos. */
  private async exigirResiduo(
    operador: Operador,
    { cargo, monto }: { cargo: DocumentoConAplicaciones; monto: string },
  ): Promise<number> {
    const { consultas, topeDeDiferencia } = this.dependencias;
    const { id } = cargo.documento;
    const montoCentavos = aCentavos(monto);
    const restante = saldoDeLaFila((await consultas.buscar(id))!);
    const restantes = new Map([[id, { etiqueta: etiquetaDe(cargo.documento), restanteCentavos: restante }]]);
    const tope = await topeDeDiferencia.centavos(operador);
    exigirDiferenciasValidas([{ cargoId: id, montoCentavos }], restantes, tope);
    return montoCentavos;
  }
}
