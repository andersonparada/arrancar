<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  AVISO_DE_DESCUENTO,
  AVISO_DE_DIFERENCIA_CON_RETENCION,
  tieneRetencion,
} from '../composables/pagos/avisos-del-pago';
import { diferenciaOfrecible, residuoDelCargo } from '../composables/pagos/edicion-de-pago';
import { centavosDe, textoDeCentavos } from '../composables/dinero';
import { tituloDeDocumento } from '../composables/detalles-de-documento';
import type { CargoParaPagar } from '../servicios/tipos-de-pagos';

/**
 * Un cargo autorizado en la pantalla de pago: lo que se debe, la retención que se descontará y lo que se le paga.
 * Vacío o cero es «no pagar este documento». La diferencia de centavos solo se ofrece si el usuario puede ajustar.
 */
const props = defineProps<{
  cargo: CargoParaPagar;
  tope: string;
  error?: string;
  /** Muestra la casilla de la diferencia (permiso de ajustar y una forma que lo admite). */
  puedeSaldar: boolean;
  saldada: boolean;
}>();
const monto = defineModel<string>({ default: '' });
const emit = defineEmits<{ alternarDiferencia: [] }>();

const pagando = computed(() => (centavosDe(monto.value) ?? 0) > 0);
const diferencia = computed(() => diferenciaOfrecible(props.cargo, monto.value, props.tope));
const sobrante = computed(() => residuoDelCargo(props.cargo, monto.value));
const pasaDelTope = computed(() => sobrante.value > 0 && diferencia.value === null);
const conRetencion = computed(() => (centavosDe(props.cargo.retencionPorDescontar) ?? 0) > 0);

const escribir = (valor: string | number | null | undefined): void => {
  monto.value = valor === null || valor === undefined ? '' : String(valor);
};
const alternar = (): void => {
  monto.value = pagando.value ? '' : props.cargo.saldo;
};
</script>

<template>
  <li
    class="rounded-xl p-3 ring-1 ring-tierra-200 sm:p-4 dark:ring-tierra-700"
    :class="{ 'bg-campo-50/50 dark:bg-campo-950/20': pagando }"
  >
    <div class="flex items-start gap-3">
      <input
        type="checkbox"
        class="mt-1 size-5 shrink-0 rounded accent-campo-700"
        :checked="pagando"
        :aria-label="`Pagar ${tituloDeDocumento(cargo)}`"
        @change="alternar"
      />
      <div class="min-w-0 flex-1">
        <p class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <RouterLink
            :to="{ name: 'cuentas-por-pagar.documentos.ficha', params: { documentoId: cargo.id } }"
            class="font-medium underline-offset-2 hover:underline"
          >
            {{ tituloDeDocumento(cargo) }}
          </RouterLink>
          <InsigniaBase v-if="cargo.origen === 'saldo_inicial'">Saldo inicial</InsigniaBase>
          <InsigniaBase v-if="cargo.tieneActivoFijo">Activo fijo</InsigniaBase>
          <InsigniaBase v-if="cargo.sobreUmbralDeBancarizacion" tono="trigo">Pide pago bancario</InsigniaBase>
        </p>
        <p class="mt-1 text-sm text-tierra-600 dark:text-tierra-300">
          Emitida {{ formatearFecha(cargo.fechaDeEmision) }}
          <template v-if="cargo.vencimiento"> · vence {{ formatearFecha(cargo.vencimiento) }}</template>
          · debe <strong>{{ formatearMonto(cargo.saldo) }}</strong>
        </p>
        <p v-if="conRetencion" class="mt-1 text-xs text-tierra-600 dark:text-tierra-300">
          Retención que se descontará con este pago: {{ formatearMonto(cargo.retencionPorDescontar) }} (el saldo ya
          viene sin ella).
        </p>
      </div>
    </div>

    <div class="mt-3 flex items-end gap-2 sm:ml-8">
      <div class="min-w-0 flex-1 sm:max-w-56">
        <CampoTexto
          :model-value="monto"
          etiqueta="Monto a pagar"
          tipo="number"
          paso="0.01"
          :error="error"
          @update:model-value="escribir"
        />
      </div>
      <BotonBase variante="secundario" @click="escribir(cargo.saldo)">Todo</BotonBase>
    </div>

    <div v-if="puedeSaldar && diferencia !== null" class="mt-3 sm:ml-8">
      <label class="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          class="mt-0.5 size-4 accent-campo-700"
          :checked="saldada"
          @change="emit('alternarDiferencia')"
        />
        <span>Dar por saldada la diferencia de {{ formatearMonto(textoDeCentavos(diferencia)) }}</span>
      </label>
      <p v-if="tieneRetencion(cargo)" class="mt-1 text-xs text-tierra-600 dark:text-tierra-300">
        {{ AVISO_DE_DIFERENCIA_CON_RETENCION }}
      </p>
    </div>
    <p v-else-if="pasaDelTope" class="mt-3 text-xs text-tierra-600 sm:ml-8 dark:text-tierra-300">
      Quedarán {{ formatearMonto(textoDeCentavos(sobrante)) }} sin pagar de este documento. {{ AVISO_DE_DESCUENTO }}
    </p>
  </li>
</template>
