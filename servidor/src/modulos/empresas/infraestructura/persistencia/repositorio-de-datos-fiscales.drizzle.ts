import { eq } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioDeDatosFiscales } from '../../aplicacion/puertos/repositorio-de-datos-fiscales.js';
import { DatosFiscales } from '../../dominio/datos-fiscales.js';
import type { EmpresaId } from '../../dominio/empresa.js';
import { datosFiscales } from './datos-fiscales.tablas.js';

export class RepositorioDeDatosFiscalesDrizzle implements RepositorioDeDatosFiscales {
  async buscar(empresaId: EmpresaId): Promise<DatosFiscales | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(datosFiscales)
      .where(eq(datosFiscales.empresaId, empresaId.valor));
    if (!fila) return null;
    const { razonSocial, nombreComercial } = fila;
    return DatosFiscales.reconstruir({ empresaId: Identificador.desde(fila.empresaId), razonSocial, nombreComercial });
  }

  async guardar(datos: DatosFiscales): Promise<void> {
    const { empresaId, razonSocial, nombreComercial } = datos.instantanea();
    await transaccionEnCurso()
      .insert(datosFiscales)
      .values({ empresaId: empresaId.valor, razonSocial, nombreComercial })
      .onConflictDoUpdate({
        target: datosFiscales.empresaId,
        set: { razonSocial, nombreComercial, actualizadoEn: new Date(), actualizadoPor: deLaTransaccion.usuario() },
      });
  }
}
