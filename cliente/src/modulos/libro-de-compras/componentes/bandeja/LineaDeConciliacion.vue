<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  accionesDelItem,
  tipoDeValorDelCampo,
  tituloDelItem,
} from '../../composables/bandeja/datos-de-la-conciliacion';
import { ANTERIORES_A_LA_FECHA_DE_INICIO as anteriores } from '../../textos-de-anteriores';
import { MOTIVOS_DE_BLOQUEO } from '../../textos-de-la-bandeja';
import type { ClaveDeResultado, ItemDeConciliacion } from '../../servicios/conciliacion.api';
import {
  ACCIONES_DE_CONCILIACION,
  CAMPOS_COMPARADOS,
  CONCILIACION,
  type AccionDeConciliacion,
} from '../../textos-de-la-conciliacion';

/** Una línea de la conciliación con sus diferencias, su situación en la bandeja y lo que se puede hacer con ella. */
const props = defineProps<{ clave: ClaveDeResultado; item: ItemDeConciliacion }>();
const emit = defineEmits<{ accion: [accion: AccionDeConciliacion] }>();

const acciones = computed(() => accionesDelItem(props.clave, props.item));
const PERMISO_DE_LA_ACCION: Record<AccionDeConciliacion, string> = {
  abrirDocumento: 'libro-de-compras.documentos.ver',
  verEnLaBandeja: 'libro-de-compras.documentos.importar',
  descartar: 'libro-de-compras.dte-recibidos.descartar',
  restaurar: 'libro-de-compras.dte-recibidos.descartar',
  registrarAqui: 'libro-de-compras.documentos.crear',
};
const enPlazo = computed(() => props.clave === 'anterioresALaFechaDeInicio' && props.item.enPlazoDeCredito);

function valorDeDiferencia(campo: keyof typeof CAMPOS_COMPARADOS, valor: string | null): string {
  if (valor === null || valor === '') return '—';
  const tipo = tipoDeValorDelCampo(campo);
  if (tipo === 'dinero') return formatearMonto(valor);
  return tipo === 'fecha' ? formatearFecha(valor) : valor;
}

const nota = computed(() => {
  const { motivoDeBloqueo, motivoDeDescarte, periodoDelDocumento, documentoFueraDelLibro } = props.item;
  const partes = [
    periodoDelDocumento && props.clave === 'registradoEnOtroPeriodo'
      ? `${CONCILIACION.otroPeriodo} ${periodoDelDocumento.slice(0, 7)}.`
      : '',
    documentoFueraDelLibro ? `${CONCILIACION.fueraDelLibro}.` : '',
    motivoDeBloqueo ? (MOTIVOS_DE_BLOQUEO[motivoDeBloqueo] ?? '') : '',
    motivoDeDescarte ? `Motivo: ${motivoDeDescarte}` : '',
  ];
  return partes.filter(Boolean).join(' ');
});
</script>

<template>
  <div
    class="rounded-2xl bg-white p-4 ring-1 dark:bg-tierra-800/60"
    :class="enPlazo ? 'ring-2 ring-trigo-500' : 'ring-tierra-200/70 dark:ring-tierra-700'"
  >
    <div class="flex items-start justify-between gap-2">
      <p class="font-semibold">{{ tituloDelItem(item) }}</p>
      <p class="shrink-0 font-semibold tabular-nums">{{ formatearMonto(item.total) }}</p>
    </div>
    <p class="truncate text-sm text-tierra-700 dark:text-tierra-200">{{ item.nombreEmisor }}</p>
    <p class="text-xs text-tierra-500">
      <template v-if="item.nitEmisor">NIT {{ item.nitEmisor }} · </template>Emitido
      {{ formatearFecha(item.fechaEmision) }} · IVA {{ formatearMonto(item.iva) }}
    </p>
    <InsigniaBase v-if="item.estadoEnLaBandeja === 'bloqueado'" tono="tierra" class="mt-2">Bloqueado</InsigniaBase>
    <p v-if="enPlazo" class="mt-2 text-sm font-medium text-amber-800 dark:text-amber-300">{{ anteriores.enPlazo }}</p>
    <p v-if="nota" class="mt-2 text-sm text-tierra-600 dark:text-tierra-300">{{ nota }}</p>
    <table v-if="item.diferencias.length" class="mt-3 w-full text-sm">
      <caption class="sr-only">
        {{
          CONCILIACION.detalle
        }}
      </caption>
      <thead>
        <tr class="text-left text-xs text-tierra-500">
          <th scope="col" class="pb-1 font-normal">{{ CONCILIACION.detalle }}</th>
          <th scope="col" class="pb-1 font-normal">{{ CONCILIACION.arrancar }}</th>
          <th scope="col" class="pb-1 font-normal">{{ CONCILIACION.sat }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="diferencia in item.diferencias"
          :key="diferencia.campo"
          class="border-t border-tierra-100 dark:border-tierra-700"
        >
          <th scope="row" class="py-1 pr-2 text-left font-medium">{{ CAMPOS_COMPARADOS[diferencia.campo] }}</th>
          <td class="py-1 pr-2 tabular-nums break-all">
            {{ valorDeDiferencia(diferencia.campo, diferencia.arrancar) }}
          </td>
          <td class="py-1 tabular-nums break-all">{{ valorDeDiferencia(diferencia.campo, diferencia.sat) }}</td>
        </tr>
      </tbody>
    </table>
    <div v-if="acciones.length" class="mt-3 flex flex-wrap justify-end gap-2">
      <BotonBase
        v-for="accion in acciones"
        :key="accion"
        v-permiso="PERMISO_DE_LA_ACCION[accion]"
        :variante="accion === 'verEnLaBandeja' || accion === 'registrarAqui' ? 'primario' : 'secundario'"
        pequeno
        @click="emit('accion', accion)"
      >
        {{ ACCIONES_DE_CONCILIACION[accion] }}
      </BotonBase>
    </div>
  </div>
</template>
