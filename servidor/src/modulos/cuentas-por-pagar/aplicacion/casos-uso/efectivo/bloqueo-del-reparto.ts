import type { DocumentoConAplicaciones } from '../../../dominio/documento-por-pagar.js';
import { bloquear } from '../acciones/dependencias-de-acciones.js';
import type { DependenciasDeEfectivo } from './dependencias-de-efectivo.js';
import type { PagoRevisado } from './peticion-de-efectivo.js';

type Dependencias = Pick<DependenciasDeEfectivo, 'bloqueoDeBancarizacion' | 'contrasenas' | 'documentos'>;

/**
 * Los bloqueos de un reparto después del retiro (§4.2): primero la bancarización de cada proveedor (para que dos operaciones
 * a la vez no pasen las dos bajo el umbral), luego las contraseñas de todos los pagos y al final sus cargos, cada grupo en
 * orden de id (el orden de todo el módulo).
 */
export class BloqueoDelReparto {
  constructor(private readonly dependencias: Dependencias) {}

  /** Devuelve cada cargo bloqueado como estaba (para auditar la diferencia de centavos que se salde). */
  async bloquear(previas: readonly PagoRevisado[]): Promise<Map<string, DocumentoConAplicaciones>> {
    const { bloqueoDeBancarizacion, contrasenas, documentos } = this.dependencias;
    await bloqueoDeBancarizacion.bloquear(previas.map(({ peticion }) => peticion.proveedorId));
    const deLasContrasenas = previas.flatMap(({ lineas }) => lineas.map(({ contrasena }) => contrasena.id));
    for (const id of [...new Set(deLasContrasenas)].sort()) await contrasenas.bloquear(id);
    const guardados = new Map<string, DocumentoConAplicaciones>();
    const cargos = previas.flatMap(({ pedidas }) => pedidas.lineas.map(({ cargoId }) => cargoId));
    for (const id of [...cargos].sort()) guardados.set(id, await bloquear(documentos, id));
    return guardados;
  }
}
