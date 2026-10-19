import { eq } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import type { RepositorioDeDatosFiscalesDeProveedor } from '../../aplicacion/puertos/repositorios-de-datos-fiscales.js';
import {
  DatosFiscalesDeProveedor,
  type RegimenDeIsrDeProveedor,
  type RegimenDeIvaDeProveedor,
} from '../../dominio/datos-fiscales-de-proveedor.js';
import { datosFiscalesDeProveedor } from './datos-fiscales.tablas.js';

const cambioDeAutoria = () => ({ actualizadoEn: new Date(), actualizadoPor: deLaTransaccion.usuario() });

export class RepositorioDeDatosFiscalesDeProveedorDrizzle implements RepositorioDeDatosFiscalesDeProveedor {
  async buscar(proveedorId: string): Promise<DatosFiscalesDeProveedor | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(datosFiscalesDeProveedor)
      .where(eq(datosFiscalesDeProveedor.proveedorId, proveedorId));
    if (!fila) return null;
    return DatosFiscalesDeProveedor.crear({
      regimenIva: fila.regimenIva as RegimenDeIvaDeProveedor,
      regimenIsr: fila.regimenIsr as RegimenDeIsrDeProveedor | null,
      esAgenteDeRetencionIva: fila.esAgenteDeRetencionIva,
      seLeRetieneIva: fila.seLeRetieneIva,
      seLeRetieneIsr: fila.seLeRetieneIsr,
      seLeRetieneIvaPequenoContribuyente: fila.seLeRetieneIvaPequenoContribuyente,
    });
  }

  async guardar(proveedorId: string, datos: DatosFiscalesDeProveedor): Promise<void> {
    const propiedades = datos.instantanea();
    await transaccionEnCurso()
      .insert(datosFiscalesDeProveedor)
      .values({ proveedorId, ...propiedades })
      .onConflictDoUpdate({
        target: datosFiscalesDeProveedor.proveedorId,
        set: { ...propiedades, ...cambioDeAutoria() },
      });
  }

  async existe(proveedorId: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: proveedores.id })
      .from(proveedores)
      .where(eq(proveedores.id, proveedorId));
    return fila !== undefined;
  }
}
