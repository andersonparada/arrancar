<script setup lang="ts">
import { Ban, HandCoins, Printer } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { detallesDeVale, marcaDeVale } from '../composables/movimientos/detalles-de-movimientos';
import type { ValeResumen } from '../servicios/tipos-de-vales';
import EnlaceComoBoton from './EnlaceComoBoton.vue';
import SeccionPlegable from './SeccionPlegable.vue';
import TarjetaDeMovimiento from './TarjetaDeMovimiento.vue';

/**
 * Los vales provisionales del fondo. Los abiertos se ven de entrada con su aviso de «vale viejo»; liquidar lleva a la
 * página de liquidación y anular pide el motivo. El servidor dice si se puede anular y por qué no.
 */
const props = defineProps<{ vales: ValeResumen[]; puedeCambiar: boolean }>();
const emit = defineEmits<{ anular: [vale: ValeResumen] }>();

const notasDe = (vale: ValeResumen): string[] => [
  vale.motivo,
  ...vale.avisos,
  ...(vale.motivoDeAnulacion ? [`Anulado: ${vale.motivoDeAnulacion}`] : []),
];
const hayAbiertos = (): boolean => props.vales.some(({ estado }) => estado === 'abierto');
</script>

<template>
  <SeccionPlegable titulo="Vales provisionales" :cantidad="vales.length" :abierta="hayAbiertos()">
    <p v-if="vales.length === 0" class="text-sm text-tierra-600 dark:text-tierra-300">
      Cuando se entregue efectivo del fondo a alguien por justificar, el vale aparece aquí hasta que lo liquide.
    </p>
    <ul v-else class="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <li v-for="vale in vales" :key="vale.id">
        <TarjetaDeMovimiento
          :titulo="`Vale ${vale.numero}`"
          :marca="marcaDeVale(vale)"
          :detalles="detallesDeVale(vale)"
          :notas="notasDe(vale)"
          :anulado="vale.estado === 'anulado'"
        >
          <template v-if="vale.estado === 'abierto' && puedeCambiar">
            <EnlaceComoBoton
              v-permiso="'caja-chica.vales.liquidar'"
              variante="primario"
              pequeno
              :icono="HandCoins"
              :to="{ name: 'caja-chica.vales.liquidar', params: { id: vale.id } }"
            >
              Liquidar
            </EnlaceComoBoton>
            <BotonBase
              v-permiso="'caja-chica.vales.anular'"
              variante="secundario"
              pequeno
              :icono="Ban"
              @click="emit('anular', vale)"
            >
              Anular
            </BotonBase>
          </template>
          <EnlaceComoBoton
            pequeno
            :icono="Printer"
            :to="{ name: 'caja-chica.vales.imprimir', params: { id: vale.id } }"
          >
            Imprimir
          </EnlaceComoBoton>
        </TarjetaDeMovimiento>
      </li>
    </ul>
  </SeccionPlegable>
</template>
