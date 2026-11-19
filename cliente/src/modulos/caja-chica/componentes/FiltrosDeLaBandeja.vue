<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { opcionesDeNombres } from '../composables/fondos/opciones-de-fondos';
import type { FiltroDeBandeja } from '../servicios/tipos-de-comprobantes';

/** Los filtros de la bandeja: proveedor, rango de fechas de emisión y si llevan retención. */
const props = defineProps<{ proveedores: readonly { id: string; nombre: string }[]; filtros: number }>();
const filtro = defineModel<FiltroDeBandeja>({ required: true });
const emit = defineEmits<{ limpiar: [] }>();

const opcionesDeProveedor = computed(() => opcionesDeNombres(props.proveedores, 'Todos los proveedores'));
const opcionesDeRetencion = [
  { valor: null, texto: 'Con y sin retención' },
  { valor: 'si', texto: 'Solo con retención' },
  { valor: 'no', texto: 'Solo sin retención' },
];
const retencion = computed<string | null>({
  get: () => (filtro.value.conRetencion === undefined ? null : filtro.value.conRetencion ? 'si' : 'no'),
  set: (valor) => (filtro.value = { ...filtro.value, conRetencion: valor === null ? undefined : valor === 'si' }),
});
const proveedor = computed<string | null>({
  get: () => filtro.value.proveedorId ?? null,
  set: (valor) => (filtro.value = { ...filtro.value, proveedorId: valor ?? undefined }),
});
const fecha = (campo: 'desde' | 'hasta') =>
  computed<string>({
    get: () => filtro.value[campo] ?? '',
    set: (valor) => (filtro.value = { ...filtro.value, [campo]: valor || undefined }),
  });
const desde = fecha('desde');
const hasta = fecha('hasta');
</script>

<template>
  <form
    class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    role="search"
    aria-label="Filtros de la bandeja"
    @submit.prevent
  >
    <CampoSelector v-model="proveedor" etiqueta="Proveedor" :opciones="opcionesDeProveedor" />
    <CampoSelector v-model="retencion" etiqueta="Retención" :opciones="opcionesDeRetencion" />
    <CampoTexto v-model="desde" etiqueta="Emitidos desde" tipo="date" />
    <CampoTexto v-model="hasta" etiqueta="Emitidos hasta" tipo="date" />
    <div v-if="filtros > 0" class="sm:col-span-2 xl:col-span-4">
      <BotonBase variante="fantasma" pequeno @click="emit('limpiar')">
        Quitar {{ filtros === 1 ? 'el filtro' : `los ${filtros} filtros` }}
      </BotonBase>
    </div>
  </form>
</template>
