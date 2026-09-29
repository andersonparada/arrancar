import { eq } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioDeCargasIniciales } from '../../aplicacion/puertos/repositorio-de-cargas-iniciales.js';
import { CargaInicial } from '../../dominio/carga-inicial.js';
import type { EmpresaId } from '../../dominio/empresa.js';
import { cargasIniciales } from './cargas-iniciales.tablas.js';

export class RepositorioDeCargasInicialesDrizzle implements RepositorioDeCargasIniciales {
  async buscar(empresaId: EmpresaId): Promise<CargaInicial | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(cargasIniciales)
      .where(eq(cargasIniciales.empresaId, empresaId.valor))
      .for('update');
    if (!fila) return null;
    const { cerradaEn, cerradaPor } = fila;
    return CargaInicial.reconstruir({
      empresaId: Identificador.desde(fila.empresaId),
      fechaDeInicio: fila.fechaDeInicio,
      cierre: cerradaEn && cerradaPor ? { cerradaEn, cerradaPor } : null,
    });
  }

  async guardar(carga: CargaInicial): Promise<void> {
    const { empresaId, fechaDeInicio, cierre } = carga.instantanea();
    const cierreGuardado = { cerradaEn: cierre?.cerradaEn ?? null, cerradaPor: cierre?.cerradaPor ?? null };
    await transaccionEnCurso()
      .insert(cargasIniciales)
      .values({ empresaId: empresaId.valor, fechaDeInicio, ...cierreGuardado })
      .onConflictDoUpdate({
        target: cargasIniciales.empresaId,
        set: { fechaDeInicio, ...cierreGuardado, actualizadoEn: new Date(), actualizadoPor: deLaTransaccion.usuario() },
      });
  }
}
