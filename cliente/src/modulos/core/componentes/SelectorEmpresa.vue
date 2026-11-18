<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { usarAvisos } from '../almacenes/avisos';
import { usarSesion } from '../almacenes/sesion';
import { opcionesDeEmpresa } from '../utilidades/opciones-de-empresa';
import CampoSelector from './CampoSelector.vue';

const sesion = usarSesion();
const avisos = usarAvisos();
const router = useRouter();

const opciones = computed(() => opcionesDeEmpresa(sesion.empresasDisponibles));

async function cambiar(empresaId: string | undefined): Promise<void> {
  if (!empresaId || empresaId === sesion.empresa?.id) return;
  try {
    await sesion.cambiarEmpresa(empresaId);
    await router.push({ name: 'inicio' });
    avisos.info(`Trabajando en ${sesion.empresa?.nombre}`);
  } catch (error) {
    avisos.error(error instanceof Error ? error.message : 'No se pudo cambiar de empresa.');
  }
}
</script>

<template>
  <CampoSelector
    :model-value="sesion.empresa?.id ?? ''"
    etiqueta="Empresa activa"
    ocultar-etiqueta
    :opciones="opciones"
    @update:model-value="cambiar"
  />
</template>
