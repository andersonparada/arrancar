<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import { formatearFecha } from '@/modulos/core/utilidades/formato';
import { detallesDeValor } from '../../composables/inmuebles/valores/detalles-de-valor';
import { OPCIONES_DE_FUENTE } from '../../composables/inmuebles/valores/edicion-de-valor';
import type { FuenteDeValor, ValorDeInmueble } from '../../servicios/valores-de-inmueble.api';

/** Una serie de valores del inmueble (su matrícula fiscal o su catastro), del más reciente al más antiguo. */
defineProps<{ fuente: FuenteDeValor; valores: ValorDeInmueble[]; vigente: ValorDeInmueble | null }>();
const emit = defineEmits<{ registrar: []; eliminar: [valor: ValorDeInmueble] }>();
</script>

<template>
  <section class="space-y-3" :aria-label="OPCIONES_DE_FUENTE[fuente]">
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-base font-semibold">{{ OPCIONES_DE_FUENTE[fuente] }}</h3>
      <BotonBase v-permiso="'empresas.inmuebles.editar'" variante="secundario" :icono="Plus" @click="emit('registrar')">
        Registrar valor
      </BotonBase>
    </div>
    <p v-if="!valores.length" class="text-sm text-tierra-500">Todavía no hay valores de esta serie.</p>
    <ul v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <li v-for="valor in valores" :key="valor.id">
        <TarjetaDeRegistro
          :titulo="`Vigente desde ${formatearFecha(valor.vigenteDesde)}`"
          :detalles="detallesDeValor(valor)"
          :insignia="valor.id === vigente?.id ? 'Vigente hoy' : undefined"
          permiso="empresas.inmuebles.editar"
          sin-editar
        >
          <template #acciones-extra>
            <BotonBase
              v-permiso="'empresas.inmuebles.editar'"
              variante="fantasma"
              pequeno
              :icono="Trash2"
              @click="emit('eliminar', valor)"
            >
              Eliminar
            </BotonBase>
          </template>
        </TarjetaDeRegistro>
      </li>
    </ul>
  </section>
</template>
