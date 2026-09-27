<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { PapelesDelFormulario } from '../composables/datos-de-tercero';
import type { CategoriaProveedor, PapelTercero } from '../servicios/terceros.api';
import { CLASES_DE_CLIENTE } from '../textos';

/** Lo propio del papel: la clase del cliente o la categoría del proveedor, y sus notas. */
defineProps<{ papel: PapelTercero; categorias: CategoriaProveedor[] }>();
const papeles = defineModel<PapelesDelFormulario>({ required: true });

const CLASES = Object.entries(CLASES_DE_CLIENTE).map(([valor, texto]) => ({
  valor: valor as keyof typeof CLASES_DE_CLIENTE,
  texto,
}));
</script>

<template>
  <div class="space-y-4">
    <template v-if="papel === 'cliente'">
      <CampoSelector v-model="papeles.cliente.clase" etiqueta="Clase de cliente" :opciones="CLASES" />
      <CampoTexto v-model="papeles.cliente.notas" etiqueta="Notas del cliente" multilinea />
    </template>
    <template v-else>
      <CampoSelector
        v-model="papeles.proveedor.categoriaId"
        etiqueta="Categoría"
        :opciones="[
          { valor: null, texto: 'Sin categoría' },
          ...categorias.filter((c) => c.activo).map((c) => ({ valor: c.id, texto: c.nombre })),
        ]"
      />
      <CampoTexto v-model="papeles.proveedor.notas" etiqueta="Notas del proveedor" multilinea />
    </template>
  </div>
</template>
