<script setup lang="ts">
import { CircleCheck } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import { detallesDeFichaDeRetiro } from '../composables/retiros/ficha-de-retiro';
import type { EdicionDeLaVentanaDeRetiro } from '../composables/retiros/usar-ventana-de-retiro';
import type { MediosDePago } from '../servicios/tipos-de-pagos';
import type { Retiro } from '../servicios/tipos-de-retiros';
import AvisosDelPago from './AvisosDelPago.vue';
import CamposDeRetiro from './CamposDeRetiro.vue';

/**
 * Retirar efectivo del banco para pagar a proveedores. Al registrarlo muestra el resultado con los avisos (de bancarización
 * y de Bancos) y lleva a repartir el efectivo.
 */
defineProps<{
  resultado: Retiro | null;
  medios: MediosDePago | null;
  custodios: OpcionBuscable<string>[];
  puedeElegirUsuario: boolean;
  cargando: boolean;
  errores: Record<string, string>;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeLaVentanaDeRetiro>({ required: true });
const clase =
  'inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-tierra-800 ring-1 ring-tierra-200 hover:bg-tierra-100 dark:bg-tierra-800 dark:text-tierra-100 dark:ring-tierra-700 dark:hover:bg-tierra-700';
</script>

<template>
  <VentanaModal
    :abierta="edicion.abierta"
    :titulo="resultado ? 'Retiro registrado' : 'Retirar efectivo'"
    ancha
    @cerrar="emit('cerrar')"
  >
    <div v-if="resultado" class="space-y-4">
      <div class="flex items-start gap-3" role="status">
        <CircleCheck class="mt-0.5 size-6 shrink-0 text-campo-700 dark:text-campo-300" aria-hidden="true" />
        <p class="font-medium">
          Retiro {{ resultado.numero }} registrado. Ahora reparta el efectivo entre los proveedores.
        </p>
      </div>
      <DatosDelRegistro :detalles="detallesDeFichaDeRetiro(resultado)" />
      <AvisosDelPago :avisos="resultado.avisos" titulo="Revise estos avisos" />
    </div>
    <form v-else id="form-retiro" novalidate @submit.prevent="emit('guardar')">
      <CamposDeRetiro
        v-model="edicion"
        :medios="medios"
        :custodios="custodios"
        :puede-elegir-usuario="puedeElegirUsuario"
        :cargando="cargando"
        :errores="errores"
      />
    </form>
    <template #pie>
      <template v-if="resultado">
        <BotonBase variante="secundario" @click="emit('cerrar')">Cerrar</BotonBase>
        <RouterLink :to="{ name: 'cuentas-por-pagar.retiros.ficha', params: { id: resultado.id } }" :class="clase">
          Ver el retiro
        </RouterLink>
        <RouterLink
          v-if="resultado.forma === 'cheque'"
          v-permiso="'bancos.cheques.imprimir'"
          :to="{ name: 'bancos.cheques', query: { cuentaBancariaId: resultado.movimiento.cuentaBancariaId } }"
          :class="clase"
        >
          Imprimir el cheque
        </RouterLink>
        <RouterLink
          v-permiso="'cuentas-por-pagar.pagos.pagar-en-efectivo'"
          :to="{ name: 'cuentas-por-pagar.retiros.pagar', params: { id: resultado.id } }"
          class="inline-flex items-center justify-center rounded-lg bg-campo-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-campo-800 dark:bg-campo-600 dark:hover:bg-campo-500"
        >
          Pagar en efectivo
        </RouterLink>
      </template>
      <template v-else>
        <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
        <BotonBase tipo="submit" form="form-retiro" :cargando="enviando">Registrar el retiro</BotonBase>
      </template>
    </template>
  </VentanaModal>
</template>
