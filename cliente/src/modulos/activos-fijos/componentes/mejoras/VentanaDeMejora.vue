<script setup lang="ts">
import { Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { opcionesDeLista } from '@/modulos/core/utilidades/edicion';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  OPCIONES_DE_CLASE_DE_MEJORA,
  sugiereComponente,
  totalDeMejoraEnCentavos,
  type EdicionDeMejora,
} from '../../composables/mejoras/edicion-de-mejora';
import { textoDeCentavos } from '../../composables/bandeja/montos-de-bandeja';
import CamposDeCostoDeMejora from './CamposDeCostoDeMejora.vue';
import SugerenciaDeComponente from './SugerenciaDeComponente.vue';

/** Registrar una mejora o un costo posterior de un activo en uso, con los costos que agrupa. */
defineProps<{ abierta: boolean; errores: Record<string, string>; enviando: boolean; esEdificio: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: []; agregar: []; quitar: [clave: number]; componente: [] }>();
const edicion = defineModel<EdicionDeMejora>({ required: true });
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Registrar mejora o costo posterior" ancha @cerrar="emit('cerrar')">
    <form id="form-de-mejora" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <CampoSelector
        v-model="edicion.clase"
        etiqueta="Qué es"
        :opciones="opcionesDeLista(OPCIONES_DE_CLASE_DE_MEJORA, false)"
        requerido
        :error="errores.clase"
      />
      <CampoTexto
        v-model="edicion.descripcion"
        etiqueta="Descripción"
        requerido
        :longitud-maxima="300"
        :error="errores.descripcion"
      />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto v-model="edicion.fecha" etiqueta="Fecha" tipo="date" requerido :error="errores.fecha" />
        <CampoTexto
          v-if="edicion.clase === 'mejora'"
          v-model="edicion.vidaUtilRestante"
          etiqueta="Vida útil que le queda (meses)"
          tipo="number"
          paso="1"
          ayuda="Opcional: si la mejora alarga la vida del activo."
          :error="errores.vidaUtilRestanteContableMeses"
        />
      </div>
      <CampoInterruptor
        v-if="edicion.clase === 'mejora'"
        v-model="edicion.separable"
        etiqueta="Se puede separar y tiene vida propia"
        descripcion="Un motor, un techo, una bomba."
      />
      <SugerenciaDeComponente v-if="sugiereComponente(edicion)" @dar-de-alta="emit('componente')" />
      <CampoInterruptor
        v-if="esEdificio"
        v-model="edicion.noEsEdificacion"
        etiqueta="No es edificación ni requiere licencia"
        descripcion="Marque lo que no es de construir el edificio."
      />

      <p v-if="errores.costosManuales" class="text-sm text-red-700 dark:text-red-400" role="alert">
        {{ errores.costosManuales }}
      </p>
      <CamposDeCostoDeMejora
        v-for="(renglon, indice) in edicion.renglones"
        :key="renglon.clave"
        v-model="edicion.renglones[indice]!"
        :indice="indice"
        :errores="errores"
        :puede-quitar="edicion.renglones.length > 1"
        @quitar="emit('quitar', renglon.clave)"
      />
      <div class="flex flex-wrap items-center justify-between gap-3">
        <BotonBase variante="secundario" :icono="Plus" @click="emit('agregar')">Agregar otro costo</BotonBase>
        <p class="text-sm tabular-nums">
          Total:
          <strong>{{ formatearMonto(textoDeCentavos(totalDeMejoraEnCentavos(edicion))) }}</strong>
        </p>
      </div>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-mejora" :cargando="enviando">Registrar</BotonBase>
    </template>
  </VentanaModal>
</template>
