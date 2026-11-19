<script setup lang="ts">
import { HandCoins, Printer } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import HojaDeLiquidacion from '../componentes/HojaDeLiquidacion.vue';
import { usarImpresionDeLiquidacion } from '../composables/liquidacion/usar-impresion-de-liquidacion';

/** La liquidación lista para imprimir y firmar: gastos con y sin documento, lo devuelto o no liquidado y las firmas. */
const props = defineProps<{ id: string }>();
const { anticipo, gastos, cargando, imprimir } = usarImpresionDeLiquidacion(() => props.id);
const volver = (id: string) => ({
  texto: 'Volver al anticipo',
  ruta: { name: 'cuentas-por-liquidar.anticipos.ficha', params: { id } },
});
</script>

<template>
  <div v-if="anticipo && anticipo.liquidacion" class="space-y-4">
    <div class="print:hidden">
      <EncabezadoPagina
        :titulo="`Liquidación del anticipo ${anticipo.numero}`"
        descripcion="Imprímala y fírmela: el beneficiario, quien revisó y quien autorizó."
        :volver="volver(anticipo.id)"
      >
        <BotonBase :icono="Printer" @click="imprimir">Imprimir</BotonBase>
      </EncabezadoPagina>
    </div>
    <HojaDeLiquidacion :anticipo="anticipo" :gastos="gastos" />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500 print:hidden" role="status">Preparando la hoja…</p>
  <EstadoVacio
    v-else
    :icono="HandCoins"
    titulo="Este anticipo todavía no tiene liquidación"
    descripcion="La hoja se imprime cuando el anticipo está liquidado. Vaya a su ficha y liquídelo."
  />
</template>
