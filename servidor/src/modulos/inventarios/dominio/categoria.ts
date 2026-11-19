import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';

export type CategoriaId = Identificador<'Categoria'>;

/** Lo que el usuario puede escribir de una categoría. */
export interface DatosDeCategoria {
  nombre: string;
  tipoDeInventarioPorOmision:
    | 'mercaderia'
    | 'materia_prima'
    | 'suministros'
    | 'producto_en_proceso'
    | 'producto_terminado'
    | 'repuestos'
    | 'empaques';
  activo: boolean;
}

export interface PropiedadesDeCategoria extends DatosDeCategoria {
  id: CategoriaId;
  empresaId: Identificador<'Empresa'>;
}

/** Un dato de la categoría no cumple sus reglas. */
export class CategoriaInvalido extends DatoInvalido {
  readonly codigo = 'categoria_invalido';
}

/** Recorta el texto, exige que no quede vacío y que quepa en su largo. */
function textoObligatorio(texto: string, campo: string, maximo: number): string {
  const limpio = texto.trim();
  if (!limpio) throw new CategoriaInvalido(`Escriba "${campo}".`);
  if (limpio.length > maximo) throw new CategoriaInvalido(`"${campo}" no puede pasar de ${maximo} caracteres.`);
  return limpio;
}

/** Los textos obligatorios no pueden quedar vacíos. */
function datosValidos(datos: DatosDeCategoria): DatosDeCategoria {
  return { ...datos, nombre: textoObligatorio(datos.nombre, 'Nombre', 80) };
}

/** Categoría de la empresa. Sus reglas van aquí, en el dominio. */
export class Categoria extends Entidad<CategoriaId> {
  private constructor(private propiedades: PropiedadesDeCategoria) {
    super(propiedades.id);
  }

  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeCategoria): Categoria {
    return new Categoria({ ...datosValidos(datos), empresaId, id: Identificador.nuevo() });
  }

  static reconstruir(propiedades: PropiedadesDeCategoria): Categoria {
    return new Categoria(propiedades);
  }

  cambiarDatos(datos: DatosDeCategoria): void {
    this.propiedades = { ...this.propiedades, ...datosValidos(datos) };
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeCategoria> {
    return { ...this.propiedades };
  }
}
