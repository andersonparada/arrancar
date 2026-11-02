<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { UserPlus } from 'lucide-vue-next';
import type { EdicionDeProveedorNuevo } from '../../composables/bandeja/datos-de-proveedores-nuevos';
import TarjetaDeProveedorNuevo from './TarjetaDeProveedorNuevo.vue';

/**
 * Los proveedores que se crean al confirmar, uno por NIT. Las tarjetas editan directamente su objeto; si el usuario
 * intenta confirmar con un campo mal (sube `intentos`), el foco va al primero.
 */
const props = defineProps<{ proveedores: EdicionDeProveedorNuevo[]; intentos: number }>();
const seccion = ref<HTMLElement | null>(null);

watch(
  () => props.intentos,
  async () => {
    await nextTick();
    seccion.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  },
);
</script>

<template>
  <section v-if="proveedores.length" ref="seccion" class="space-y-3" aria-labelledby="titulo-proveedores-nuevos">
    <h3 id="titulo-proveedores-nuevos" class="flex items-center gap-2 font-semibold">
      <UserPlus class="size-4" aria-hidden="true" />
      Proveedores nuevos ({{ proveedores.length }})
    </h3>
    <p class="text-sm text-tierra-600 dark:text-tierra-300">
      Estos NIT aún no son proveedores. Se crearán al registrar las facturas, con el nombre que confirme aquí.
    </p>
    <TarjetaDeProveedorNuevo
      v-for="proveedor in proveedores"
      :key="proveedor.nit"
      :model-value="proveedor"
      :mostrar-problemas="intentos > 0"
    />
  </section>
</template>
