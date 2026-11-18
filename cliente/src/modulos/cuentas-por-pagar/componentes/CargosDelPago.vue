<script setup lang="ts">
import { computed } from 'vue';
import { Plus, X } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeCentavos } from '../composables/dinero';
import type { EdicionDePago } from '../composables/pagos/edicion-de-pago';
import { gruposIncluidos, gruposPorAgregar } from '../composables/pagos/grupos-del-pago';
import { tituloDeDocumento } from '../composables/detalles-de-documento';
import type { ParaPagar } from '../servicios/tipos-de-pagos';
import FilaDeCargoDelPago from './FilaDeCargoDelPago.vue';

/**
 * Los cargos autorizados que se pueden pagar, agrupados por contraseña (M2): la abierta y las que se agreguen del mismo
 * proveedor. Los que todavía no se autorizaron se ven apagados, con la razón.
 */
const props = defineProps<{ datos: ParaPagar; errores: Record<string, string>; puedeSaldar: boolean }>();
const edicion = defineModel<EdicionDePago>({ required: true });
const emit = defineEmits<{ agregar: [id: string]; quitar: [id: string] }>();

const incluidos = computed(() => gruposIncluidos(edicion.value, props.datos));
const porAgregar = computed(() => gruposPorAgregar(edicion.value, props.datos));
const sinAutorizar = computed(() =>
  props.datos.noAutorizados.filter(
    ({ origen }) => edicion.value.forma !== 'cuenta_de_apertura' || origen === 'saldo_inicial',
  ),
);

const alternarDiferencia = (cargoId: string): void => {
  const marcadas = edicion.value.diferencias;
  edicion.value.diferencias = marcadas.includes(cargoId)
    ? marcadas.filter((id) => id !== cargoId)
    : [...marcadas, cargoId];
};
</script>

<template>
  <div class="space-y-5">
    <p v-if="errores.aplicaciones" class="text-sm text-red-700 dark:text-red-400" role="alert">
      {{ errores.aplicaciones }}
    </p>

    <p
      v-if="incluidos.length === 0 && porAgregar.length === 0"
      class="rounded-lg bg-tierra-100 px-3 py-3 text-sm text-tierra-700 dark:bg-tierra-800 dark:text-tierra-200"
    >
      {{
        edicion.forma === 'cuenta_de_apertura'
          ? 'Este proveedor no tiene saldos iniciales autorizados por pagar.'
          : 'Este proveedor no tiene documentos autorizados con saldo en una contraseña vigente.'
      }}
    </p>

    <section v-for="grupo in incluidos" :key="grupo.id" :aria-labelledby="`grupo-${grupo.id}`">
      <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 :id="`grupo-${grupo.id}`" class="font-medium">
          Contraseña {{ grupo.numero }}
          <span class="text-sm font-normal text-tierra-600 dark:text-tierra-300">
            · {{ formatearFecha(grupo.fecha) }} · se paga {{ formatearMonto(textoDeCentavos(grupo.pagando)) }} de
            {{ formatearMonto(grupo.porPagar) }}
          </span>
        </h3>
        <BotonBase v-if="incluidos.length > 1" variante="fantasma" pequeno :icono="X" @click="emit('quitar', grupo.id)">
          Quitar del pago
        </BotonBase>
      </div>
      <ul class="space-y-2">
        <FilaDeCargoDelPago
          v-for="cargo in grupo.cargos"
          :key="cargo.id"
          v-model="edicion.montos[cargo.id]"
          :cargo="cargo"
          :tope="datos.topeDiferencia"
          :error="errores[`monto.${cargo.id}`]"
          :puede-saldar="puedeSaldar && edicion.forma !== 'cuenta_de_apertura'"
          :saldada="edicion.diferencias.includes(cargo.id)"
          @alternar-diferencia="alternarDiferencia(cargo.id)"
        />
      </ul>
    </section>

    <section v-if="porAgregar.length > 0" aria-labelledby="otras-contrasenas">
      <h3 id="otras-contrasenas" class="mb-2 text-sm font-medium text-tierra-700 dark:text-tierra-200">
        Agregar otra contraseña del proveedor
      </h3>
      <ul class="flex flex-wrap gap-2">
        <li v-for="grupo in porAgregar" :key="grupo.id">
          <BotonBase variante="secundario" :icono="Plus" @click="emit('agregar', grupo.id)">
            Contraseña {{ grupo.numero }} · {{ grupo.cargos.length }}
            {{ grupo.cargos.length === 1 ? 'documento' : 'documentos' }} · {{ formatearMonto(grupo.porPagar) }}
          </BotonBase>
        </li>
      </ul>
    </section>

    <section v-if="sinAutorizar.length > 0" aria-labelledby="sin-autorizar">
      <h3 id="sin-autorizar" class="mb-2 text-sm font-medium text-tierra-700 dark:text-tierra-200">
        Sin autorizar: no se pueden pagar
      </h3>
      <ul class="space-y-1 text-sm text-tierra-600 dark:text-tierra-300">
        <li v-for="cargo in sinAutorizar" :key="cargo.id" class="rounded-lg bg-tierra-100 px-3 py-2 dark:bg-tierra-800">
          <RouterLink
            :to="{ name: 'cuentas-por-pagar.documentos.ficha', params: { documentoId: cargo.id } }"
            class="underline-offset-2 hover:underline"
          >
            {{ tituloDeDocumento(cargo) }}
          </RouterLink>
          · debe {{ formatearMonto(cargo.saldo) }}. Autorícelo en Documentos por pagar para poder pagarlo.
        </li>
      </ul>
    </section>
  </div>
</template>
