import type { Identificador } from '../../core/compartido/dominio/identificador.js';
import { InicioInvalido } from './errores.js';
import { MascaraDeCuentas } from './mascara-de-cuentas.js';

export const CASOS_DE_INICIO = ['desde_la_carga', 'posterior'] as const;
export type CasoDeInicio = (typeof CASOS_DE_INICIO)[number];

/** Quienes firman los estados financieros y el Libro de Inventarios (C. Com. art. 374). */
export interface FirmantesDelInicio {
  firmaRepresentante: string | null;
  firmaContador: string | null;
  registroDelContador: string | null;
}

/** Lo que el usuario escribe del inicio de la contabilidad. */
export interface DatosDeInicio extends FirmantesDelInicio {
  /** `AAAA-MM-DD`. */
  fecha: string;
  caso: CasoDeInicio;
  mascara: string;
  plantilla: string | null;
}

export interface PropiedadesDeInicio extends DatosDeInicio {
  empresaId: Identificador<'Empresa'>;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function textoOpcional(texto: string | null, campo: string, maximo: number): string | null {
  const limpio = texto?.trim();
  if (!limpio) return null;
  if (limpio.length > maximo) throw new InicioInvalido(`"${campo}" admite hasta ${maximo} caracteres.`);
  return limpio;
}

/** El contador se escribe con su registro, o ninguno de los dos. */
function firmantesValidos(datos: FirmantesDelInicio): FirmantesDelInicio {
  const firmaContador = textoOpcional(datos.firmaContador, 'Contador', 150);
  const registroDelContador = textoOpcional(datos.registroDelContador, 'Registro del contador', 30);
  if ((firmaContador === null) !== (registroDelContador === null))
    throw new InicioInvalido('Escriba el nombre del contador y su número de registro, o ninguno de los dos.');
  return {
    firmaRepresentante: textoOpcional(datos.firmaRepresentante, 'Representante', 150),
    firmaContador,
    registroDelContador,
  };
}

function datosValidos(datos: DatosDeInicio): DatosDeInicio {
  if (!FECHA.test(datos.fecha)) throw new InicioInvalido('La fecha de inicio es inválida.');
  return {
    ...datos,
    ...firmantesValidos(datos),
    mascara: MascaraDeCuentas.desde(datos.mascara).texto,
    plantilla: textoOpcional(datos.plantilla, 'Plantilla', 60),
  };
}

/** Desde cuándo lleva contabilidad la empresa y con qué máscara de códigos. Una fila por empresa. */
export class InicioContable {
  private constructor(private propiedades: PropiedadesDeInicio) {}

  /** @throws InicioInvalido o MascaraInvalida si un dato no cumple. */
  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeInicio): InicioContable {
    return new InicioContable({ ...datosValidos(datos), empresaId });
  }

  static reconstruir(propiedades: PropiedadesDeInicio): InicioContable {
    return new InicioContable(propiedades);
  }

  /** @throws InicioInvalido o MascaraInvalida si un dato no cumple. */
  cambiarDatos(datos: DatosDeInicio): void {
    this.propiedades = { ...this.propiedades, ...datosValidos(datos) };
  }

  get mascara(): MascaraDeCuentas {
    return MascaraDeCuentas.desde(this.propiedades.mascara);
  }

  get fecha(): string {
    return this.propiedades.fecha;
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeInicio> {
    return { ...this.propiedades };
  }
}
