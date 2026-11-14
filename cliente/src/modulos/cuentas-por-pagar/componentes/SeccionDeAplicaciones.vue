<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { Undo2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { avisoDeAplicacionesManuales, resumenDeQuitar } from '../composables/aplicaciones-de-la-ficha';
import type { AplicacionDelDocumento, FichaDelDocumento } from '../servicios/tipos';
import { FORMAS_DE_APLICACION } from '../textos';
import SeccionDeFicha from './SeccionDeFicha.vue';

/** Lo que una nota rebajó de los cargos, o lo que las notas rebajaron de este cargo; las manuales se pueden quitar. */
const props = defineProps<{ ficha: FichaDelDocumento }>();
defineEmits<{ quitar: [id: string, resumen: string] }>();
const enlaceA = (id: string) => ({ name: 'cuentas-por-pagar.documentos.ficha', params: { documentoId: id } });
const etiquetaDe = (serie: string | null, numero: string) => (serie ? `${serie}-${numero}` : numero);
const aviso = (): string | null => avisoDeAplicacionesManuales(props.ficha);
const resumen = (aplicacion: AplicacionDelDocumento): string => resumenDeQuitar(aplicacion);
</script>

<template>
  <SeccionDeFicha
    v-if="ficha.aplicaciones.length"
    :titulo="`Notas de crédito aplicadas (${ficha.aplicaciones.length})`"
  >
    <p v-if="aviso()" class="mb-2 text-sm text-tierra-700 dark:text-tierra-300">{{ aviso() }}</p>
    <ul class="space-y-2">
      <li v-for="aplicacion in ficha.aplicaciones" :key="aplicacion.id">
        <TarjetaBase class="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p class="min-w-0 flex-1 basis-60">
            La nota de crédito
            <RouterLink
              :to="enlaceA(aplicacion.notaId)"
              class="font-medium text-campo-700 underline dark:text-campo-300"
            >
              {{ etiquetaDe(aplicacion.notaSerie, aplicacion.notaNumero) }}
            </RouterLink>
            rebajó <strong>{{ formatearMonto(aplicacion.monto) }}</strong> de
            <RouterLink
              :to="enlaceA(aplicacion.cargoId)"
              class="font-medium text-campo-700 underline dark:text-campo-300"
            >
              {{ etiquetaDe(aplicacion.cargoSerie, aplicacion.cargoNumero) }}
            </RouterLink>
            <span class="block text-xs text-tierra-500">
              {{ formatearFecha(aplicacion.fecha) }}
              <template v-if="aplicacion.referencia"> · {{ aplicacion.referencia }}</template>
            </span>
          </p>
          <InsigniaBase :tono="aplicacion.forma === 'manual' ? 'trigo' : 'tierra'">
            {{ FORMAS_DE_APLICACION[aplicacion.forma] }}
          </InsigniaBase>
          <BotonBase
            v-if="aplicacion.puedeQuitar"
            v-permiso="'cuentas-por-pagar.documentos.aplicar-notas'"
            variante="secundario"
            pequeno
            :icono="Undo2"
            @click="$emit('quitar', aplicacion.id, resumen(aplicacion))"
          >
            Quitar
          </BotonBase>
        </TarjetaBase>
      </li>
    </ul>
  </SeccionDeFicha>
</template>
