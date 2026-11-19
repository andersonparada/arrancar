import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import type { TipoDeInventario } from './tipos-de-inventario.js';

export type ArticuloId = Identificador<'Articulo'>;

/** Lo que el usuario puede escribir de un artículo. */
export interface DatosDeArticulo {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoriaId: string;
  tipoDeInventario: TipoDeInventario;
  unidadBaseId: string;
  manejaLotes: boolean;
  manejaVencimiento: boolean;
  codigoDeBarras: string | null;
  /** El concepto de gasto de Libro de compras que proponen las salidas a gasto. */
  conceptoDeGastoId: string | null;
  existenciaMinima: string | null;
  pesoKgPorUnidadBase: string | null;
  activo: boolean;
}

export interface PropiedadesDeArticulo extends DatosDeArticulo {
  id: ArticuloId;
  empresaId: Identificador<'Empresa'>;
}

/** Un dato del artículo no cumple sus reglas. */
export class ArticuloInvalido extends DatoInvalido {
  readonly codigo = 'articulo_invalido';
}

const FORMA_DEL_CODIGO = /^[A-Za-z0-9./-]+$/;

/** Recorta el texto, exige que no quede vacío y que quepa en su largo. */
function textoObligatorio(texto: string, campo: string, maximo: number): string {
  const limpio = texto.trim();
  if (!limpio) throw new ArticuloInvalido(`Escriba "${campo}".`);
  if (limpio.length > maximo) throw new ArticuloInvalido(`"${campo}" no puede pasar de ${maximo} caracteres.`);
  return limpio;
}

/** Un texto que puede faltar: si se escribe, cabe en su largo. */
function textoOpcional(texto: string | null, campo: string, maximo: number): string | null {
  return texto && texto.trim() ? textoObligatorio(texto, campo, maximo) : null;
}

function codigoValido(codigo: string): string {
  const limpio = textoObligatorio(codigo, 'Código', 30);
  if (!FORMA_DEL_CODIGO.test(limpio))
    throw new ArticuloInvalido('El código solo lleva letras, números, punto, guion y diagonal.');
  return limpio;
}

/** La existencia mínima no es negativa; el peso por unidad es mayor que cero. */
function cantidadesValidas({ existenciaMinima, pesoKgPorUnidadBase }: DatosDeArticulo): void {
  if (existenciaMinima !== null && Number(existenciaMinima) < 0)
    throw new ArticuloInvalido('La existencia mínima no puede ser negativa.');
  if (pesoKgPorUnidadBase !== null && !(Number(pesoKgPorUnidadBase) > 0))
    throw new ArticuloInvalido('El peso por unidad base debe ser mayor que cero.');
}

function datosValidos(datos: DatosDeArticulo): DatosDeArticulo {
  if (datos.manejaVencimiento && !datos.manejaLotes)
    throw new ArticuloInvalido('Un artículo con vencimiento maneja lotes.');
  cantidadesValidas(datos);
  return {
    ...datos,
    codigo: codigoValido(datos.codigo),
    nombre: textoObligatorio(datos.nombre, 'Nombre', 150),
    descripcion: textoOpcional(datos.descripcion, 'Descripción', 500),
    codigoDeBarras: textoOpcional(datos.codigoDeBarras, 'Código de barras', 60),
  };
}

/** Artículo de la empresa. Sus reglas van aquí, en el dominio. */
export class Articulo extends Entidad<ArticuloId> {
  private constructor(private propiedades: PropiedadesDeArticulo) {
    super(propiedades.id);
  }

  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeArticulo): Articulo {
    return new Articulo({ ...datosValidos(datos), empresaId, id: Identificador.nuevo() });
  }

  static reconstruir(propiedades: PropiedadesDeArticulo): Articulo {
    return new Articulo(propiedades);
  }

  cambiarDatos(datos: DatosDeArticulo): void {
    this.propiedades = { ...this.propiedades, ...datosValidos(datos) };
  }

  get manejaLotes(): boolean {
    return this.propiedades.manejaLotes;
  }

  get manejaVencimiento(): boolean {
    return this.propiedades.manejaVencimiento;
  }

  get unidadBaseId(): string {
    return this.propiedades.unidadBaseId;
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeArticulo> {
    return { ...this.propiedades };
  }
}
