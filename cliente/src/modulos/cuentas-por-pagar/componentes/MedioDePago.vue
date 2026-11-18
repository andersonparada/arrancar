<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import {
  opcionesDeChequeras,
  opcionesDeCuentas,
  opcionesDeCuentasParaNotas,
} from '../composables/pagos/opciones-del-pago';
import type { FiltroDeNotas } from '../composables/pagos/filtro-de-notas';
import type { EdicionDePago } from '../composables/pagos/edicion-de-pago';
import type { MediosDePago, NotaParaLigar } from '../servicios/tipos-de-pagos';
import NotasParaLigar from './NotasParaLigar.vue';

/** Con qué se paga: la chequera (cheque), la cuenta (nota de débito) o la nota que ya está en Bancos. */
const props = defineProps<{
  medios: MediosDePago | null;
  notas: NotaParaLigar[];
  /** Si la lista de notas llegó al tope del servidor y puede haber más. */
  notasAlTope: boolean;
  cargandoNotas: boolean;
  errores: Record<string, string>;
  cargando: boolean;
  /** El nombre del NIT del proveedor, que irá en el cheque o la nota; `null` si hay que escribirlo en Terceros. */
  beneficiario: string | null;
}>();
const edicion = defineModel<EdicionDePago>({ required: true });
const filtroDeNotas = defineModel<FiltroDeNotas>('filtroDeNotas', { required: true });

const opciones = computed(() =>
  edicion.value.forma === 'cheque' ? opcionesDeChequeras(props.medios) : opcionesDeCuentas(props.medios),
);
const cuentasParaNotas = computed(() => opcionesDeCuentasParaNotas(props.medios, props.notas));
const sinCuentas = computed(() => !props.cargando && opciones.value.length === 0);
</script>

<template>
  <div v-if="edicion.forma === 'nota_ligada'">
    <NotasParaLigar
      v-model="edicion.movimientoId"
      v-model:filtro="filtroDeNotas"
      :notas="notas"
      :cuentas="cuentasParaNotas"
      :al-tope="notasAlTope"
      :cargando="cargandoNotas"
      :error="errores.movimientoId"
    />
  </div>
  <div v-else-if="edicion.forma !== 'cuenta_de_apertura'" class="space-y-2">
    <CampoSelector
      v-model="edicion.medio"
      :etiqueta="edicion.forma === 'cheque' ? 'Chequera' : 'Cuenta bancaria'"
      requerido
      :opciones="opciones"
      :error="errores.medio"
    />
    <CampoTexto
      :model-value="beneficiario ?? ''"
      etiqueta="Beneficiario (nombre del NIT)"
      solo-lectura
      :error="errores.proveedorId"
      ayuda="El cheque o la nota sale siempre a nombre del NIT del proveedor, no del nombre comercial."
    />
    <p v-if="sinCuentas" class="text-sm text-tierra-600 dark:text-tierra-300">
      {{ edicion.forma === 'cheque' ? 'No hay chequeras activas.' : 'No hay cuentas bancarias activas.' }}
      Créelas en
      <RouterLink
        :to="edicion.forma === 'cheque' ? '/bancos/chequeras' : '/bancos/cuentas-bancarias'"
        class="font-medium underline underline-offset-2"
        >Bancos</RouterLink
      >
      para poder pagar.
    </p>
  </div>
</template>
