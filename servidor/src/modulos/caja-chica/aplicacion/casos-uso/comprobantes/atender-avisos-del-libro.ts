import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { RECURSO_DE_COMPROBANTES, etiquetaDelComprobante, type Comprobante } from '../../../dominio/comprobantes.js';
import {
  ComprobanteConReposicionAnulada,
  ComprobanteEnFondoNoAsignado,
  ComprobanteRepuesto,
} from '../../../dominio/errores-de-comprobantes.js';
import { ComprobanteDeUnValeNoSeAnula } from '../../../dominio/errores-de-vales-provisionales.js';
import { FEL_ANULADA_POR_EL_EMISOR } from '../../../dominio/documento-anulado.js';
import type { Fondo } from '../../../dominio/fondos.js';
import { exigirFondoAbierto } from '../../../dominio/reglas-del-fondo.js';
import { LectorDelFondo } from '../fondos/lector-del-fondo.js';
import { AnuladorDeComprobantes } from './anulador-de-comprobantes.js';
import { comprobanteDto } from './armado-del-comprobante.js';
import type { DependenciasDeComprobantes } from './dependencias-de-comprobantes.js';
import { eventoDeQuitado } from './utilidades-de-comprobantes.js';

const DESTINO_PROPIO = 'caja-chica';

/** Lo que traen los avisos `libro-de-compras.documento_por_anular` y `…_por_eliminar`. */
export interface AvisoDeBajaDelLibro {
  /** El id del documento en Libro de compras. */
  documentoId: string;
  destino: string;
  motivo?: string;
  /** Solo en `documento_por_anular`. */
  causa?: string;
}

/**
 * Busca el comprobante del documento y, si está en un fondo, lo bloquea antes (fondo primero, §13.2 del diseño).
 * Todo documento con destino Caja chica crea su comprobante al recibirse: si no se ve, es que está en un fondo que el
 * usuario no tiene asignado (RLS por alcance) y se rechaza, en vez de dejar al libro dar de baja el documento a medias.
 * Un comprobante vigente sin reponer de un fondo cerrado (lo que dejó el cierre cuando lo pendiente sumaba cero o menos)
 * no se da de baja: `fondo_no_disponible`.
 * Con `exigirAbierto: false` (la FEL anulada por su emisor, que no se puede vetar) no rechaza el fondo cerrado.
 * @throws ComprobanteEnFondoNoAsignado, FondoNoDisponible
 */
async function bloquearElDelDocumento(
  dependencias: DependenciasDeComprobantes,
  por: { documentoId: string; exigirAbierto: boolean },
): Promise<{ comprobante: Comprobante; fondo: Fondo | null }> {
  const { documentoId, exigirAbierto } = por;
  const { comprobantes, fondos, consultasDeFondos } = dependencias;
  const visto = await comprobantes.buscarDelDocumento(documentoId);
  if (!visto) throw new ComprobanteEnFondoNoAsignado();
  const fondo =
    visto.fondoId === null
      ? null
      : await new LectorDelFondo({ fondos, consultas: consultasDeFondos }).bloquear(visto.fondoId);
  const bloqueado = await comprobantes.bloquear(visto.id);
  if (!bloqueado) throw new ComprobanteEnFondoNoAsignado();
  const sinReponer = bloqueado.estado === 'vigente' && bloqueado.reposicionNumero === null;
  if (fondo && exigirAbierto && sinReponer) exigirFondoAbierto(fondo);
  return { comprobante: bloqueado, fondo };
}

/**
 * El efectivo ya salió: está en un fondo (pendiente de reponer, repuesto, de un vale liquidado o de un fondo cerrado). Solo
 * lo que sigue en la bandeja no movió nada y se anula como siempre.
 */
const haMovidoEfectivo = (comprobante: Comprobante): boolean => comprobante.fondoId !== null;

/**
 * Responde al aviso `libro-de-compras.documento_por_anular` (§5.9), que llega dentro de la transacción del libro antes de
 * que anule nada. Idempotente: uno ya anulado no hace nada; sin comprobante visible lanza `ComprobanteEnFondoNoAsignado`. Si está repuesto lanza `ComprobanteRepuesto` y el
 * libro no anula; si no, lo anula con el motivo del aviso (auditoría `anular`). Con la causa `fel_anulada_por_el_emisor`
 * (hecho externo que Caja chica no veta) nunca rechaza: si el comprobante está en un fondo deja el comprobante vigente,
 * «documento anulado, por resolver», sin tocar el efectivo esperado (lo gastado ya salió); audita `corregir`, no `anular`.
 */
export class AnularPorAviso {
  private readonly anulador: AnuladorDeComprobantes;

  constructor(private readonly dependencias: DependenciasDeComprobantes) {
    this.anulador = new AnuladorDeComprobantes(dependencias);
  }

