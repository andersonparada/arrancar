import { asc, eq, sql, type SQL } from 'drizzle-orm';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AnulacionDeDocumento,
  AutorizacionDeDocumento,
  DocumentoCompletado,
  DocumentoNuevo,
  RepositorioDeAplicaciones,
  RepositorioDeDocumentos,
} from '../../aplicacion/puertos/puertos-de-documentos.js';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { AjusteDeSaldo, CausaDeAjuste } from '../../dominio/ajustes.js';
import type { DocumentoConAplicaciones, DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
import { ajustesDeSaldo } from './ajustes-de-saldo.tablas.js';
import { mapeadorDeDocumento } from './documento.mapeador.js';
import { documentos } from './documentos.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioDeDocumentosDrizzle implements RepositorioDeDocumentos {
  constructor(private readonly aplicaciones: RepositorioDeAplicaciones) {}

  async existe(documentoId: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: documentos.id })
      .from(documentos)
      .where(eq(documentos.documentoId, documentoId));
    return fila !== undefined;
  }

  async agregar(nuevo: DocumentoNuevo): Promise<DocumentoPorPagar> {
    const valores = { ...mapeadorDeDocumento.aFila(nuevo), empresaId: contextoEnCurso().empresaId };
    const [fila] = await transaccionEnCurso().insert(documentos).values(valores).returning();
    return mapeadorDeDocumento.aDominio(fila!);
  }

  buscarPorDocumentoDeCompra(documentoId: string, bloquear: boolean): Promise<DocumentoConAplicaciones | null> {
    return this.buscarDonde(eq(documentos.documentoId, documentoId), bloquear);
  }

  buscarPorId(id: string, bloquear: boolean): Promise<DocumentoConAplicaciones | null> {
    return this.buscarDonde(eq(documentos.id, id), bloquear);
  }

  async registrar(id: string, { registradoPor, vencimiento }: DocumentoCompletado): Promise<void> {
    await this.cambiar(id, { estado: 'registrado', registradoEn: sql`now()`, registradoPor, vencimiento });
  }

  async cambiarVencimiento(id: string, vencimiento: string): Promise<void> {
    await this.cambiar(id, { vencimiento });
  }

  async autorizar(id: string, { autorizadoPor, autorizacionPropia }: AutorizacionDeDocumento): Promise<void> {
    await this.cambiar(id, { estado: 'autorizado', autorizadoEn: sql`now()`, autorizadoPor, autorizacionPropia });
  }

  async desautorizar(id: string): Promise<void> {
    await this.cambiar(id, {
      estado: 'registrado',
      autorizadoEn: null,
      autorizadoPor: null,
      autorizacionPropia: false,
    });
  }

  async anular(id: string, { anuladoPor, motivo, estabaAutorizado }: AnulacionDeDocumento): Promise<void> {
    await this.cambiar(id, {
      estado: 'anulado',
      anuladoEn: sql`now()`,
      anuladoPor,
      motivoDeAnulacion: motivo,
      estabaAutorizado,
    });
  }

  async eliminar(id: string): Promise<void> {
    await transaccionEnCurso().delete(documentos).where(eq(documentos.id, id));
  }

  private async cambiar(id: string, cambios: PgUpdateSetSource<typeof documentos>): Promise<void> {
    await transaccionEnCurso().update(documentos).set(cambios).where(eq(documentos.id, id));
  }

  private async buscarDonde(condicion: SQL, bloquear: boolean): Promise<DocumentoConAplicaciones | null> {
    const consulta = transaccionEnCurso().select().from(documentos).where(condicion);
    const [fila] = await (bloquear ? consulta.for('update') : consulta);
    if (!fila) return null;
    const documento = mapeadorDeDocumento.aDominio(fila);
    return {
      documento,
      hechas: await this.aplicaciones.hechasPorLaNota(documento.id),
      recibidas: await this.aplicaciones.recibidasPorElCargo(documento.id),
      ajustes: await this.ajustesDe(documento.id),
    };
  }

  private async ajustesDe(documentoId: string): Promise<AjusteDeSaldo[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(ajustesDeSaldo)
      .where(eq(ajustesDeSaldo.documentoId, documentoId))
      .orderBy(asc(ajustesDeSaldo.creadoEn));
    return filas.map((fila) => ({
      id: fila.id,
      documentoId: fila.documentoId,
      montoCentavos: aCentavos(fila.monto),
      fecha: fila.fecha,
      causa: fila.causa as CausaDeAjuste,
      motivo: fila.motivo,
      referencia: fila.referencia,
      estado: fila.estado as AjusteDeSaldo['estado'],
      motivoDeAnulacion: fila.motivoDeAnulacion,
    }));
  }
}
