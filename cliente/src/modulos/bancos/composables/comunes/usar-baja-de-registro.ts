import { reactive, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { datosDeBajaNuevos } from './baja-de-registro';
import type { DatosDeBaja } from '../../servicios/datos-de-baja';

interface OpcionesDeBaja<Registro> {
  /** Llama a la API con lo que se escribió en la ventana. */
  ejecutar: (registro: Registro, datos: DatosDeBaja) => Promise<unknown>;
  /** El aviso de éxito. */
  aviso: string;
  /** Qué hacer al terminar (normalmente, volver a cargar la lista). */
  alTerminar: () => Promise<void>;
}

/**
 * Una baja de un registro (anular, eliminar, blanquear) en su propia ventana: pide el motivo (y la
 * fecha, si la ventana la muestra), llama a la API y avisa. Cada pantalla arma una por acción.
 */
export function usarBajaDeRegistro<Registro>({ ejecutar, aviso, alTerminar }: OpcionesDeBaja<Registro>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const registro = ref<Registro | null>(null);
  const motivo = ref('');
  const fecha = ref('');

  function abrir(aDarDeBaja: Registro): void {
    ({ motivo: motivo.value, fecha: fecha.value } = datosDeBajaNuevos());
    registro.value = aDarDeBaja;
    errores.value = {};
  }

  function cerrar(): void {
    registro.value = null;
  }

  async function confirmar(): Promise<void> {
    const elegido = registro.value;
    if (!elegido) return;
    if (!(await enviar(() => ejecutar(elegido, { motivo: motivo.value, fecha: fecha.value })))) return;
    avisos.exito(aviso);
    cerrar();
    await alTerminar();
  }

  return reactive({ registro, motivo, fecha, enviando, errores, abrir, cerrar, confirmar });
}
