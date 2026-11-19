import { ref, watch, type Ref } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { apiTiposDeCambio } from '../../servicios/tipos-de-cambio.api';
import { formatearFecha } from '../../utilidades/formato';
import { usarFormulario } from '../usar-formulario';
import {
  datosDelTipo,
  erroresDelTipo,
  formularioDeTipoDelDia,
  formularioDeTipoNuevo,
  formularioDeTipoVacio,
  resumenDelGuardado,
  type FormularioDeTipo,
} from './edicion-de-tipo-manual';

const FECHA_COMPLETA = /^\d{4}-\d{2}-\d{2}$/;

/** Trae las versiones del día elegido cada vez que se abre la ventana o cambia la fecha. */
function usarVersionesDelDia(formulario: Ref<FormularioDeTipo>) {
  const avisos = usarAvisos();
  const cargando = ref(false);

  async function traer(): Promise<void> {
    const { moneda, fecha, abierta } = formulario.value;
    if (!abierta || !FECHA_COMPLETA.test(fecha)) return;
    cargando.value = true;
    try {
      const versiones = await apiTiposDeCambio.versiones(moneda, fecha);
      if (formulario.value.fecha === fecha) formulario.value.versiones = versiones;
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar el historial del día.');
    } finally {
      cargando.value = false;
    }
  }

  watch(() => [formulario.value.abierta, formulario.value.fecha], traer);
  return cargando;
}

/** Antes de guardar se muestra qué reemplaza y cuánto cambia contra el vigente, y se pide confirmar. */
const aceptaElResumen = (avisos: ReturnType<typeof usarAvisos>, formulario: FormularioDeTipo) =>
  avisos.confirmar({
    titulo: 'Guardar tipo de cambio',
    mensaje: resumenDelGuardado(formulario, formatearFecha),
    textoConfirmar: 'Guardar',
  });

/** Validar, pedir confirmar con el resumen y guardar la versión nueva del día. */
function usarGuardadoDelTipo(formulario: Ref<FormularioDeTipo>, alGuardar: () => Promise<unknown>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const cerrar = () => (formulario.value.abierta = false);

  async function guardar(): Promise<void> {
    errores.value = erroresDelTipo(formulario.value);
    if (Object.keys(errores.value).length > 0 || !(await aceptaElResumen(avisos, formulario.value))) return;
    if (!(await enviar(() => apiTiposDeCambio.registrar(datosDelTipo(formulario.value))))) return;
    avisos.exito('Tipo de cambio guardado.');
    cerrar();
    await alGuardar();
  }

  return { enviando, errores, cerrar, guardar };
}

/** La ventana para ingresar o corregir el tipo de un día. */
export function usarTipoManual(moneda: () => string, hoy: () => string, alGuardar: () => Promise<unknown>) {
  const formulario = ref(formularioDeTipoVacio());
  const guardado = usarGuardadoDelTipo(formulario, alGuardar);
  const abrir = (nuevo: FormularioDeTipo) => {
    guardado.errores.value = {};
    formulario.value = nuevo;
  };
  return {
    ...guardado,
    formulario,
    cargandoVersiones: usarVersionesDelDia(formulario),
    abrirNuevo: () => abrir(formularioDeTipoNuevo(moneda(), hoy())),
    abrirDelDia: (fecha: string) => abrir(formularioDeTipoDelDia(moneda(), fecha)),
  };
}
