import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';

export type BancoId = Identificador<'Banco'>;

/** Lo que el usuario puede escribir de un banco. */
export interface DatosDeBanco {
  nombre: string;
  observaciones: string | null;
  activo: boolean;
}

export interface PropiedadesDeBanco extends DatosDeBanco {
  id: BancoId;
  empresaId: Identificador<'Empresa'>;
}

/** Un dato del banco no cumple sus reglas. */
export class BancoInvalido extends DatoInvalido {
  readonly codigo = 'banco_invalido';
}

/** Recorta el texto y exige que no quede vacío. */
function textoObligatorio(texto: string, campo: string): string {
  const limpio = texto.trim();
  if (!limpio) throw new BancoInvalido(`Escriba "${campo}".`);
  return limpio;
}

/** Los textos obligatorios no pueden quedar vacíos. */
function datosValidos(datos: DatosDeBanco): DatosDeBanco {
  return { ...datos, nombre: textoObligatorio(datos.nombre, 'Nombre') };
}

/** Banco de la empresa. Sus reglas van aquí, en el dominio. */
export class Banco extends Entidad<BancoId> {
  private constructor(private propiedades: PropiedadesDeBanco) {
    super(propiedades.id);
  }

  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeBanco): Banco {
    return new Banco({ ...datosValidos(datos), empresaId, id: Identificador.nuevo() });
  }

  static reconstruir(propiedades: PropiedadesDeBanco): Banco {
    return new Banco(propiedades);
  }

  cambiarDatos(datos: DatosDeBanco): void {
    this.propiedades = { ...this.propiedades, ...datosValidos(datos) };
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeBanco> {
    return { ...this.propiedades };
  }
}
