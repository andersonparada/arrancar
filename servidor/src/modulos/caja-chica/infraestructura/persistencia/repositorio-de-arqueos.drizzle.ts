import { desc, eq, sql } from 'drizzle-orm';
import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AnulacionDelArqueo,
  ArqueoNuevo,
  ConsultasDeArqueos,
  RepositorioDeArqueos,
} from '../../aplicacion/puertos/puertos-de-arqueos.js';
import type { Arqueo } from '../../dominio/arqueos.js';
import type { Comprobante } from '../../dominio/comprobantes.js';
import { arqueos } from './arqueos.tablas.js';
import { ConsultasDeComprobantesDrizzle } from './consultas-de-comprobantes.drizzle.js';

/** Las cifras del arqueo en centavos, desde sus columnas de dinero. */
function cifrasDeLaFila(fila: typeof arqueos.$inferSelect) {
  return {
    efectivoContadoCentavos: aCentavos(fila.efectivoContado),
    valoresPorCambiarCentavos: aCentavos(fila.valoresPorCambiar),
    montoDelFondoCentavos: aCentavos(fila.montoDelFondo),
    pendienteDeReponerCentavos: aCentavos(fila.pendienteDeReponer),
    valesAbiertosCentavos: aCentavos(fila.valesAbiertos),
    efectivoEsperadoCentavos: aCentavos(fila.efectivoEsperado),
    diferenciaCentavos: aCentavos(fila.diferencia),
  };
}

/** La fila de la base como el arqueo del dominio (sin marcas de tiempo ni autoría). */
export function aArqueo(fila: typeof arqueos.$inferSelect): Arqueo {
  return {
    ...cifrasDeLaFila(fila),
    id: fila.id,
    fondoId: fila.fondoId,
    numero: fila.numero,
    anioDeNumero: fila.anioDeNumero,
    realizadoEn: fila.realizadoEn.toISOString(),
    arqueadoPor: fila.arqueadoPor,
    custodio: fila.custodio,
    custodioUsuarioId: fila.custodioUsuarioId,
    loHizoElCustodio: fila.loHizoElCustodio,
    conteo: fila.conteo,
    comprobantesCompletos: fila.comprobantesCompletos,
    motivoDeDiferencia: fila.motivoDeDiferencia,
    observaciones: fila.observaciones,
    estado: fila.estado,
    fechaDeAnulacion: fila.fechaDeAnulacion,
    motivoDeAnulacion: fila.motivoDeAnulacion,
  };
}

/** Las columnas de dinero de la fila, con dos decimales. */
function montosDe(nuevo: ArqueoNuevo) {
  return {
    efectivoContado: deCentavos(nuevo.efectivoContadoCentavos),
    valoresPorCambiar: deCentavos(nuevo.valoresPorCambiarCentavos),
    montoDelFondo: deCentavos(nuevo.montoDelFondoCentavos),
    pendienteDeReponer: deCentavos(nuevo.pendienteDeReponerCentavos),
    valesAbiertos: deCentavos(nuevo.valesAbiertosCentavos),
    efectivoEsperado: deCentavos(nuevo.efectivoEsperadoCentavos),
    diferencia: deCentavos(nuevo.diferenciaCentavos),
  };
}

/** Las tablas tienen seguridad por empresa y por el alcance de fondos (RLS): un fondo ajeno no se ve ni se toca. */
export class RepositorioDeArqueosDrizzle implements RepositorioDeArqueos {
  async agregar(nuevo: ArqueoNuevo): Promise<void> {
    const { empresaId } = contextoEnCurso();
    // Drizzle solo toma las columnas de la tabla: los `...Centavos` sobrantes de `nuevo` se ignoran.
    await transaccionEnCurso()
      .insert(arqueos)
      .values({ ...nuevo, ...montosDe(nuevo), empresaId });
  }

  async buscar(id: string): Promise<Arqueo | null> {
    const [fila] = await transaccionEnCurso().select().from(arqueos).where(eq(arqueos.id, id));
    return fila ? aArqueo(fila) : null;
  }

  async bloquear(id: string): Promise<Arqueo | null> {
    const [fila] = await transaccionEnCurso().select().from(arqueos).where(eq(arqueos.id, id)).for('update');
    return fila ? aArqueo(fila) : null;
  }

  async anular(id: string, { anuladoPor, motivo, fechaDeAnulacion }: AnulacionDelArqueo): Promise<void> {
    await transaccionEnCurso()
      .update(arqueos)
      .set({ estado: 'anulado', anuladoEn: sql`now()`, anuladoPor, motivoDeAnulacion: motivo, fechaDeAnulacion })
      .where(eq(arqueos.id, id));
  }
}

/** Lecturas de los arqueos de un fondo y de lo pendiente que se revisa al contar. */
export class ConsultasDeArqueosDrizzle implements ConsultasDeArqueos {
  async delFondo(fondoId: string): Promise<Arqueo[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(arqueos)
      .where(eq(arqueos.fondoId, fondoId))
      .orderBy(desc(arqueos.realizadoEn), desc(arqueos.numero));
    return filas.map(aArqueo);
  }

  pendientesDelFondo(fondoId: string): Promise<Comprobante[]> {
    return new ConsultasDeComprobantesDrizzle().delFondo({ fondoId, estado: 'pendiente' });
  }
}
