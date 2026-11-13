import type { Operador } from '../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../compartido/aplicacion/unidad-de-trabajo.js';
import { ErrorEsperado } from '../../compartido/dominio/errores.js';
import { escribirCelda } from './celdas.js';
import type { Columna } from './columnas.js';
import {
  campoDelError,
  type AvisoDeFila,
  type AvisoDeImportacion,
  type ResultadoDeImportacion,
} from './resultado-de-importacion.js';
import { ArchivoSinFilas, DemasiadasFilas } from './errores.js';
import { instruccionesDe } from './instrucciones.js';
import {
  consultarOpciones,
  erroresDelEsquema,
  leerFila,
  ubicarColumnas,
  type ColumnasUbicadas,
  type ErrorDeImportacion,
  type Validador,
} from './lectura-de-filas.js';
import type { FilaLeida, HojaLeida, LibroDeExcel } from './puertos/libro-de-excel.js';

export type { AvisoDeFila, AvisoDeImportacion, ResultadoDeImportacion };

/** Filas por archivo: más, y conviene partirlo. */
export const MAXIMO_DE_FILAS = 5000;

/** Lo que aporta cada recurso: sus columnas y cómo se validan, se listan y se crean sus registros.
 * `Filtro` es lo que puede acotar `listar` al exportar (por ejemplo, cuenta y fechas de un reporte); sin él, exporta todo. */
export interface DatosDelRecurso<Registro, Solicitud, Filtro = void> {
  /** El nombre de la hoja: `Animales`. */
  nombre: string;
  columnas: Columna[];
  validar: Validador<Solicitud>;
  listar: (operador: Operador, filtro?: Filtro) => Promise<Registro[]>;
  crear: (operador: Operador, solicitud: Solicitud) => Promise<unknown>;
  /**
   * Los registros importados (y los del ensayo) no se asignan a quien importa: para los recursos con
   * alcance por registro, que se reparten luego desde su ventana de accesos.
   */
  sinAsignarAlCrear?: boolean;
  /**
   * Opcional: algo que decir de una fila creada (en el ensayo y al importar), como el vencimiento que el sistema
   * propuso. Sale en `avisos` del resultado, sin impedir importar.
   */
  avisarDeFila?: (solicitud: Solicitud, creado: unknown) => AvisoDeFila | null;
  /** Avisos al final de la hoja de instrucciones, uno por fila, para lo que las columnas no explican. */
  notasDeInstrucciones?: string[];
}

/** Lo que pone el core, igual para todos los recursos. */
export interface Dependencias<Registro, Solicitud, Filtro = void> extends DatosDelRecurso<Registro, Solicitud, Filtro> {
  libro: LibroDeExcel;
  unidadDeTrabajo: UnidadDeTrabajo;
  /** Reconoce los errores de la base de datos que son esperados (un dato repetido). */
  interpretarError: (error: unknown) => ErrorEsperado | null;
}

/** Un ensayo (o una carga con problemas) crea todo y lo deshace: así revisa también lo que solo la base de datos sabe. */
class ImportacionTerminada extends Error {
  constructor(readonly resultado: ResultadoDeImportacion) {
    super('Importación terminada sin guardar');
  }
}

interface FilaLista<Solicitud> {
  numero: number;
  solicitud: Solicitud;
}

type FilaPreparada<Solicitud> = { lista: FilaLista<Solicitud> } | { errores: ErrorDeImportacion[] };

interface FilasPreparadas<Solicitud> {
  listas: FilaLista<Solicitud>[];
  errores: ErrorDeImportacion[];
}

/**
 * Exportar e importar un recurso en Excel, con sus columnas. Importar es todo
 * o nada: si una fila tiene problemas no se guarda ninguna, y se informan todos.
 */
export class IntercambioDeRecurso<Registro, Solicitud, Filtro = void> {
  constructor(private readonly dependencias: Dependencias<Registro, Solicitud, Filtro>) {}

  async exportar(operador: Operador, filtro?: Filtro): Promise<Buffer> {
    const { columnas, listar } = this.dependencias;
    const registros = await listar(operador, filtro);
    const filas = registros.map((registro) =>
      columnas.map((columna) => escribirCelda(registro as Record<string, unknown>, columna)),
    );
    return this.escribir(filas);
  }

  plantilla(): Promise<Buffer> {
    return this.escribir([]);
  }

