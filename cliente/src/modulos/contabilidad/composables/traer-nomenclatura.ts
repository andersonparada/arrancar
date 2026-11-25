import { apiCuentas, type Cuenta } from '../servicios/cuentas.api';
import { apiEnlaces, type RolDeEnlace } from '../servicios/enlaces.api';

export interface DatosDeNomenclatura {
  /** `null` = la empresa todavía no inició su contabilidad. */
  mascara: string | null;
  cuentas: Cuenta[];
  roles: RolDeEnlace[];
}

/** Los roles solo sirven para avisar al quitar la marca de control; si no se pueden leer, no estorban. */
async function rolesSiPuede(puede: boolean): Promise<RolDeEnlace[]> {
  if (!puede) return [];
  return apiEnlaces.listar().catch(() => []);
}

/**
 * Todo lo de la nomenclatura con el permiso de cuentas: la máscara (y si ya se inició) llega con las cuentas, así que
 * no hace falta poder ver el inicio.
 */
export async function traerNomenclatura(puedeVerEnlaces: boolean): Promise<DatosDeNomenclatura> {
  const [{ mascara }, cuentas, roles] = await Promise.all([
    apiCuentas.mascara(),
    apiCuentas.listar(),
    rolesSiPuede(puedeVerEnlaces),
  ]);
  return { mascara, cuentas, roles };
}
