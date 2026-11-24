import { ref, type Ref } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { fechaDeHoyEn } from '../activos/fecha-de-hoy';
import { edicionDeMejoraNueva, renglonDeMejoraNuevo } from './edicion-de-mejora';

/** Lo que se escribe en la ventana de la mejora: abrirla vacía y agregar o quitar costos. */
export function usarEdicionDeMejora(errores: Ref<Record<string, string>>) {
  const { config } = usarSesion();
  const hoy = () => fechaDeHoyEn(config('core.regional.zona_horaria', 'America/Guatemala'));
  const edicion = ref(edicionDeMejoraNueva(hoy()));
  const ventanaAbierta = ref(false);
  let ultimaClave = 1;

  function abrir(): void {
    edicion.value = edicionDeMejoraNueva(hoy());
    errores.value = {};
    ultimaClave = 1;
    ventanaAbierta.value = true;
  }

  const agregarRenglon = (): void => {
    edicion.value.renglones.push(renglonDeMejoraNuevo(++ultimaClave));
  };
  const quitarRenglon = (clave: number): void => {
    edicion.value.renglones = edicion.value.renglones.filter((renglon) => renglon.clave !== clave);
  };

  return { edicion, ventanaAbierta, abrir, agregarRenglon, quitarRenglon };
}
