import type { EmpresaId } from './empresa.js';
import { NombreComercialInvalido, RazonSocialInvalida } from './errores.js';

const LARGO_MAXIMO = 200;

/** Los textos que el usuario escribe; vacíos o solo con espacios equivalen a «sin dato». */
export interface TextosFiscales {
  razonSocial: string | null;
  nombreComercial: string | null;
}

export interface PropiedadesDeDatosFiscales extends TextosFiscales {
  empresaId: EmpresaId;
}

function limpiar(texto: string | null, invalido: () => Error): string | null {
  const limpio = texto?.trim() ?? '';
  if (limpio.length > LARGO_MAXIMO) throw invalido();
  return limpio || null;
}

/** Razón social y nombre comercial de una empresa (uno por empresa; se crea al guardar por primera vez). */
export class DatosFiscales {
  private constructor(private readonly propiedades: PropiedadesDeDatosFiscales) {}

  /** @throws RazonSocialInvalida | NombreComercialInvalido si un texto pasa de 200 caracteres. */
  static crear(empresaId: EmpresaId, textos: TextosFiscales): DatosFiscales {
    return new DatosFiscales({
      empresaId,
      razonSocial: limpiar(textos.razonSocial, () => new RazonSocialInvalida()),
      nombreComercial: limpiar(textos.nombreComercial, () => new NombreComercialInvalido()),
    });
  }

  static reconstruir(propiedades: PropiedadesDeDatosFiscales): DatosFiscales {
    return new DatosFiscales(propiedades);
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeDatosFiscales> {
    return { ...this.propiedades };
  }
}
