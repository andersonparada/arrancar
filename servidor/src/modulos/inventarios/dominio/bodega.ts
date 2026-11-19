import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';

export type BodegaId = Identificador<'Bodega'>;

/** Lo que el usuario puede escribir de una bodega. */
export interface DatosDeBodega {
  codigo: string;
  nombre: string;
  /** Nulo: la bodega es de toda la empresa. */
  localidadId: string | null;
  responsable: string | null;
  /** Si es usuario de la empresa, recibe acceso a la bodega al guardarla. */
  responsableUsuarioId: string | null;
  activo: boolean;
}

export interface PropiedadesDeBodega extends DatosDeBodega {
  id: BodegaId;
  empresaId: Identificador<'Empresa'>;
}

/** Un dato de la bodega no cumple sus reglas. */
export class BodegaInvalido extends DatoInvalido {
  readonly codigo = 'bodega_invalido';
}

const FORMA_DEL_CODIGO = /^[A-Z0-9-]{1,12}$/;

/** Recorta el texto y exige que no quede vacío. */
function textoObligatorio(texto: string, campo: string): string {
  const limpio = texto.trim();
  if (!limpio) throw new BodegaInvalido(`Escriba "${campo}".`);
  return limpio;
}

/** El código va en mayúsculas, con letras, números y guiones (hasta 12). */
function codigoValido(texto: string): string {
  const codigo = textoObligatorio(texto, 'Código').toUpperCase();
  if (!FORMA_DEL_CODIGO.test(codigo)) throw new BodegaInvalido('El código lleva de 1 a 12 letras, números o guiones.');
  return codigo;
}

/** Normaliza y valida lo que escribe el usuario. */
function datosValidos(datos: DatosDeBodega): DatosDeBodega {
  return {
    ...datos,
    codigo: codigoValido(datos.codigo),
    nombre: textoObligatorio(datos.nombre, 'Nombre'),
    responsable: datos.responsable?.trim() || null,
  };
}

/** Bodega de la empresa. Sus reglas van aquí, en el dominio. */
export class Bodega extends Entidad<BodegaId> {
  private constructor(private propiedades: PropiedadesDeBodega) {
    super(propiedades.id);
  }

  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeBodega): Bodega {
    return new Bodega({ ...datosValidos(datos), empresaId, id: Identificador.nuevo() });
  }

  static reconstruir(propiedades: PropiedadesDeBodega): Bodega {
    return new Bodega(propiedades);
  }

  cambiarDatos(datos: DatosDeBodega): void {
    this.propiedades = { ...this.propiedades, ...datosValidos(datos) };
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeBodega> {
    return { ...this.propiedades };
  }
}
