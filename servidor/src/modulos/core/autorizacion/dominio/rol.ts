import { RaizAgregado } from '../../compartido/dominio/entidad.js';
import { Identificador, type CuentaId } from '../../compartido/dominio/identificador.js';
import { NombreDeRolInvalido, RolAsignadoAUsuarios, SeNecesitaUnRolConAccesoTotal } from './errores.js';

export type RolId = Identificador<'Rol'>;

const LARGO_MAXIMO_DEL_NOMBRE = 60;

/** Lo que la cuenta decide de un rol. */
export interface DatosDeRol {
  nombre: string;
  descripcion: string | null;
  /** Recibe todos los permisos, incluidos los de módulos que se activen más adelante. */
  accesoTotal: boolean;
  permisos: readonly string[];
}

export interface PropiedadesDeRol extends DatosDeRol {
  id: RolId;
  cuentaId: CuentaId;
}

/** Cuántos usuarios tienen el rol y cuántos roles de la cuenta tienen acceso total. */
export interface UsoDelRol {
  usuariosAsignados: number;
  rolesConAccesoTotal: number;
}

function datosValidos(datos: DatosDeRol): DatosDeRol {
  const nombre = datos.nombre.trim();
  if (!nombre || nombre.length > LARGO_MAXIMO_DEL_NOMBRE) throw new NombreDeRolInvalido(datos.nombre);
  const permisos = datos.accesoTotal ? [] : [...new Set(datos.permisos)];
  return { ...datos, nombre, permisos };
}

/** Conjunto de permisos que la cuenta asigna a sus usuarios en cada empresa. */
export class Rol extends RaizAgregado<RolId> {
  private constructor(private propiedades: PropiedadesDeRol) {
    super(propiedades.id);
  }

  static crear(cuentaId: CuentaId, datos: DatosDeRol): Rol {
    return new Rol({ ...datosValidos(datos), id: Identificador.nuevo(), cuentaId });
  }

  /** El primer rol de toda cuenta nueva: el de su dueño. */
  static propietario(cuentaId: CuentaId): Rol {
    return Rol.crear(cuentaId, {
      nombre: 'Propietario',
      descripcion: 'Acceso total a la cuenta.',
      accesoTotal: true,
      permisos: [],
    });
  }

  static reconstruir(propiedades: PropiedadesDeRol): Rol {
    return new Rol(propiedades);
  }

  /** @throws SeNecesitaUnRolConAccesoTotal si se le quita el acceso total al último que lo tiene. */
  cambiar(datos: DatosDeRol, uso: UsoDelRol): void {
    if (!datos.accesoTotal) this.exigirQueNoSeaElUltimoConAccesoTotal(uso);
    this.propiedades = { ...this.propiedades, ...datosValidos(datos) };
  }

  /**
   * @throws RolAsignadoAUsuarios si algún usuario lo tiene.
   * @throws SeNecesitaUnRolConAccesoTotal si es el último con acceso total.
   */
  exigirQueSePuedaEliminar(uso: UsoDelRol): void {
    if (uso.usuariosAsignados > 0) throw new RolAsignadoAUsuarios();
    this.exigirQueNoSeaElUltimoConAccesoTotal(uso);
  }

  get cuentaId(): CuentaId {
    return this.propiedades.cuentaId;
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeRol> {
    return { ...this.propiedades };
  }

  private exigirQueNoSeaElUltimoConAccesoTotal({ rolesConAccesoTotal }: UsoDelRol): void {
    if (this.propiedades.accesoTotal && rolesConAccesoTotal === 1) throw new SeNecesitaUnRolConAccesoTotal();
  }
}
