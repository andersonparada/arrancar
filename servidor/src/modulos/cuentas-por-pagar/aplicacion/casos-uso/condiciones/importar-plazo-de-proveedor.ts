import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { CambioDeCondiciones } from '../../../dominio/condiciones-de-proveedor.js';
import type { IdentidadDeProveedor } from '../../dto/plazo-de-proveedor.dto.js';
import {
  ProveedorDelPlazoAmbiguo,
  ProveedorDelPlazoNoExiste,
  ProveedorRepetidoEnElArchivo,
} from '../../errores-de-plazos.js';
import type { ProveedoresDeLosPlazos } from '../../puertos/puertos-de-plazos.js';
import type { GuardarCondicionesDeProveedor } from './guardar-condiciones-de-proveedor.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  proveedores: ProveedoresDeLosPlazos;
  guardar: GuardarCondicionesDeProveedor;
}

/**
 * Pone el plazo de un proveedor que ya existe a partir de una fila del Excel: lo identifica por NIT o, sin NIT, por su
 * nombre exacto si es único en la cuenta; después guarda igual que el formulario de Proveedores. Nunca crea proveedores.
 * Dentro de una misma importación (mismo `operador`) un proveedor solo puede aparecer una vez.
 */
export class ImportarPlazoDeProveedor {
  private readonly yaVistos = new WeakMap<Operador, Set<string>>();

  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador, identidad: IdentidadDeProveedor, cambio: CambioDeCondiciones): Promise<void> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const proveedorId = await this.ubicar(identidad);
      this.registrarVisto(operador, proveedorId, campoDe(identidad));
      await this.dependencias.guardar.ejecutar(operador, proveedorId, cambio);
    });
  }

  private async ubicar(identidad: IdentidadDeProveedor): Promise<string> {
    const nit = identidad.nit?.trim();
    const nombre = identidad.proveedorNombre?.trim() ?? '';
    const ids = await this.dependencias.proveedores.buscar(nit ? { nit } : { proveedorNombre: nombre });
    if (ids.length === 0) throw new ProveedorDelPlazoNoExiste(campoDe(identidad), mensajeDeNoExiste(nit, nombre));
    if (ids.length > 1) throw new ProveedorDelPlazoAmbiguo(nombre);
    return ids[0]!;
  }

  private registrarVisto(operador: Operador, proveedorId: string, campo: 'nit' | 'proveedorNombre'): void {
    const vistos = this.yaVistos.get(operador) ?? new Set<string>();
    if (vistos.has(proveedorId)) throw new ProveedorRepetidoEnElArchivo(campo);
    this.yaVistos.set(operador, vistos.add(proveedorId));
  }
}

const campoDe = (identidad: IdentidadDeProveedor) => (identidad.nit?.trim() ? 'nit' : 'proveedorNombre');

const mensajeDeNoExiste = (nit: string | undefined, nombre: string) =>
  `No hay un proveedor ${nit ? `con el NIT ${nit}` : `llamado «${nombre}»`} en la cuenta.`;
