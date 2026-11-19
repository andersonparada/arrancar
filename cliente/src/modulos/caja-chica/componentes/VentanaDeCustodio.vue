<script setup lang="ts">
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import type { EdicionDeCustodio } from '../composables/fondos/edicion-de-fondo';
import type { UsuarioParaElFondo } from '../servicios/catalogos.api';
import { AYUDA_DE_LA_FECHA, MAXIMO_DEL_MOTIVO } from '../textos';
import CamposDelCustodio from './CamposDelCustodio.vue';

/** Cambiar quién tiene el dinero del fondo. El historial de custodios queda en la ficha. */
defineProps<{
  abierta: boolean;
  enviando: boolean;
  errores: Record<string, string>;
  usuarios: readonly UsuarioParaElFondo[];
  fondo: { nombre: string; custodio: string | null };
}>();
const edicion = defineModel<EdicionDeCustodio>({ required: true });
const emit = defineEmits<{ cerrar: []; guardar: [] }>();
</script>

<template>
  <VentanaModal :abierta="abierta" titulo="Cambiar el custodio" @cerrar="emit('cerrar')">
    <form id="form-de-custodio" class="space-y-4" novalidate @submit.prevent="emit('guardar')">
      <p class="text-sm">
        Hoy «{{ fondo.nombre }}» está a cargo de <strong>{{ fondo.custodio ?? 'nadie' }}</strong
        >. El nuevo custodio responde por el efectivo desde la fecha que escriba; el anterior queda en el historial.
      </p>
      <CamposDelCustodio
        v-model:custodio="edicion.custodio"
        v-model:usuario-id="edicion.custodioUsuarioId"
        :usuarios="usuarios"
        :errores="errores"
      />
      <CampoTexto
        v-model="edicion.fecha"
        etiqueta="Desde"
        tipo="date"
        :ayuda="AYUDA_DE_LA_FECHA"
        :error="errores.fecha"
      />
      <CampoTexto
        v-model="edicion.motivo"
        etiqueta="Motivo"
        requerido
        multilinea
        :longitud-maxima="MAXIMO_DEL_MOTIVO"
        ayuda="Por qué cambia el custodio; queda en la auditoría."
        :error="errores.motivo"
      />
    </form>
    <template #pie>
      <BotonBase variante="secundario" @click="emit('cerrar')">Cancelar</BotonBase>
      <BotonBase tipo="submit" form="form-de-custodio" :cargando="enviando">Cambiar custodio</BotonBase>
    </template>
  </VentanaModal>
</template>
