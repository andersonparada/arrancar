<script setup lang="ts">
import { computed, watch } from 'vue';
import { Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import {
  aplicarConcepto,
  ajustarTipoDeLinea,
  type LineaEnEdicion,
} from '../../composables/documentos/lineas-del-documento';
import type { Combustible } from '../../servicios/combustibles.api';
import type { ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import IdpDeLaFactura from './IdpDeLaFactura.vue';
import MasMontosDeLinea from './MasMontosDeLinea.vue';

/** Una línea del documento: qué se compró, cuánto costó y, si es combustible, cuántos galones. */
const props = defineProps<{
  numero: number;
  conceptos: ConceptoDeGasto[];
  combustibles: Combustible[];
  errores: Record<string, string>;
  puedeQuitar: boolean;
  /** Falso en la factura especial: no lleva otros impuestos ni IDP escrito. */
  conMontosExtra: boolean;
}>();
const linea = defineModel<LineaEnEdicion>({ required: true });
defineEmits<{ quitar: [] }>();

const TIPOS = [
  { valor: 'bien' as const, texto: 'Bien' },
  { valor: 'servicio' as const, texto: 'Servicio' },
];
const opcionesDeConcepto = computed(() => [
  { valor: null, texto: 'Elija el concepto' },
  ...props.conceptos.map(({ id, nombre }) => ({ valor: id, texto: nombre })),
]);
const opcionesDeCombustible = computed(() => [
  { valor: null, texto: 'Elija el combustible' },
  ...props.combustibles.map(({ id, nombre }) => ({ valor: id, texto: nombre })),
]);
const fijaElTipo = computed(() => linea.value.esActivoFijo || linea.value.esCombustible);

// Un activo fijo o el combustible siempre son un bien; sin combustible no hay galones.
watch(
  () => [linea.value.esActivoFijo, linea.value.esCombustible],
  () => ajustarTipoDeLinea(linea.value),
);

function elegirConcepto(id: string | null | undefined): void {
  linea.value.conceptoId = id ?? null;
  aplicarConcepto(
    linea.value,
    props.conceptos.find((concepto) => concepto.id === id),
  );
}
</script>

<template>
  <fieldset
    class="rounded-xl bg-tierra-50 p-3 ring-1 ring-tierra-200/70 sm:p-4 dark:bg-tierra-900/40 dark:ring-tierra-700"
  >
    <legend class="sr-only">Línea {{ numero }}</legend>
    <div class="mb-3 flex items-center justify-between gap-2">
      <p class="text-sm font-semibold text-tierra-700 dark:text-tierra-200" aria-hidden="true">Línea {{ numero }}</p>
      <BotonBase
        v-if="puedeQuitar"
        variante="fantasma"
        pequeno
        :icono="Trash2"
        :aria-label="`Quitar la línea ${numero}`"
        @click="$emit('quitar')"
      >
        Quitar
      </BotonBase>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <CampoSelector
        :model-value="linea.conceptoId"
        class="sm:col-span-2"
        etiqueta="Concepto de gasto"
        requerido
        :opciones="opcionesDeConcepto"
        :error="errores.conceptoId"
        @update:model-value="elegirConcepto"
      />
      <CampoTexto
        v-model="linea.total"
        tipo="number"
        paso="any"
        etiqueta="Total con IVA (Q)"
        requerido
        :error="errores.total"
      />
      <CampoTexto
        v-model="linea.exento"
        tipo="number"
        paso="any"
        etiqueta="De ese total, exento (Q)"
        ayuda="Solo si una parte no paga IVA."
        :error="errores.exento"
      />
      <CampoTexto
        v-model="linea.descripcion"
        class="sm:col-span-2"
        etiqueta="Descripción"
        :longitud-maxima="300"
        :error="errores.descripcion"
      />
      <CampoSelector
        v-model="linea.tipo"
        etiqueta="Es un"
        :deshabilitado="fijaElTipo"
        :opciones="TIPOS"
        :error="errores.tipo"
      />
      <div class="flex flex-col justify-end gap-3">
        <CampoInterruptor v-model="linea.esActivoFijo" etiqueta="Es activo fijo" />
        <CampoInterruptor v-model="linea.esCombustible" etiqueta="Es combustible" />
      </div>
      <template v-if="linea.esCombustible">
        <CampoSelector
          v-model="linea.combustibleId"
          class="sm:col-span-2"
          etiqueta="Combustible"
          :requerido="!linea.escribeIdp"
          :opciones="opcionesDeCombustible"
          :error="errores.combustibleId"
        />
        <CampoTexto
          v-model="linea.galones"
          tipo="number"
          paso="any"
          etiqueta="Galones"
          :requerido="!linea.escribeIdp"
          :ayuda="linea.escribeIdp ? 'Opcional: con ellos le avisamos si el IDP no cuadra.' : undefined"
          :error="errores.galones"
        />
        <IdpDeLaFactura v-if="conMontosExtra" v-model="linea" :errores="errores" />
      </template>
    </div>
    <MasMontosDeLinea v-if="conMontosExtra" v-model="linea" class="mt-3" :errores="errores" />
  </fieldset>
</template>
