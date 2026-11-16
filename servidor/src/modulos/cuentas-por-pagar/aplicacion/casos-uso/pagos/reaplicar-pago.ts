import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import {
  efectoDelPago,
  exigirElMismoMonto,
  exigirSoloSaldosInicialesEnLaApertura,
} from '../../../dominio/anulacion-de-pagos.js';
import { motivoValido } from '../../../dominio/ciclo-de-vida.js';
import { PagoReaplicado } from '../../../dominio/eventos-de-pagos.js';
import { creoSuMovimiento, type PagoConLineas } from '../../../dominio/pago-con-lineas.js';
import { exigirLineasValidas, retencionPorDescontar, type LineaPedida } from '../../../dominio/registro-de-pago.js';
import type { PagoDto } from '../../dto/registro-de-pago.dto.js';
import { bloquear } from '../acciones/dependencias-de-acciones.js';
import { AnuladorDelPago, RECURSO_DE_PAGOS } from './anulador-del-pago.js';
import { pagoVigenteBloqueado } from './anular-pago.js';
import { aplicacionDelEvento } from './armado-del-pago.js';
import type { LineaConRetencion } from './avisos-del-pago.js';
import type { DependenciasDeCambiarPagos, LineaRevisada } from './dependencias-de-pagos.js';
import { LectorDelPago, type PagoLeido } from './lector-del-pago.js';
import { conceptosDelPago, MODULO_DE_ORIGEN } from './orden-a-bancos.js';
import { RevisorDelPago } from './revisor-del-pago.js';

export interface PeticionParaReaplicar {
  pagoId: string;
  motivo: string;
  /** De 1 a 100 cargos autorizados de contraseñas vigentes del proveedor del pago; el dinero como texto con dos decimales. */
  aplicaciones: Array<{ cargoId: string; monto: string }>;
}

interface Reaplicacion {
  pagoId: string;
  motivo: string;
  lineas: LineaPedida[];
}

const deActivoFijo = (lineas: readonly LineaRevisada[]): number =>
  lineas.reduce((suma, { fila, montoCentavos }) => (fila.documento.tieneActivoFijo ? suma + montoCentavos : suma), 0);

/**
 * Cambia a qué cargos cubre un pago vigente (§5.11, `pagos.reaplicar`): para un pago aplicado a los documentos
 * equivocados, sobre todo un cheque ya cobrado, que no se anula. El dinero, la fecha, el número y el movimiento no cambian.
 * Bloquea el pago, las contraseñas y los cargos de antes y de después (en orden de id), revisa los nuevos cargos con el
 * saldo sin contar este pago (cualquier contraseña vigente del proveedor; la suma debe seguir siendo el monto del pago),
 * anula sus ajustes de diferencia, recalcula la retención, vuelve a fijar el reparto por activo fijo en Bancos si cambió,
 * audita `corregir` con el pago como estaba y publica `pago_reaplicado` al confirmar.
 */
export class ReaplicarPago {
  private readonly revisor: RevisorDelPago;
  private readonly anulador: AnuladorDelPago;
  private readonly lector: LectorDelPago;

  constructor(private readonly dependencias: DependenciasDeCambiarPagos) {
    this.revisor = new RevisorDelPago(dependencias);
    this.anulador = new AnuladorDelPago(dependencias);
    this.lector = new LectorDelPago(dependencias);
  }

  /**
   * @throws MotivoInvalido, RecursoNoEncontrado, PagoYaAnulado, PagoSinDocumentos, DemasiadosDocumentosEnPago,
   * MontoDePagoInvalido, CargoRepetido, CargoNoDisponible, DocumentoFueraDeLaContrasena, DocumentoSinAutorizar,
   * PagoMayorQueElSaldo, ReaplicacionConOtroMonto, SoloSaldosIniciales.
   */
  async ejecutar(operador: Operador, pedido: PeticionParaReaplicar): Promise<PagoDto> {
    const motivo = motivoValido(pedido.motivo);
    const lineas = pedido.aplicaciones.map(({ cargoId, monto }) => ({ cargoId, montoCentavos: aCentavos(monto) }));
    exigirLineasValidas(lineas);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () =>
      this.reaplicar(operador, { pagoId: pedido.pagoId, motivo, lineas }),
    );
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async reaplicar(operador: Operador, pedido: Reaplicacion) {
    const { pagos, cargaInicial, reglasParaReaplicar, reloj } = this.dependencias;
    await cargaInicial.obtener(operador);
    const pago = await this.bloquear(pedido);
    await this.anulador.revisar(pago, reglasParaReaplicar);
    const antes = await this.lector.leer(operador, pago);
    const previas = await this.revisor.revisar(pago.proveedorId, pedido.lineas, await this.devueltos(pago));
    exigirElMismoMonto(pago, previas);
    exigirSoloSaldosInicialesEnLaApertura(
      pago,
      previas.map(({ fila }) => fila.documento.origen),
    );
    const hoy = await reloj.hoy(operador);
    const ajustes = await this.anulador.anularDiferencias(operador, pago, { motivo: pedido.motivo, fecha: hoy });
    const despues = await this.guardarLineas(pago, previas);
    await this.fijarElDesglose(operador, pago, { antes: antes.lineas, despues });
    const evento = await this.dejarRastro(operador, pago, { antes, despues, hoy, motivo: pedido.motivo });
    const dto = (await this.lector.leer(operador, (await pagos.buscar(pago.id))!)).dto;
    return { dto, eventos: [evento, ...ajustes] as EventoDominio[] };
  }

