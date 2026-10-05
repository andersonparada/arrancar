<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import SeccionesAportadas from '@/modulos/core/componentes/SeccionesAportadas.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { PapelesDelFormulario } from '../composables/datos-de-tercero';
import type { CategoriaProveedor, PapelTercero } from '../servicios/terceros.api';
import CamposDelPapel from './CamposDelPapel.vue';

/** `papel` nulo es la ventana cerrada. */
defineProps<{
  papel: PapelTercero | null;
  categorias: CategoriaProveedor[];
  enviando: boolean;
  /** El proveedor que ya existe (para cargar los datos de sus secciones); `null` si el papel es nuevo. */
  proveedorId: string | null;
  errores: Record<string, string>;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const papeles = defineModel<PapelesDelFormulario>({ required: true });
/** Lo que aportan los módulos activos al papel de proveedor (p. ej. Datos fiscales). */
const secciones = defineModel<Record<string, unknown>>('secciones', { required: true });
</script>

<template>
  <VentanaModal
    :abierta="papel !== null"
    :titulo="papel === 'proveedor' ? 'Papel de proveedor' : 'Papel de cliente'"
    @cerrar="emit('cerrar')"
  >
    <form v-if="papel" id="form-papel" class="space-y-4" @submit.prevent="emit('guardar')">
      <CamposDelPapel v-model="papeles" :papel="papel" :categorias="categorias" />
      <CampoInterruptor v-model="papeles[papel].activo" etiqueta="Papel activo" />
      <SeccionesAportadas
        v-if="papel === 'proveedor'"
        v-model="secciones"
        en="proveedor"
        :registro-id="proveedorId"
        :errores="errores"
        class="min-w-0 border-t border-tierra-200 pt-4 dark:border-tierra-700"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-papel" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
