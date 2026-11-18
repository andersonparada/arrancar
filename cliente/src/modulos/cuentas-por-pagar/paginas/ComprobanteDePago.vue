<script setup lang="ts">
import { Banknote, Printer } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import HojaDelComprobante from '../componentes/HojaDelComprobante.vue';
import { usarComprobanteDePago } from '../composables/pagos/usar-comprobante-de-pago';

/** El comprobante del pago listo para imprimir: original para el proveedor y copia para la empresa, una hoja cada una. */
const props = defineProps<{ id: string }>();
const { comprobante, cargando, imprimir } = usarComprobanteDePago(() => props.id);
const volver = {
  texto: 'Volver al pago',
  ruta: { name: 'cuentas-por-pagar.pagos.ficha', params: { id: props.id } },
};
</script>

<template>
  <div v-if="comprobante" class="space-y-4">
    <div class="print:hidden">
      <EncabezadoPagina
        :titulo="`${comprobante.esReciboDeEfectivo ? 'Imprimir el recibo' : 'Imprimir el pago'} ${comprobante.pago.numero}`"
        :descripcion="
          comprobante.esReciboDeEfectivo
            ? 'Se imprimen dos hojas: el original, que firma quien recibe el efectivo y se queda en la empresa, y la copia para el proveedor.'
            : 'Se imprimen dos hojas: el original para el proveedor y la copia para la empresa, que firma quien recibe.'
        "
        :volver="volver"
      >
        <BotonBase :icono="Printer" @click="imprimir">Imprimir</BotonBase>
      </EncabezadoPagina>
      <p class="text-sm text-tierra-600 dark:text-tierra-300">
        Esta es la vista previa. Imprimir el comprobante no cambia nada en el sistema y puede hacerlo las veces que
        necesite.
      </p>
    </div>

    <div class="space-y-6 print:space-y-0">
      <HojaDelComprobante
        v-for="hoja in comprobante.hojas"
        :key="hoja"
        :comprobante="comprobante"
        :rotulo="hoja"
        class="print:break-after-page print:last:break-after-auto"
      />
    </div>
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500 print:hidden" role="status">Preparando el comprobante…</p>
  <div v-else class="space-y-4 print:hidden">
    <EncabezadoPagina titulo="Imprimir el pago" :volver="volver" />
    <EstadoVacio
      :icono="Banknote"
      titulo="No se encontró este pago"
      descripcion="Puede que el enlace no corresponda a un pago o que usted no tenga permiso para verlo. Vuelva a la lista de pagos."
    />
  </div>
</template>
