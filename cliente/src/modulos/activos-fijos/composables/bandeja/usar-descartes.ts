import { computed, reactive, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiBandeja, type Descarte, type LineaDeBandeja } from '../../servicios/bandeja.api';
import { nombreDeLinea, textoDeDescarte } from './textos-de-bandeja';

/** Dice que se descartó y repite los avisos del servidor (el libro de compras no se corrige). */
function avisarDelDescarte(avisos: ReturnType<typeof usarAvisos>, linea: LineaDeBandeja, resultado: Descarte | null) {
  avisos.exito(`Se descartó la ${nombreDeLinea(linea)}.`);
  for (const aviso of resultado?.avisos ?? []) avisos.info(aviso);
}

/** Descartar la línea con su motivo; devuelve lo que contestó el servidor, o `null` si no lo aceptó. */
function usarDescarteDeLinea(alDescartar: (linea: LineaDeBandeja) => void) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const linea = ref<LineaDeBandeja | null>(null);
  const motivo = ref('');
  const texto = computed(() => (linea.value ? textoDeDescarte(linea.value) : ''));

  function pedir(porDescartar: LineaDeBandeja): void {
    motivo.value = '';
    errores.value = {};
    linea.value = porDescartar;
  }

  async function confirmar(): Promise<boolean> {
    const actual = linea.value;
    if (!actual) return false;
    let resultado: Descarte | null = null;
    const motivoLimpio = motivo.value.trim();
    if (!(await enviar(async () => (resultado = await apiBandeja.descartar(actual.lineaId, motivoLimpio)))))
      return false;
    avisarDelDescarte(avisos, actual, resultado);
    alDescartar(actual);
    linea.value = null;
    return true;
  }

  return { linea, motivo, texto, errores, enviando, pedir, confirmar, cerrar: () => (linea.value = null) };
}

/**
 * Descartar una línea (con motivo y la explicación de qué pasa con el libro) y devolverla a la bandeja. El servidor
 * no lista las descartadas, así que las de esta sesión se guardan aquí para poder deshacer un descarte equivocado.
 */
export function usarDescartes(alCambiar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();
  const descartadas = ref<LineaDeBandeja[]>([]);
  const descarte = usarDescarteDeLinea((linea) => (descartadas.value = [...descartadas.value, linea]));

  async function devolver(deVuelta: LineaDeBandeja): Promise<void> {
    if (!(await enviar(() => apiBandeja.devolver(deVuelta.lineaId)))) return;
    avisos.exito(`La ${nombreDeLinea(deVuelta)} volvió a la bandeja.`);
    descartadas.value = descartadas.value.filter((descartada) => descartada.lineaId !== deVuelta.lineaId);
    await alCambiar();
  }

  async function confirmar(): Promise<void> {
    if (await descarte.confirmar()) await alCambiar();
  }

  return reactive({ ...descarte, descartadas, devolver, confirmar });
}
