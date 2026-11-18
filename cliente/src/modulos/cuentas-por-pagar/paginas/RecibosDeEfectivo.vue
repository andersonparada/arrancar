<script setup lang="ts">
import { Banknote, Printer } from 'lucide-vue-next';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import HojaDelComprobante from '../componentes/HojaDelComprobante.vue';
import { idsDeLosRecibos } from '../composables/pagos/recibos-de-efectivo';
import { usarRecibosDeEfectivo } from '../composables/pagos/usar-recibos-de-efectivo';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

/** Los recibos de un reparto listos para imprimir: por proveedor, un original y una copia, cada hoja en su página. */
const route = useRoute();
const ids = computed(() => idsDeLosRecibos(route.query.pagos));
const { recibos, cargando, faltan, imprimir } = usarRecibosDeEfectivo(() => ids.value);
const volver = { texto: VENTANAS_CUENTAS_POR_PAGAR.pagos.titulo, ruta: { name: 'cuentas-por-pagar.pagos' } };
</script>

<template>
  <div v-if="recibos.length > 0" class="space-y-4">
    <div class="space-y-3 print:hidden">
      <EncabezadoPagina
        :titulo="recibos.length === 1 ? 'Imprimir el recibo' : `Imprimir ${recibos.length} recibos`"
        descripcion="Cada proveedor tiene su recibo, con original y copia. Firme el original quien recibe el efectivo: se queda en la empresa."
        :volver="volver"
      >
        <BotonBase :icono="Printer" @click="imprimir">Imprimir todos</BotonBase>
      </EncabezadoPagina>
      <p v-if="faltan.length > 0" class="rounded-xl bg-trigo-300/30 p-3 text-sm dark:bg-trigo-500/10" role="alert">
        No se pudo preparar {{ faltan.length === 1 ? 'un recibo' : `${faltan.length} recibos` }} (puede que no tenga
        permiso para verlo). Ábralo desde la lista de pagos.
      </p>
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        Esta es la vista previa. Imprimir no cambia nada en el sistema y puede hacerlo las veces que necesite.
      </p>
    </div>

    <div class="space-y-6 print:space-y-0">
      <template v-for="recibo in recibos" :key="recibo.pago.id">
        <HojaDelComprobante
          v-for="hoja in recibo.hojas"
          :key="`${recibo.pago.id}-${hoja}`"
          :comprobante="recibo"
          :rotulo="hoja"
          class="print:break-after-page print:last:break-after-auto"
        />
      </template>
    </div>
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500 print:hidden" role="status">Preparando los recibos…</p>
  <div v-else class="space-y-4 print:hidden">
    <EncabezadoPagina titulo="Imprimir los recibos" :volver="volver" />
    <EstadoVacio
      :icono="Banknote"
      titulo="No hay recibos para imprimir"
      descripcion="El enlace no trae pagos o usted no tiene permiso para verlos. Abra el pago desde la lista de pagos y use «Comprobante»."
    />
  </div>
</template>
