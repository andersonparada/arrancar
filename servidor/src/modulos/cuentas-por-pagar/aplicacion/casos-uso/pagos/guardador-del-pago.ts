import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { NumeroAsignado } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { avisosDeLaApertura } from '../../../dominio/apertura-de-pagos.js';
import type { AjusteRegistrado } from '../../../dominio/eventos-de-ajustes.js';
import { numeroDelPago } from '../../../dominio/pagos.js';
import { CLAVE_DE_PAGOS, retencionPorDescontar, type DiferenciaPedida } from '../../../dominio/registro-de-pago.js';
import type { PagoDto } from '../../dto/registro-de-pago.dto.js';
import type { MovimientoCreado } from '../../puertos/puertos-de-pagos.js';
import { dtoDelPago, eventoDelPago, type PagoGuardado } from './armado-del-pago.js';
import { ArmadorDeAvisosDelPago, type LineaConRetencion } from './avisos-del-pago.js';
import type { DependenciasDeRegistrarPago, LineaRevisada } from './dependencias-de-pagos.js';
import type { PeticionGuardable } from './peticion-de-pago.js';
import { RegistradorDeDiferencias } from './registrador-de-diferencias.js';
import type { PagoBloqueado } from './revisor-del-pago.js';

/** Todo lo que `RegistrarPago` ya resolvió antes de guardar. */
export interface PagoPorGuardar {
  pedido: PeticionGuardable;
  pagoId: string;
  fecha: string;
  hoy: string;
  beneficiario: string;
  /** Nulo en la cuenta de apertura: no mueve dinero. */
  movimiento: MovimientoCreado | null;
  bloqueado: PagoBloqueado;
  diferencias: DiferenciaPedida[];
  fechaDeInicio: string | null;
  /** Solo al ligar una nota: lo que le queda por aplicar después de este pago. */
  restanteDeLaNotaCentavos?: number;
  /** Solo en la cuenta de apertura: si la carga inicial estaba cerrada. */
  conCargaCerrada?: boolean;
  /** Solo en efectivo: los avisos de bancarización ya resueltos y si se usó la excepción (se publica en el evento). */
  avisosDeEfectivo?: string[];
  sinBancarizar?: boolean;
}

export interface PagoYSusEventos {
  dto: PagoDto;
  eventos: EventoDominio[];
}

/**
 * Lo que solo lleva la cuenta de apertura: su motivo, si la carga inicial estaba cerrada y el cheque de apertura que dice
 * haber pagado lo mismo (informativo); nulos en las demás formas.
 */
function datosDeApertura({ pedido, conCargaCerrada }: PagoPorGuardar) {
  if (pedido.forma !== 'cuenta_de_apertura') {
    return { motivo: null, conCargaCerrada: null, chequeDeAperturaReferidoId: null };
  }
  return {
    motivo: pedido.motivo,
    conCargaCerrada: conCargaCerrada ?? false,
    chequeDeAperturaReferidoId: pedido.chequeDeAperturaReferidoId ?? null,
  };
}

/** Lo que solo lleva el efectivo: su retiro, quien recibió y el motivo de la excepción de bancarización; nulos en las demás formas. */
function datosDeEfectivo(pedido: PeticionGuardable) {
  if (pedido.forma !== 'efectivo') return { retiroId: null, recibidoPor: null, motivoSinBancarizar: null };
  return {
    retiroId: pedido.retiroId,
    recibidoPor: pedido.recibidoPor ?? null,
    motivoSinBancarizar: pedido.motivoSinBancarizar ?? null,
  };
}

/** La referencia que se guarda aquí: en cheque y nota de débito va a Bancos, y el cheque de apertura ya tiene la suya. */
const referenciaPropia = (pedido: PeticionGuardable): string | null =>
  pedido.forma === 'cheque' || pedido.forma === 'nota_de_debito' || pedido.forma === 'cheque_de_apertura'
    ? null
    : (pedido.referencia ?? null);

/** La empresa, la cuenta y el usuario del pago: el evento los lleva para que un suscriptor arme su unidad de trabajo. */
const dondeYQuien = ({ empresaId, cuentaId, usuarioId }: Operador) => ({ empresaId, cuentaId, usuarioId });

/** El pago como quedó guardado, con lo que hace falta para su respuesta y su evento. */
function pagoGuardado(
  operador: Operador,
  por: PagoPorGuardar,
  { asignado, lineas, avisos }: { asignado: NumeroAsignado; lineas: LineaConRetencion[]; avisos: string[] },
): PagoGuardado {
  return {
    ...dondeYQuien(operador),
    pagoId: por.pagoId,
    numero: { numero: asignado.numero, anio: asignado.anio },
    forma: por.pedido.forma,
    observaciones: por.pedido.observaciones ?? null,
    ...datosDeApertura(por),
    ...datosDeEfectivo(por.pedido),
    sinBancarizar: por.sinBancarizar ?? false,
    estado: 'vigente',
    anulacion: null,
    fecha: por.fecha,
    hoy: por.hoy,
    beneficiario: por.beneficiario,
    movimiento: por.movimiento,
    lineas,
    diferencias: por.diferencias,
    avisos,
  };
}

