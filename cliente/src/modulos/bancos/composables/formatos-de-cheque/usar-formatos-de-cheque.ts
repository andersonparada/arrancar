import { computed, ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import { apiFormatosDeCheque } from '../../servicios/formatos-de-cheque.api';
import type {
  ClaveDePlantilla,
  FormatoDeChequeGuardado,
  PlantillaDeCheque,
} from '../../servicios/tipos-de-formatos-de-cheque';
import {
  conOtraBase,
  datosDeFormato,
  edicionCerrada,
  edicionDeFormato,
  edicionNueva,
  ordenarFormatos,
  problemasDeFormato,
  type EdicionDeFormatoDeCheque,
} from './edicion-de-formato-de-cheque';
import { usarAccionesDeFormatoDeCheque } from './usar-acciones-de-formato-de-cheque';

/** Los formatos de la cuenta por nombre y las plantillas de fábrica, que se traen una vez al abrir la pantalla. */
function usarCargaDeFormatos() {
  const {
    datos: recibidos,
    cargando,
    cargar,
  } = usarCarga(
    () => apiFormatosDeCheque.listar(),
    [] as FormatoDeChequeGuardado[],
    'No se pudieron cargar los formatos.',
  );
  const { datos: plantillas } = usarCarga(
    () => apiFormatosDeCheque.plantillas(),
    [] as PlantillaDeCheque[],
    'No se pudieron cargar las plantillas de fábrica.',
  );
  const registros = computed(() => ordenarFormatos(recibidos.value));
  const plantillasPorNombre = computed(() => ordenarFormatos(plantillas.value));
  return { registros, plantillas: plantillasPorNombre, cargando, cargar };
}

/** El envío del formato: el estado, los errores por campo y los problemas de medidas que manda el servidor. */
function usarEnvioDeFormato() {
  const { enviando, errores, enviar } = usarFormulario();
  /** Lo que el servidor no aceptó del formato, medida por medida, para que el usuario sepa qué corregir. */
  const problemas = ref<string[]>([]);
  const reiniciar = (): void => {
    errores.value = {};
    problemas.value = [];
  };
  return { enviando, errores, problemas, enviar, reiniciar };
}

type Envio = ReturnType<typeof usarEnvioDeFormato>;
/** Algo de lo que solo se lee `.value` (un `ref` o un `computed`). */
type Lectura<T> = { readonly value: T };

/** Abrir la ventana: un formato nuevo (de una plantilla), uno guardado, o cambiar la plantilla del que se arma. */
function usarVentanaDeFormato(plantillas: Lectura<PlantillaDeCheque[]>, alAbrir: () => void) {
  const avisos = usarAvisos();
  const edicion = ref<EdicionDeFormatoDeCheque>(edicionCerrada());

  function nuevo(clave?: ClaveDePlantilla): void {
    edicion.value = edicionNueva(plantillas.value, clave);
    alAbrir();
  }

  async function abrir(registro: FormatoDeChequeGuardado): Promise<void> {
    try {
      const detalle = await apiFormatosDeCheque.obtener(registro.id);
      edicion.value = edicionDeFormato(detalle, plantillas.value);
      alAbrir();
      if (detalle.danado) avisos.error('Este formato ya no cumple las reglas: se muestra con la plantilla.');
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo abrir el formato.');
    }
  }

  const cambiarBase = (base: ClaveDePlantilla): void => {
    edicion.value = conOtraBase(edicion.value, plantillas.value, base);
  };

  return { edicion, nuevo, abrir, cambiarBase };
}

/** Manda el formato al servidor; si no cumple las reglas, deja los problemas medida por medida para mostrarlos. */
async function enviarFormato(
  edicion: EdicionDeFormatoDeCheque,
  plantillas: Lectura<PlantillaDeCheque[]>,
  envio: Envio,
): Promise<void> {
  const datos = datosDeFormato(edicion, plantillas.value);
  try {
    await (edicion.id ? apiFormatosDeCheque.actualizar(edicion.id, datos) : apiFormatosDeCheque.crear(datos));
  } catch (error) {
    if (error instanceof ErrorApi) envio.problemas.value = problemasDeFormato(error.detalles);
    throw error;
  }
}

/** Guardar el formato armado (nuevo o editado) y recargar la lista. */
function usarGuardadoDeFormato(
  edicion: Ref<EdicionDeFormatoDeCheque>,
  plantillas: Lectura<PlantillaDeCheque[]>,
  envio: Envio,
) {
  const avisos = usarAvisos();
  const aviso = (esNuevo: boolean) =>
    esNuevo ? 'Formato registrado.' : 'Formato actualizado: hay que volver a hacer la prueba de alineación.';

  return async (alGuardar: () => Promise<void>): Promise<void> => {
    const esNuevo = edicion.value.id === null;
    envio.problemas.value = [];
    if (!(await envio.enviar(() => enviarFormato(edicion.value, plantillas, envio)))) return;
    avisos.exito(aviso(esNuevo));
    edicion.value.abierta = false;
    await alGuardar();
  };
}

/** Los formatos de cheque de la cuenta: listarlos, armarlos a partir de una plantilla de fábrica y editarlos. */
export function usarFormatosDeCheque() {
  const { registros, plantillas, cargando, cargar } = usarCargaDeFormatos();
  const envio = usarEnvioDeFormato();
  const ventana = usarVentanaDeFormato(plantillas, envio.reiniciar);
  const guardarYRecargar = usarGuardadoDeFormato(ventana.edicion, plantillas, envio);
  const acciones = usarAccionesDeFormatoDeCheque(cargar);
  const { enviando, errores, problemas } = envio;
  const guardar = () => guardarYRecargar(cargar);
  return { registros, plantillas, cargando, enviando, errores, problemas, ...ventana, guardar, ...acciones };
}
