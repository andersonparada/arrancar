<script setup lang="ts">
import { computed } from 'vue';
import { Info, ShieldAlert } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  fechaMinimaDeAplicacion,
  MAXIMO_DE_LA_REFERENCIA,
  montoMaximoDelCargo,
  restanteDeLaNota,
  resumenDeAplicacion,
  tocaBancarizacion,
  totalAplicado,
  type EdicionDeAplicacion,
} from '../composables/aplicacion-de-nota';
import { textoDeCentavos } from '../composables/dinero';
import { AVISO_DE_BANCARIZACION, AYUDA_DE_LA_APLICACION, AYUDA_DE_LA_FECHA_DE_APLICACION } from '../textos';
import FilaDeCargoParaAplicar from './FilaDeCargoParaAplicar.vue';

/** Aplicar el saldo a favor de una nota a otros documentos del proveedor; los montos se pueden cambiar en cada fila. */
defineProps<{ errores: Record<string, string>; enviando: boolean }>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeAplicacion>({ required: true });

const restante = computed(() => restanteDeLaNota(edicion.value));
const sePaso = computed(() => restante.value < 0);
const sinNada = computed(() => totalAplicado(edicion.value) === 0);
const minima = computed(() => fechaMinimaDeAplicacion(edicion.value));
const conBancarizacion = computed(() => tocaBancarizacion(edicion.value));

function repartirDeNuevo(): void {
  let libre = Math.round(Number(edicion.value.saldoLibre) * 100);
  const montos: Record<string, string> = {};
  for (const cargo of edicion.value.cargos) {
    const centavos = Math.min(libre, Math.round(Number(cargo.propuesto) * 100));
    montos[cargo.id] = centavos > 0 ? textoDeCentavos(centavos) : '';
    libre -= Math.max(centavos, 0);
  }
  edicion.value.montos = montos;
}
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" titulo="Aplicar el saldo a favor" ancha @cerrar="emit('cerrar')">
    <form id="form-aplicacion" class="space-y-4" @submit.prevent="emit('guardar')">
      <p
        class="flex gap-2 rounded-lg bg-trigo-300/40 p-3 text-sm text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
      >
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ AYUDA_DE_LA_APLICACION }}</span>
      </p>
      <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>
          Saldo a favor de la nota: <strong>{{ formatearMonto(edicion.saldoLibre) }}</strong>
        </span>
        <BotonBase v-if="edicion.cargos.length" variante="secundario" @click="repartirDeNuevo">
          Repartir de nuevo
        </BotonBase>
      </div>

      <p v-if="!edicion.cargos.length" class="rounded-lg bg-tierra-100 p-4 text-sm dark:bg-tierra-800">
        El proveedor no tiene otros documentos con saldo por pagar. Cuando registre uno, podrá aplicarle esta nota.
      </p>
      <ul v-else class="space-y-2">
        <li v-for="cargo in edicion.cargos" :key="cargo.id">
          <FilaDeCargoParaAplicar
            v-model="edicion.montos[cargo.id]"
            :cargo="cargo"
            :maximo="montoMaximoDelCargo(edicion, cargo)"
            :error="errores[`monto-${cargo.id}`]"
          />
        </li>
      </ul>

      <p
        class="text-sm font-medium"
        :class="sePaso ? 'text-red-700 dark:text-red-400' : ''"
        role="status"
        aria-live="polite"
      >
        <template v-if="sinNada">Escriba cuánto aplicar a cada documento.</template>
        <template v-else>{{ resumenDeAplicacion(edicion) }}</template>
      </p>
      <p v-if="errores.total" class="text-sm text-red-700 dark:text-red-400" role="alert">{{ errores.total }}</p>

      <p
        v-if="conBancarizacion"
        class="flex gap-2 rounded-lg bg-trigo-300/40 p-3 text-sm text-tierra-800 dark:bg-trigo-500/20 dark:text-trigo-300"
        role="note"
      >
        <ShieldAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ AVISO_DE_BANCARIZACION }}</span>
      </p>

      <div class="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          v-model="edicion.fecha"
          etiqueta="Fecha del acuerdo"
          tipo="date"
          requerido
          :ayuda="minima ? `Desde el ${minima}. ${AYUDA_DE_LA_FECHA_DE_APLICACION}` : AYUDA_DE_LA_FECHA_DE_APLICACION"
          :error="errores.fecha"
        />
        <CampoTexto
          v-model="edicion.referencia"
          :etiqueta="conBancarizacion ? 'Referencia del acuerdo (recomendada)' : 'Referencia del acuerdo'"
          :longitud-maxima="MAXIMO_DE_LA_REFERENCIA"
          ayuda="Opcional: número de acuerdo, correo o recibo."
          :error="errores.referencia"
        />
      </div>
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-aplicacion" :cargando="enviando" :deshabilitado="sinNada || sePaso">
        Aplicar saldo a favor
      </BotonBase>
    </template>
  </VentanaModal>
</template>
