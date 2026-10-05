import { RaizAgregado } from '../../core/compartido/dominio/entidad.js';
import { Identificador, type CuentaId } from '../../core/compartido/dominio/identificador.js';
import type { Correo } from '../../core/compartido/dominio/objetos-valor/correo.js';
import type { Dpi } from '../../core/compartido/dominio/objetos-valor/dpi.js';
import type { Nit } from '../../core/compartido/dominio/objetos-valor/nit.js';
import type { Telefono } from '../../core/compartido/dominio/objetos-valor/telefono.js';
import { NitDeProveedorSinNumero, ProveedorYaTieneOtroNit, TerceroInactivo } from './errores.js';
import { PapelAsignado, PapelQuitado, TerceroActualizado, TerceroCreado, TerceroInactivado } from './eventos.js';
import type { IdentidadDeTercero } from './identidad-de-tercero.js';
import type { Papel, PapelSegunTipo, TipoDePapel } from './papeles.js';

export type TerceroId = Identificador<'Tercero'>;

export interface Ubicacion {
  departamentoCodigo: string | null;
  municipioCodigo: string | null;
  direccion: string | null;
}

/** Lo que el usuario puede escribir de un tercero. */
export interface DatosDeTercero {
  identidad: IdentidadDeTercero;
  nit: Nit | null;
  dpi: Dpi | null;
  telefono: Telefono | null;
  whatsapp: Telefono | null;
  correo: Correo | null;
  ubicacion: Ubicacion;
  fotoArchivoId: string | null;
  notas: string | null;
  activo: boolean;
}

export type PapelesDeTercero = Partial<Record<TipoDePapel, Papel>>;

export interface PropiedadesDeTercero extends DatosDeTercero {
  id: TerceroId;
  cuentaId: CuentaId;
  papeles: PapelesDeTercero;
}

/**
 * Persona o empresa con la que trata la cuenta, registrada una sola vez y
 * compartida por todas sus empresas, con los papeles que cumple (cliente, proveedor).
 */
export class Tercero extends RaizAgregado<TerceroId> {
  private constructor(private propiedades: PropiedadesDeTercero) {
    super(propiedades.id);
  }

  static registrar(cuentaId: CuentaId, datos: DatosDeTercero): Tercero {
    const tercero = new Tercero({ ...datos, id: Identificador.nuevo(), cuentaId, papeles: {} });
    tercero.registrarEvento(new TerceroCreado(tercero.id, cuentaId));
    return tercero;
  }

  static reconstruir(propiedades: PropiedadesDeTercero): Tercero {
    return new Tercero(propiedades);
  }

  /** Cambia sus datos; si con eso queda inactivo, también se inactivan todos sus papeles. */
  cambiarDatos(datos: DatosDeTercero): void {
    const seInactiva = this.propiedades.activo && !datos.activo;
    this.propiedades = { ...this.propiedades, ...datos };
    if (seInactiva) {
      this.inactivarPapeles();
      this.registrarEvento(new TerceroInactivado(this.id, this.cuentaId));
    } else {
      this.registrarEvento(new TerceroActualizado(this.id, this.cuentaId));
    }
  }

  /**
   * Pone el NIT si no tiene; con el mismo NIT no hace nada. Devuelve si lo cambió.
   * @throws NitDeProveedorSinNumero si el NIT es consumidor final.
   * @throws ProveedorYaTieneOtroNit si ya tiene uno distinto.
   */
  completarNit(nit: Nit): boolean {
    if (nit.esConsumidorFinal()) throw new NitDeProveedorSinNumero();
    const actual = this.propiedades.nit;
    if (actual?.esIgualA(nit)) return false;
    if (actual) throw new ProveedorYaTieneOtroNit(actual.valor);
    this.propiedades = { ...this.propiedades, nit };
    return true;
  }

  /** Asigna el papel o reemplaza sus datos si ya lo tenía. */
  asignarPapel(papel: Papel): void {
    if (!this.propiedades.activo) throw new TerceroInactivo();
    this.propiedades.papeles = { ...this.propiedades.papeles, [papel.tipo]: papel };
    this.registrarEvento(new PapelAsignado(this.id, this.cuentaId, papel.tipo));
  }

  /** El papel queda inactivo, con su historial; no se borra. */
  quitarPapel(tipo: TipoDePapel): void {
    const papel = this.propiedades.papeles[tipo];
    if (!papel) return;
    this.propiedades.papeles = { ...this.propiedades.papeles, [tipo]: { ...papel, activo: false } };
    this.registrarEvento(new PapelQuitado(this.id, this.cuentaId, tipo));
  }

  tienePapel(tipo: TipoDePapel): boolean {
    return this.propiedades.papeles[tipo] !== undefined;
  }

  papel<Tipo extends TipoDePapel>(tipo: Tipo): PapelSegunTipo<Tipo> | null {
    return (this.propiedades.papeles[tipo] as PapelSegunTipo<Tipo> | undefined) ?? null;
  }

  get cuentaId(): CuentaId {
    return this.propiedades.cuentaId;
  }

  get nombreParaMostrar(): string {
    return this.propiedades.identidad.nombreParaMostrar;
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeTercero> {
    return { ...this.propiedades, papeles: { ...this.propiedades.papeles } };
  }

  private inactivarPapeles(): void {
    const papeles = Object.values(this.propiedades.papeles).map((papel) => [papel.tipo, { ...papel, activo: false }]);
    this.propiedades.papeles = Object.fromEntries(papeles);
  }
}
