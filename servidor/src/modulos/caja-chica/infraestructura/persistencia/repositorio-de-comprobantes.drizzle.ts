import { and, count, eq, isNotNull, sql } from 'drizzle-orm';
import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AnulacionDelComprobante,
  AsignacionDeComprobante,
  DocumentoRecibido,
  RepositorioDeComprobantes,
  ValeDeGastoNuevo,
} from '../../aplicacion/puertos/puertos-de-comprobantes.js';
import type { Comprobante } from '../../dominio/comprobantes.js';
import { aComprobante, comprobantesConSuContexto } from './comprobantes.lectura.js';
import { comprobantes } from './comprobantes.tablas.js';
import { reposicionComprobantes } from './reposicion-comprobantes.tablas.js';

/** Las tablas tienen seguridad por empresa y, las de un fondo, por el alcance de fondos (RLS). */
export class RepositorioDeComprobantesDrizzle implements RepositorioDeComprobantes {
  async agregarDocumento(nuevo: DocumentoRecibido): Promise<string> {
    const { empresaId } = contextoEnCurso();
    const [fila] = await transaccionEnCurso()
      .insert(comprobantes)
      .values({
        empresaId,
        clase: 'documento',
        documentoDeCompraId: nuevo.documentoDeCompraId,
        proveedorId: nuevo.proveedorId,
        fecha: nuevo.fecha,
        monto: deCentavos(nuevo.montoCentavos),
        resta: nuevo.esNotaDeCredito,
        esNotaDeCredito: nuevo.esNotaDeCredito,
        documentoAfectadoId: nuevo.documentoAfectadoId,
        conRetencion: nuevo.montoRetenidoCentavos > 0,
        montoRetenido: deCentavos(nuevo.montoRetenidoCentavos),
        conActivoFijo: nuevo.conActivoFijo,
      })
      .returning({ id: comprobantes.id });
    return fila!.id;
  }

  async agregarVale(nuevo: ValeDeGastoNuevo): Promise<string> {
    const { empresaId } = contextoEnCurso();
    const { montoCentavos, motivoSobreElTope, ...datos } = nuevo;
    const [fila] = await transaccionEnCurso()
      .insert(comprobantes)
      .values({
        ...datos,
        empresaId,
        clase: 'vale_de_gasto',
        monto: deCentavos(montoCentavos),
        sobreElTope: motivoSobreElTope !== null,
        motivoSobreElTope,
        asignadoEn: sql`now()`,
      })
      .returning({ id: comprobantes.id });
    return fila!.id;
  }

  async buscar(id: string): Promise<Comprobante | null> {
    const [fila] = await comprobantesConSuContexto().where(eq(comprobantes.id, id));
    return fila ? aComprobante(fila) : null;
  }

  /** Bloquea la fila sola y luego la lee con sus uniones (`FOR UPDATE OF` no admite el nombre con esquema). */
  async bloquear(id: string): Promise<Comprobante | null> {
    const bloqueada = await transaccionEnCurso()
      .select({ id: comprobantes.id })
      .from(comprobantes)
      .where(eq(comprobantes.id, id))
      .for('update');
    return bloqueada.length === 0 ? null : this.buscar(id);
  }

  async buscarDelDocumento(documentoDeCompraId: string): Promise<Comprobante | null> {
    const [fila] = await comprobantesConSuContexto().where(eq(comprobantes.documentoDeCompraId, documentoDeCompraId));
    return fila ? aComprobante(fila) : null;
  }

  async asignar(id: string, asignacion: AsignacionDeComprobante): Promise<void> {
    const { motivoSobreElTope, ...resto } = asignacion;
    await transaccionEnCurso()
      .update(comprobantes)
      .set({ ...resto, sobreElTope: motivoSobreElTope !== null, motivoSobreElTope, asignadoEn: sql`now()` })
      .where(eq(comprobantes.id, id));
  }

  async devolverALaBandeja(id: string, fechaDeEmision: string): Promise<void> {
    await transaccionEnCurso()
      .update(comprobantes)
      .set({
        fondoId: null,
        asignadoEn: null,
        asignadoPor: null,
        motivoConRetencion: null,
        sobreElTope: false,
        motivoSobreElTope: null,
        sinBancarizar: false,
        fecha: fechaDeEmision,
      })
      .where(eq(comprobantes.id, id));
  }

  async anular(id: string, anulacion: AnulacionDelComprobante): Promise<void> {
    await transaccionEnCurso()
      .update(comprobantes)
      .set({
        estado: 'anulado',
        anuladoEn: sql`now()`,
        anuladoPor: anulacion.anuladoPor,
        motivoDeAnulacion: anulacion.motivo,
        fechaDeAnulacion: anulacion.fechaDeAnulacion,
      })
      .where(eq(comprobantes.id, id));
  }

  async eliminar(id: string): Promise<void> {
    await transaccionEnCurso().delete(comprobantes).where(eq(comprobantes.id, id));
  }

  async contarNotasVigentes(facturaId: string): Promise<number> {
    const [fila] = await transaccionEnCurso()
      .select({ total: count() })
      .from(comprobantes)
      .where(
        and(
          eq(comprobantes.documentoAfectadoId, facturaId),
          eq(comprobantes.estado, 'vigente'),
          isNotNull(comprobantes.fondoId),
        ),
      );
    return fila?.total ?? 0;
  }

  async tuvoReposicionAnulada(id: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ total: count() })
      .from(reposicionComprobantes)
      .where(and(eq(reposicionComprobantes.comprobanteId, id), eq(reposicionComprobantes.vigente, false)));
    return (fila?.total ?? 0) > 0;
  }
}