/** Guarda el pago y sus líneas, las diferencias de centavos y arma lo que se responde y se publica. */
export class GuardadorDelPago {
  private readonly avisos: ArmadorDeAvisosDelPago;
  private readonly diferencias: RegistradorDeDiferencias;

  constructor(private readonly dependencias: DependenciasDeRegistrarPago) {
    this.avisos = new ArmadorDeAvisosDelPago(dependencias);
    this.diferencias = new RegistradorDeDiferencias(dependencias);
  }

  async guardar(operador: Operador, por: PagoPorGuardar): Promise<PagoYSusEventos> {
    const lineas = await this.conRetencion(por.bloqueado.lineas);
    // Antes de insertar: lo pagado en el mes que se compara con el umbral no incluye este pago.
    const avisos = await this.avisosDe(operador, por, lineas);
    const asignado = await this.dependencias.correlativos.siguiente(CLAVE_DE_PAGOS, por.fecha);
    await this.insertar(por, lineas, asignado);
    const ajustes = await this.guardarDiferencias(operador, por, numeroDelPago(asignado.numero, asignado.anio));
    const guardado = pagoGuardado(operador, por, { asignado, lineas, avisos });
    return { dto: dtoDelPago(guardado), eventos: [eventoDelPago(guardado), ...ajustes] };
  }

  private insertar(por: PagoPorGuardar, lineas: LineaConRetencion[], asignado: NumeroAsignado): Promise<void> {
    const { pedido } = por;
    return this.dependencias.pagos.agregar({
      id: por.pagoId,
      proveedorId: pedido.proveedorId,
      numero: asignado.numero,
      anioDeNumero: asignado.anio,
      forma: pedido.forma,
      fecha: por.fecha,
      movimientoId: por.movimiento?.movimientoId ?? null,
      referencia: referenciaPropia(pedido),
      observaciones: pedido.observaciones ?? null,
      ...datosDeApertura(por),
      ...datosDeEfectivo(pedido),
      lineas: lineas.map(({ fila, contrasena, montoCentavos, retencionDescontadaCentavos }) => ({
        cargoId: fila.documento.id,
        contrasenaId: contrasena.id,
        montoCentavos,
        retencionDescontadaCentavos,
      })),
    });
  }

  private async avisosDe(operador: Operador, por: PagoPorGuardar, lineas: LineaConRetencion[]): Promise<string[]> {
    const propios = await this.avisos.avisos(operador, {
      forma: por.pedido.forma,
      restanteDeLaNotaCentavos: por.restanteDeLaNotaCentavos,
      proveedorId: por.pedido.proveedorId,
      proveedorNombre: lineas[0]!.fila.libro.proveedorNombre,
      fecha: por.fecha,
      hoy: por.hoy,
      fechaDeInicio: por.fechaDeInicio,
      lineas,
      diferencias: por.diferencias,
    });
    const deLaApertura =
      por.pedido.forma === 'cuenta_de_apertura'
        ? avisosDeLaApertura({ cargaCerrada: por.conCargaCerrada ?? false, fechaDeInicio: por.fechaDeInicio })
        : [];
    return [
      ...deLaApertura,
      ...propios,
      ...(por.avisosDeEfectivo ?? []),
      ...(por.movimiento?.avisos ?? []).map(({ mensaje }) => mensaje),
    ];
  }

  /** A cada línea, las retenciones del cargo si este es su primer pago vigente; si no, cero. */
  private async conRetencion(lineas: readonly LineaRevisada[]): Promise<LineaConRetencion[]> {
    const ya = await this.dependencias.pagos.conRetencionYaDescontada(lineas.map(({ fila }) => fila.documento.id));
    return lineas.map((linea) => ({
      ...linea,
      retencionDescontadaCentavos: retencionPorDescontar(linea.fila.documento, ya.has(linea.fila.documento.id)),
    }));
  }

  /** Las diferencias de centavos: un ajuste del cargo ligado al pago, auditado y con su evento (efecto `ingreso`). */
  private async guardarDiferencias(operador: Operador, por: PagoPorGuardar, numero: string): Promise<EventoDominio[]> {
    const eventos: AjusteRegistrado[] = [];
    for (const { cargoId, montoCentavos } of por.diferencias) {
      const cargo = por.bloqueado.guardados.get(cargoId)!;
      const por1 = { pagoId: por.pagoId, numeroDelPago: numero, fecha: por.fecha, cargo, montoCentavos };
      eventos.push(await this.diferencias.registrar(operador, por1));
    }
    return eventos;
  }
}
