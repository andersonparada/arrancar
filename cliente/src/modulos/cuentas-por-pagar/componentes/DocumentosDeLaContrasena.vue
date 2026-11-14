<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { etiquetaDeDocumento } from '../composables/contrasenas/edicion-de-contrasena';
import { textoDeEstado, tonoDeEstado } from '../composables/detalles-de-documento';
import type { CargoDeContrasena, NotaDeContrasena } from '../servicios/tipos-de-contrasenas';
import { TIPOS_DE_DOCUMENTO } from '../textos';

/** Las facturas y las notas de la contraseña con sus montos de hoy; quitar solo si el servidor deja editarla. */
defineProps<{ cargos: CargoDeContrasena[]; notas: NotaDeContrasena[]; puedeQuitar: boolean }>();
const emit = defineEmits<{ quitar: [id: string, nombre: string] }>();
const tarjeta =
  'flex flex-col gap-3 rounded-xl p-4 ring-1 ring-tierra-200 sm:flex-row sm:items-start dark:ring-tierra-700';
const nombreDelCargo = (cargo: CargoDeContrasena) => `${TIPOS_DE_DOCUMENTO[cargo.tipo]} ${etiquetaDeDocumento(cargo)}`;
</script>

<template>
  <div class="space-y-5">
    <section aria-labelledby="cargos-de-la-contrasena">
      <h3 id="cargos-de-la-contrasena" class="mb-2 font-medium">Facturas ({{ cargos.length }})</h3>
      <ul class="space-y-2">
        <li v-for="cargo in cargos" :key="cargo.documentoId" :class="tarjeta">
          <div class="min-w-0 flex-1">
            <p class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <RouterLink
                :to="{ name: 'cuentas-por-pagar.documentos.ficha', params: { documentoId: cargo.documentoId } }"
                class="font-medium underline-offset-2 hover:underline"
              >
                {{ nombreDelCargo(cargo) }}
              </RouterLink>
              <InsigniaBase :tono="tonoDeEstado(cargo.estado)">{{ textoDeEstado(cargo.estado) }}</InsigniaBase>
              <InsigniaBase v-if="cargo.origen === 'saldo_inicial'">Saldo inicial</InsigniaBase>
            </p>
            <p class="mt-1 text-sm text-tierra-600 dark:text-tierra-300">
              Emitida {{ formatearFecha(cargo.fechaEmision) }}
            </p>
            <dl class="mt-2 grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt class="text-xs text-tierra-500">Total</dt>
                <dd>{{ formatearMonto(cargo.total) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-tierra-500">Retenciones</dt>
                <dd>{{ formatearMonto(cargo.retenciones) }}</dd>
              </div>
              <div>
                <dt class="text-xs text-tierra-500">Rebajado</dt>
                <dd>{{ formatearMonto(cargo.rebajado) }}</dd>
              </div>
            </dl>
          </div>
          <div class="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
            <p class="text-right">
              <span class="block text-lg font-semibold">{{ formatearMonto(cargo.saldo) }}</span>
              <span class="block text-xs text-tierra-500">por pagar</span>
            </p>
            <span v-if="puedeQuitar" v-permiso="'cuentas-por-pagar.contrasenas.editar'" class="contents">
              <BotonBase
                variante="fantasma"
                pequeno
                :icono="Trash2"
                @click="emit('quitar', cargo.documentoId, `el documento ${nombreDelCargo(cargo)}`)"
              >
                Quitar
              </BotonBase>
            </span>
          </div>
        </li>
      </ul>
    </section>

    <section v-if="notas.length > 0" aria-labelledby="notas-de-la-contrasena">
      <h3 id="notas-de-la-contrasena" class="mb-2 font-medium">Notas de crédito a favor ({{ notas.length }})</h3>
      <ul class="space-y-2">
        <li v-for="nota in notas" :key="nota.documentoId" :class="tarjeta">
          <div class="min-w-0 flex-1">
            <p class="font-medium">Nota de crédito {{ etiquetaDeDocumento(nota) }}</p>
            <p class="mt-1 text-sm text-tierra-600 dark:text-tierra-300">
              Emitida {{ formatearFecha(nota.fechaEmision) }} · Libre fuera de esta contraseña:
              {{ formatearMonto(nota.saldoLibre) }}
            </p>
          </div>
          <div class="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
            <p class="text-right">
              <span class="block text-lg font-semibold text-campo-700 dark:text-campo-300">
                − {{ formatearMonto(nota.aplicadoEnLaContrasena) }}
              </span>
              <span class="block text-xs text-tierra-500">compensa en esta contraseña</span>
            </p>
            <span v-if="puedeQuitar" v-permiso="'cuentas-por-pagar.contrasenas.editar'" class="contents">
              <BotonBase
                variante="fantasma"
                pequeno
                :icono="Trash2"
                @click="emit('quitar', nota.documentoId, `la nota de crédito ${etiquetaDeDocumento(nota)}`)"
              >
                Quitar
              </BotonBase>
            </span>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
