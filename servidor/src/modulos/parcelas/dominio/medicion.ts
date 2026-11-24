import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { MedicionYaAnulada, SuperficieUtilMayorQueTotal, UnidadSinVarasDeCuerda } from './errores-de-parcela.js';
import { textoObligatorio, textoOpcional } from './reglas-de-parcela.js';
import { aCentesimasDeM2, centesimasATexto, type FactoresDeSuperficie, type UnidadDeSuperficie } from './superficie.js';

export type MedicionId = Identificador<'Medicion'>;

export const FUENTES_DE_MEDICION = ['escritura', 'plano_topografico', 'gps', 'estimacion', 'otra'] as const;
export type FuenteDeMedicion = (typeof FUENTES_DE_MEDICION)[number];

/** Lo que escribe el usuario: la cifra tal como la leyó (la útil, en la misma unidad que la total). */
export interface DatosDeMedicion {
  vigenteDesde: string;
  fuente: FuenteDeMedicion;
  cantidadOriginal: string;
  unidadOriginal: UnidadDeSuperficie;
  varasPorLadoDeCuerda: number | null;
  cantidadUtil: string | null;
  documento: string | null;
}

export interface PropiedadesDeMedicion {
  id: MedicionId;
  empresaId: Identificador<'Empresa'>;
  parcelaId: string;
  vigenteDesde: string;
  fuente: FuenteDeMedicion;
  superficieTotalM2: string;
  superficieUtilM2: string;
  cantidadOriginal: string;
  unidadOriginal: UnidadDeSuperficie;
  varasPorLadoDeCuerda: number | null;
  documento: string | null;
  archivoId: string | null;
  estado: 'vigente' | 'anulada';
  anuladaEn: Date | null;
  anuladaPor: string | null;
  motivoDeAnulacion: string | null;
}

/** Las varas por lado solo van con la cuerda, y la cuerda las necesita. */
function varasValidas({ unidadOriginal, varasPorLadoDeCuerda }: DatosDeMedicion): number | null {
  const esCuerda = unidadOriginal === 'cuerda';
  if (esCuerda !== (varasPorLadoDeCuerda !== null)) throw new UnidadSinVarasDeCuerda();
  return varasPorLadoDeCuerda;
}

/** De qué empresa y parcela es la medición y con qué factores se convierte. */
export interface ContextoDeMedicion {
  empresaId: Identificador<'Empresa'>;
  parcelaId: string;
  factores: FactoresDeSuperficie;
}

/** La superficie total y la útil en centésimas de m² (si no se conoce la útil, es igual a la total). */
function superficies(datos: DatosDeMedicion, varasPorLadoDeCuerda: number | null, factores: FactoresDeSuperficie) {
  const origen = { unidad: datos.unidadOriginal, varasPorLadoDeCuerda };
  const total = aCentesimasDeM2(datos.cantidadOriginal, origen, factores);
  const util = datos.cantidadUtil === null ? total : aCentesimasDeM2(datos.cantidadUtil, origen, factores);
  if (util > total) throw new SuperficieUtilMayorQueTotal();
  return { total, util };
}

/** Una medición de la superficie de una parcela desde una fecha. Se anula, nunca se borra. */
export class Medicion extends Entidad<MedicionId> {
  private constructor(private propiedades: PropiedadesDeMedicion) {
    super(propiedades.id);
  }

  /**
   * Convierte la cifra original a m² con los factores vigentes y guarda ambas.
   * @throws SuperficieInvalida si una cifra no es válida; UnidadSinVarasDeCuerda; SuperficieUtilMayorQueTotal.
   */
  static registrar(contexto: ContextoDeMedicion, datos: DatosDeMedicion): Medicion {
    const varasPorLadoDeCuerda = varasValidas(datos);
    const { total, util } = superficies(datos, varasPorLadoDeCuerda, contexto.factores);
    return new Medicion({
      id: Identificador.nuevo(),
      empresaId: contexto.empresaId,
      parcelaId: contexto.parcelaId,
      vigenteDesde: datos.vigenteDesde,
      fuente: datos.fuente,
      superficieTotalM2: centesimasATexto(total),
      superficieUtilM2: centesimasATexto(util),
      cantidadOriginal: datos.cantidadOriginal.trim(),
      unidadOriginal: datos.unidadOriginal,
      varasPorLadoDeCuerda,
      documento: textoOpcional(datos.documento, 'Documento', 150),
      archivoId: null,
      estado: 'vigente',
      anuladaEn: null,
      anuladaPor: null,
      motivoDeAnulacion: null,
    });
  }

  static reconstruir(propiedades: PropiedadesDeMedicion): Medicion {
    return new Medicion(propiedades);
  }

  /** @throws MedicionYaAnulada si ya estaba anulada. */
  anular(anulacion: { motivo: string; usuarioId: string; cuando: Date }): void {
    if (this.propiedades.estado === 'anulada') throw new MedicionYaAnulada();
    this.propiedades = {
      ...this.propiedades,
      estado: 'anulada',
      anuladaEn: anulacion.cuando,
      anuladaPor: anulacion.usuarioId,
      motivoDeAnulacion: textoObligatorio(anulacion.motivo, 'Motivo', 300),
    };
  }

  instantanea(): Readonly<PropiedadesDeMedicion> {
    return { ...this.propiedades };
  }
}
