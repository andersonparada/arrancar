<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { textoDeCentavos } from '../composables/dinero';
import type { CandidatoDeReaplicacion, EdicionDeReaplicacion } from '../composables/pagos/reaplicacion';
import { MAXIMO_DEL_MOTIVO } from '../textos';

/**
 * Reaplicar un pago: cambia a qué documentos del proveedor cubre, sin mover el dinero. La suma debe ser igual al monto
 * del pago; el texto de la suma se actualiza mientras se escribe.
 */
defineProps<{
  numero: string;
  monto: string;
  candidatos: CandidatoDeReaplicacion[];
  textoDeLaSuma: string;
  errores: Record<string, string>;
  cargando: boolean;
  enviando: boolean;
}>();
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
const edicion = defineModel<EdicionDeReaplicacion>({ required: true });
const escribir = (id: string, valor: string | number | null | undefined): void => {
  edicion.value.montos[id] = valor === null || valor === undefined ? '' : String(valor);
};
</script>

<template>
  <VentanaModal :abierta="edicion.abierta" :titulo="`Reaplicar el pago ${numero}`" ancha @cerrar="emit('cerrar')">
    <form id="form-reaplicar-pago" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm">
        Reparta los {{ formatearMonto(monto) }} del pago entre los documentos del proveedor. El dinero, la fecha y el
        cheque no cambian: solo cambia a qué documentos se aplica.
      </p>
      <p v-if="cargando" class="text-sm text-tierra-500" role="status">Buscando los documentos del proveedor…</p>
      <ul v-else class="space-y-2">
        <li
          v-for="candidato in candidatos"
          :key="candidato.id"
          class="grid grid-cols-1 gap-2 rounded-xl p-3 ring-1 ring-tierra-200 sm:grid-cols-[1fr_11rem] sm:items-end dark:ring-tierra-700"
        >
          <div class="min-w-0">
            <p class="font-medium">{{ candidato.titulo }}</p>
            <p class="text-xs text-tierra-600 dark:text-tierra-300">
              Contraseña {{ candidato.contrasenaNumero }} · admite hasta
              {{ formatearMonto(textoDeCentavos(candidato.disponible)) }}
            </p>
          </div>
          <CampoTexto
            :model-value="edicion.montos[candidato.id] ?? ''"
            etiqueta="Monto"
            tipo="number"
            paso="0.01"
            :error="errores[`monto.${candidato.id}`]"
            @update:model-value="escribir(candidato.id, $event)"
          />
        </li>
      </ul>
      <p
        v-if="!cargando"
        class="text-sm font-medium"
        :class="errores.aplicaciones ? 'text-red-700 dark:text-red-300' : ''"
        role="status"
      >
        {{ errores.aplicaciones ?? textoDeLaSuma }}
      </p>
      <CampoTexto
        v-model="edicion.motivo"
        etiqueta="Motivo"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        ayuda="Por qué se corrige; queda registrado en la auditoría."
        :error="errores.motivo"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-reaplicar-pago" :cargando="enviando" :deshabilitado="cargando">
        Reaplicar
      </BotonBase>
    </template>
  </VentanaModal>
</template>