  /** @throws ComprobanteRepuesto, ComprobanteEnFondoNoAsignado */
  async ejecutar(operador: Operador, aviso: AvisoDeBajaDelLibro): Promise<void> {
    if (aviso.destino !== DESTINO_PROPIO) return;
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const eventos = await unidadDeTrabajo.ejecutar(operador, () => this.anular(operador, aviso));
    await publicadorEventos.publicar(eventos);
  }

  private async anular(operador: Operador, aviso: AvisoDeBajaDelLibro): Promise<EventoDominio[]> {
    const motivo = aviso.motivo ?? 'Anulado desde el libro de compras';
    const esFel = aviso.causa === FEL_ANULADA_POR_EL_EMISOR;
    const { comprobante } = await bloquearElDelDocumento(this.dependencias, {
      documentoId: aviso.documentoId,
      exigirAbierto: !esFel,
    });
    if (comprobante.estado === 'anulado') return [];
    if (esFel && haMovidoEfectivo(comprobante)) return this.dejarPorResolver(comprobante, motivo);
    return this.anulador.anular(operador, { comprobante, motivo });
  }

  /**
   * El emisor anuló la FEL, pero el efectivo ya salió: nada cambia en la caja, solo queda «documento anulado, por resolver».
   * Si ya traía un reemplazo, es la FEL nueva la que se anuló: vuelve a quedar por resolver.
   */
  private async dejarPorResolver(comprobante: Comprobante, motivo: string): Promise<EventoDominio[]> {
    const { comprobantes, auditoria } = this.dependencias;
    if (comprobante.motivoDocumentoAnulado !== null && comprobante.seguimiento?.salida !== 'reemplazo') return [];
    await comprobantes.marcarDocumentoAnulado(comprobante.id, motivo);
    await auditoria.registrar({
      recurso: RECURSO_DE_COMPROBANTES,
      registroId: comprobante.id,
      accion: 'corregir',
      anterior: comprobanteDto(comprobante),
      motivo: `Documento anulado por su emisor, por resolver: ${motivo}`,
    });
    return [];
  }
}

/**
 * Responde al aviso `libro-de-compras.documento_por_eliminar` (§5.9), antes de que el libro borre su fila: la llave obliga
 * a borrar primero el comprobante, así que aquí se elimina (no se anula) con auditoría `eliminar` y el comprobante como
 * estaba. Repuesto lo rechaza (`ComprobanteRepuesto`), igual que el que justificó un vale provisional (`ComprobanteDeUnValeNoSeAnula`), y también el que estuvo en una reposición anulada (`ComprobanteConReposicionAnulada`: su línea de historial lo ata). Sin comprobante visible lanza `ComprobanteEnFondoNoAsignado`. Si estaba en un fondo vigente publica
 * `comprobante_quitado` (para Contabilidad equivale a anulado).
 */
export class EliminarPorAviso {
  constructor(private readonly dependencias: DependenciasDeComprobantes) {}

  /** @throws ComprobanteDeUnValeNoSeAnula, ComprobanteRepuesto, ComprobanteConReposicionAnulada, ComprobanteEnFondoNoAsignado */
  async ejecutar(operador: Operador, aviso: AvisoDeBajaDelLibro): Promise<void> {
    if (aviso.destino !== DESTINO_PROPIO) return;
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const eventos = await unidadDeTrabajo.ejecutar(operador, () => this.eliminar(operador, aviso));
    await publicadorEventos.publicar(eventos);
  }

  private async eliminar(operador: Operador, aviso: AvisoDeBajaDelLibro): Promise<EventoDominio[]> {
    const { comprobante } = await bloquearElDelDocumento(this.dependencias, {
      documentoId: aviso.documentoId,
      exigirAbierto: true,
    });
    if (comprobante.valeProvisionalId !== null)
      throw new ComprobanteDeUnValeNoSeAnula(etiquetaDelComprobante(comprobante));
    if (comprobante.reposicionNumero !== null) throw new ComprobanteRepuesto(comprobante.reposicionNumero);
    if (await this.dependencias.comprobantes.tuvoReposicionAnulada(comprobante.id)) {
      throw new ComprobanteConReposicionAnulada();
    }
    await this.dependencias.auditoria.registrar({
      recurso: RECURSO_DE_COMPROBANTES,
      registroId: comprobante.id,
      accion: 'eliminar',
      anterior: comprobanteDto(comprobante),
    });
    await this.dependencias.comprobantes.eliminar(comprobante.id);
    const estabaEnUnFondo = comprobante.fondoId !== null && comprobante.estado === 'vigente';
    return estabaEnUnFondo ? [eventoDeQuitado(operador, { comprobante, motivo: 'anulado' })] : [];
  }
}
