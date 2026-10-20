import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiRetenciones, type RetencionDelMes } from '../../servicios/retenciones.api';
import {
  conFechaEnTodas,
  cuerpoDeConstancias,
  erroresDeConstancias,
  filasConProblemas,
  filasDeConstancias,
  revisarConstancias,
  type ErroresPorFila,
  type FilaDeConstancia,
} from './datos-de-constancias';

/** Manda una constancia con su ruta o varias en lote; devuelve los avisos del servidor. */
async function enviarConstancias(filas: readonly FilaDeConstancia[]): Promise<string[]> {
  const cuerpo = cuerpoDeConstancias(filas);
  const [primera] = cuerpo;
  if (cuerpo.length === 1 && primera) {
    const { retencionId, ...constancia } = primera;
    return (await apiRetenciones.anotarConstancia(retencionId, constancia)).avisos;
  }
  return (await apiRetenciones.anotarConstancias(cuerpo)).avisos;
}

const textoDelExito = (cantidad: number) =>
  cantidad === 1 ? 'Constancia guardada.' : `${cantidad} constancias guardadas.`;

/** Las filas de la ventana: lo que se anota, la fecha común y los errores por fila. */
function usarFilas() {
  const abierta = ref(false);
  const filas = ref<FilaDeConstancia[]>([]);
  const fechaParaTodas = ref('');
  const errores = ref<ErroresPorFila>({});

  function abrir(retenciones: readonly RetencionDelMes[]): void {
    filas.value = filasDeConstancias(retenciones);
    fechaParaTodas.value = '';
    errores.value = {};
    abierta.value = true;
  }

  const copiarFecha = (fecha: string) => (filas.value = conFechaEnTodas(filas.value, fecha));
  return { abierta, filas, fechaParaTodas, errores, abrir, copiarFecha };
}

/** Reparte el error entre las filas y avisa en general si no es de una fila (o si son varias). */
function repartirError(error: unknown, cantidad: number, errores: { value: ErroresPorFila }): void {
  const porFila = erroresDeConstancias(error);
  if (porFila) errores.value = porFila;
  if (!porFila || cantidad > 1) {
    usarAvisos().error(error instanceof Error ? error.message : 'No se pudieron guardar las constancias.');
  }
}

/** La ventana para anotar o corregir una constancia, o varias a la vez (todo o nada). */
export function usarConstancias(alTerminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const enviando = ref(false);
  const estado = usarFilas();
  const { abierta, filas, errores } = estado;

  async function guardar(): Promise<void> {
    errores.value = revisarConstancias(filas.value);
    if (filasConProblemas(errores.value) > 0) return;
    enviando.value = true;
    try {
      const avisosDelServidor = await enviarConstancias(filas.value);
      abierta.value = false;
      avisos.exito(textoDelExito(filas.value.length));
      avisosDelServidor.forEach((aviso) => avisos.info(aviso));
      await alTerminar();
    } catch (error) {
      repartirError(error, filas.value.length, errores);
    } finally {
      enviando.value = false;
    }
  }

  return { ...estado, enviando, guardar };
}
