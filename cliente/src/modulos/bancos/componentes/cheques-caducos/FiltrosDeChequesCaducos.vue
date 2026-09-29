<script setup lang="ts">
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import {
  errorDeMeses,
  MESES_MAXIMOS,
  MESES_MINIMOS,
  type FiltrosDeChequesCaducos,
} from '../../composables/cheques-caducos/filtros-de-cheques-caducos';

defineProps<{ opcionesDeCuenta: OpcionDeRegistro[]; mesesDeLaEmpresa: number }>();
const filtros = defineModel<FiltrosDeChequesCaducos>({ required: true });
</script>

<template>
  <TarjetaBase>
    <div class="grid gap-3 sm:grid-cols-3">
      <CampoSelector v-model="filtros.cuentaBancariaId" etiqueta="Cuenta" :opciones="opcionesDeCuenta" />
      <CampoTexto v-model="filtros.beneficiario" etiqueta="Beneficiario" tipo="search" placeholder="Nombre o parte" />
      <CampoTexto
        v-model="filtros.meses"
        etiqueta="Antigüedad mínima (meses)"
        tipo="number"
        :placeholder="String(mesesDeLaEmpresa)"
        :error="errorDeMeses(filtros.meses)"
        :ayuda="`Vacío: ${mesesDeLaEmpresa} meses, el plazo de la empresa (de ${MESES_MINIMOS} a ${MESES_MAXIMOS}).`"
      />
    </div>
  </TarjetaBase>
</template>
