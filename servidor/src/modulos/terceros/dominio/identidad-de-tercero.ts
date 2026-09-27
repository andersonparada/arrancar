import { FaltaElNombre } from './errores.js';

export type TipoDeTercero = 'individual' | 'juridica';

export interface NombresDeTercero {
  nombres: string | null;
  apellidos: string | null;
  razonSocial: string | null;
  nombreComercial: string | null;
}

function limpiar(texto: string | null): string | null {
  return texto?.trim() || null;
}

function tieneNombre(tipo: TipoDeTercero, nombres: NombresDeTercero): boolean {
  return tipo === 'individual' ? !!nombres.nombres : !!(nombres.razonSocial || nombres.nombreComercial);
}

const MENSAJE_SI_FALTA_EL_NOMBRE: Record<TipoDeTercero, string> = {
  individual: 'Escriba los nombres de la persona.',
  juridica: 'Escriba la razón social o el nombre comercial de la empresa.',
};

/**
 * Quién es el tercero: una persona (nombres y apellidos) o una empresa (razón
 * social). Cualquiera puede tener además un nombre comercial.
 */
export class IdentidadDeTercero {
  private constructor(
    readonly tipo: TipoDeTercero,
    readonly nombres: Readonly<NombresDeTercero>,
  ) {}

  static crear(tipo: TipoDeTercero, nombres: NombresDeTercero): IdentidadDeTercero {
    const limpios: NombresDeTercero = {
      nombres: limpiar(nombres.nombres),
      apellidos: limpiar(nombres.apellidos),
      razonSocial: limpiar(nombres.razonSocial),
      nombreComercial: limpiar(nombres.nombreComercial),
    };
    if (!tieneNombre(tipo, limpios)) throw new FaltaElNombre(MENSAJE_SI_FALTA_EL_NOMBRE[tipo]);
    return new IdentidadDeTercero(tipo, limpios);
  }

  /** Con el que se busca y se lista: el nombre comercial si lo tiene; si no, razón social o nombres y apellidos. */
  get nombreParaMostrar(): string {
    const { nombres, apellidos, razonSocial, nombreComercial } = this.nombres;
    if (nombreComercial) return nombreComercial;
    if (this.tipo === 'juridica') return razonSocial ?? '';
    return [nombres, apellidos].filter(Boolean).join(' ');
  }
}
