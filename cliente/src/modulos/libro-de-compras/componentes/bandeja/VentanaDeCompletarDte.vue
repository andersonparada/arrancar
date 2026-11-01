<script setup lang="ts">
import { Info } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import type { EdicionDeCompletar } from '../../composables/bandeja/datos-de-completar';
import type { DestinoDeDocumento } from '../../servicios/documentos.api';

/**
 * Completar varias filas a la vez: lo que se escoge aquí se pone en todas las marcadas y lo que se deja en «Dejar como
 * está» no se toca. La factura que corrige una nota se escoge solo cuando se completa una sola.
 */
defineProps<{
  cantidad: number;
  conceptos: OpcionBuscable<string | null>[];
  destinos: OpcionBuscable<DestinoDeDocumento | null>[];
  facturas: OpcionBuscable<string | null>[];
  pideLaRecepcion: boolean;
  errores: Record<string, string>;
  enviando: boolean;
}>();
const edicion = defineModel<EdicionDeCompletar>({ required: true });
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="`Completar ${cantidad === 1 ? 'el DTE' : `${cantidad} DTE`}`"
    @cerrar="emit('cerrar')"
  >
    <form id="form-completar-dte" class="space-y-4" @submit.prevent="emit('guardar')">
      <p
        class="flex gap-2 rounded-lg bg-trigo-300/40 p-3 text-sm text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
      >
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>Se cambia solo lo que escoja aquí. Lo demás queda como está o con lo que el sistema propone.</span>
      </p>
      <CampoSelector v-model="edicion.conceptoId" etiqueta="Concepto de gasto" :opciones="conceptos" />
      <CampoSelector v-model="edicion.destino" etiqueta="Destino" :opciones="destinos" />
      <CampoSelector
        v-if="facturas.length"
        v-model="edicion.documentoAfectadoId"
        etiqueta="Factura que corrige esta nota"
        :opciones="facturas"
      />
      <div class="space-y-2">
        <CampoTexto
          v-model="edicion.fechaRecepcion"
          etiqueta="Fecha de recepción"
          tipo="date"
          :error="errores.fechaRecepcion"
          :ayuda="
            pideLaRecepcion
              ? 'La empresa es agente de retención del IVA: de esta fecha sale la de la retención, por eso no se supone.'
              : 'Si la deja vacía se usa la fecha de emisión.'
          "
          :solo-lectura="edicion.usarFechaDeEmision"
        />
        <label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            v-model="edicion.usarFechaDeEmision"
            type="checkbox"
            class="size-5 rounded border-tierra-300 text-campo-600"
          />
          Usar la fecha de emisión de cada DTE
        </label>
      </div>
      <p v-if="errores.general" class="text-sm text-red-700 dark:text-red-400" role="alert">{{ errores.general }}</p>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-completar-dte" :cargando="enviando">Guardar</BotonBase>
    </template>
  </VentanaModal>
</template>
