import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { ProveedorSinNombreDelNit } from '../../../dominio/errores-de-registro-de-pago.js';
import { exigirFechaDelPago } from '../../../dominio/registro-de-pago.js';
import type { PagoDto } from '../../dto/registro-de-pago.dto.js';
import {
  exigirDiferenciasDelPago,
  fechaMinimaDeLasLineas,
  pedidoEnCentavos,
  sumaDe,
  type PedidoEnCentavos,
} from './comunes-del-registro.js';
import type { DependenciasDeRegistrarPago, LineaRevisada } from './dependencias-de-pagos.js';
import { GuardadorDelPago, type PagoYSusEventos } from './guardador-del-pago.js';
import { conceptosDelPago, ordenarABancos } from './orden-a-bancos.js';
import type { PeticionDePago } from './peticion-de-pago.js';
import { RevisorDelPago } from './revisor-del-pago.js';

/**
 * Paga con cheque o con nota de débito a un proveedor, hasta 100 cargos autorizados de una o varias contraseñas vigentes
 * suyas (§5.1). Pide la carga inicial, revisa sin bloquear, ordena a Bancos crear el cheque o la nota (así un rechazo de
 * Bancos no gasta ningún número aquí), bloquea las contraseñas y los cargos y los revisa otra vez, y guarda. La retención
 * se descuenta una sola vez, en el primer pago vigente de cada cargo. Todo o nada: si algo falla, también se deshace el
 * cheque. Es un alta (`creado_por`): no audita, salvo la diferencia de centavos, que sí.
 */
export class RegistrarPago {
  private readonly revisor: RevisorDelPago;
  private readonly guardador: GuardadorDelPago;

  constructor(private readonly dependencias: DependenciasDeRegistrarPago) {
    this.revisor = new RevisorDelPago(dependencias);
    this.guardador = new GuardadorDelPago(dependencias);
  }

  /**
   * @throws PagoSinDocumentos, DemasiadosDocumentosEnPago, MontoDePagoInvalido, CargoRepetido, CargoNoDisponible,
   * DocumentoFueraDeLaContrasena, DocumentoSinAutorizar, PagoMayorQueElSaldo, FechaInvalidaDelPago,
   * ProveedorSinNombreDelNit, DiferenciaFueraDelPago, DiferenciaMayorQueElSaldo, DiferenciaDePagoSobreElTope y los de Bancos.
   */
  async ejecutar(operador: Operador, pedido: PeticionDePago): Promise<PagoDto> {
    const pedidas = pedidoEnCentavos(pedido);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.registrar(operador, pedido, pedidas));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async registrar(
    operador: Operador,
    pedido: PeticionDePago,
    pedidas: PedidoEnCentavos,
  ): Promise<PagoYSusEventos> {
    const { cargaInicial, reloj, bancos, topeDeDiferencia } = this.dependencias;
    const { lineas, diferencias } = pedidas;
    const { fechaDeInicio } = await cargaInicial.obtener(operador);
    const previas = await this.revisor.revisar(pedido.proveedorId, lineas);
    await exigirDiferenciasDelPago(topeDeDiferencia, operador, { lineas: previas, diferencias });
    const hoy = await reloj.hoy(operador);
    const fecha = pedido.fecha ?? hoy;
    exigirFechaDelPago(fecha, fechaMinimaDeLasLineas(previas, fechaDeInicio));
    const beneficiario = await this.beneficiario(pedido.proveedorId, previas);
    const pagoId = crypto.randomUUID();
    const datos = { pagoId, fecha, montoCentavos: sumaDe(previas), beneficiario, conceptos: conceptosDelPago(previas) };
    const movimiento = await ordenarABancos(bancos, operador, { pedido, datos });
    const bloqueado = await this.revisor.bloquearYRevisar(pedido.proveedorId, lineas, previas);
    await exigirDiferenciasDelPago(topeDeDiferencia, operador, { lineas: bloqueado.lineas, diferencias });
    return this.guardador.guardar(operador, {
      ...{ pedido, pagoId, fecha, hoy, beneficiario, movimiento, bloqueado, diferencias, fechaDeInicio },
    });
  }

  private async beneficiario(proveedorId: string, lineas: readonly LineaRevisada[]): Promise<string> {
    const nombre = await this.dependencias.nombreDelNit.de(
      proveedorId,
      lineas.map(({ fila }) => fila.documento.id),
    );
    if (nombre === null) throw new ProveedorSinNombreDelNit();
    return nombre;
  }
}
