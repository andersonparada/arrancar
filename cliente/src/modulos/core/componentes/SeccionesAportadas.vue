<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { modulosCliente } from '@/modulos/indice';
import { usarSesion } from '../almacenes/sesion';
import { erroresDeLaSeccion, seccionesDe } from '../secciones/secciones-aportadas';
import type { DondeSeAporta } from '../tipos';
import TarjetaBase from './TarjetaBase.vue';

/**
 * Las secciones que los módulos activos aportan al formulario de Empresas o al de Proveedores. El valor de cada
 * una viaja en `v-model` (`{ '<módulo>': valor }`) y se envía en `secciones` con el resto del formulario.
 */
const props = defineProps<{
  en: DondeSeAporta;
  /** La empresa o el proveedor que se edita; `null` si es nuevo. */
  registroId: string | null;
  errores: Record<string, string>;
  /** Cada sección dentro de una tarjeta (formularios en página) en vez de un grupo simple (ventanas). */
  tarjetas?: boolean;
}>();
const valores = defineModel<Record<string, unknown>>({ required: true });
const sesion = usarSesion();

const secciones = computed(() =>
  seccionesDe(modulosCliente, props.en, sesion.moduloActivo).map(({ modulo, seccion }) => ({
    modulo,
    titulo: seccion.titulo,
    componente: defineAsyncComponent(seccion.formulario),
  })),
);

const cambiar = (modulo: string, valor: unknown): void => {
  valores.value = { ...valores.value, [modulo]: valor };
};
</script>

<template>
  <component :is="tarjetas ? TarjetaBase : 'fieldset'" v-for="seccion in secciones" :key="seccion.modulo">
    <component :is="tarjetas ? 'h2' : 'legend'" class="mb-4 font-semibold text-tierra-800 dark:text-tierra-100">
      {{ seccion.titulo }}
    </component>
    <component
      :is="seccion.componente"
      :model-value="valores[seccion.modulo]"
      :registro-id="registroId"
      :errores="erroresDeLaSeccion(errores, seccion.modulo)"
      @update:model-value="cambiar(seccion.modulo, $event)"
    />
  </component>
</template>
