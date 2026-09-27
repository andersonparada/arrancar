import { RaizAgregado } from '../../compartido/dominio/entidad.js';
import { Identificador } from '../../compartido/dominio/identificador.js';
import type { Correo } from '../../compartido/dominio/objetos-valor/correo.js';
import { NoPuedeCambiarseASiMismo, UsuarioDeVariasCuentas } from './errores.js';
import type { NombreDeUsuario } from './nombre-de-usuario.js';

export type UsuarioId = Identificador<'Usuario'>;

export interface DatosPersonales {
  nombres: string;
  apellidos: string;
  correo: Correo | null;
}

export interface PropiedadesDeUsuario extends DatosPersonales {
  id: UsuarioId;
  nombreDeUsuario: NombreDeUsuario;
  hashContrasena: string;
  /** Soporte de Arrancar: entra a cualquier empresa y no pertenece a ninguna cuenta. */
  esSuperacceso: boolean;
  activo: boolean;
}

/** Qué relación tiene el usuario con quien lo administra. */
export interface Pertenencia {
  esElMismo: boolean;
  /** No trabaja para otras cuentas, así que esta cuenta controla todos sus datos. */
  soloEnEstaCuenta: boolean;
}

export type CambiosDeUsuario = Partial<DatosPersonales & { activo: boolean }>;

/** Persona que inicia sesión; puede trabajar en empresas de varias cuentas. */
export class Usuario extends RaizAgregado<UsuarioId> {
  private constructor(private propiedades: PropiedadesDeUsuario) {
    super(propiedades.id);
  }

  static registrar(datos: Omit<PropiedadesDeUsuario, 'id' | 'activo' | 'esSuperacceso'>): Usuario {
    return new Usuario({ ...datos, id: Identificador.nuevo(), activo: true, esSuperacceso: false });
  }

  static registrarSoporte(datos: Omit<PropiedadesDeUsuario, 'id' | 'activo' | 'esSuperacceso'>): Usuario {
    return new Usuario({ ...datos, id: Identificador.nuevo(), activo: true, esSuperacceso: true });
  }

  static reconstruir(propiedades: PropiedadesDeUsuario): Usuario {
    return new Usuario(propiedades);
  }

  /**
   * @throws NoPuedeCambiarseASiMismo si quien administra intenta desactivarse.
   * @throws UsuarioDeVariasCuentas si trabaja para otra cuenta.
   */
  cambiar(cambios: CambiosDeUsuario, pertenencia: Pertenencia): void {
    if (pertenencia.esElMismo && cambios.activo === false) throw new NoPuedeCambiarseASiMismo();
    const hayCambios = Object.values(cambios).some((valor) => valor !== undefined);
    if (hayCambios && !pertenencia.soloEnEstaCuenta) {
      throw new UsuarioDeVariasCuentas('Este usuario también pertenece a otra cuenta; solo puede cambiar sus accesos.');
    }
    const definidos = Object.fromEntries(Object.entries(cambios).filter(([, valor]) => valor !== undefined));
    this.propiedades = { ...this.propiedades, ...definidos };
  }

  /** @throws NoPuedeCambiarseASiMismo si quien administra intenta cambiar sus propios accesos. */
  exigirQueSePuedanCambiarSusAccesos(pertenencia: Pertenencia): void {
    if (pertenencia.esElMismo) throw new NoPuedeCambiarseASiMismo();
  }

  /** @throws UsuarioDeVariasCuentas si trabaja para otra cuenta y no es él quien la cambia. */
  cambiarContrasena(hashContrasena: string, pertenencia: Pertenencia): void {
    if (!pertenencia.soloEnEstaCuenta && !pertenencia.esElMismo) {
      throw new UsuarioDeVariasCuentas('Este usuario también pertenece a otra cuenta; debe cambiarla él mismo.');
    }
    this.propiedades = { ...this.propiedades, hashContrasena };
  }

  get esSuperacceso(): boolean {
    return this.propiedades.esSuperacceso;
  }

  get activo(): boolean {
    return this.propiedades.activo;
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeUsuario> {
    return { ...this.propiedades };
  }
}
