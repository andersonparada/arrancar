import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { CostoInvalido, CostoNoAnulable } from './errores-de-costo.js';
import type { LineaCapitalizable } from './linea-capitalizable.js';
import type { ClaseDeCosto, EstadoDeCosto, OrigenDeCosto } from './tipos-de-costo.js';

export type CostoId = Identificador<'Costo'>;

/** El costo con el que se guarda. El monto va en centavos enteros: nunca se calcula con decimales. */
export interface PropiedadesDeCosto {
  id: CostoId;
  empresaId: Identificador<'Empresa'>;
  activoId: string;
  origen: OrigenDeCosto;
  claseDeCosto: ClaseDeCosto;
  documentoDeCompraId: string | null;
  lineaDeDocumentoId: string | null;
  /** La mejora o el costo posterior que lo agrupa (activo en uso); nulo si es de la capitalización. */
  mejoraId: string | null;
  /** La división que lo creó (AFI-5); nulo en los demás. */
  divisionId: string | null;
  fecha: string;
  montoCentavos: number;
  aplicaAlLibroFiscal: boolean;
  motivoFueraDelLibroFiscal: string | null;
  noEsEdificacion: boolean;
  documentoDeSoporte: string | null;
  archivoId: string | null;
  descripcion: string | null;
  estado: EstadoDeCosto;
  anuladoEn: Date | null;
  anuladoPor: string | null;
  motivoDeAnulacion: string | null;
}

/** Lo que dice quien registra un costo a mano (E3): su soporte y, si no va al libro fiscal, el porqué (V-8). */
export interface DatosDeCostoManual {
  claseDeCosto: ClaseDeCosto;
  fecha: string;
  montoCentavos: number;
  documentoDeSoporte: string;
  descripcion: string | null;
  aplicaAlLibroFiscal: boolean;
  motivoFueraDelLibroFiscal: string | null;
  noEsEdificacion: boolean;
  /** La mejora o el costo posterior al que pertenece. */
  mejoraId?: string | null;
}

const MOTIVO_MAXIMO = 300;
const SOPORTE_MAXIMO = 150;

function textoLimitado(valor: string | null, etiqueta: string, maximo: number): string | null {
  const limpio = valor?.trim() ?? '';
  if (limpio.length > maximo) throw new CostoInvalido(`"${etiqueta}" no puede pasar de ${maximo} caracteres.`);
  return limpio || null;
}

/** El costo que sale fuera del libro fiscal lleva su motivo; el que va, no (V-8). */
function datosFiscalesValidos({ aplicaAlLibroFiscal, motivoFueraDelLibroFiscal }: DatosDeCostoManual) {
  const motivo = textoLimitado(motivoFueraDelLibroFiscal, 'Motivo', MOTIVO_MAXIMO);
  if (!aplicaAlLibroFiscal && !motivo)
    throw new CostoInvalido('Escriba por qué el costo queda fuera del libro fiscal.');
  return { aplicaAlLibroFiscal, motivoFueraDelLibroFiscal: aplicaAlLibroFiscal ? null : motivo };
}

const PROPIEDADES_INICIALES = {
  mejoraId: null,
  divisionId: null,
  noEsEdificacion: false,
  documentoDeSoporte: null,
  archivoId: null,
  descripcion: null,
  estado: 'vigente',
  anuladoEn: null,
  anuladoPor: null,
  motivoDeAnulacion: null,
} as const;

/** Un costo capitalizado a un activo: de una línea del libro o escrito a mano con su soporte. */
export class Costo extends Entidad<CostoId> {
  private constructor(private propiedades: PropiedadesDeCosto) {
    super(propiedades.id);
  }

  /** El costo de una parte de una línea del libro (siempre va al libro fiscal). */
  static deLinea(entrada: {
    empresaId: Identificador<'Empresa'>;
    activoId: string;
    linea: LineaCapitalizable;
    claseDeCosto: ClaseDeCosto;
    montoCentavos: number;
    noEsEdificacion: boolean;
    mejoraId?: string;
  }): Costo {
    const { linea, ...resto } = entrada;
    return new Costo({
      ...PROPIEDADES_INICIALES,
      ...resto,
      id: Identificador.nuevo(),
      origen: 'linea_de_compra',
      documentoDeCompraId: linea.documentoId,
      lineaDeDocumentoId: linea.lineaId,
      fecha: linea.fechaEmision,
      aplicaAlLibroFiscal: true,
      motivoFueraDelLibroFiscal: null,
    });
  }

