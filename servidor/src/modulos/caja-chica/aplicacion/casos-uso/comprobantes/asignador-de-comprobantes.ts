import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { etiquetaDelComprobante, RECURSO_DE_COMPROBANTES, type Comprobante } from '../../../dominio/comprobantes.js';
import { NotaEnOtroFondo } from '../../../dominio/errores-de-comprobantes.js';
import type { Fondo } from '../../../dominio/fondos.js';
import { exigirFondoAbierto } from '../../../dominio/reglas-del-fondo.js';
import {
  efectoEnLoPendiente,
  exigirFechaDelComprobante,
  exigirQueAlcanceElEfectivo,
  topeVigente,
} from '../../../dominio/reglas-de-comprobantes.js';
import type { AsignacionDeComprobante } from '../../puertos/puertos-de-comprobantes.js';
import { avisoDeFueraDelLibro } from './avisos-de-comprobantes.js';
import { comprobanteDto } from './armado-del-comprobante.js';
import { motivoDeLaRetencion, motivoDelTope } from './excepciones-de-comprobantes.js';
import type { DependenciasDeComprobantes } from './dependencias-de-comprobantes.js';
import { efectivoEsperadoDelFondo, eventoDeAsignado } from './utilidades-de-comprobantes.js';

/** Qué excepciones puede autorizar quien asigna (sus permisos `sobre-el-tope` y `con-retencion`). */
export interface PermisosDeExcepcion {
  sobreElTope: boolean;
  conRetencion: boolean;
}

/** Un documento de la bandeja que pasa a un fondo (ya bloqueado y abierto el fondo). */
export interface PedidoDeAsignacion {
  comprobante: Comprobante;
  fondo: Fondo;
  fecha?: string | null;
  motivoSobreElTope?: string | null;
  motivoConRetencion?: string | null;
  permisos: PermisosDeExcepcion;
  /** El vale provisional que se liquida con este documento. */
  valeProvisionalId?: string | null;
}

export interface ResultadoDeAsignacion {
  comprobante: Comprobante;
  avisos: string[];
  evento: EventoDominio;
}

type Dependencias = Pick<
  DependenciasDeComprobantes,
  'comprobantes' | 'consultasDeFondos' | 'configuracion' | 'bancarizacion' | 'auditoria' | 'reloj'
>;

const SIN_BANCARIZAR_NADA = { avisos: [] as string[], sinBancarizar: false };

/**
 * Pasa un documento de la bandeja a un fondo con todas las reglas de §5.4 b: fecha, la nota con su factura, el tope, la
 * excepción de retención (con su auditoría `autorizar`), que el efectivo alcance y la bancarización. Todo se valida
 * antes de escribir, así que si lanza un error esperado no queda nada cambiado.
 */
export class AsignadorDeComprobantes {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws FondoNoDisponible, FechaDelComprobanteInvalida, NotaEnOtroFondo, ComprobanteSobreElTope,
   * MotivoSobreElTopeObligatorio, RetencionSinPermiso, MotivoConRetencionObligatorio, MotivoConRetencionSinRetencion,
   * ComprobantesMayoresQueElEfectivo
   */
  async asignar(operador: Operador, pedido: PedidoDeAsignacion): Promise<ResultadoDeAsignacion> {
    const { comprobante, fondo } = pedido;
    exigirFondoAbierto(fondo);
    const fecha = await this.fechaDe(operador, pedido);
    await this.exigirNotaEnSuFondo(pedido);
    const motivos = await this.motivosDe(operador, pedido);
    await this.exigirEfectivo(pedido);
    const bancarizacion = await this.bancarizar(operador, { comprobante, fecha });
    await this.escribir(operador, {
      comprobante,
      asignacion: {
        fondoId: fondo.id,
        fecha,
        ...motivos,
        sinBancarizar: bancarizacion.sinBancarizar,
        valeProvisionalId: pedido.valeProvisionalId ?? null,
      },
    });
    const asignado = (await this.dependencias.comprobantes.buscar(comprobante.id))!;
    return {
      comprobante: asignado,
      avisos: [...bancarizacion.avisos, ...avisoDeFueraDelLibro(asignado)],
      evento: eventoDeAsignado(operador, asignado),
    };
  }

