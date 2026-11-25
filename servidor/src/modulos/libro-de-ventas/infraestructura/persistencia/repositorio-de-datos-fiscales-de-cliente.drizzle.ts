import { eq } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { clientes } from '../../../terceros/infraestructura/persistencia/clientes.tablas.js';
import type { RepositorioDeDatosFiscalesDeCliente } from '../../aplicacion/puertos/repositorio-de-datos-fiscales-de-cliente.js';
import { DatosFiscalesDeCliente } from '../../dominio/datos-fiscales-de-cliente.js';
import { datosFiscalesDeCliente } from './datos-fiscales-de-cliente.tablas.js';

const cambioDeAutoria = () => ({ actualizadoEn: new Date(), actualizadoPor: deLaTransaccion.usuario() });

/** La tabla tiene seguridad por cuenta (RLS): ninguna consulta necesita filtrar por cuenta. */
export class RepositorioDeDatosFiscalesDeClienteDrizzle implements RepositorioDeDatosFiscalesDeCliente {
  async buscar(clienteId: string): Promise<DatosFiscalesDeCliente | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(datosFiscalesDeCliente)
      .where(eq(datosFiscalesDeCliente.clienteId, clienteId));
    if (!fila) return null;
    const { agenteDeRetencionIva, exportaProductosAgropecuarios, retieneIsr, retieneIvaAPequenoContribuyente } = fila;
    return DatosFiscalesDeCliente.crear({
      agenteDeRetencionIva,
      exportaProductosAgropecuarios,
      retieneIsr,
      retieneIvaAPequenoContribuyente,
    });
  }

  async guardar(clienteId: string, datos: DatosFiscalesDeCliente): Promise<void> {
    const propiedades = datos.instantanea();
    await transaccionEnCurso()
      .insert(datosFiscalesDeCliente)
      .values({ clienteId, ...propiedades })
      .onConflictDoUpdate({
        target: datosFiscalesDeCliente.clienteId,
        set: { ...propiedades, ...cambioDeAutoria() },
      });
  }

  async existe(clienteId: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: clientes.id })
      .from(clientes)
      .where(eq(clientes.id, clienteId));
    return fila !== undefined;
  }
}
