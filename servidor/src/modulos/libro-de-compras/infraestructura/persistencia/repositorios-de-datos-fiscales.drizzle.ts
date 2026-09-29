import { eq } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import type {
  RepositorioDeDatosFiscalesDeEmpresa,
  RepositorioDeDatosFiscalesDeProveedor,
} from '../../aplicacion/puertos/repositorios-de-datos-fiscales.js';
import { DatosFiscalesDeEmpresa, type PropiedadesFiscalesDeEmpresa } from '../../dominio/datos-fiscales-de-empresa.js';
import { DatosFiscalesDeProveedor, type RegimenDeIsrDeProveedor } from '../../dominio/datos-fiscales-de-proveedor.js';
import { datosFiscalesDeEmpresa, datosFiscalesDeProveedor } from './datos-fiscales.tablas.js';

const cambioDeAutoria = () => ({ actualizadoEn: new Date(), actualizadoPor: deLaTransaccion.usuario() });

export class RepositorioDeDatosFiscalesDeEmpresaDrizzle implements RepositorioDeDatosFiscalesDeEmpresa {
  async buscar(empresaId: string): Promise<DatosFiscalesDeEmpresa | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(datosFiscalesDeEmpresa)
      .where(eq(datosFiscalesDeEmpresa.empresaId, empresaId));
    if (!fila) return null;
    const { regimenIva, regimenIsr, agenteDeRetencionIva, esAgenteDeRetencionIsr } = fila;
    return DatosFiscalesDeEmpresa.crear({
      regimenIva: regimenIva as PropiedadesFiscalesDeEmpresa['regimenIva'],
      regimenIsr: regimenIsr as PropiedadesFiscalesDeEmpresa['regimenIsr'],
      agenteDeRetencionIva: agenteDeRetencionIva as PropiedadesFiscalesDeEmpresa['agenteDeRetencionIva'],
      esAgenteDeRetencionIsr,
    });
  }

  async guardar(empresaId: string, datos: DatosFiscalesDeEmpresa): Promise<void> {
    const propiedades = datos.instantanea();
    await transaccionEnCurso()
      .insert(datosFiscalesDeEmpresa)
      .values({ empresaId, ...propiedades })
      .onConflictDoUpdate({
        target: datosFiscalesDeEmpresa.empresaId,
        set: { ...propiedades, ...cambioDeAutoria() },
      });
  }
}

export class RepositorioDeDatosFiscalesDeProveedorDrizzle implements RepositorioDeDatosFiscalesDeProveedor {
  async buscar(proveedorId: string): Promise<DatosFiscalesDeProveedor | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(datosFiscalesDeProveedor)
      .where(eq(datosFiscalesDeProveedor.proveedorId, proveedorId));
    if (!fila) return null;
    return DatosFiscalesDeProveedor.crear({
      esPequenoContribuyente: fila.esPequenoContribuyente,
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
