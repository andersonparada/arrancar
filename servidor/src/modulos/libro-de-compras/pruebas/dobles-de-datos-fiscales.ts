import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type {
  AccesoAEmpresas,
  RepositorioDeDatosFiscalesDeEmpresa,
  RepositorioDeDatosFiscalesDeProveedor,
} from '../aplicacion/puertos/repositorios-de-datos-fiscales.js';
import type { DatosFiscalesDeEmpresa } from '../dominio/datos-fiscales-de-empresa.js';
import type { DatosFiscalesDeProveedor } from '../dominio/datos-fiscales-de-proveedor.js';

/** Datos fiscales de empresa en memoria: una fila por empresa. */
export class DatosFiscalesDeEmpresaEnMemoria implements RepositorioDeDatosFiscalesDeEmpresa {
  readonly filas = new Map<string, DatosFiscalesDeEmpresa>();

  async buscar(empresaId: string): Promise<DatosFiscalesDeEmpresa | null> {
    return this.filas.get(empresaId) ?? null;
  }

  async guardar(empresaId: string, datos: DatosFiscalesDeEmpresa): Promise<void> {
    this.filas.set(empresaId, datos);
  }
}

/** Datos fiscales de proveedor en memoria: una fila por proveedor; `existentes` son los proveedores de la cuenta. */
export class DatosFiscalesDeProveedorEnMemoria implements RepositorioDeDatosFiscalesDeProveedor {
  readonly filas = new Map<string, DatosFiscalesDeProveedor>();
  readonly existentes = new Set<string>();

  async buscar(proveedorId: string): Promise<DatosFiscalesDeProveedor | null> {
    return this.filas.get(proveedorId) ?? null;
  }

  async guardar(proveedorId: string, datos: DatosFiscalesDeProveedor): Promise<void> {
    this.filas.set(proveedorId, datos);
  }

  async existe(proveedorId: string): Promise<boolean> {
    return this.existentes.has(proveedorId);
  }
}

/** Solo las empresas indicadas son del operador. */
export class AccesoAEmpresasEnMemoria implements AccesoAEmpresas {
  constructor(private readonly permitidas: readonly string[]) {}

  async exigirAcceso(_operador: Operador, empresaId: string): Promise<void> {
    if (!this.permitidas.includes(empresaId)) throw new RecursoNoEncontrado('La empresa');
  }
}
