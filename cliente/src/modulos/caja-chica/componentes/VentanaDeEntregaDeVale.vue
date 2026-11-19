<script setup lang="ts">
import { computed } from 'vue';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { EdicionDeEntregaDeVale } from '../composables/vales/edicion-de-vale-provisional';
import { opcionesDeUsuarios } from '../composables/fondos/opciones-de-fondos';
import type { UsuarioParaElFondo } from '../servicios/catalogos.api';
import { AYUDA_DE_LA_FECHA, AYUDA_DEL_VALE_PROVISIONAL, MAXIMO_DEL_MOTIVO } from '../textos';

/** Entregar un vale provisional: efectivo del fondo a alguien que lo justificará después con comprobantes. */
const props = defineProps<{
  abierta: boolean;
  enviando: boolean;
  errores: Record<string, string>;
  usuarios: readonly UsuarioParaElFondo[];
  fondo: { nombre: string; efectivoEsperado: string };
}>();
const edicion = defineModel<EdicionDeEntregaDeVale>({ required: true });
const emit = defineEmits<{ cerrar: []; guardar: [] }>();

const opciones = computed(() => opcionesDeUsuarios(props.usuarios, 'Solo escribir el nombre'));
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Entregar un vale provisional" @cerrar="emit('cerrar')">
    <form id="form-de-entrega-de-vale" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm text-tierra-600 dark:text-tierra-300">{{ AYUDA_DEL_VALE_PROVISIONAL }}</p>
      <p class="text-sm">
        Hoy se espera en «{{ fondo.nombre }}» <strong>{{ formatearMonto(fondo.efectivoEsperado) }}</strong
        >: el vale no puede pasar de ese efectivo.
      </p>
      <CampoSelector
        v-if="usuarios.length > 0"
        v-model="edicion.entregadoAUsuarioId"
        etiqueta="Entregado a: usuario del sistema"
        :opciones="opciones"
        :error="errores.entregadoAUsuarioId"
      />
      <CampoTexto
        v-model="edicion.entregadoA"
        etiqueta="Entregado a: nombre"
        :requerido="!edicion.entregadoAUsuarioId"
        :longitud-maxima="150"
        :ayuda="edicion.entregadoAUsuarioId ? 'Con un usuario elegido se usa su nombre.' : 'Quién recibe el efectivo.'"
        :error="errores.entregadoA"
      />
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoTexto
          v-model="edicion.monto"
          etiqueta="Monto"
          tipo="number"
          paso="any"
          requerido
          :error="errores.monto"
        />
        <CampoTexto
          v-model="edicion.fecha"
          etiqueta="Fecha"
          tipo="date"
          :ayuda="AYUDA_DE_LA_FECHA"
          :error="errores.fecha"
        />
      </div>
      <CampoTexto
        v-model="edicion.motivo"
        etiqueta="Para qué se entrega"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        :error="errores.motivo"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-entrega-de-vale" :cargando="enviando">Entregar vale</BotonBase>
    </template>
  </VentanaModal>
</template>
