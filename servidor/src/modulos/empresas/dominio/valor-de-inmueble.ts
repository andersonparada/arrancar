import { aCentavos } from '../../core/compartido/dominio/centavos.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { CategoriaDeIusiFueraDeMatricula, ValorDeInmuebleInvalido } from './errores-de-valor-de-inmueble.js';
import type { InmuebleId } from './inmueble.js';
import type { CategoriaDeIusi, FuenteDeValor, OrigenDeValor } from './tipos-de-valor-de-inmueble.js';

export {
  CategoriaDeIusiFueraDeMatricula,
  ValorDeInmuebleInvalido,
  ValorDeInmuebleRepetido,
} from './errores-de-valor-de-inmueble.js';

export type ValorDeInmuebleId = Identificador<'ValorDeInmueble'>;

/** Lo que el usuario escribe al registrar un valor; los montos van como texto con dos decimales. */
export interface DatosDeValorDeInmueble {
  fuente: FuenteDeValor;
  vigenteDesde: string;
  origen: OrigenDeValor;
  valorTerreno: string | null;
  valorConstrucciones: string | null;
  valorCultivosPermanentes: string | null;
  valorTotal: string;
  categoriaIusi: CategoriaDeIusi | null;
  documento: string | null;
}

export interface PropiedadesDeValorDeInmueble extends DatosDeValorDeInmueble {
  id: ValorDeInmuebleId;
  empresaId: Identificador<'Empresa'>;
  inmuebleId: InmuebleId;
}

/** Las partes del valor (las que vengan) no pasan del total y, si vienen las tres, lo igualan. */
function validarLosMontos(datos: DatosDeValorDeInmueble): void {
  const partes = [datos.valorTerreno, datos.valorConstrucciones, datos.valorCultivosPermanentes];
  const centavos = partes.map((parte) => (parte === null ? null : aCentavos(parte)));
  if (centavos.some((parte) => parte !== null && parte < 0))
    throw new ValorDeInmuebleInvalido(
      'Los valores del terreno, las construcciones y los cultivos no pueden ser negativos.',
    );
  const total = aCentavos(datos.valorTotal);
  if (total <= 0) throw new ValorDeInmuebleInvalido('El valor total debe ser mayor que cero.');
  const suma = centavos.reduce<number>((acumulado, parte) => acumulado + (parte ?? 0), 0);
  if (suma > total)
    throw new ValorDeInmuebleInvalido('Terreno, construcciones y cultivos suman más que el valor total.');
  if (centavos.every((parte) => parte !== null) && suma !== total)
    throw new ValorDeInmuebleInvalido(
      'Si escribe el terreno, las construcciones y los cultivos, deben sumar el valor total.',
    );
}

function documentoLimpio(documento: string | null): string | null {
  const limpio = documento?.trim();
  if (!limpio) return null;
  if (limpio.length > 150) throw new ValorDeInmuebleInvalido('El documento admite hasta 150 caracteres.');
  return limpio;
}

function datosValidos(datos: DatosDeValorDeInmueble): DatosDeValorDeInmueble {
  validarLosMontos(datos);
  if (datos.categoriaIusi !== null && datos.fuente !== 'matricula_fiscal') throw new CategoriaDeIusiFueraDeMatricula();
  return { ...datos, documento: documentoLimpio(datos.documento) };
}

/** Valor de un inmueble desde una fecha, según su fuente. Es un histórico: no se edita. */
export class ValorDeInmueble extends Entidad<ValorDeInmuebleId> {
  private constructor(private readonly propiedades: PropiedadesDeValorDeInmueble) {
    super(propiedades.id);
  }

  static crear(
    contexto: { empresaId: Identificador<'Empresa'>; inmuebleId: InmuebleId },
    datos: DatosDeValorDeInmueble,
  ) {
    return new ValorDeInmueble({ ...datosValidos(datos), ...contexto, id: Identificador.nuevo() });
  }

  static reconstruir(propiedades: PropiedadesDeValorDeInmueble): ValorDeInmueble {
    return new ValorDeInmueble(propiedades);
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeValorDeInmueble> {
    return { ...this.propiedades };
  }
}