  /**
   * Un costo sin línea del libro: DUCA, planilla de construcción, aporte, donación. Siempre suma.
   * @throws CostoInvalido si falta el soporte, el motivo de quedar fuera del libro fiscal o algo pasa de su largo.
   */
  static manual(empresaId: Identificador<'Empresa'>, activoId: string, datos: DatosDeCostoManual): Costo {
    const soporte = textoLimitado(datos.documentoDeSoporte, 'Documento de soporte', SOPORTE_MAXIMO);
    if (!soporte) throw new CostoInvalido('Escriba el documento de soporte del costo (DUCA, planilla, acta…).');
    if (!Number.isInteger(datos.montoCentavos) || datos.montoCentavos <= 0)
      throw new CostoInvalido('El monto de un costo manual es mayor que cero.');
    return new Costo({
      ...PROPIEDADES_INICIALES,
      ...datosFiscalesValidos(datos),
      id: Identificador.nuevo(),
      empresaId,
      activoId,
      origen: 'manual',
      claseDeCosto: datos.claseDeCosto,
      documentoDeCompraId: null,
      lineaDeDocumentoId: null,
      fecha: datos.fecha,
      montoCentavos: datos.montoCentavos,
      noEsEdificacion: datos.noEsEdificacion,
      mejoraId: datos.mejoraId ?? null,
      documentoDeSoporte: soporte,
      descripcion: textoLimitado(datos.descripcion, 'Descripción', MOTIVO_MAXIMO),
    });
  }

  /** El costo de un activo de saldo inicial: lo que costó, fechado el día de corte. Siempre suma. */
  static deSaldoInicial(entrada: {
    empresaId: Identificador<'Empresa'>;
    activoId: string;
    fecha: string;
    montoCentavos: number;
  }): Costo {
    return new Costo({
      ...PROPIEDADES_INICIALES,
      ...entrada,
      id: Identificador.nuevo(),
      origen: 'saldo_inicial',
      claseDeCosto: 'adquisicion',
      documentoDeCompraId: null,
      lineaDeDocumentoId: null,
      aplicaAlLibroFiscal: true,
      motivoFueraDelLibroFiscal: null,
      descripcion: 'Saldo inicial',
    });
  }

  static reconstruir(propiedades: PropiedadesDeCosto): Costo {
    return new Costo(propiedades);
  }

  /** Corrige el monto y la fecha del costo de un saldo inicial (con la carga abierta y sin cierres). */
  corregirSaldoInicial({ montoCentavos, fecha }: { montoCentavos: number; fecha: string }): void {
    if (this.propiedades.origen !== 'saldo_inicial')
      throw new CostoInvalido('Solo el costo de un saldo inicial se corrige así.');
    this.propiedades = { ...this.propiedades, montoCentavos, fecha };
  }

  /**
   * Anula el costo con su motivo; la fila se queda como rastro.
   * @throws CostoNoAnulable si ya está anulado, es el saldo inicial o es de una división.
   * @throws CostoInvalido si falta el motivo.
   */
  anular(entrada: { motivo: string; usuarioId: string; ahora: Date }): void {
    this.exigirAnulable();
    this.marcarAnulado(entrada);
  }

  /** Anula el costo de una división: solo lo hace la anulación de la división. */
  anularPorDivision(entrada: { motivo: string; usuarioId: string; ahora: Date }): void {
    if (this.propiedades.origen !== 'division' || this.propiedades.estado === 'anulado')
      throw new CostoNoAnulable('Solo el costo vigente de una división se anula con ella.');
    this.marcarAnulado(entrada);
  }

  private marcarAnulado(entrada: { motivo: string; usuarioId: string; ahora: Date }): void {
    const motivo = textoLimitado(entrada.motivo, 'Motivo', MOTIVO_MAXIMO);
    if (!motivo) throw new CostoInvalido('Escriba el motivo de la anulación.');
    const anulado = { estado: 'anulado', anuladoEn: entrada.ahora, anuladoPor: entrada.usuarioId } as const;
    this.propiedades = { ...this.propiedades, ...anulado, motivoDeAnulacion: motivo };
  }

  /** @throws CostoNoAnulable si ya está anulado, es el saldo inicial o es de una división. */
  exigirAnulable(): void {
    if (this.propiedades.estado === 'anulado') throw new CostoNoAnulable('El costo ya está anulado.');
    const { origen } = this.propiedades;
    if (origen === 'saldo_inicial')
      throw new CostoNoAnulable('El costo del saldo inicial se corrige en Saldos iniciales.');
    if (origen === 'division') throw new CostoNoAnulable('El costo de una división se deshace anulando la división.');
  }

  instantanea(): Readonly<PropiedadesDeCosto> {
    return { ...this.propiedades };
  }
}
