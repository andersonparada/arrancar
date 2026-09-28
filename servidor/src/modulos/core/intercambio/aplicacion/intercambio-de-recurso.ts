import type { Operador } from '../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../compartido/aplicacion/unidad-de-trabajo.js';
import { ErrorEsperado } from '../../compartido/dominio/errores.js';
import { escribirCelda } from './celdas.js';
import type { Columna } from './columnas.js';
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

/** Filas por archivo: más, y conviene partirlo. */
export const MAXIMO_DE_FILAS = 5000;

/** Qué pasó con el archivo: si se guardó, y los problemas por fila (con uno solo no se guarda nada). */
export interface ResultadoDeImportacion {
  filas: number;
  guardado: boolean;
  errores: ErrorDeImportacion[];
}

/** Lo que aporta cada recurso: sus columnas y cómo se validan, se listan y se crean sus registros.
 * `Filtro` es lo que puede acotar `listar` al exportar (por ejemplo, cuenta y fechas de un reporte); sin él, exporta todo. */
export interface DatosDelRecurso<Registro, Solicitud, Filtro = void> {
  /** El nombre de la hoja: `Animales`. */
  nombre: string;
  columnas: Columna[];
  validar: Validador<Solicitud>;
  listar: (operador: Operador, filtro?: Filtro) => Promise<Registro[]>;
  crear: (operador: Operador, solicitud: Solicitud) => Promise<unknown>;
}

/** Lo que pone el core, igual para todos los recursos. */
export interface Dependencias<Registro, Solicitud, Filtro = void> extends DatosDelRecurso<Registro, Solicitud, Filtro> {
  libro: LibroDeExcel;
  unidadDeTrabajo: UnidadDeTrabajo;
  /** Reconoce los errores de la base de datos que son esperados (un dato repetido). */
  interpretarError: (error: unknown) => ErrorEsperado | null;
}

/** Un ensayo crea todo y lo deshace: así revisa también lo que solo la base de datos sabe. */
class EnsayoTerminado extends Error {
  constructor(readonly resultado: ResultadoDeImportacion) {
    super('Ensayo terminado');
  }
}

class FallaEnFila extends Error {
  constructor(readonly error: ErrorDeImportacion) {
    super(error.mensaje);
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
  async importar(operador: Operador, { contenido, ensayo }: { contenido: Buffer; ensayo: boolean }) {
    const hoja = await this.dependencias.libro.leer(contenido);
    if (hoja.filas.length === 0) throw new ArchivoSinFilas();
    if (hoja.filas.length > MAXIMO_DE_FILAS) throw new DemasiadasFilas(MAXIMO_DE_FILAS);
    try {
      return await this.dependencias.unidadDeTrabajo.ejecutar(operador, () =>
        this.importarEnTransaccion(operador, hoja, ensayo),
      );
    } catch (error) {
      if (error instanceof EnsayoTerminado) return error.resultado;
      if (error instanceof FallaEnFila) return { filas: hoja.filas.length, guardado: false, errores: [error.error] };
      throw error;
    }
  }

  private async importarEnTransaccion(operador: Operador, hoja: HojaLeida, ensayo: boolean) {
    const { listas, errores } = await this.prepararFilas(hoja);
    const resultado = { filas: hoja.filas.length, guardado: false, errores };
    if (errores.length > 0) return resultado;
    for (const fila of listas) await this.crearFila(operador, fila);
    if (ensayo) throw new EnsayoTerminado(resultado);
    return { ...resultado, guardado: true };
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

  /** Lo que rechacen las reglas o la base de datos se informa con el número de la fila. */
  private async crearFila(operador: Operador, { numero, solicitud }: FilaLista<Solicitud>): Promise<void> {
    try {
      await this.dependencias.crear(operador, solicitud);
    } catch (error) {
      const esperado = error instanceof ErrorEsperado ? error : this.dependencias.interpretarError(error);
      if (!esperado) throw error;
      throw new FallaEnFila({ fila: numero, columna: null, mensaje: esperado.message });
    }
  }

  private escribir(filas: unknown[][]): Promise<Buffer> {
    const { nombre, columnas, libro } = this.dependencias;
    return libro.escribir({
      nombre,
      encabezados: columnas.map((columna) => columna.titulo),
      filas,
      instrucciones: instruccionesDe(columnas),
    });
  }
}
