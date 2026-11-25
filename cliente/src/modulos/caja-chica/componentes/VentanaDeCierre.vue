<script setup lang="ts">
import { computed } from 'vue';
import { TriangleAlert } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { EdicionDeCierre } from '../composables/cierre/edicion-de-cierre';
import { opcionesDeCuentas } from '../composables/fondos/opciones-de-fondos';
import type { CuentaParaElFondo } from '../servicios/catalogos.api';
import type { Fondo } from '../servicios/tipos-de-fondos';
import { AYUDA_DE_LA_FECHA, MAXIMO_DEL_MOTIVO } from '../textos';

/**
 * Cerrar el fondo: dice qué va a pasar con lo pendiente, con los vales y con el efectivo que queda, y pide el motivo y la
 * cuenta del depósito. Un fondo cerrado no se reabre.
 */
const props = defineProps<{
  abierta: boolean;
  enviando: boolean;
  cargando: boolean;
  errores: Record<string, string>;
  cuentas: readonly CuentaParaElFondo[];
  fondo: Fondo;
}>();
const edicion = defineModel<EdicionDeCierre>({ required: true });
const emit = defineEmits<{ cerrar: []; guardar: [] }>();

const opciones = computed(() => opcionesDeCuentas(props.cuentas));
const hayEfectivo = computed(() => Number(props.fondo.efectivoEsperado) > 0);
const hayVales = computed(() => Number(props.fondo.valesAbiertos) > 0);
const hayPorResolver = computed(() => props.fondo.documentosPorResolver > 0);
const puedeCerrarConPendientes = usarSesion().puede('caja-chica.fondos.cerrar-con-documentos-por-resolver');
</script>

<template>
  <VentanaModal :abierta="abierta" :titulo="`Cerrar «${fondo.nombre}»`" @cerrar="emit('cerrar')">
    <form id="form-de-cierre" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <ul class="list-disc space-y-1 pl-5 text-sm" aria-label="Lo que pasa al cerrar">
        <li>
          Lo pendiente de reponer (<strong>{{ formatearMonto(fondo.pendienteDeReponer) }}</strong
          >) se liquida contra el fondo, sin cheque ni nota.
        </li>
        <li v-if="hayEfectivo">
          El efectivo que queda en caja (se espera <strong>{{ formatearMonto(fondo.efectivoEsperado) }}</strong
          >) se deposita en el banco.
        </li>
        <li v-else>No queda efectivo por depositar.</li>
        <li>Un fondo cerrado no se reabre: para volver a usar caja chica hay que abrir otro.</li>
      </ul>
      <div
        v-if="hayVales"
        class="flex gap-2 rounded-2xl bg-trigo-300/40 p-3 text-sm text-tierra-900 dark:bg-trigo-500/20 dark:text-trigo-300"
        role="alert"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Hay vales provisionales abiertos por {{ formatearMonto(fondo.valesAbiertos) }}. Liquídelos o anúlelos antes de
          cerrar: el sistema no deja cerrar con vales abiertos.
        </span>
      </div>
      <div
        v-if="hayPorResolver"
        class="flex gap-2 rounded-2xl bg-trigo-300/40 p-3 text-sm text-tierra-900 dark:bg-trigo-500/20 dark:text-trigo-300"
        role="alert"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span v-if="puedeCerrarConPendientes">
          Hay {{ fondo.documentosPorResolver }} factura(s) anulada(s) por su emisor sin resolver. Conviene resolverlas
          antes de cerrar; si cierra así, el motivo que escriba queda en la auditoría como la excepción.
        </span>
        <span v-else>
          Hay {{ fondo.documentosPorResolver }} factura(s) anulada(s) por su emisor sin resolver. Resuélvalas
          (reemplazo, devolución, cobro o sin recuperación) antes de cerrar, o pida a quien tenga el permiso que cierre
          el fondo.
        </span>
      </div>
      <p v-if="!fondo.ultimoArqueo" class="text-sm text-tierra-600 dark:text-tierra-300">
        Este fondo no tiene arqueo. Si lo contado puede no coincidir con lo esperado, haga el arqueo antes de cerrar.
      </p>
      <CampoTexto
        v-model="edicion.motivo"
        etiqueta="Motivo del cierre"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        ayuda="Por qué se cierra; queda registrado en la auditoría."
        :error="errores.motivo"
      />
      <template v-if="hayEfectivo">
        <CampoSelector
          v-model="edicion.cuentaBancariaId"
          etiqueta="Cuenta donde se deposita el efectivo"
          requerido
          :opciones="opciones"
          :error="errores.cuentaBancariaId"
        />
        <p v-if="!cargando && opciones.length === 0" class="text-sm text-tierra-600 dark:text-tierra-300" role="status">
          No hay cuentas bancarias activas. Pida que las creen en Bancos para poder depositar.
        </p>
        <CampoTexto
          v-model="edicion.referencia"
          etiqueta="Referencia del depósito"
          :longitud-maxima="100"
          :error="errores.referencia"
        />
      </template>
      <CampoTexto
        v-model="edicion.fecha"
        etiqueta="Fecha del cierre"
        tipo="date"
        :ayuda="AYUDA_DE_LA_FECHA"
        :error="errores.fecha"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase
        tipo="submit"
        form="form-de-cierre"
        variante="peligro"
        :cargando="enviando"
        :deshabilitado="hayPorResolver && !puedeCerrarConPendientes"
        >Cerrar el fondo</BotonBase
      >
    </template>
  </VentanaModal>
</template>
