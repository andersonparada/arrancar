import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { RECURSO_DE_COMPROBANTES, type Comprobante } from '../../../dominio/comprobantes.js';
import {
  ComprobanteConReposicionAnulada,
  ComprobanteEnFondoNoAsignado,
  ComprobanteRepuesto,
} from '../../../dominio/errores-de-comprobantes.js';
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
}

/**
 * Busca el comprobante del documento y, si está en un fondo, lo bloquea antes (fondo primero, §13.2 del diseño).
 * Todo documento con destino Caja chica crea su comprobante al recibirse: si no se ve, es que está en un fondo que el
 * usuario no tiene asignado (RLS por alcance) y se rechaza, en vez de dejar al libro dar de baja el documento a medias.
 * @throws ComprobanteEnFondoNoAsignado
 */
async function bloquearElDelDocumento(
  dependencias: DependenciasDeComprobantes,
  documentoId: string,
): Promise<Comprobante> {
  const { comprobantes, fondos, consultasDeFondos } = dependencias;
  const visto = await comprobantes.buscarDelDocumento(documentoId);
  if (!visto) throw new ComprobanteEnFondoNoAsignado();
  if (visto.fondoId !== null)
    await new LectorDelFondo({ fondos, consultas: consultasDeFondos }).bloquear(visto.fondoId);
  const bloqueado = await comprobantes.bloquear(visto.id);
  if (!bloqueado) throw new ComprobanteEnFondoNoAsignado();
  return bloqueado;
}

/**
 * Responde al aviso `libro-de-compras.documento_por_anular` (§5.9), que llega dentro de la transacción del libro antes de
 * que anule nada. Idempotente: uno ya anulado no hace nada; sin comprobante visible lanza `ComprobanteEnFondoNoAsignado`. Si está repuesto lanza `ComprobanteRepuesto` y el
 * libro no anula; si no, lo anula con el motivo del aviso (auditoría `anular`).
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
    const comprobante = await bloquearElDelDocumento(this.dependencias, aviso.documentoId);
    if (comprobante.estado === 'anulado') return [];
    return this.anulador.anular(operador, { comprobante, motivo: aviso.motivo ?? 'Anulado desde el libro de compras' });
  }
}

/**
 * Responde al aviso `libro-de-compras.documento_por_eliminar` (§5.9), antes de que el libro borre su fila: la llave obliga
 * a borrar primero el comprobante, así que aquí se elimina (no se anula) con auditoría `eliminar` y el comprobante como
 * estaba. Repuesto lo rechaza (`ComprobanteRepuesto`), y también el que estuvo en una reposición anulada (`ComprobanteConReposicionAnulada`: su línea de historial lo ata). Sin comprobante visible lanza `ComprobanteEnFondoNoAsignado`. Si estaba en un fondo vigente publica
 * `comprobante_quitado` (para Contabilidad equivale a anulado).
 */
export class EliminarPorAviso {
  constructor(private readonly dependencias: DependenciasDeComprobantes) {}

  /** @throws ComprobanteRepuesto, ComprobanteConReposicionAnulada, ComprobanteEnFondoNoAsignado */
  async ejecutar(operador: Operador, aviso: AvisoDeBajaDelLibro): Promise<void> {
    if (aviso.destino !== DESTINO_PROPIO) return;
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const eventos = await unidadDeTrabajo.ejecutar(operador, () => this.eliminar(operador, aviso));
    await publicadorEventos.publicar(eventos);
  }

  private async eliminar(operador: Operador, aviso: AvisoDeBajaDelLibro): Promise<EventoDominio[]> {
    const comprobante = await bloquearElDelDocumento(this.dependencias, aviso.documentoId);
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
