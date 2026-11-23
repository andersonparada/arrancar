import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import type { RolDeCuenta } from '../../core/contratos/contabilidad.contratos.js';
import type { Cuenta, CuentaId } from './cuenta.js';
import { CuentaInactiva, CuentaNoEsDeDetalle, EnlaceInvalido } from './errores.js';
import { DEFINICIONES_DE_ROLES } from './roles-de-enlace.js';

export type EnlaceId = Identificador<'Enlace'>;

export interface PropiedadesDeEnlace {
  id: EnlaceId;
  empresaId: Identificador<'Empresa'>;
  rol: RolDeCuenta;
  /** El id del registro del otro módulo (o la regla de retención); nulo = rige para todas las llaves del rol. */
  llave: string | null;
  /** El nombre con que se mostró al enlazar, para la pantalla si el registro ya no existe. */
  llaveNombre: string | null;
  cuentaId: CuentaId;
}

/** Lo que se escribe de un enlace: el rol, su llave con el nombre que la acompaña y la cuenta. */
export interface DatosDeEnlace {
  rol: RolDeCuenta;
  llave: { id: string; nombre: string } | null;
  cuenta: Cuenta;
}

/** Qué cuenta contable cumple un rol de sistema (con su llave, si el rol la lleva) en una empresa. */
export class Enlace extends Entidad<EnlaceId> {
  private constructor(private propiedades: PropiedadesDeEnlace) {
    super(propiedades.id);
  }

  /** @throws EnlaceInvalido, CuentaNoEsDeDetalle o CuentaInactiva si no cumple las reglas. */
  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeEnlace): Enlace {
    Enlace.exigirCoherente(datos);
    return new Enlace({ ...Enlace.propiedadesDe(datos), id: Identificador.nuevo(), empresaId });
  }

  static reconstruir(propiedades: PropiedadesDeEnlace): Enlace {
    return new Enlace(propiedades);
  }

  /** Cambia la cuenta del enlace (y el nombre de la llave); el rol y la llave no cambian. */
  cambiarCuenta(datos: DatosDeEnlace): void {
    Enlace.exigirCoherente(datos);
    const { llaveNombre, cuentaId } = Enlace.propiedadesDe(datos);
    this.propiedades = { ...this.propiedades, llaveNombre, cuentaId };
  }

  get rol(): RolDeCuenta {
    return this.propiedades.rol;
  }

  get cuentaId(): CuentaId {
    return this.propiedades.cuentaId;
  }

  instantanea(): Readonly<PropiedadesDeEnlace> {
    return { ...this.propiedades };
  }

  private static propiedadesDe({ rol, llave, cuenta }: DatosDeEnlace) {
    return { rol, llave: llave?.id ?? null, llaveNombre: llave?.nombre ?? null, cuentaId: cuenta.id };
  }

  private static exigirCoherente({ rol, llave, cuenta }: DatosDeEnlace): void {
    const definicion = DEFINICIONES_DE_ROLES[rol];
    if (llave && !definicion.admiteLlave) throw new EnlaceInvalido(`El rol «${definicion.nombre}» no lleva llave.`);
    if (llave && !llave.id.trim()) throw new EnlaceInvalido('La llave del enlace no puede quedar vacía.');
    if (!cuenta.esDeDetalle) throw new CuentaNoEsDeDetalle('Solo una cuenta de detalle se enlaza a un rol.');
    if (!cuenta.activo) throw new CuentaInactiva();
  }
}
