import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiGastos } from '../../servicios/gastos.api';
import { apiOpciones, type ConceptoParaGasto } from '../../servicios/opciones.api';
import { fechaDeHoy } from '../reportes/fechas-de-reportes';
import {
  erroresDelGastoSinDocumento,
  gastoSinDocumentoVacio,
  solicitudDeGastoSinDocumento,
  type EdicionDeGastoSinDocumento,
} from './gastos-del-anticipo';

export type EdicionDeLaVentanaDeGasto = EdicionDeGastoSinDocumento & { abierta: boolean };

const cerrada = (): EdicionDeLaVentanaDeGasto => ({ ...gastoSinDocumentoVacio(fechaDeHoy()), abierta: false });

/** Los conceptos de gasto por nombre, para el selector. */
const opcionesDeConceptos = (conceptos: readonly ConceptoParaGasto[]) =>
  conceptos
    .map(({ id, nombre }) => ({ valor: id, texto: nombre }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' }));

/** Los conceptos de gasto activos, traídos al abrir la ventana; si no se pueden traer, se avisa. */
function usarConceptosDeGasto() {
  const conceptos = ref<ConceptoParaGasto[]>([]);
  const cargando = ref(false);
  async function traer(): Promise<void> {
    cargando.value = true;
    try {
      conceptos.value = await apiOpciones.conceptosDeGasto();
    } catch (error) {
      usarAvisos().error(error instanceof Error ? error.message : 'No se pudieron cargar los conceptos de gasto.');
    } finally {
      cargando.value = false;
    }
  }
  return { opciones: computed(() => opcionesDeConceptos(conceptos.value)), cargando, traer };
}

/** Valida lo escrito y lo registra; el servidor decide lo demás y sus avisos se dicen al terminar. */
function usarRegistroDelGasto(
  edicion: Ref<EdicionDeLaVentanaDeGasto>,
  anticipoId: () => string,
  alTerminar: () => Promise<void>,
) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();

  async function guardar(): Promise<void> {
    errores.value = erroresDelGastoSinDocumento(edicion.value, fechaDeHoy());
    if (Object.keys(errores.value).length > 0) return;
    const solicitud = solicitudDeGastoSinDocumento(edicion.value);
    let delServidor: string[] = [];
    const guardado = await enviar(
      async () => (delServidor = (await apiGastos.sinDocumento(anticipoId(), solicitud)).avisos),
    );
    if (!guardado) return;
    avisos.exito('Gasto registrado.');
    delServidor.forEach((aviso) => avisos.info(aviso));
    await alTerminar();
  }
  return { enviando, errores, guardar };
}

/** La ventana «Gasto sin documento» de un anticipo abierto: trae los conceptos al abrir, valida y registra. */
export function usarGastoSinDocumento(anticipoId: () => string, alRegistrar: () => Promise<void>) {
  const edicion = ref<EdicionDeLaVentanaDeGasto>(cerrada());
  const conceptos = usarConceptosDeGasto();
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };
  const registro = usarRegistroDelGasto(edicion, anticipoId, async () => {
    cerrar();
    await alRegistrar();
  });
  const abrir = async (): Promise<void> => {
    registro.errores.value = {};
    edicion.value = { ...cerrada(), abierta: true };
    await conceptos.traer();
  };
  return { ...registro, edicion, cargando: conceptos.cargando, conceptos: conceptos.opciones, abrir, cerrar };
}
