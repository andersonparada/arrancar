<script setup lang="ts">
import { HandCoins } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import CamposDeLiquidacion from '../componentes/CamposDeLiquidacion.vue';
import CifrasDelAnticipo from '../componentes/CifrasDelAnticipo.vue';
import SeccionDeGastos from '../componentes/SeccionDeGastos.vue';
import { usarLiquidacion } from '../composables/liquidacion/usar-liquidacion';

/** Liquidar un anticipo: lo gastado ya está a la vista; se reparte lo que falta (o se reembolsa lo de más) y se confirma. */
const props = defineProps<{ id: string }>();
const router = useRouter();
const l = usarLiquidacion(() => props.id);
const volver = () => router.push({ name: 'cuentas-por-liquidar.anticipos.ficha', params: { id: props.id } });
</script>

<template>
  <div v-if="l.anticipo.value && l.cuadre.value && l.anticipo.value.puedeLiquidar" class="space-y-5">
    <EncabezadoPagina
      :titulo="`Liquidar el anticipo ${l.anticipo.value.numero}`"
      :descripcion="`Para ${l.anticipo.value.beneficiario}`"
      :volver="{ texto: 'Volver al anticipo', ruta: { name: 'cuentas-por-liquidar.anticipos.ficha', params: { id } } }"
    />
    <CifrasDelAnticipo :ficha="l.anticipo.value" />
    <form class="space-y-5" novalidate @submit.prevent="l.liquidar">
      <TarjetaBase>
        <CamposDeLiquidacion
          v-model="l.edicion"
          :medios="l.medios.value"
          :cuadre="l.cuadre.value"
          :es-empleado="l.anticipo.value.esEmpleado"
          :errores="l.errores.value"
          @devuelto="l.escribirDevuelto"
          @no-liquidado="l.escribirNoLiquidado"
        />
      </TarjetaBase>
      <div
        class="sticky bottom-0 -mx-4 flex flex-wrap justify-end gap-2 border-t border-tierra-200 bg-white/95 p-3 backdrop-blur sm:mx-0 sm:rounded-xl dark:border-tierra-700 dark:bg-tierra-900/95"
      >
        <BotonBase variante="secundario" @click="volver">Cancelar</BotonBase>
        <BotonBase tipo="submit" :icono="HandCoins" :cargando="l.enviando.value">Liquidar el anticipo</BotonBase>
      </div>
    </form>
    <details class="rounded-2xl ring-1 ring-tierra-200/70 dark:ring-tierra-700">
      <summary class="cursor-pointer p-4 text-sm font-semibold">Ver los gastos que se están liquidando</summary>
      <div class="p-4 pt-0">
        <SeccionDeGastos :gastos="l.gastos.value" :puede-quitar="false" />
      </div>
    </details>
  </div>
  <EstadoVacio
    v-else-if="l.anticipo.value"
    :icono="HandCoins"
    titulo="Este anticipo no se puede liquidar ahora"
    descripcion="Puede que ya esté liquidado o anulado. Vuelva a su ficha para ver su estado; si está liquidado, puede reabrirlo desde allí."
  >
    <BotonBase variante="secundario" @click="volver">Volver al anticipo</BotonBase>
  </EstadoVacio>
  <p v-else-if="l.cargando.value" class="text-sm text-tierra-500" role="status">Preparando la liquidación…</p>
  <EstadoVacio
    v-else
    :icono="HandCoins"
    titulo="No se encontró este anticipo"
    descripcion="Puede que el enlace no corresponda a un anticipo de esta empresa o que usted no tenga permiso para verlo."
  />
</template>
