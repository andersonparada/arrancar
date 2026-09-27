import { RaizAgregado } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import type { Nit } from '../../core/compartido/dominio/objetos-valor/nit.js';
import { NoSePuedeDesactivarLaEmpresaEnUso, NombreDeEmpresaInvalido } from './errores.js';
import { EmpresaRegistrada } from './eventos.js';

export type EmpresaId = Identificador<'Empresa'>;
export type CuentaId = Identificador<'Cuenta'>;

const LARGO_MAXIMO_DEL_NOMBRE = 120;
const MONEDA_BASE_PREDETERMINADA = 'GTQ';

/** Lo que el usuario puede escribir de una empresa. */
export interface DatosDeEmpresa {
  nombre: string;
  nit: Nit | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  activa: boolean;
}

export interface PropiedadesDeEmpresa extends DatosDeEmpresa {
  id: EmpresaId;
  cuentaId: CuentaId;
  /** Moneda de su contabilidad; hoy siempre quetzales (GTQ). */
  monedaBase: string;
}

function nombreValido(nombre: string): string {
  const limpio = nombre.trim();
  if (!limpio || limpio.length > LARGO_MAXIMO_DEL_NOMBRE) throw new NombreDeEmpresaInvalido(nombre);
  return limpio;
}

/** Rancho o parcela que la cuenta administra como una empresa, con su propio NIT. */
export class Empresa extends RaizAgregado<EmpresaId> {
  private constructor(private propiedades: PropiedadesDeEmpresa) {
    super(propiedades.id);
  }

  static registrar(cuentaId: CuentaId, datos: DatosDeEmpresa): Empresa {
    const empresa = new Empresa({
      ...datos,
      nombre: nombreValido(datos.nombre),
      id: Identificador.nuevo(),
      cuentaId,
      monedaBase: MONEDA_BASE_PREDETERMINADA,
    });
    empresa.registrarEvento(new EmpresaRegistrada(empresa.id, cuentaId));
    return empresa;
  }

  static reconstruir(propiedades: PropiedadesDeEmpresa): Empresa {
    return new Empresa(propiedades);
  }

  /**
   * Cambia los datos generales. No se puede desactivar la empresa con la que el
   * usuario está trabajando: se quedaría sin empresa activa a mitad de la sesión.
   */
  cambiarDatos(datos: DatosDeEmpresa, empresaEnUso: EmpresaId): void {
    if (!datos.activa && this.id.esIgualA(empresaEnUso)) throw new NoSePuedeDesactivarLaEmpresaEnUso();
    this.propiedades = { ...this.propiedades, ...datos, nombre: nombreValido(datos.nombre) };
  }

  get cuentaId(): CuentaId {
    return this.propiedades.cuentaId;
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeEmpresa> {
    return { ...this.propiedades };
  }
}
