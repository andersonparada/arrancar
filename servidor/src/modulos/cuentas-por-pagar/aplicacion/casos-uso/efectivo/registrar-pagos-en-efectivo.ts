import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import type { DocumentoConAplicaciones } from '../../../dominio/documento-por-pagar.js';
import { RetiroNoDisponible } from '../../../dominio/errores-de-pagos-en-efectivo.js';
import { exigirRepartoValido } from '../../../dominio/reparto-de-efectivo.js';
import type { RetiroDeEfectivo } from '../../../dominio/retiros.js';
import type { PagoDto } from '../../dto/registro-de-pago.dto.js';
import { GuardadorDelPago } from '../pagos/guardador-del-pago.js';
import { DesgloseDelRetiro } from '../retiros/desglose-del-retiro.js';
import { LectorDelRetiro } from '../retiros/lector-del-retiro.js';
import { retiroBloqueado } from '../retiros/bloqueo-del-retiro.js';
import { BloqueoDelReparto } from './bloqueo-del-reparto.js';
import type { DependenciasDeEfectivo } from './dependencias-de-efectivo.js';
import type { PeticionDeReparto, RepartoDto } from './peticion-de-efectivo.js';
import { PreparadorDelReparto, type PagoListo } from './preparador-del-reparto.js';
import { RevisorDelReparto } from './revisor-del-reparto.js';

/** Los pagos ya revisados con todo bloqueado, listos para guardarse en el orden en que vinieron. */
interface RepartoPorGuardar {
  retiro: RetiroDeEfectivo;
  hoy: string;
  fechaDeInicio: string | null;
  listos: PagoListo[];
  cargos: Map<string, DocumentoConAplicaciones>;
}

/**
 * Reparte el efectivo de un retiro entre uno o varios proveedores en una sola operación (`pagos.pagar-en-efectivo`, adenda
 * de efectivo §4.2): de 1 a 20 pagos, uno por proveedor, todo o nada. Cada pago es como el de un cheque (cargos autorizados
 * en contraseñas vigentes, retención en el primer pago, diferencias de centavos, su número y su recibo) pero no ordena nada a
 * Bancos: gasta el efectivo del retiro. Bloquea el cheque o la nota del retiro, el retiro, la bancarización de cada proveedor,
 * las contraseñas y los cargos (en ese orden) y revisa todo otra vez antes de guardar. La bancarización bloquea un pago que
 * llega al umbral si la empresa perdería costo o crédito fiscal, salvo permiso y motivo. Al final vuelve a fijar en Bancos el
 * reparto del cheque o la nota entre Operación, Inversión y «efectivo para pagos». Publica un `pago_registrado` por pago.
 */
export class RegistrarPagosEnEfectivo {
  private readonly revisor: RevisorDelReparto;
  private readonly bloqueo: BloqueoDelReparto;
  private readonly preparador: PreparadorDelReparto;
  private readonly guardador: GuardadorDelPago;
  private readonly lector: LectorDelRetiro;
  private readonly desglose: DesgloseDelRetiro;

  constructor(private readonly dependencias: DependenciasDeEfectivo) {
    this.revisor = new RevisorDelReparto(dependencias);
    this.bloqueo = new BloqueoDelReparto(dependencias);
    this.preparador = new PreparadorDelReparto(dependencias);
    this.guardador = new GuardadorDelPago(dependencias);
    this.lector = new LectorDelRetiro({ ...dependencias, consultas: dependencias.consultasDeRetiros });
    this.desglose = new DesgloseDelRetiro({ consultas: dependencias.consultasDeRetiros, bancos: dependencias.bancos });
  }

  /**
   * @throws DemasiadosPagosEnElReparto, ProveedorRepetidoEnElReparto, DemasiadosDocumentosEnElReparto, RetiroNoDisponible,
   * PagoMayorQueElRetiro, FechaDePagoEnEfectivoInvalida, EfectivoSobreElUmbral, MotivoSinBancarizarObligatorio y los de un
   * pago con cheque (cargos, montos y diferencias), con el índice del pago en `detalles`.
   */
  async ejecutar(operador: Operador, pedido: PeticionDeReparto): Promise<RepartoDto> {
    exigirRepartoValido(pedido.pagos);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { reparto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.repartir(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return reparto;
  }

  private async repartir(operador: Operador, pedido: PeticionDeReparto) {
    const { cargaInicial, reloj } = this.dependencias;
    const pedidos = await this.revisor.pedidos(pedido);
    const { fechaDeInicio } = await cargaInicial.obtener(operador);
    const retiro = await this.retiroAbierto(pedido.retiroId);
    const cargos = await this.bloqueo.bloquear(await this.revisor.revisar(pedidos));
    const pagos = await this.revisor.revisar(pedidos);
    const hoy = await reloj.hoy(operador);
    const contexto = { retiro, hoy, fechaDeInicio, puedeSinBancarizar: pedido.puedeSinBancarizar };
    const listos = await this.preparador.preparar(operador, { pagos, contexto });
    return this.guardar(operador, { retiro, hoy, fechaDeInicio, listos, cargos });
  }

  /** El retiro bloqueado, con su cheque o su nota antes; debe ser de la empresa y seguir abierto. */
  private async retiroAbierto(retiroId: string): Promise<RetiroDeEfectivo> {
    if ((await this.dependencias.retiros.buscar(retiroId)) === null) throw new RetiroNoDisponible();
    const retiro = await retiroBloqueado(this.dependencias, retiroId);
    if (retiro.estado !== 'abierto') throw new RetiroNoDisponible();
    return retiro;
  }

  private async guardar(operador: Operador, por: RepartoPorGuardar) {
    const pagos: PagoDto[] = [];
    const eventos: EventoDominio[] = [];
    for (const listo of por.listos) {
      const { dto, eventos: delPago } = await this.guardarUno(operador, listo, por);
      pagos.push(dto);
      eventos.push(...delPago);
    }
    await this.desglose.fijar(operador, por.retiro);
    const avisos = [...new Set(pagos.flatMap(({ avisos: delPago }) => delPago))];
    const retiro = await this.lector.leer(operador, por.retiro, avisos);
    return { reparto: { retiro, pagos, avisos: retiro.avisos }, eventos };
  }

  private guardarUno(operador: Operador, { pago, fecha, bancarizacion }: PagoListo, por: RepartoPorGuardar) {
    const motivoSinBancarizar = bancarizacion.motivoSinBancarizar;
    return this.guardador.guardar(operador, {
      pedido: { ...pago.peticion, motivoSinBancarizar },
      pagoId: crypto.randomUUID(),
      fecha,
      hoy: por.hoy,
      beneficiario: pago.lineas[0]!.fila.libro.proveedorNombre,
      movimiento: null,
      bloqueado: { lineas: pago.lineas, guardados: por.cargos },
      diferencias: pago.pedidas.diferencias,
      fechaDeInicio: por.fechaDeInicio,
      avisosDeEfectivo: bancarizacion.avisos,
      sinBancarizar: motivoSinBancarizar !== null,
    });
  }
}
