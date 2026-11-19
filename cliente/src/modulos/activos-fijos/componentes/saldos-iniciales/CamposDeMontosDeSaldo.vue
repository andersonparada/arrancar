<script setup lang="ts">
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  valorEnLibrosEscrito,
  type EdicionDeSaldoInicial,
} from '../../composables/saldos-iniciales/edicion-de-saldo-inicial';

/** Los montos al corte: costo y depreciación acumulada de cada libro, y lo que falta por depreciar. */
defineProps<{ errores: Record<string, string>; sinDepreciacion: boolean }>();
const edicion = defineModel<EdicionDeSaldoInicial>({ required: true });
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-4">
      <h2 class="text-sm font-semibold text-tierra-600 dark:text-tierra-300">Libro contable</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto
          v-model="edicion.costo"
          etiqueta="Costo"
          tipo="number"
          paso="any"
          requerido
          :error="errores.costo"
        />
        <CampoTexto
          v-if="!sinDepreciacion"
          v-model="edicion.depreciacionAcumuladaContable"
          etiqueta="Depreciación acumulada al corte"
          tipo="number"
          paso="any"
          requerido
          :error="errores.depreciacionAcumuladaContable"
        />
        <CampoTexto
          v-if="!sinDepreciacion"
          v-model="edicion.vidaUtilRestanteMeses"
          etiqueta="Vida útil restante (meses)"
          tipo="number"
          ayuda="Si ya se agotó, escriba 0: solo seguirá depreciándose en el libro fiscal."
          :error="errores.vidaUtilRestanteMeses"
        />
        <CampoTexto
          v-if="!sinDepreciacion"
          v-model="edicion.valorResidual"
          etiqueta="Valor residual"
          tipo="number"
          paso="any"
          ayuda="Si lo deja vacío, se propone el de la clase."
          :error="errores.valorResidual"
        />
      </div>
      <p v-if="valorEnLibrosEscrito(edicion) !== null" class="text-sm" aria-live="polite">
        Valor en libros al corte:
        <strong class="tabular-nums">{{ formatearMonto(valorEnLibrosEscrito(edicion)) }}</strong>
      </p>
      <p v-if="sinDepreciacion" class="text-sm text-tierra-500">
        Una obra sin terminar o un terreno entra sin depreciación acumulada.
      </p>
    </section>

    <section class="space-y-4">
      <h2 class="text-sm font-semibold text-tierra-600 dark:text-tierra-300">Libro fiscal (ISR)</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto
          v-model="edicion.costoFiscal"
          etiqueta="Costo fiscal"
          tipo="number"
          paso="any"
          ayuda="Si lo deja vacío, es igual al costo."
          :error="errores.costoFiscal"
        />
        <CampoTexto
          v-model="edicion.baseFiscal"
          etiqueta="Base fiscal"
          tipo="number"
          paso="any"
          ayuda="Si lo deja vacío, se calcula con la clase (tope del inmueble, sin ganado común)."
          :error="errores.baseFiscal"
        />
        <CampoTexto
          v-if="!sinDepreciacion"
          v-model="edicion.depreciacionAcumuladaFiscal"
          etiqueta="Depreciación acumulada fiscal"
          tipo="number"
          paso="any"
          requerido
          :error="errores.depreciacionAcumuladaFiscal"
        />
        <CampoTexto
          v-if="!sinDepreciacion"
          v-model="edicion.porcentajeFiscal"
          etiqueta="Porcentaje fiscal anual"
          tipo="number"
          paso="any"
          ayuda="Si lo deja vacío, se usa el de la clase."
          :error="errores.porcentajeFiscal"
        />
      </div>
    </section>
  </div>
</template>
