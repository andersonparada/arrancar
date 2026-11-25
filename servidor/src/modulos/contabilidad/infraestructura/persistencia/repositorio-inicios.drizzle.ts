import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { BloqueoDelInicio, RepositorioInicios } from '../../aplicacion/puertos/repositorio-inicios.js';
import { InicioContable } from '../../dominio/inicio.js';
import { inicios } from './inicios.tablas.js';

type Fila = typeof inicios.$inferSelect;

function aEntidad(fila: Fila): InicioContable {
  const { empresaId, fecha, caso, mascara, plantilla, firmaRepresentante, firmaContador, registroDelContador } = fila;
  return InicioContable.reconstruir({
    empresaId: Identificador.desde(empresaId),
    fecha,
    caso,
    mascara,
    plantilla,
    firmaRepresentante,
    firmaContador,
    registroDelContador,
  });
}

function aFila(inicio: InicioContable): typeof inicios.$inferInsert {
  const { empresaId, ...datos } = inicio.instantanea();
  return { ...datos, empresaId: empresaId.valor };
}

/** La tabla tiene seguridad por empresa (RLS): solo se ve la fila de la empresa activa. */
export class RepositorioIniciosDrizzle implements RepositorioInicios {
  async obtener(bloqueo?: BloqueoDelInicio): Promise<InicioContable | null> {
    const consulta = transaccionEnCurso().select().from(inicios).limit(1);
    const [fila] = await (bloqueo ? consulta.for(bloqueo === 'exclusivo' ? 'update' : 'share') : consulta);
    return fila ? aEntidad(fila) : null;
  }

  async agregar(inicio: InicioContable): Promise<void> {
    await transaccionEnCurso().insert(inicios).values(aFila(inicio));
  }

  async guardar(inicio: InicioContable): Promise<void> {
    const fila = aFila(inicio);
    await transaccionEnCurso().update(inicios).set(fila).where(eq(inicios.empresaId, fila.empresaId));
  }
}
