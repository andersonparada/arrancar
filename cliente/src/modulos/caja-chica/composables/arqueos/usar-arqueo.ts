import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { apiArqueos } from '../../servicios/arqueos.api';
import type { Arqueo, PropuestaDeArqueo } from '../../servicios/tipos-de-arqueos';
import { partesDeLaPropuesta } from './detalles-de-arqueo';
import {
  cuerpoDelArqueo,
  edicionDeArqueo,
  faltantesDelArqueo,
  resultadoDelConteo,
  type EdicionDeArqueo,
} from './edicion-de-arqueo';

/** Lo que hace falta de la propuesta para contar: las denominaciones y lo que se espera. */
interface DatosDelConteo {
  denominaciones: string[];
  efectivoEsperado: string;
}

const PROPUESTA_VACIA: DatosDelConteo = { denominaciones: [], efectivoEsperado: '0.00' };

/** Lo que se avisa al registrar: el resultado con el enlace al acta, y los avisos que no bloquean. */
function avisarDelResultado(arqueo: Arqueo): void {
  const avisos = usarAvisos();
  const diferencia = Number(arqueo.diferencia);
  const resultado =
    diferencia === 0
      ? 'El efectivo cuadra.'
      : `${diferencia < 0 ? 'Faltante' : 'Sobrante'} de ${formatearMonto(Math.abs(diferencia).toFixed(2))}: quedó como comprobante pendiente de reponer.`;
  avisos.exito(`Arqueo ${arqueo.numero} registrado. ${resultado}`, {
    texto: 'Imprimir el acta',
    ruta: { name: 'caja-chica.arqueos.imprimir', params: { id: arqueo.id } },
  });
  arqueo.avisos.forEach((aviso) => avisos.info(aviso));
}

/** Valida el conteo, registra el arqueo y, si salió bien, avisa y vuelve a la ficha del fondo. */
function usarRegistro(fondoId: string, conteo: { edicion: Ref<EdicionDeArqueo>; datos: ComputedRef<DatosDelConteo> }) {
  const router = useRouter();
  const { enviando, errores, enviar } = usarFormulario();
  const resultado = computed(() => resultadoDelConteo(conteo.edicion.value, conteo.datos.value));

  async function registrar(): Promise<void> {
    errores.value = faltantesDelArqueo(conteo.edicion.value, resultado.value);
    if (Object.keys(errores.value).length > 0) return;
    const cuerpo = cuerpoDelArqueo(conteo.edicion.value, { ...conteo.datos.value, tipo: resultado.value.tipo });
    let hecho: Arqueo | undefined;
    const bien = await enviar(async () => (hecho = await apiArqueos.registrar(fondoId, cuerpo)));
    if (!bien || !hecho) return;
    avisarDelResultado(hecho);
    await router.push({ name: 'caja-chica.fondos.ficha', params: { id: fondoId } });
  }
  return { resultado, errores, enviando, registrar };
}

/**
 * Arquear un fondo: trae lo que el sistema espera, deja contar por denominación y muestra al instante si cuadra, falta
 * o sobra. Con diferencia pide el motivo (y qué hacer con un faltante). Al terminar vuelve a la ficha con el enlace al acta.
 */
export function usarArqueo(fondoId: string) {
  const propuesta = usarCarga(
    () => apiArqueos.propuesta(fondoId),
    null as PropuestaDeArqueo | null,
    'No se pudo cargar lo que se espera en el fondo.',
  );
  const edicion = ref(edicionDeArqueo());
  const datos = computed(() => propuesta.datos.value ?? PROPUESTA_VACIA);
  return {
    ...usarRegistro(fondoId, { edicion, datos }),
    edicion,
    propuesta: propuesta.datos,
    cargando: propuesta.cargando,
    partes: computed(() => (propuesta.datos.value ? partesDeLaPropuesta(propuesta.datos.value) : [])),
  };
}
