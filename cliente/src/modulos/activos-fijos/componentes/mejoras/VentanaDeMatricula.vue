<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeMatricula } from '../../composables/mejoras/edicion-de-revision';

/** Cambiar el valor de matrícula o el catastral de un edificio: recalcula la base fiscal hacia adelante. */
defineProps<{ abierta: boolean; errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeMatricula>({ required: true });
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Cambiar matrícula o catastro" @cerrar="emit('cerrar')">
    <form id="form-de-matricula" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        La base fiscal del edificio se recalcula desde el primer mes abierto, con el mismo porcentaje; los meses
        cerrados no se tocan.
      </p>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto
          v-model="edicion.valorDeMatricula"
          etiqueta="Valor de matrícula"
          tipo="number"
          paso="0.01"
          :error="errores.valorDeMatricula"
        />
        <CampoTexto
          v-model="edicion.valorCatastral"
          etiqueta="Valor catastral"
          tipo="number"
          paso="0.01"
          :error="errores.valorCatastral"
        />
      </div>
      <CampoInterruptor
        v-model="edicion.valoresDelInmuebleCompleto"
        etiqueta="Los valores son del inmueble completo"
        descripcion="Si no separan el terreno del edificio, el tope es el 70 % del mayor."
      />
      <CampoTexto
        v-model="edicion.documentoDeSoporte"
        etiqueta="Documento de soporte"
        requerido
        :longitud-maxima="150"
        ayuda="Por ejemplo: «Certificación del Registro de la Propiedad, 12 de mayo»."
        :error="errores.documentoDeSoporte"
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
      <BotonBase tipo="submit" form="form-de-matricula" :cargando="enviando">Cambiar valores</BotonBase>
    </template>
  </VentanaModal>
</template>
