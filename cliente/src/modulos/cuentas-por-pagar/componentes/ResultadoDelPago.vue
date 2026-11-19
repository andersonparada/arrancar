<script setup lang="ts">
import { CircleCheck, Plus } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import { detallesDelPagoRegistrado, textoDeExitoDelPago } from '../composables/pagos/detalles-de-pago';
import type { PagoRegistrado } from '../servicios/tipos-de-pagos';
import AvisosDelPago from './AvisosDelPago.vue';

/** Lo que se ve al registrar el pago: el resumen, los avisos de Cuentas por pagar y de Bancos y a dónde seguir. */
defineProps<{ pago: PagoRegistrado }>();
defineEmits<{ otro: [] }>();
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-start gap-3" role="status">
      <CircleCheck class="mt-0.5 size-6 shrink-0 text-campo-700 dark:text-campo-300" aria-hidden="true" />
      <p class="font-medium">{{ textoDeExitoDelPago(pago) }}</p>
    </div>
    <DatosDelRegistro :detalles="detallesDelPagoRegistrado(pago)" />
    <AvisosDelPago :avisos="pago.avisos" titulo="Revise estos avisos" />
    <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      <RouterLink
        :to="{ name: 'cuentas-por-pagar.pagos.ficha', params: { id: pago.id } }"
        class="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-tierra-800 ring-1 ring-tierra-200 hover:bg-tierra-100 dark:bg-tierra-800 dark:text-tierra-100 dark:ring-tierra-700 dark:hover:bg-tierra-700"
      >
        Ver el pago {{ pago.numero }}
      </RouterLink>
      <RouterLink
        :to="{ name: 'cuentas-por-pagar.pagos.comprobante', params: { id: pago.id } }"
        class="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-tierra-800 ring-1 ring-tierra-200 hover:bg-tierra-100 dark:bg-tierra-800 dark:text-tierra-100 dark:ring-tierra-700 dark:hover:bg-tierra-700"
      >
        Imprimir el comprobante
      </RouterLink>
      <RouterLink
        v-if="pago.forma === 'cheque' && pago.movimiento"
        v-permiso="'bancos.cheques.imprimir'"
        :to="{ name: 'bancos.cheques', query: { cuentaBancariaId: pago.movimiento.cuentaBancariaId } }"
        class="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-tierra-800 ring-1 ring-tierra-200 hover:bg-tierra-100 dark:bg-tierra-800 dark:text-tierra-100 dark:ring-tierra-700 dark:hover:bg-tierra-700"
      >
        Imprimir el cheque
      </RouterLink>
      <span v-permiso="'cuentas-por-pagar.contrasenas.ver'" class="contents">
        <RouterLink
          v-for="contrasena in pago.contrasenas"
          :key="contrasena.id"
          :to="{ name: 'cuentas-por-pagar.contrasenas.ficha', params: { id: contrasena.id } }"
          class="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-tierra-800 ring-1 ring-tierra-200 hover:bg-tierra-100 dark:bg-tierra-800 dark:text-tierra-100 dark:ring-tierra-700 dark:hover:bg-tierra-700"
        >
          Ver la contraseña {{ contrasena.numero }}
        </RouterLink>
      </span>
      <BotonBase :icono="Plus" @click="$emit('otro')">Registrar otro pago</BotonBase>
    </div>
  </div>
</template>