  private async fechaDe(operador: Operador, { comprobante, fondo, fecha }: PedidoDeAsignacion): Promise<string> {
    const elegida = fecha ?? comprobante.fecha;
    const hoy = await this.dependencias.reloj.hoy(operador);
    exigirFechaDelComprobante(elegida, { hoy, fechaDeApertura: fondo.fechaDeApertura });
    return elegida;
  }

  /** La nota de crédito va al fondo de su factura (la factura se asigna antes si viene en la misma tanda). */
  private async exigirNotaEnSuFondo({ comprobante, fondo }: PedidoDeAsignacion): Promise<void> {
    if (!comprobante.esNotaDeCredito || comprobante.documentoAfectadoId === null) return;
    const factura = await this.dependencias.comprobantes.buscar(comprobante.documentoAfectadoId);
    if (factura?.fondoId !== fondo.id) throw new NotaEnOtroFondo(etiquetaDelComprobante(comprobante));
  }

  private async motivosDe(operador: Operador, pedido: PedidoDeAsignacion) {
    const { comprobante, fondo, permisos } = pedido;
    const porOmision = await this.dependencias.configuracion.topePorOmisionCentavos(operador);
    // Lo que resta (nota de crédito) no es un gasto: no pasa de ningún tope.
    const tope = comprobante.resta ? null : topeVigente(fondo.topeCentavos, porOmision);
    return {
      motivoSobreElTope: motivoDelTope({
        comprobante,
        tope,
        excepcion: { permitida: permisos.sobreElTope, motivo: pedido.motivoSobreElTope },
      }),
      motivoConRetencion: motivoDeLaRetencion(comprobante, {
        permitida: permisos.conRetencion,
        motivo: pedido.motivoConRetencion,
      }),
    };
  }

  private async exigirEfectivo({ comprobante, fondo }: PedidoDeAsignacion): Promise<void> {
    const esperado = await efectivoEsperadoDelFondo(this.dependencias.consultasDeFondos, fondo.id);
    exigirQueAlcanceElEfectivo(esperado, efectoEnLoPendiente(comprobante));
  }

  /** Con `bloquear` marca el comprobante y avisa; con `avisar`, solo avisa (el efectivo ya salió: nunca se rechaza). */
  private async bancarizar(operador: Operador, por: { comprobante: Comprobante; fecha: string }) {
    const { comprobante, fecha } = por;
    const { documento, proveedorId } = comprobante;
    if (!documento || comprobante.resta || proveedorId === null) return SIN_BANCARIZAR_NADA;
    const evaluacion = await this.dependencias.bancarizacion.evaluar(operador, {
      proveedorId,
      proveedorNombre: documento.proveedorNombre,
      fecha,
      montoEnEfectivoCentavos: comprobante.montoCentavos + comprobante.montoRetenidoCentavos,
      cargos: [
        {
          documentoDeCompraId: comprobante.documentoDeCompraId,
          etiqueta: `Caja chica, ${etiquetaDelComprobante(comprobante)}`,
          totalCentavos: documento.totalCentavos,
        },
      ],
    });
    if (evaluacion.resultado === 'libre') return SIN_BANCARIZAR_NADA;
    return {
      avisos: evaluacion.mensaje ? [evaluacion.mensaje] : [],
      sinBancarizar: evaluacion.resultado === 'bloquear',
    };
  }

  /** Quién asignó es quien autorizó la excepción de retención: queda en la auditoría con el motivo. */
  private async escribir(
    operador: Operador,
    por: { comprobante: Comprobante; asignacion: Omit<AsignacionDeComprobante, 'asignadoPor'> },
  ): Promise<void> {
    const { comprobante, asignacion } = por;
    const { comprobantes, auditoria } = this.dependencias;
    await comprobantes.asignar(comprobante.id, { ...asignacion, asignadoPor: operador.usuarioId });
    if (!comprobante.conRetencion) return;
    await auditoria.registrar({
      recurso: RECURSO_DE_COMPROBANTES,
      registroId: comprobante.id,
      accion: 'autorizar',
      anterior: comprobanteDto(comprobante),
      motivo: asignacion.motivoConRetencion,
    });
  }
}
