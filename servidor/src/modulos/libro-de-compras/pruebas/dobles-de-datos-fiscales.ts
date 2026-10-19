import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type {
  AccesoAEmpresas,
  ConsultaDePeriodosConDocumentos,
  ModoDeBloqueoFiscal,
  RepositorioDeDatosFiscalesDeEmpresa,
  RepositorioDeDatosFiscalesDeProveedor,
} from '../aplicacion/puertos/repositorios-de-datos-fiscales.js';
import type { DatosFiscalesDeEmpresa } from '../dominio/datos-fiscales-de-empresa.js';
import { HistorialFiscalDeEmpresa, type VigenciaFiscal } from '../dominio/historial-fiscal-de-empresa.js';
import type { DatosFiscalesDeProveedor } from '../dominio/datos-fiscales-de-proveedor.js';

/** El historial fiscal de las empresas en memoria; `bloqueos` anota cómo se bloqueó cada empresa. */
export class DatosFiscalesDeEmpresaEnMemoria implements RepositorioDeDatosFiscalesDeEmpresa {
  readonly vigencias = new Map<string, VigenciaFiscal[]>();
  readonly bloqueos: string[] = [];

  /**
   * Datos que valen para toda empresa sin vigencias propias (para pruebas que no tratan de datos fiscales). Con
   * `null`, una empresa sin vigencias no tiene datos, como en la base real.
   */
  constructor(private readonly respaldo: DatosFiscalesDeEmpresa | null = null) {}

  /** Deja una sola vigencia, la base, con esos datos (para pruebas que solo necesitan un régimen). */
  fijar(empresaId: string, datos: DatosFiscalesDeEmpresa): void {
    this.vigencias.set(empresaId, [{ id: crypto.randomUUID(), vigenteDesde: null, datos }]);
  }

  async historial(empresaId: string): Promise<HistorialFiscalDeEmpresa> {
    const propias = this.vigencias.get(empresaId);
    if (propias || !this.respaldo) return new HistorialFiscalDeEmpresa(propias ?? []);
    return new HistorialFiscalDeEmpresa([{ id: crypto.randomUUID(), vigenteDesde: null, datos: this.respaldo }]);
  }

  async vigenteEn(empresaId: string, periodo: string): Promise<DatosFiscalesDeEmpresa | null> {
    return (await this.historial(empresaId)).vigenteEn(periodo)?.datos ?? null;
  }

  async bloquear(empresaId: string, modo: ModoDeBloqueoFiscal): Promise<void> {
    this.bloqueos.push(`${empresaId}:${modo}`);
  }

  async insertar(empresaId: string, vigencia: VigenciaFiscal): Promise<void> {
    const todas = this.vigencias.get(empresaId) ?? [];
    this.vigencias.set(empresaId, [...todas, { ...vigencia, id: crypto.randomUUID() }]);
  }

  async actualizar(vigencia: VigenciaFiscal): Promise<void> {
    for (const [empresaId, todas] of this.vigencias) {
      this.vigencias.set(
        empresaId,
        todas.map((v) => (v.id === vigencia.id ? vigencia : v)),
      );
    }
  }

  async eliminar(id: string): Promise<void> {
    for (const [empresaId, todas] of this.vigencias) {
      this.vigencias.set(
        empresaId,
        todas.filter((v) => v.id !== id),
      );
    }
  }
}

/** Los períodos con documentos vigentes, que la prueba fija a mano. */
export class PeriodosConDocumentosEnMemoria implements ConsultaDePeriodosConDocumentos {
  periodos: string[] = [];

  async periodosConDocumentosVigentes(): Promise<string[]> {
    return this.periodos;
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
