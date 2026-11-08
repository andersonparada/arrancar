import { computed, reactive, ref, watch, type Ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import type { RetencionDeDocumento } from '../../servicios/documentos.api';
import type { RespuestaDeDocumento } from '../../servicios/registro-de-documentos.api';
import { ajustesIncompletos } from './ajustes-de-retenciones';
import { edicionVacia, pendientesDelRegistro, type EdicionDeDocumento } from './edicion-de-documento';
import { erroresDeLineas, erroresDelEncabezado } from './errores-del-registro';
import { usarCatalogosDelRegistro } from './usar-catalogos-del-registro';
import { usarEnvioDeDocumento } from './usar-envio-de-documento';
import { usarPrecargaDesdeDte } from './usar-precarga-desde-dte';
import { usarProveedorDelDocumento } from './usar-proveedor-del-documento';
import { usarVistaPreviaDeDocumento } from './usar-vista-previa-de-documento';

/** Si lo escrito se pierde al salir, pregunta antes (una vez registrado ya no hay nada que perder). */
function preguntarAntesDeSalir(edicion: EdicionDeDocumento, registrado: Ref<boolean>) {
  const avisos = usarAvisos();
  let inicial = JSON.stringify(edicion);
  onBeforeRouteLeave(async () => {
    if (registrado.value || JSON.stringify(edicion) === inicial) return true;
    return avisos.confirmar({
      titulo: '¿Salir sin registrar?',
      mensaje: 'Lo que escribió en este documento se perderá.',
      textoConfirmar: 'Salir sin registrar',
      peligroso: true,
    });
  });
  /** Lo que llega ya escrito (de un DTE de la SAT) no cuenta como cambio del usuario. */
  return () => (inicial = JSON.stringify(edicion));
}

/** Lo que el servidor propuso para la recepción y el período mientras el usuario no escribe los suyos. */
function usarPropuestas(edicion: EdicionDeDocumento, respuesta: Ref<RespuestaDeDocumento | null>) {
  const periodo = ref<string | null>(null);
  const fechaDeRecepcion = ref<string | null>(null);
  watch(respuesta, (nueva) => {
    if (!nueva) return;
    if (!edicion.periodo) periodo.value = nueva.documento.periodo.slice(0, 7);
    if (!edicion.fechaRecepcion) fechaDeRecepcion.value = nueva.documento.fechaRecepcion;
  });
  return { periodo, fechaDeRecepcion };
}

/** Lo que falta para poder registrar, en palabras del usuario. */
function usarPendientes(
  edicion: EdicionDeDocumento,
  retenciones: Ref<RetencionDeDocumento[]>,
  sinDestinos: Ref<boolean>,
) {
  return computed(() => {
    const faltan = pendientesDelRegistro(edicion);
    if (!edicion.destino && !sinDestinos.value) faltan.push('elegir el destino');
    if (ajustesIncompletos(edicion.ajustes, retenciones.value)) faltan.push('corregir el ajuste de retenciones');
    return faltan;
  });
}

interface DatosDeLasCondiciones {
  edicion: EdicionDeDocumento;
  retenciones: Ref<RetencionDeDocumento[]>;
  catalogos: ReturnType<typeof usarCatalogosDelRegistro>;
  /** Enviando el registro o trayendo los datos del DTE. */
  ocupado: Ref<boolean>;
}

/** Cuándo se puede registrar: nada pendiente, hay destino y no se está enviando ni trayendo datos del DTE. */
function usarCondiciones({ edicion, retenciones, catalogos, ocupado }: DatosDeLasCondiciones) {
  const sinDestinos = computed(() => catalogos.destinosCargados.value && catalogos.destinos.value.length === 0);
  const pendientes = usarPendientes(edicion, retenciones, sinDestinos);
  const puedeRegistrar = computed(() => pendientes.value.length === 0 && !sinDestinos.value && !ocupado.value);
  return { sinDestinos, pendientes, puedeRegistrar };
}

/** Los errores por campo, de la vista previa y del envío, repartidos entre el encabezado y las líneas. */
function usarErroresDelFormulario(edicion: EdicionDeDocumento, ...fuentes: Ref<Record<string, string>>[]) {
  const errores = computed(() => Object.assign({}, ...fuentes.map((fuente) => fuente.value)) as Record<string, string>);
  return {
    erroresDelEncabezado: computed(() => erroresDelEncabezado(errores.value)),
    erroresDeLineas: computed(() => erroresDeLineas(edicion.lineas, errores.value)),
  };
}

/** Todo el formulario de «Registrar factura»: lo escrito, los catálogos, la vista previa y el envío. */
export function usarRegistroDeDocumento() {
  const edicion = reactive(edicionVacia(new Date()));
  const catalogos = usarCatalogosDelRegistro();
  const previa = usarVistaPreviaDeDocumento(edicion);
  const envio = usarEnvioDeDocumento(edicion, previa.retenciones);
  const alSalir = preguntarAntesDeSalir(edicion, envio.registrado);
  const precarga = usarPrecargaDesdeDte(edicion, alSalir);
  const { documentos } = usarProveedorDelDocumento({ edicion, ...catalogos, saltos: precarga.saltos });

  const ocupado = computed(() => envio.enviando.value || precarga.cargando.value);
  const condiciones = usarCondiciones({ edicion, retenciones: previa.retenciones, catalogos, ocupado });
  return {
    ...usarErroresDelFormulario(edicion, previa.errores, envio.errores),
    edicion,
    catalogos,
    documentos,
    previa,
    ...condiciones,
    propuestas: usarPropuestas(edicion, previa.respuesta),
    problema: computed(() => envio.problema.value ?? previa.problema.value),
    precarga,
    enviando: envio.enviando,
    // Enter en un campo o un clic con algo pendiente no registran nada.
    registrar: () => (condiciones.puedeRegistrar.value ? envio.registrar() : undefined),
  };
}
