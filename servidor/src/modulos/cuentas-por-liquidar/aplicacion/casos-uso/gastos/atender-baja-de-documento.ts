import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { eventoDeGastoQuitado } from '../../../dominio/eventos-de-gastos.js';
import { RECURSO_DE_GASTOS, type Gasto } from '../../../dominio/gastos.js';
import { fechaDeQuitarElGasto } from '../../../dominio/reglas-del-gasto.js';
import { anticipoAbiertoBloqueado } from './anticipo-abierto.js';
import type { DependenciasDeGastos } from './dependencias-de-gastos.js';
import { LectorDelGasto } from './lector-del-gasto.js';

/** Lo que traen los avisos `libro-de-compras.documento_por_anular` y `..._por_eliminar`. */
export interface AvisoDeBajaDeDocumento {
  /** El id del documento en Libro de compras. */
  documentoId: string;
  destino: string;
  /** Solo al anular. */
  motivo?: string;
}

/**
 * Responde a los avisos de que el libro va a anular o eliminar un documento (§7.5), dentro de la transacción del libro y
 * antes de que cambie nada. Es idempotente: sin gasto aquí, o ya anulado al anular, no hace nada. Si el gasto está en un
 * anticipo liquidado se rechaza (`AnticipoNoAbierto`: reabra primero) y el libro no cambia. En la bandeja o en un anticipo
 * abierto, el gasto se anula (al eliminar el documento, la fila se borra porque la llave del libro obliga), siempre con su
 * auditoría `anular` / `eliminar` y el gasto como estaba. Si salió de un anticipo publica `gasto_quitado` al confirmar.
 */
export class AtenderBajaDeDocumento {
  private readonly lector: LectorDelGasto;

  constructor(private readonly dependencias: DependenciasDeGastos) {
    this.lector = new LectorDelGasto(dependencias);
  }

  /** @throws AnticipoNoAbierto si el documento está en un anticipo liquidado. */
  async anular(operador: Operador, aviso: AvisoDeBajaDeDocumento): Promise<void> {
    await this.dar(operador, aviso, 'anular');
  }

  /** @throws AnticipoNoAbierto si el documento está en un anticipo liquidado. */
  async eliminar(operador: Operador, aviso: AvisoDeBajaDeDocumento): Promise<void> {
    await this.dar(operador, aviso, 'eliminar');
  }

  private async dar(operador: Operador, aviso: AvisoDeBajaDeDocumento, baja: 'anular' | 'eliminar'): Promise<void> {
    if (aviso.destino !== 'cuentas-por-liquidar') return;
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const eventos = await unidadDeTrabajo.ejecutar(operador, () => this.bajar(operador, aviso, baja));
    await publicadorEventos.publicar(eventos);
  }

  private async bajar(operador: Operador, aviso: AvisoDeBajaDeDocumento, baja: 'anular' | 'eliminar') {
    const gasto = await this.bloqueado(aviso.documentoId, baja);
    if (!gasto) return [];
    const anterior = await this.lector.leer(gasto);
    const motivo = aviso.motivo ?? 'Eliminado en Libro de compras';
    await this.darDeBaja(operador, gasto, { baja, motivo });
    const registroId = gasto.id;
    await this.dependencias.auditoria.registrar({
      recurso: RECURSO_DE_GASTOS,
      registroId,
      accion: baja,
      anterior,
      motivo,
    });
    return gasto.anticipoId === null || gasto.estado !== 'vigente'
      ? []
      : [eventoDeGastoQuitado(operador.empresaId, gasto, false)];
  }

  /** El gasto del documento, bloqueado (con su anticipo abierto si está en uno); `null` si no hay nada que hacer. */
  private async bloqueado(documentoId: string, baja: 'anular' | 'eliminar'): Promise<Gasto | null> {
    const { gastos } = this.dependencias;
    const encontrado = await gastos.delDocumento(documentoId);
    if (!encontrado || (baja === 'anular' && encontrado.estado === 'anulado')) return null;
    if (encontrado.anticipoId !== null && encontrado.estado === 'vigente') {
      await anticipoAbiertoBloqueado(this.dependencias, encontrado.anticipoId);
    }
    return gastos.bloquear(encontrado.id);
  }

  /** Al eliminar el documento la fila se borra (la llave del libro obliga); al anularlo, el gasto queda anulado. */
  private async darDeBaja(operador: Operador, gasto: Gasto, { baja, motivo }: { baja: string; motivo: string }) {
    const { gastos, reloj } = this.dependencias;
    if (baja === 'eliminar') return gastos.eliminar(gasto.id);
    const fechaDeAnulacion = fechaDeQuitarElGasto(gasto, await reloj.hoy(operador));
    return gastos.anular(gasto.id, { anuladoPor: operador.usuarioId, motivo, fechaDeAnulacion });
  }
}
