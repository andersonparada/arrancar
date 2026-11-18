<script setup lang="ts">
import { Printer } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import HojaDeReciboDeReintegro from '../componentes/HojaDeReciboDeReintegro.vue';
import { usarReciboDeReintegro } from '../composables/reintegros/usar-recibo-de-reintegro';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

/** El recibo del reintegro listo para imprimir y firmar: lo recibido, de qué notas de crédito y la leyenda no tributaria. */
const props = defineProps<{ id: string }>();
const { datos: recibo, cargando, imprimir } = usarReciboDeReintegro(() => props.id);
const volver = {
  texto: VENTANAS_CUENTAS_POR_PAGAR.notasDeCredito.titulo,
  ruta: { name: 'cuentas-por-pagar.notas-de-credito' },
};
</script>

<template>
  <div v-if="recibo" class="space-y-4">
    <div class="print:hidden">
      <EncabezadoPagina
        :titulo="`Recibo de reintegro ${recibo.numero}`"
        descripcion="Imprímalo y fírmelo: el proveedor entrega el dinero y la empresa lo recibe. No es un documento tributario."
        :volver="volver"
      >
        <BotonBase :icono="Printer" @click="imprimir">Imprimir</BotonBase>
      </EncabezadoPagina>
    </div>
    <HojaDeReciboDeReintegro :recibo="recibo" />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500 print:hidden" role="status">Preparando el recibo…</p>
</template>
