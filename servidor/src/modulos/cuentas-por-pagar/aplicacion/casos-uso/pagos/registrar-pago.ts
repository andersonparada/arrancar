import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { etiquetaDe } from '../../../dominio/documento-por-pagar.js';
import { ProveedorSinNombreDelNit } from '../../../dominio/errores-de-registro-de-pago.js';
import {
  exigirDiferenciasValidas,
  exigirFechaDelPago,
  exigirLineasValidas,
  fechaMinimaDelPago,
  type DiferenciaPedida,
  type LineaPedida,
  type RestanteDelCargo,
} from '../../../dominio/registro-de-pago.js';
import type { PagoDto } from '../../dto/registro-de-pago.dto.js';
import type { DependenciasDeRegistrarPago, LineaRevisada } from './dependencias-de-pagos.js';
import { GuardadorDelPago, type PagoYSusEventos } from './guardador-del-pago.js';
import { conceptosDelPago, ordenarABancos } from './orden-a-bancos.js';
import type { PeticionDePago } from './peticion-de-pago.js';
import { RevisorDelPago } from './revisor-del-pago.js';

interface Pedido {
  lineas: LineaPedida[];
  diferencias: DiferenciaPedida[];
}

const sumaDe = (lineas: readonly LineaRevisada[]): number =>
  lineas.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0);

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
    const lineas = pedido.aplicaciones.map(({ cargoId, monto }) => ({ cargoId, montoCentavos: aCentavos(monto) }));
    exigirLineasValidas(lineas);
    const diferencias = (pedido.diferencias ?? []).map(({ cargoId, monto }) => ({
      cargoId,
      montoCentavos: aCentavos(monto),
    }));
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () =>
      this.registrar(operador, pedido, { lineas, diferencias }),
    );
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async registrar(operador: Operador, pedido: PeticionDePago, pedidas: Pedido): Promise<PagoYSusEventos> {
    const { cargaInicial, reloj, bancos } = this.dependencias;
    const { lineas, diferencias } = pedidas;
    const { fechaDeInicio } = await cargaInicial.obtener(operador);
    const previas = await this.revisor.revisar(pedido.proveedorId, lineas);
    await this.exigirDiferencias(operador, previas, diferencias);
    const hoy = await reloj.hoy(operador);
    const fecha = pedido.fecha ?? hoy;
    this.exigirFecha(fecha, previas, fechaDeInicio);
    const beneficiario = await this.beneficiario(pedido.proveedorId, previas);
    const pagoId = crypto.randomUUID();
    const datos = { pagoId, fecha, montoCentavos: sumaDe(previas), beneficiario, conceptos: conceptosDelPago(previas) };
    const movimiento = await ordenarABancos(bancos, operador, { pedido, datos });
    const bloqueado = await this.revisor.bloquearYRevisar(pedido.proveedorId, lineas, previas);
    await this.exigirDiferencias(operador, bloqueado.lineas, diferencias);
    return this.guardador.guardar(operador, {
      ...{ pedido, pagoId, fecha, hoy, beneficiario, movimiento, bloqueado, diferencias, fechaDeInicio },
    });
  }

  private exigirFecha(fecha: string, lineas: readonly LineaRevisada[], fechaDeInicio: string | null): void {
    const hayInicial = lineas.some(({ fila }) => fila.documento.origen === 'saldo_inicial');
    const emisiones = lineas.map(({ fila }) => fila.documento.fechaEmision);
    exigirFechaDelPago(fecha, fechaMinimaDelPago({ emisiones, fechaDeInicio: hayInicial ? fechaDeInicio : null }));
  }

  private async beneficiario(proveedorId: string, lineas: readonly LineaRevisada[]): Promise<string> {
    const nombre = await this.dependencias.nombreDelNit.de(
      proveedorId,
      lineas.map(({ fila }) => fila.documento.id),
    );
    if (nombre === null) throw new ProveedorSinNombreDelNit();
    return nombre;
  }

  private async exigirDiferencias(
    operador: Operador,
    lineas: readonly LineaRevisada[],
    diferencias: readonly DiferenciaPedida[],
  ): Promise<void> {
    if (diferencias.length === 0) return;
    const restantes = new Map<string, RestanteDelCargo>(
      lineas.map(({ fila, saldoCentavos, montoCentavos }) => [
        fila.documento.id,
        { etiqueta: etiquetaDe(fila.documento), restanteCentavos: saldoCentavos - montoCentavos },
      ]),
    );
    exigirDiferenciasValidas(diferencias, restantes, await this.dependencias.topeDeDiferencia.centavos(operador));
  }
}
