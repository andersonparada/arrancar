import type { ArchivoDeFilas, FilaCruda } from '../../../core/intercambio/aplicacion/puertos/lector-de-filas.js';
import type { DatosDelDte } from '../../dominio/dte-recibido.js';
import { ArchivoDeLaSatNoReconocido } from '../../dominio/errores-de-bandeja.js';
import type { RechazoDeLote } from '../../dominio/lote-de-dte.js';
import { columnasDesconocidasConMonto } from '../../dominio/montos-en-columnas-desconocidas.js';
import { convertirFila } from './convertidor-de-fila-sat.js';
import {
  CAMPOS_DEL_DTE,
  CAMPOS_OBLIGATORIOS,
  posicionDe,
  type CampoDelDte,
  type MapaDeEncabezados,
} from './mapa-de-encabezados-sat.js';
import { FilaRechazada, type ColumnasDelArchivo, type OpcionesDeConversion } from './tipos-de-conversion.js';

export type OpcionesDeLectura = OpcionesDeConversion & { mapa: MapaDeEncabezados };

/** Una fila del archivo ya convertida, con su número de fila en el archivo. */
export interface FilaDelDte {
  numeroDeFila: number;
  datos: DatosDelDte;
}

export interface ResultadoDeLaLectura {
  /** Los DTE que pueden entrar, uno por autorización. */
  filas: FilaDelDte[];
  rechazos: RechazoDeLote[];
  /** Filas idénticas a otra del mismo archivo: no se cuentan dos veces. */
  repetidasIguales: number;
  avisos: string[];
}

/** Ubica las columnas del mapa en los encabezados del archivo. */
function ubicarColumnas(archivo: ArchivoDeFilas, mapa: MapaDeEncabezados): ColumnasDelArchivo {
  const campos = Object.fromEntries(
    CAMPOS_DEL_DTE.map((campo) => [campo, posicionDe(archivo.encabezados, mapa.campos[campo])]),
  ) as Record<CampoDelDte, number>;
  const faltan = CAMPOS_OBLIGATORIOS.filter((campo) => campos[campo] < 0).map(
    (campo) => mapa.campos[campo][0] as string,
  );
  if (faltan.length > 0) {
    throw new ArchivoDeLaSatNoReconocido(
      faltan,
      archivo.encabezados.filter((titulo) => titulo !== ''),
    );
  }
  const impuestos = Object.entries(mapa.impuestos)
    .map(([nombre, variantes]) => ({ nombre, posicion: posicionDe(archivo.encabezados, variantes) }))
    .filter(({ posicion }) => posicion >= 0);
  return { campos, impuestos, encabezados: archivo.encabezados };
}

/** Lo que identifica al DTE y sus montos: dos filas con la misma autorización deben coincidir en esto. */
const huellaDe = ({ filaOriginal: _filaOriginal, ...datos }: DatosDelDte): string => JSON.stringify(datos);

/** La autorización de la fila rechazada, solo si es legible. */
function autorizacionDe(celdas: readonly string[], columnas: ColumnasDelArchivo): string | null {
  const texto = (celdas[columnas.campos.autorizacionFel] ?? '').trim().toLowerCase();
  return /^[0-9a-f-]{36}$/.test(texto) ? texto : null;
}

/** Va juntando las filas convertidas, los rechazos y las repetidas de un archivo. */
class Acumulador {
  readonly filas: FilaDelDte[] = [];
  readonly rechazos: RechazoDeLote[] = [];
  repetidasIguales = 0;
  ajustes = 0;
  private readonly vistas = new Map<string, string>();

  constructor(
    private readonly columnas: ColumnasDelArchivo,
    private readonly opciones: OpcionesDeConversion,
  ) {}

  agregar(fila: FilaCruda): void {
    try {
      this.convertir(fila);
    } catch (error) {
      if (!(error instanceof FilaRechazada)) throw error;
      const autorizacion = autorizacionDe(fila.celdas, this.columnas);
      this.rechazos.push({ fila: fila.numero, autorizacion, motivo: error.motivo, detalle: error.detalle });
    }
  }

  private convertir(fila: FilaCruda): void {
    const { datos, ivaAjustadoPorRedondeo } = convertirFila(fila.celdas, this.columnas, this.opciones);
    const anterior = this.vistas.get(datos.autorizacionFel);
    if (anterior === huellaDe(datos)) {
      this.repetidasIguales++;
      return;
    }
    if (anterior !== undefined) {
      throw new FilaRechazada('autorizacion_repetida', 'La autorización se repite en el archivo con datos distintos.');
    }
    this.vistas.set(datos.autorizacionFel, huellaDe(datos));
    this.filas.push({ numeroDeFila: fila.numero, datos });
    if (ivaAjustadoPorRedondeo) this.ajustes++;
  }

  /** Los avisos: lo que se supuso, montos en columnas desconocidas e IVA ajustado por redondeo. */
  avisos(noReconocidos: readonly string[]): string[] {
    const avisos: string[] = [];
    if (this.columnas.campos.moneda < 0) avisos.push('El archivo no trae la moneda: se supuso quetzales (GTQ).');
    if (this.columnas.campos.nitReceptor < 0) {
      avisos.push('El archivo no trae el NIT del receptor: se supuso el de la empresa.');
    }
    const conMonto = new Set(
      this.filas.flatMap(({ datos }) => columnasDesconocidasConMonto(datos.filaOriginal, noReconocidos)),
    );
    if (conMonto.size > 0) {
      avisos.push(`Hay montos en columnas que el sistema no conoce (${[...conMonto].join(', ')}): revise esas filas.`);
    }
    if (this.ajustes > 0) {
      avisos.push(
        `En ${this.ajustes} fila(s) se bajó el IVA unos centavos por el redondeo para que cuadre con el total.`,
      );
    }
    return avisos;
  }
}

/**
 * Convierte el archivo de la SAT (ya leído y con su fila de encabezados ubicada) en filas del dominio. Cada fila se
 * convierte o se rechaza con su motivo; ningún rechazo detiene a las demás.
 * @throws ArchivoDeLaSatNoReconocido si faltan columnas obligatorias.
 */
export function leerDteDeLaSat(archivo: ArchivoDeFilas, opciones: OpcionesDeLectura): ResultadoDeLaLectura {
  const acumulado = new Acumulador(ubicarColumnas(archivo, opciones.mapa), opciones);
  archivo.filas.forEach((fila) => acumulado.agregar(fila));
  return {
    filas: acumulado.filas,
    rechazos: acumulado.rechazos,
    repetidasIguales: acumulado.repetidasIguales,
    avisos: acumulado.avisos(archivo.noReconocidos),
  };
}
