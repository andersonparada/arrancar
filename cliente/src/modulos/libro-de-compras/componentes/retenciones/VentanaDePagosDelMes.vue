<script setup lang="ts">
import { CircleDollarSign, Pencil, Ban } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearFecha, formatearFechaHora, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import { nombreDelMes } from '../../composables/retenciones/datos-de-pagos';
import { prefijoDelPlazo, tonoDelEstado } from '../../composables/retenciones/datos-de-retenciones';
import type { GrupoDelMes, PagoDeEntero } from '../../servicios/retenciones.api';
import { NOMBRES_DE_ESTADOS, VENTANA_DE_ENTEROS as textos } from '../../textos-de-retenciones';
import CifrasDelGrupo from './CifrasDelGrupo.vue';

/** Los pagos de un mes y grupo: cuánto se retuvo, lo pagado, y registrar, corregir o anular cada pago. */
defineProps<{ abierta: boolean; grupo: GrupoDelMes | null }>();
defineEmits<{ registrar: []; corregir: [pago: PagoDeEntero]; anular: [pago: PagoDeEntero]; cerrar: [] }>();
</script>

<template>
  <VentanaModal :abierta="abierta" :titulo="textos.pagos" ancha @cerrar="$emit('cerrar')">
    <div v-if="grupo" class="flex flex-col gap-4">
      <div>
        <p class="flex flex-wrap items-center gap-2 font-medium">
          {{ grupo.nombre }} · {{ nombreDelMes(grupo.mes) }} {{ grupo.mes.slice(0, 4) }}
          <InsigniaBase :tono="tonoDelEstado(grupo.estado)">{{ NOMBRES_DE_ESTADOS[grupo.estado] }}</InsigniaBase>
        </p>
        <p v-if="grupo.estado !== 'sin_retenciones'" class="text-sm text-tierra-600 dark:text-tierra-300">
          {{ prefijoDelPlazo(grupo.estado) }} {{ formatearFecha(grupo.plazo) }}
        </p>
      </div>
      <CifrasDelGrupo :grupo="grupo" />
      <p
        v-if="grupo.aviso"
        class="rounded-lg bg-red-50 p-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        role="alert"
      >
        {{ grupo.aviso }}
      </p>
      <p v-if="grupo.pagos.length === 0" class="text-sm text-tierra-600 dark:text-tierra-300">{{ textos.sinPagos }}</p>
      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="pago in grupo.pagos"
          :key="pago.id"
          class="rounded-xl p-3 text-sm ring-1 ring-tierra-200 dark:ring-tierra-700"
          :class="pago.estado === 'anulado' ? 'opacity-60' : ''"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <p :class="pago.estado === 'anulado' ? 'line-through' : ''">
              <strong class="tabular-nums">{{ formatearMonto(pago.monto) }}</strong>
              · {{ formatearFecha(pago.fechaDePago) }} · {{ pago.documentoDePago }}
            </p>
            <InsigniaBase v-if="pago.estado === 'anulado'" tono="rojo">Anulado</InsigniaBase>
            <div v-else v-permiso="'libro-de-compras.retenciones.enterar'" class="flex gap-1">
              <BotonBase pequeno variante="fantasma" :icono="Pencil" @click="$emit('corregir', pago)">{{
                textos.corregir
              }}</BotonBase>
              <BotonBase pequeno variante="fantasma" :icono="Ban" @click="$emit('anular', pago)">{{
                textos.anular
              }}</BotonBase>
            </div>
          </div>
          <p v-if="pago.observaciones" class="mt-1 break-words text-tierra-600 dark:text-tierra-300">
            {{ pago.observaciones }}
          </p>
          <p v-if="pago.estado === 'anulado'" class="mt-1 break-words text-tierra-600 dark:text-tierra-300">
            Anulado {{ formatearFechaHora(pago.anuladoEn) }}: {{ formatearTexto(pago.motivoDeAnulacion) }}
          </p>
        </li>
      </ul>
    </div>
    <template #pie>
      <BotonBase variante="secundario" @click="$emit('cerrar')">Cerrar</BotonBase>
      <BotonBase
        v-if="grupo && grupo.estado !== 'sin_retenciones'"
        v-permiso="'libro-de-compras.retenciones.enterar'"
        :icono="CircleDollarSign"
        @click="$emit('registrar')"
      >
        {{ textos.registrar }}
      </BotonBase>
    </template>
  </VentanaModal>
</template>
