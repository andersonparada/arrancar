import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador, type CuentaId } from '../../core/compartido/dominio/identificador.js';
import { nombreObligatorio } from './errores.js';

export type CategoriaDeProveedorId = Identificador<'CategoriaDeProveedor'>;

export interface DatosDeCategoria {
  nombre: string;
  activo: boolean;
}

export interface PropiedadesDeCategoria extends DatosDeCategoria {
  id: CategoriaDeProveedorId;
  cuentaId: CuentaId;
}

const MENSAJE_SI_FALTA_EL_NOMBRE = 'Escriba el nombre de la categoría.';

/** Agrupa a los proveedores de la cuenta (insumos, veterinario, transporte…); cada cuenta define las suyas. */
export class CategoriaDeProveedor extends Entidad<CategoriaDeProveedorId> {
  private constructor(private propiedades: PropiedadesDeCategoria) {
    super(propiedades.id);
  }

  static crear(cuentaId: CuentaId, datos: DatosDeCategoria): CategoriaDeProveedor {
    const nombre = nombreObligatorio(datos.nombre, MENSAJE_SI_FALTA_EL_NOMBRE);
    return new CategoriaDeProveedor({ ...datos, nombre, cuentaId, id: Identificador.nuevo() });
  }

  static reconstruir(propiedades: PropiedadesDeCategoria): CategoriaDeProveedor {
    return new CategoriaDeProveedor(propiedades);
  }

  cambiarDatos(datos: DatosDeCategoria): void {
    this.propiedades = {
      ...this.propiedades,
      ...datos,
      nombre: nombreObligatorio(datos.nombre, MENSAJE_SI_FALTA_EL_NOMBRE),
    };
  }

  instantanea(): Readonly<PropiedadesDeCategoria> {
    return { ...this.propiedades };
  }
}
