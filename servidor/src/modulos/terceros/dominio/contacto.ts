import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador, type CuentaId } from '../../core/compartido/dominio/identificador.js';
import type { Correo } from '../../core/compartido/dominio/objetos-valor/correo.js';
import type { Telefono } from '../../core/compartido/dominio/objetos-valor/telefono.js';
import { nombreObligatorio } from './errores.js';
import type { TerceroId } from './tercero.js';

export type ContactoId = Identificador<'Contacto'>;

export interface DatosDeContacto {
  nombre: string;
  cargo: string | null;
  telefono: Telefono | null;
  whatsapp: Telefono | null;
  correo: Correo | null;
  notas: string | null;
}

export interface PropiedadesDeContacto extends DatosDeContacto {
  id: ContactoId;
  terceroId: TerceroId;
  cuentaId: CuentaId;
}

const MENSAJE_SI_FALTA_EL_NOMBRE = 'Escriba el nombre del contacto.';

/** Persona con quien se habla dentro de un tercero, por ejemplo el encargado de compras del acopiador. */
export class Contacto extends Entidad<ContactoId> {
  private constructor(private propiedades: PropiedadesDeContacto) {
    super(propiedades.id);
  }

  static agregar(de: { terceroId: TerceroId; cuentaId: CuentaId }, datos: DatosDeContacto): Contacto {
    const nombre = nombreObligatorio(datos.nombre, MENSAJE_SI_FALTA_EL_NOMBRE);
    return new Contacto({ ...datos, ...de, nombre, id: Identificador.nuevo() });
  }

  static reconstruir(propiedades: PropiedadesDeContacto): Contacto {
    return new Contacto(propiedades);
  }

  cambiarDatos(datos: DatosDeContacto): void {
    this.propiedades = {
      ...this.propiedades,
      ...datos,
      nombre: nombreObligatorio(datos.nombre, MENSAJE_SI_FALTA_EL_NOMBRE),
    };
  }

  esDe(terceroId: TerceroId): boolean {
    return this.propiedades.terceroId.esIgualA(terceroId);
  }

  instantanea(): Readonly<PropiedadesDeContacto> {
    return { ...this.propiedades };
  }
}
