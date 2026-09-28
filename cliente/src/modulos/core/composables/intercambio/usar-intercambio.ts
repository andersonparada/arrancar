import { reactive } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import type { ArchivoDescargado } from '../../servicios/cliente-http';
import type { IntercambioDeDatos, ResultadoDeImportacion } from '../../servicios/intercambio';
import { guardarArchivo } from '../../utilidades/archivos';

/** Cómo va la importación: el archivo elegido, si se está revisando o guardando, y qué dijo el servidor. */
export interface EstadoDeImportacion {
  abierta: boolean;
  archivo: File | null;
  revisando: boolean;
  guardando: boolean;
  resultado: ResultadoDeImportacion | null;
}

const ESTADO_INICIAL: EstadoDeImportacion = {
  abierta: false,
  archivo: null,
  revisando: false,
  guardando: false,
  resultado: null,
};

type Avisos = ReturnType<typeof usarAvisos>;

const mensajeDe = (error: unknown, siNoHay: string) => (error instanceof Error ? error.message : siNoHay);

async function descargar(obtener: () => Promise<ArchivoDescargado>, avisos: Avisos): Promise<void> {
  try {
    guardarArchivo(await obtener());
  } catch (error) {
    avisos.error(mensajeDe(error, 'No se pudo descargar el archivo.'));
  }
}

interface Contexto {
  intercambio: IntercambioDeDatos;
  estado: EstadoDeImportacion;
  avisos: Avisos;
  alImportar: () => Promise<void>;
}

/** Sube el archivo elegido; con `ensayo` solo lo revisa. Si el servidor no pudo leerlo, avisa y devuelve `null`. */
async function subir({ intercambio, estado, avisos }: Contexto, ensayo: boolean) {
  try {
    return await intercambio.importar(estado.archivo!, ensayo);
  } catch (error) {
    avisos.error(mensajeDe(error, 'No se pudo leer el archivo.'));
    return null;
  }
}

/** Apenas se elige el archivo, el servidor lo revisa sin guardar nada. */
async function revisar(contexto: Contexto, archivo: File): Promise<void> {
  Object.assign(contexto.estado, { archivo, resultado: null, revisando: true });
  contexto.estado.resultado = await subir(contexto, true);
  contexto.estado.revisando = false;
}

/** Importa de verdad; si el servidor encontró algo nuevo, lo muestra en vez de cerrar. */
async function guardar(contexto: Contexto): Promise<void> {
  const { estado, avisos, alImportar } = contexto;
  estado.guardando = true;
  const resultado = await subir(contexto, false);
  estado.guardando = false;
  if (!resultado?.guardado) return void (estado.resultado = resultado);
  avisos.exito(`Se importaron ${resultado.filas.toLocaleString('es-GT')} registros.`);
  Object.assign(estado, ESTADO_INICIAL);
  await alImportar();
}

/**
 * Exportar e importar en Excel desde una lista. Al elegir el archivo se revisa
 * con un ensayo (no se guarda nada); solo si está bien se puede importar.
 */
export function usarIntercambio(intercambio: IntercambioDeDatos, alImportar: () => Promise<void>) {
  const avisos = usarAvisos();
  const estado = reactive<EstadoDeImportacion>({ ...ESTADO_INICIAL });
  const contexto: Contexto = { intercambio, estado, avisos, alImportar };
  return {
    estado,
    abrir: () => Object.assign(estado, { ...ESTADO_INICIAL, abierta: true }),
    cerrar: () => Object.assign(estado, ESTADO_INICIAL),
    exportar: () => descargar(intercambio.exportar, avisos),
    bajarPlantilla: () => descargar(intercambio.plantilla, avisos),
    elegir: (archivo: File) => revisar(contexto, archivo),
    importar: () => guardar(contexto),
  };
}

export type Intercambio = ReturnType<typeof usarIntercambio>;