  /** Audita `corregir` con el pago como estaba y arma el evento con las líneas de antes y de después. */
  private async dejarRastro(
    operador: Operador,
    pago: PagoConLineas,
    {
      antes,
      despues,
      hoy,
      motivo,
    }: { antes: PagoLeido; despues: readonly LineaConRetencion[]; hoy: string; motivo: string },
  ): Promise<PagoReaplicado> {
    await this.dependencias.auditoria.registrar({
      recurso: RECURSO_DE_PAGOS,
      registroId: pago.id,
      accion: 'corregir',
      anterior: antes.dto,
      motivo,
    });
    return this.evento(operador, pago, { antes: antes.lineas, despues, hoy });
  }

  /** Bloquea el pago y después, en orden de id, las contraseñas y los cargos de antes y de después. */
  private async bloquear(pedido: Reaplicacion): Promise<PagoConLineas> {
    const { contrasenas, documentos, consultas } = this.dependencias;
    const pago = await pagoVigenteBloqueado(this.dependencias, pedido.pagoId);
    const contrasenaIds = new Set(pago.lineas.map(({ contrasenaId }) => contrasenaId));
    for (const { cargoId } of pedido.lineas) {
      const contrasena = (await consultas.buscar(cargoId))?.contrasena;
      if (contrasena) contrasenaIds.add(contrasena.id);
    }
    const cargoIds = new Set([...pago.lineas, ...pedido.lineas].map(({ cargoId }) => cargoId));
    for (const id of [...contrasenaIds].sort()) await contrasenas.bloquear(id);
    for (const id of [...cargoIds].sort()) await bloquear(documentos, id);
    return pago;
  }

  /** Lo que este pago ya tiene en cada cargo (su línea y su diferencia de centavos): el saldo se cuenta sin esto. */
  private async devueltos(pago: PagoConLineas): Promise<Map<string, number>> {
    const devueltos = new Map(pago.lineas.map(({ cargoId, montoCentavos }) => [cargoId, montoCentavos]));
    for (const { documentoId, montoCentavos } of await this.dependencias.ajustes.vigentesDelPago(pago.id)) {
      devueltos.set(documentoId, (devueltos.get(documentoId) ?? 0) + montoCentavos);
    }
    return devueltos;
  }

  /** Cambia las líneas del pago; la retención se recalcula sin contar la que este mismo pago descontaba. */
  private async guardarLineas(pago: PagoConLineas, lineas: readonly LineaRevisada[]): Promise<LineaConRetencion[]> {
    const { pagos } = this.dependencias;
    const ya = await pagos.conRetencionYaDescontada(lineas.map(({ fila }) => fila.documento.id));
    for (const { cargoId, retencionDescontadaCentavos } of pago.lineas) {
      if (retencionDescontadaCentavos > 0) ya.delete(cargoId);
    }
    const nuevas = lineas.map((linea) => ({
      ...linea,
      retencionDescontadaCentavos: retencionPorDescontar(linea.fila.documento, ya.has(linea.fila.documento.id)),
    }));
    await pagos.reemplazarLineas(
      pago,
      nuevas.map(({ fila, contrasena, montoCentavos, retencionDescontadaCentavos }) => ({
        cargoId: fila.documento.id,
        contrasenaId: contrasena.id,
        montoCentavos,
        retencionDescontadaCentavos,
      })),
    );
    return nuevas;
  }

  /** Si cambió lo pagado a cargos de activo fijo, Bancos vuelve a repartir el cheque o la nota entre Operación e Inversión. */
  private async fijarElDesglose(
    operador: Operador,
    pago: PagoConLineas,
    { antes, despues }: { antes: readonly LineaRevisada[]; despues: readonly LineaRevisada[] },
  ): Promise<void> {
    if (!creoSuMovimiento(pago) || pago.movimientoId === null) return;
    if (deActivoFijo(antes) === deActivoFijo(despues)) return;
    await this.dependencias.bancos.fijarDesglose(operador, {
      origen: { modulo: MODULO_DE_ORIGEN, documentoId: pago.id },
      movimientoId: pago.movimientoId,
      conceptos: conceptosDelPago(despues),
    });
  }

  private evento(
    operador: Operador,
    pago: PagoConLineas,
    {
      antes,
      despues,
      hoy,
    }: { antes: readonly LineaConRetencion[]; despues: readonly LineaConRetencion[]; hoy: string },
  ): PagoReaplicado {
    return new PagoReaplicado({
      empresaId: operador.empresaId,
      pagoId: pago.id,
      fecha: hoy,
      fechaDelPago: pago.fecha,
      efecto: efectoDelPago(pago),
      retiroId: pago.retiroId,
      antes: antes.map(aplicacionDelEvento),
      despues: despues.map(aplicacionDelEvento),
    });
  }
}
