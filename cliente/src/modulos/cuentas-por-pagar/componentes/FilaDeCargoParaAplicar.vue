<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { tituloDeDocumento } from '../composables/detalles-de-documento';
import type { CargoParaAplicar } from '../servicios/tipos';

/** Un documento del proveedor en la ventana de aplicar: sus datos y el monto que se le aplica (`maximo` es lo que cabe). */
const props = defineProps<{ cargo: CargoParaAplicar; maximo: string; error?: string }>();
const monto = defineModel<string>();
const sinAutorizar = (): boolean => props.cargo.estado !== 'autorizado';
const aplicarTodo = (): void => {
  monto.value = props.maximo === '0.00' ? '' : props.maximo;
};
</script>

<template>
  <TarjetaBase class="space-y-3">
    <div class="flex flex-wrap items-center gap-2">
      <span class="font-medium">{{ tituloDeDocumento(cargo) }}</span>
      <InsigniaBase v-if="sinAutorizar()" tono="trigo">Sin autorizar</InsigniaBase>
      <InsigniaBase v-if="cargo.origen === 'saldo_inicial'">Saldo inicial</InsigniaBase>
      <InsigniaBase v-if="cargo.sobreUmbralDeBancarizacion" tono="trigo">Pide acuerdo escrito</InsigniaBase>
    </div>
    <p class="text-sm text-tierra-600 dark:text-tierra-300">
      Emisión {{ formatearFecha(cargo.fechaEmision) }}
      <template v-if="cargo.vencimiento"> · vence {{ formatearFecha(cargo.vencimiento) }}</template>
      · debe <strong>{{ formatearMonto(cargo.saldo) }}</strong>
    </p>
    <div class="flex items-end gap-2">
      <div class="min-w-0 flex-1">
        <CampoTexto v-model="monto" etiqueta="Monto a aplicar" tipo="number" paso="0.01" :error="error" />
      </div>
      <BotonBase variante="secundario" :deshabilitado="maximo === '0.00'" @click="aplicarTodo">
        Todo lo que cabe
      </BotonBase>
    </div>
  </TarjetaBase>
</template>
