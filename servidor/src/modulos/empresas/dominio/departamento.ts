import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';

export type DepartamentoId = Identificador<'Departamento'>;

/** Lo que el usuario puede escribir de un departamento. */
export interface DatosDeDepartamento {
  codigo: string;
  nombre: string;
  localidadId: string | null;
  activo: boolean;
}

export interface PropiedadesDeDepartamento extends DatosDeDepartamento {
  id: DepartamentoId;
  empresaId: Identificador<'Empresa'>;
}

/** Un dato del departamento no cumple sus reglas. */
export class DepartamentoInvalido extends DatoInvalido {
  readonly codigo = 'departamento_invalido';
}

/** Recorta el texto y exige que no quede vacío. */
function textoObligatorio(texto: string, campo: string): string {
  const limpio = texto.trim();
  if (!limpio) throw new DepartamentoInvalido(`Escriba "${campo}".`);
  return limpio;
}

const FORMA_DEL_CODIGO = /^[A-Z0-9-]{1,12}$/;

/** El código interno va en mayúsculas, con letras, números y guiones (hasta 12). */
function codigoValido(texto: string): string {
  const codigo = textoObligatorio(texto, 'Código interno').toUpperCase();
  if (!FORMA_DEL_CODIGO.test(codigo))
    throw new DepartamentoInvalido('El código interno lleva de 1 a 12 letras, números o guiones.');
  return codigo;
}

/** Normaliza y valida lo que escribe el usuario. */
function datosValidos(datos: DatosDeDepartamento): DatosDeDepartamento {
  return {
    ...datos,
    codigo: codigoValido(datos.codigo),
    nombre: textoObligatorio(datos.nombre, 'Nombre'),
  };
}

/** Departamento de la empresa. Sus reglas van aquí, en el dominio. */
export class Departamento extends Entidad<DepartamentoId> {
  private constructor(private propiedades: PropiedadesDeDepartamento) {
    super(propiedades.id);
  }

  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeDepartamento): Departamento {
    return new Departamento({ ...datosValidos(datos), empresaId, id: Identificador.nuevo() });
  }

  static reconstruir(propiedades: PropiedadesDeDepartamento): Departamento {
    return new Departamento(propiedades);
  }

  cambiarDatos(datos: DatosDeDepartamento): void {
    this.propiedades = { ...this.propiedades, ...datosValidos(datos) };
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeDepartamento> {
    return { ...this.propiedades };
  }
}
