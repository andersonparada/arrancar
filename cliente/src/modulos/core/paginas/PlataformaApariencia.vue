<script setup lang="ts">
import { RotateCcw, Save } from 'lucide-vue-next';
import BotonBase from '../componentes/BotonBase.vue';
import EncabezadoPagina from '../componentes/EncabezadoPagina.vue';
import TarjetaDeColores from '../componentes/plataforma/TarjetaDeColores.vue';
import TarjetaDeIdentidad from '../componentes/plataforma/TarjetaDeIdentidad.vue';
import VistaPreviaDeApariencia from '../componentes/plataforma/VistaPreviaDeApariencia.vue';
import { usarEdicionDeApariencia } from '../composables/plataforma/usar-edicion-de-apariencia';
import { usarLogoDeApariencia } from '../composables/plataforma/usar-logo-de-apariencia';
import { VENTANAS_CORE } from '../textos';

const { borrador, hayCambios, acentoPocoVisible, enviando, errores, elegirColores, guardar, restablecer } =
  usarEdicionDeApariencia();
const logo = usarLogoDeApariencia(elegirColores);
const { vistaPrevia, tieneLogoPropio } = logo;
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="VENTANAS_CORE.apariencia.titulo" :descripcion="VENTANAS_CORE.apariencia.descripcion">
      <BotonBase variante="secundario" :icono="RotateCcw" @click="restablecer">Restablecer</BotonBase>
      <BotonBase :icono="Save" :cargando="enviando" :deshabilitado="!hayCambios" @click="guardar">Guardar</BotonBase>
    </EncabezadoPagina>

    <div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div class="space-y-4">
        <TarjetaDeIdentidad
          v-model:nombre="borrador.nombreAplicacion"
          :logo="vistaPrevia"
          :tiene-logo-propio="tieneLogoPropio"
          :error="errores.nombreAplicacion"
          @subir="logo.subir"
          @quitar="logo.quitar"
          @sugerir-colores="logo.sugerirColores"
        />
        <TarjetaDeColores
          v-model:principal="borrador.colorPrincipal"
          v-model:acento="borrador.colorAcento"
          :acento-poco-visible="acentoPocoVisible"
          @elegir="elegirColores"
        />
      </div>
      <VistaPreviaDeApariencia
        :nombre="borrador.nombreAplicacion"
        :principal="borrador.colorPrincipal"
        :acento="borrador.colorAcento"
        :logo="vistaPrevia"
      />
    </div>
  </div>
</template>
