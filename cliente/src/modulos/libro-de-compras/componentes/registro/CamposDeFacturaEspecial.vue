<script setup lang="ts">
import { computed } from 'vue';
import { Info } from 'lucide-vue-next';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { EdicionDeDocumento } from '../../composables/documentos/edicion-de-documento';
import { FACTURA_ESPECIAL as textos, textoDelEmisorEspecial } from '../../textos-del-registro';

/** La FEL de una factura especial: la emite la empresa, así que el emisor es ella y el vendedor es el proveedor. */
const props = defineProps<{ nitDeLaEmpresa: string | null; errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeDocumento>({ required: true });
const emisor = computed(() => textoDelEmisorEspecial(props.nitDeLaEmpresa));
</script>

<template>
  <div class="space-y-4">
    <p
      class="flex gap-2 rounded-lg bg-trigo-300/40 p-3 text-sm text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
    >
      <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{{ textos.ayuda }}</span>
    </p>

    <CampoInterruptor
      :model-value="true"
      etiqueta="Se muestra en reportes SAT"
      :descripcion="textos.siempreEnElLibro"
      deshabilitado
    />

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <CampoTexto :model-value="emisor" etiqueta="Emisor" solo-lectura />
      <CampoTexto
        v-model="edicion.nitReceptor"
        etiqueta="Vendedor (NIT o CUI)"
        requerido
        :ayuda="textos.ayudaDelVendedor"
        :error="errores.nitReceptor"
        sin-correccion
      />
      <CampoTexto
        v-model="edicion.autorizacionFel"
        etiqueta="Autorización de la FEL"
        requerido
        ayuda="El número de autorización (UUID) que le dio el certificador al emitir la factura especial."
        :error="errores.autorizacionFel"
        sin-correccion
      />
    </div>
  </div>
</template>
