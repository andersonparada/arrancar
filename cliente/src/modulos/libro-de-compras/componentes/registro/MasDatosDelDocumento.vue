<script setup lang="ts">
import { ref, watch } from 'vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { EdicionDeDocumento } from '../../composables/documentos/edicion-de-documento';
import { esUnaFactura } from '../../composables/documentos/tipos-de-documento-sat';
import { OTRA_CAUSA } from '../../textos-del-registro';

/** Datos que casi nunca hacen falta: el IVA que dice la FEL, si no se vincula a ventas gravadas y las observaciones. */
const props = defineProps<{ errores: Record<string, string> }>();
const edicion = defineModel<EdicionDeDocumento>({ required: true });

/** Plegado por omisión; se abre solo cuando «otra causa» o un error de esta sección lo necesita. */
const abierto = ref(false);
watch(
  () => edicion.value.otraCausaSinCredito || !!props.errores.observaciones || !!props.errores.otraCausaSinCredito,
  (hace) => hace && (abierto.value = true),
  { immediate: true },
);
</script>

<template>
  <details
    :open="abierto"
    class="group rounded-2xl bg-white p-4 ring-1 ring-tierra-200/70 sm:p-5 dark:bg-tierra-800/60 dark:ring-tierra-700"
    @toggle="abierto = ($event.target as HTMLDetailsElement).open"
  >
    <summary class="cursor-pointer font-semibold marker:text-tierra-400">Más datos (opcionales)</summary>
    <div class="mt-4 space-y-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto
          v-model="edicion.ivaDeLaFel"
          tipo="number"
          paso="any"
          etiqueta="IVA que dice la FEL (Q)"
          ayuda="Si lo escribe, el cálculo se ajusta a ese IVA (hasta unos pocos centavos de diferencia)."
          :error="errores.ivaDeLaFel"
        />
        <CampoTexto
          v-model="edicion.observaciones"
          etiqueta="Observaciones"
          :longitud-maxima="500"
          :requerido="edicion.otraCausaSinCredito"
          :ayuda="edicion.otraCausaSinCredito ? OTRA_CAUSA.ayudaDeObservaciones : undefined"
          :error="errores.observaciones"
        />
      </div>
      <CampoInterruptor
        v-model="edicion.noVinculado"
        etiqueta="Esta compra no se usa en ventas gravadas con IVA"
        descripcion="Si la compra no está vinculada a ventas gravadas (Ley del IVA, art. 16), su IVA no es crédito fiscal."
      />
      <div v-if="esUnaFactura(edicion.tipoDte)">
        <CampoInterruptor
          v-model="edicion.otraCausaSinCredito"
          :etiqueta="OTRA_CAUSA.etiqueta"
          :descripcion="OTRA_CAUSA.descripcion"
        />
        <p v-if="errores.otraCausaSinCredito" class="mt-1 text-xs text-red-700 dark:text-red-400" role="alert">
          {{ errores.otraCausaSinCredito }}
        </p>
      </div>
    </div>
  </details>
</template>
