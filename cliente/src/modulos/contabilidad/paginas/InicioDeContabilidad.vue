<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import CamposDelInicio from '../componentes/CamposDelInicio.vue';
import { usarInicio } from '../composables/usar-inicio';
import { VENTANAS_CONTABILIDAD } from '../textos';

const sesion = usarSesion();
const i = usarInicio();
const puedeEditar = computed(() => sesion.puede('contabilidad.inicio.editar'));
const esNuevo = computed(() => i.datos.value.inicio === null);
</script>

<template>
  <div>
    <EncabezadoPagina
      :titulo="VENTANAS_CONTABILIDAD.inicio.titulo"
      :descripcion="
        esNuevo && !i.cargando.value
          ? 'Todavía no se inicia la contabilidad de esta empresa. Elija desde cuándo y cómo se escriben los códigos.'
          : VENTANAS_CONTABILIDAD.inicio.descripcion
      "
    >
      <RouterLink
        v-if="!esNuevo && sesion.puede('contabilidad.cuentas.ver')"
        :to="{ name: 'contabilidad.nomenclatura' }"
        class="rounded-lg px-4 py-2.5 text-sm font-medium text-campo-700 ring-1 ring-tierra-200 hover:bg-tierra-100 dark:text-campo-300 dark:ring-tierra-700 dark:hover:bg-tierra-800"
      >
        Ir a la nomenclatura
      </RouterLink>
    </EncabezadoPagina>

    <TarjetaBase v-if="!i.cargando.value" class="max-w-3xl">
      <form id="form-inicio" novalidate @submit.prevent="i.guardar">
        <CamposDelInicio
          v-model="i.formulario.value"
          :puede-editar="puedeEditar"
          :mascara-fija="i.datos.value.hayCuentas"
          :aviso-de-mascara="i.avisoMascara.value"
          :aviso-del-contador="i.avisoContador.value"
          :errores="i.errores.value"
        />
        <div v-if="puedeEditar" class="mt-6 flex justify-end">
          <BotonBase tipo="submit" :cargando="i.enviando.value" :deshabilitado="!i.puedeGuardar.value">
            {{ esNuevo ? 'Iniciar la contabilidad' : 'Guardar cambios' }}
          </BotonBase>
        </div>
      </form>
    </TarjetaBase>
  </div>
</template>