  /** Con `ensayo` revisa todo y no guarda nada. */
  async importar(operadorDeLaSolicitud: Operador, { contenido, ensayo }: { contenido: Buffer; ensayo: boolean }) {
    const operador = this.dependencias.sinAsignarAlCrear
      ? { ...operadorDeLaSolicitud, sinAsignarAlCrear: true }
      : operadorDeLaSolicitud;
    const hoja = await this.dependencias.libro.leer(contenido);
    if (hoja.filas.length === 0) throw new ArchivoSinFilas();
    if (hoja.filas.length > MAXIMO_DE_FILAS) throw new DemasiadasFilas(MAXIMO_DE_FILAS);
    try {
      return await this.dependencias.unidadDeTrabajo.ejecutar(operador, () =>
        this.importarEnTransaccion(operador, hoja, ensayo),
      );
    } catch (error) {
      if (error instanceof ImportacionTerminada) return error.resultado;
      throw error;
    }
  }

  /**
   * Una sola pasada: los problemas de formato de cada fila y, de las filas que se pudieron leer, los de las reglas
   * (cada una en su punto de guardado, para seguir con las demás). Con algún problema, o en ensayo, se deshace todo.
   */
  private async importarEnTransaccion(operador: Operador, hoja: HojaLeida, ensayo: boolean) {
    const { listas, errores } = await this.prepararFilas(hoja);
    const avisos: AvisoDeImportacion[] = [];
    for (const fila of listas) {
      const problema = await this.crearFila(operador, fila, avisos);
      if (problema) errores.push(problema);
    }
    errores.sort((a, b) => a.fila - b.fila);
    const resultado = { filas: hoja.filas.length, guardado: false, errores };
    const conAvisos = avisos.length > 0 ? { ...resultado, avisos } : resultado;
    if (ensayo || errores.length > 0) throw new ImportacionTerminada(conAvisos);
    return { ...conAvisos, guardado: true };
  }

  /** Convierte y valida todas las filas; junta los problemas de todas. */
  private async prepararFilas(hoja: HojaLeida): Promise<FilasPreparadas<Solicitud>> {
    const { columnas } = this.dependencias;
    const { posiciones, faltantes } = ubicarColumnas(columnas, hoja.encabezados);
    if (faltantes.length > 0) {
      return {
        listas: [],
        errores: faltantes.map((c) => ({ fila: 1, columna: c.titulo, mensaje: 'Falta esta columna.' })),
      };
    }
    const ubicadas = { posiciones, opciones: await consultarOpciones(posiciones.keys()) };
    const resultados = hoja.filas.map((fila) => this.prepararFila(fila, ubicadas));
    return {
      listas: resultados.flatMap((resultado) => ('lista' in resultado ? [resultado.lista] : [])),
      errores: resultados.flatMap((resultado) => ('errores' in resultado ? resultado.errores : [])),
    };
  }

  private prepararFila(fila: FilaLeida, ubicadas: ColumnasUbicadas): FilaPreparada<Solicitud> {
    const { datos, errores } = leerFila(fila, ubicadas);
    if (errores.length > 0) return { errores };
    const validacion = this.dependencias.validar(datos);
    if ('errores' in validacion)
      return { errores: erroresDelEsquema(fila.numero, validacion.errores, this.dependencias.columnas) };
    return { lista: { numero: fila.numero, solicitud: validacion.datos } };
  }

  /**
   * Crea la fila en un punto de guardado. Lo que rechacen las reglas o la base de datos se devuelve con el número
   * de la fila y, si se sabe, la columna; el aviso del recurso, si lo hay, se agrega a `avisos`.
   */
  private async crearFila(
    operador: Operador,
    { numero, solicitud }: FilaLista<Solicitud>,
    avisos: AvisoDeImportacion[],
  ): Promise<ErrorDeImportacion | null> {
    try {
      const creado = await this.dependencias.unidadDeTrabajo.aislar(() => this.dependencias.crear(operador, solicitud));
      const aviso = this.dependencias.avisarDeFila?.(solicitud, creado);
      if (aviso) avisos.push({ fila: numero, columna: this.tituloDeColumna(aviso.campo), mensaje: aviso.mensaje });
      return null;
    } catch (error) {
      const esperado = error instanceof ErrorEsperado ? error : this.dependencias.interpretarError(error);
      if (!esperado) throw error;
      return { fila: numero, columna: this.tituloDeColumna(campoDelError(esperado)), mensaje: esperado.message };
    }
  }

  private tituloDeColumna(clave: string | null): string | null {
    return this.dependencias.columnas.find((columna) => columna.clave === clave)?.titulo ?? null;
  }

  private escribir(filas: unknown[][]): Promise<Buffer> {
    const { nombre, columnas, libro } = this.dependencias;
    return libro.escribir({
      nombre,
      encabezados: columnas.map((columna) => columna.titulo),
      filas,
      instrucciones: instruccionesDe(columnas, this.dependencias.notasDeInstrucciones),
    });
  }
}
