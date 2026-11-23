import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';

export type TipoDeParcelaId = Identificador<'TipoDeParcela'>;

/** Lo que el usuario puede escribir de un tipo de parcela. */
export interface DatosDeTipoDeParcela {
  nombre: string;
  activo: boolean;
}

export interface PropiedadesDeTipoDeParcela extends DatosDeTipoDeParcela {
  id: TipoDeParcelaId;
  empresaId: Identificador<'Empresa'>;
}

/** Un dato del tipo de parcela no cumple sus reglas. */
export class TipoDeParcelaInvalido extends DatoInvalido {
  readonly codigo = 'tipo_de_parcela_invalido';
}

/** Recorta el texto y exige que no quede vacío. */
function textoObligatorio(texto: string, campo: string): string {
  const limpio = texto.trim();
  if (!limpio) throw new TipoDeParcelaInvalido(`Escriba "${campo}".`);
  return limpio;
}

/** Los textos obligatorios no pueden quedar vacíos. */
function datosValidos(datos: DatosDeTipoDeParcela): DatosDeTipoDeParcela {
  return { ...datos, nombre: textoObligatorio(datos.nombre, 'Nombre') };
}

/** Tipo de parcela de la empresa. Sus reglas van aquí, en el dominio. */
export class TipoDeParcela extends Entidad<TipoDeParcelaId> {
  private constructor(private propiedades: PropiedadesDeTipoDeParcela) {
    super(propiedades.id);
  }

  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeTipoDeParcela): TipoDeParcela {
    return new TipoDeParcela({ ...datosValidos(datos), empresaId, id: Identificador.nuevo() });
  }

  static reconstruir(propiedades: PropiedadesDeTipoDeParcela): TipoDeParcela {
    return new TipoDeParcela(propiedades);
  }

  cambiarDatos(datos: DatosDeTipoDeParcela): void {
    this.propiedades = { ...this.propiedades, ...datosValidos(datos) };
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeTipoDeParcela> {
    return { ...this.propiedades };
  }
}
