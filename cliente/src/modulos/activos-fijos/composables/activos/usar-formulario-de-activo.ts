import { ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiActivos, type ActivoFicha } from '../../servicios/activos.api';
import { alCambiarElTipo, datosDeActivo, departamentoValido, edicionNueva } from './edicion-de-activo';
import type { EdicionDeActivo } from './edicion-de-activo';
import { fechaDeHoyEn } from './fecha-de-hoy';
import { usarReferenciasDeActivo } from './usar-referencias-de-activo';

type Departamentos = Parameters<typeof departamentoValido>[0];

/** Mantiene coherentes los campos: al cambiar el tipo se limpian los datos que no aplican, y al cambiar la localidad, el departamento. */
function usarCamposCoherentes(edicion: Ref<EdicionDeActivo>, departamentos: Ref<Departamentos>): void {
  watch(
    () => edicion.value.tipoDeRegistro,
    () => alCambiarElTipo(edicion.value),
  );
  watch(
    () => edicion.value.localidadId,
    () => {
      const { localidadId, departamentoId } = edicion.value;
      edicion.value.departamentoId = departamentoValido(departamentos.value, { localidadId, departamentoId });
    },
  );
}

/** El alta manual de un activo en página completa (sin costos: llegan con la bandeja y los costos manuales). */
export function usarFormularioDeActivo() {
  const avisos = usarAvisos();
  const { config } = usarSesion();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref(edicionNueva(fechaDeHoyEn(config('core.regional.zona_horaria', 'America/Guatemala'))));
  const referencias = usarReferenciasDeActivo(edicion);
  usarCamposCoherentes(edicion, referencias.departamentos);

  /** @returns El activo registrado, o `null` si el servidor no lo aceptó. */
  async function guardar(): Promise<ActivoFicha | null> {
    let guardado: ActivoFicha | null = null;
    const aceptado = await enviar(async () => {
      guardado = await apiActivos.crear(datosDeActivo(edicion.value, referencias.inciso.value));
    });
    if (aceptado) avisos.exito('Activo registrado.');
    return guardado;
  }

  return { edicion, enviando, errores, referencias, guardar };
}
