import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiCuentasPorPagar, type FichaDelDocumento } from '../servicios/cuentas-por-pagar.api';
import {
  datosDeAnulacion,
  edicionDeAnulacionVacia,
  errorDelMotivo,
  errorDelVencimiento,
  erroresDeAnulacion,
} from './reglas-de-acciones';

export type FichaActual = Readonly<Ref<FichaDelDocumento | null>>;
type AlTerminar = () => Promise<void>;

/** Desautorizar: devuelve un documento autorizado a «por autorizar», con el motivo en una ventana. */
export function usarDesautorizacion(ficha: FichaActual, alTerminar: AlTerminar) {
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref({ abierta: false, motivo: '' });

  const abrir = (): void => {
    edicion.value = { abierta: true, motivo: '' };
    errores.value = {};
  };
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };

  async function desautorizar(): Promise<void> {
    const error = errorDelMotivo(edicion.value.motivo);
    if (error || !ficha.value) {
      errores.value = error ? { motivo: error } : {};
      return;
    }
    const { id } = ficha.value;
    if (!(await enviar(() => apiCuentasPorPagar.desautorizar(id, edicion.value.motivo.trim())))) return;
    cerrar();
    usarAvisos().exito('Documento devuelto a «Por autorizar».');
    await alTerminar();
  }

  return { edicion, enviando, errores, abrir, cerrar, desautorizar };
}

/** Cambiar el vencimiento de un cargo registrado o autorizado, en una ventana con la fecha. */
export function usarCambioDeVencimiento(ficha: FichaActual, alTerminar: AlTerminar) {
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref({ abierta: false, vencimiento: '' });

  const abrir = (): void => {
    edicion.value = { abierta: true, vencimiento: ficha.value?.vencimiento ?? '' };
    errores.value = {};
  };
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };

  async function cambiar(): Promise<void> {
    if (!ficha.value) return;
    const { id, fechaEmision } = ficha.value;
    const error = errorDelVencimiento(edicion.value.vencimiento, fechaEmision);
    if (error) {
      errores.value = { vencimiento: error };
      return;
    }
    if (!(await enviar(() => apiCuentasPorPagar.cambiarVencimiento(id, edicion.value.vencimiento)))) return;
    cerrar();
    usarAvisos().exito('Vencimiento cambiado.');
    await alTerminar();
  }

  return { edicion, enviando, errores, abrir, cerrar, cambiar };
}

/** Anular el registro (también en el libro de compras), con causa y motivo en una ventana. */
export function usarAnulacion(ficha: FichaActual, alTerminar: AlTerminar) {
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref(edicionDeAnulacionVacia());

  const abrir = (): void => {
    edicion.value = { ...edicionDeAnulacionVacia(), abierta: true };
    errores.value = {};
  };
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };

  async function anular(): Promise<void> {
    const invalidos = erroresDeAnulacion(edicion.value);
    if (Object.keys(invalidos).length > 0 || !ficha.value) {
      errores.value = invalidos;
      return;
    }
    const { id } = ficha.value;
    if (!(await enviar(() => apiCuentasPorPagar.anular(id, datosDeAnulacion(edicion.value))))) return;
    cerrar();
    usarAvisos().exito('Registro anulado. La factura sigue vigente en la SAT.');
    await alTerminar();
  }

  return { edicion, enviando, errores, abrir, cerrar, anular };
}
