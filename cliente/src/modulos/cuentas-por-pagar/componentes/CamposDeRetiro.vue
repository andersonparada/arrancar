<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import { fechaDeHoy } from '../composables/dinero';
import {
  MAXIMO_DE_OBSERVACIONES,
  MAXIMO_DE_REFERENCIA_DEL_RETIRO,
  MAXIMO_DEL_CUSTODIO,
  OPCIONES_DE_FORMA_DE_RETIRO,
  type EdicionDeRetiro,
} from '../composables/retiros/edicion-de-retiro';
import { opcionesDeChequeras, opcionesDeCuentas } from '../composables/pagos/opciones-del-pago';
import type { MediosDePago } from '../servicios/tipos-de-pagos';

/** Los campos del retiro: cómo se saca el dinero (cheque o nota de débito), cuánto, quién lo lleva y a nombre de quién. */
const props = defineProps<{
  medios: MediosDePago | null;
  custodios: OpcionBuscable<string>[];
  puedeElegirUsuario: boolean;
  cargando: boolean;
  errores: Record<string, string>;
}>();
const edicion = defineModel<EdicionDeRetiro>({ required: true });

const esCheque = computed(() => edicion.value.forma === 'cheque');
const opcionesDelMedio = computed(() =>
  esCheque.value ? opcionesDeChequeras(props.medios) : opcionesDeCuentas(props.medios),
);
const sinMedios = computed(() => !props.cargando && opcionesDelMedio.value.length === 0);
const hoy = fechaDeHoy();
/** A nombre de quién irá el cheque si se deja en blanco: el usuario elegido o el nombre escrito. */
const custodioDelCheque = computed(() =>
  edicion.value.custodioUsuarioId
    ? (props.custodios.find(({ valor }) => valor === edicion.value.custodioUsuarioId)?.texto.replace(/ \(.*\)$/, '') ??
      'El custodio')
    : edicion.value.custodio.trim() || 'El custodio',
);
</script>

<template>
  <div class="space-y-4">
    <CampoSelector
      v-model="edicion.forma"
      etiqueta="Cómo se retira"
      requerido
      :opciones="OPCIONES_DE_FORMA_DE_RETIRO"
    />
    <div class="space-y-2">
      <CampoSelector
        v-model="edicion.medio"
        :etiqueta="esCheque ? 'Chequera' : 'Cuenta bancaria'"
        requerido
        :opciones="opcionesDelMedio"
        :error="errores.medio ?? errores.chequeraId ?? errores.cuentaBancariaId"
      />
      <p v-if="sinMedios" class="text-sm text-tierra-600 dark:text-tierra-300">
        {{ esCheque ? 'No hay chequeras activas.' : 'No hay cuentas bancarias activas.' }} Créelas en
        <RouterLink
          :to="esCheque ? '/bancos/chequeras' : '/bancos/cuentas-bancarias'"
          class="font-medium underline underline-offset-2"
          >Bancos</RouterLink
        >
        para poder retirar.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <CampoTexto
        v-model="edicion.monto"
        etiqueta="Monto a retirar"
        tipo="number"
        paso="0.01"
        requerido
        :error="errores.monto"
      />
      <CampoTexto
        v-model="edicion.fecha"
        etiqueta="Fecha del retiro"
        tipo="date"
        :maximo="hoy"
        requerido
        :error="errores.fecha"
      />
    </div>

    <CampoSelector
      v-if="puedeElegirUsuario"
      v-model="edicion.custodioUsuarioId"
      etiqueta="Custodio (quién lleva el efectivo)"
      :opciones="custodios"
      :error="errores.custodioUsuarioId"
    />
    <CampoTexto
      v-if="!edicion.custodioUsuarioId"
      v-model="edicion.custodio"
      etiqueta="Nombre del custodio"
      requerido
      :longitud-maxima="MAXIMO_DEL_CUSTODIO"
      ayuda="Quien lleva y entrega el efectivo; su nombre sale en los recibos."
      :error="errores.custodio"
    />

    <template v-if="esCheque">
      <CampoTexto
        v-model="edicion.beneficiario"
        etiqueta="Cheque a nombre de"
        :placeholder="custodioDelCheque"
        ayuda="Si lo deja en blanco, va a nombre del custodio. Escriba el de la empresa si el banco lo pide. No se emite al portador."
        :error="errores.beneficiario"
      />
      <CampoInterruptor
        v-model="edicion.noNegociable"
        etiqueta="No negociable"
        descripcion="Solo lo cobra quien figura en el cheque, directamente en ventanilla."
      />
    </template>
    <CampoTexto
      v-else
      v-model="edicion.referencia"
      etiqueta="Boleta o comprobante del cajero"
      :longitud-maxima="MAXIMO_DE_REFERENCIA_DEL_RETIRO"
      ayuda="Opcional, pero conviene anotarla para la conciliación."
      :error="errores.referencia"
    />
    <CampoTexto
      v-model="edicion.observaciones"
      etiqueta="Observaciones"
      multilinea
      :longitud-maxima="MAXIMO_DE_OBSERVACIONES"
      :error="errores.observaciones"
    />
    <p class="text-xs text-tierra-600 dark:text-tierra-300">
      El banco puede pedirle el formulario IVE-BA-03 si el retiro en efectivo es grande (US$10,000 o más, o su
      equivalente).
    </p>
  </div>
</template>
