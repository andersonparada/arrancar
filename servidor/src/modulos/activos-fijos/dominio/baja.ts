import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { BajaAnulada, BajaInvalida, BajaNoAnulable } from './errores-de-baja.js';
import { datosDeBajaValidos, type ContextoDeBaja } from './reglas-de-baja.js';
import { resultadosDeVenta } from './resultados-de-venta.js';
import type {
  CifrasDeBaja,
  CostoFiscalDeLaVenta,
  DatosDeBaja,
  EstadoDeBaja,
  NumeroDeActa,
  TipoDeActa,
} from './tipos-de-baja.js';
import { TIPOS_DE_ACTA } from './tipos-de-baja.js';

export type BajaId = Identificador<'Baja'>;

/** El acta de la baja: su archivo y quién la firma (V-12). */
export interface ActaDeBaja {
  archivoId: string;
  tipo: TipoDeActa;
}

export interface PropiedadesDeBaja extends DatosDeBaja, NumeroDeActa {
  id: BajaId;
  empresaId: Identificador<'Empresa'>;
  activoId: string;
  cifras: CifrasDeBaja;
  /** Solo en una venta; en las demás causas la pérdida es el valor en libros. */
  resultadoContableCentavos: number | null;
  resultadoFiscalCentavos: number | null;
  /** Solo en una venta: de dónde sale el costo fiscal con el que se calculó el resultado fiscal (AF-9b). */
  costoFiscalDeLaVenta: CostoFiscalDeLaVenta | null;
  acta: ActaDeBaja | null;
  denunciaArchivoId: string | null;
  estado: EstadoDeBaja;
  anuladaEn: Date | null;
  anuladaPor: string | null;
  motivoDeAnulacion: string | null;
}

/** Lo que identifica la baja que se registra: de quién es, el acta y lo congelado del activo. */
export interface EntradaDeBaja extends NumeroDeActa {
  empresaId: Identificador<'Empresa'>;
  activoId: string;
  cifras: CifrasDeBaja;
  /** De dónde sale el costo fiscal de las cifras; solo se guarda si la baja es una venta. */
  costoFiscal: CostoFiscalDeLaVenta;
}

const MOTIVO_MAXIMO = 300;

/**
 * La baja o venta de un activo (diseño §5.12): congela lo que valía al día de la baja y, en una venta, el resultado
 * contable y fiscal. No se borra: se anula y queda como rastro.
 */
export class Baja extends Entidad<BajaId> {
  private constructor(private propiedades: PropiedadesDeBaja) {
    super(propiedades.id);
  }

  /** @throws BajaInvalida, FechaDeBajaAnteriorAlUso o CausaDeBajaNoPermitida si los datos no valen. */
  static registrar(entrada: EntradaDeBaja, datos: DatosDeBaja, contexto: ContextoDeBaja): Baja {
    const validos = datosDeBajaValidos(datos, contexto);
    const { costoFiscal, ...resto } = entrada;
    const resultados = validos.venta ? resultadosDeVenta(validos.venta.precioCentavos, entrada.cifras) : null;
    return new Baja({
      ...resto,
      ...validos,
      id: Identificador.nuevo(),
      resultadoContableCentavos: resultados?.contableCentavos ?? null,
      resultadoFiscalCentavos: resultados?.fiscalCentavos ?? null,
      costoFiscalDeLaVenta: validos.venta ? costoFiscal : null,
      acta: null,
      denunciaArchivoId: null,
      estado: 'vigente',
      anuladaEn: null,
      anuladaPor: null,
      motivoDeAnulacion: null,
    });
  }

  static reconstruir(propiedades: PropiedadesDeBaja): Baja {
    return new Baja(propiedades);
  }

  /** @throws BajaNoAnulable si ya está anulada; BajaInvalida si falta el motivo. */
  anular({ motivo, usuarioId, ahora }: { motivo: string; usuarioId: string; ahora: Date }): void {
    if (this.propiedades.estado === 'anulada') throw new BajaNoAnulable();
    const limpio = motivo.trim();
    if (!limpio) throw new BajaInvalida('Escriba el motivo de la anulación.');
    if (limpio.length > MOTIVO_MAXIMO)
      throw new BajaInvalida(`El motivo no puede pasar de ${MOTIVO_MAXIMO} caracteres.`);
    this.propiedades = {
      ...this.propiedades,
      estado: 'anulada',
      anuladaEn: ahora,
      anuladaPor: usuarioId,
      motivoDeAnulacion: limpio,
    };
  }

  /** @throws BajaAnulada si está anulada; BajaInvalida si el tipo de acta no es válido. */
  ponerActa(acta: ActaDeBaja): void {
    this.exigirVigente();
    if (!TIPOS_DE_ACTA.includes(acta.tipo)) throw new BajaInvalida('El tipo de acta no es válido.');
    this.propiedades = { ...this.propiedades, acta };
  }

  /** @throws BajaAnulada si está anulada. */
  ponerDenuncia(archivoId: string): void {
    this.exigirVigente();
    this.propiedades = { ...this.propiedades, denunciaArchivoId: archivoId };
  }

  instantanea(): Readonly<PropiedadesDeBaja> {
    return { ...this.propiedades };
  }

  private exigirVigente(): void {
    if (this.propiedades.estado === 'anulada') throw new BajaAnulada();
  }
}
