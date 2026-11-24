<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { ActivoPorTrasladar, EdicionDeTraslado } from '../../composables/traslados/edicion-de-traslado';

/** Trasladar uno o varios activos con una sola boleta (la responsiva): destino, quién recibe y motivo. */
defineProps<{
  abierta: boolean;
  activos: ActivoPorTrasladar[];
  opciones: { localidadId: OpcionDeRegistro[]; departamentoId: OpcionDeRegistro[] };
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeTraslado>({ required: true });
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Trasladar" @cerrar="emit('cerrar')">
    <form id="form-de-traslado" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <ul class="rounded-xl bg-tierra-100 p-3 text-sm dark:bg-tierra-800" aria-label="Activos que se trasladan">
        <li v-for="activo in activos" :key="activo.id" class="truncate">
          {{ activo.codigo }} · {{ activo.descripcion }}
        </li>
      </ul>
      <p class="text-xs text-tierra-500">Los componentes se trasladan junto con su activo principal.</p>
      <CampoTexto v-model="edicion.fecha" etiqueta="Fecha" tipo="date" requerido :error="errores.fecha" />
      <CampoInterruptor
        v-model="edicion.aBodega"
        etiqueta="A la bodega de activos"
        descripcion="El bien queda guardado, sin entregar. Siguen depreciándose."
      />
      <CampoInterruptor
        v-if="edicion.aBodega"
        v-model="edicion.marcarOcioso"
        etiqueta="Marcar como ocioso"
        descripcion="Úselo si el bien se devuelve porque ya no se usa."
      />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoSelector
          v-model="edicion.localidadId"
          etiqueta="Localidad de destino"
          :opciones="opciones.localidadId"
          :error="errores.localidadId"
        />
        <CampoSelector
          v-model="edicion.departamentoId"
          etiqueta="Departamento de destino"
          :opciones="opciones.departamentoId"
          :error="errores.departamentoId"
        />
      </div>
      <CampoTexto v-model="edicion.responsable" etiqueta="Responsable del bien" :longitud-maxima="150" />
      <CampoTexto
        v-model="edicion.recibidoPor"
        etiqueta="Quién recibe"
        requerido
        :longitud-maxima="150"
        ayuda="Firma la boleta."
        :error="errores.recibidoPor"
      />
      <CampoTexto
        v-model="edicion.motivo"
        etiqueta="Motivo"
        multilinea
        requerido
        :longitud-maxima="300"
        contar
        :error="errores.motivo"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-traslado" :cargando="enviando">Trasladar</BotonBase>
    </template>
  </VentanaModal>
</template>
