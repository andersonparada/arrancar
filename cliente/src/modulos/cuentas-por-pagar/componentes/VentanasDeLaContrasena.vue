<script setup lang="ts">
import type { usarFichaDeContrasena } from '../composables/contrasenas/usar-ficha-de-contrasena';
import type { FichaDeContrasena } from '../servicios/tipos-de-contrasenas';
import VentanaDeCambioDeContrasena from './VentanaDeCambioDeContrasena.vue';
import VentanaDeMotivo from './VentanaDeMotivo.vue';
import VentanaParaAgregarDocumentos from './VentanaParaAgregarDocumentos.vue';

/** Las ventanas de la ficha: cambiar la fecha, agregar documentos, quitar uno (con motivo) y anular (con motivo). */
const props = defineProps<{ ficha: FichaDeContrasena; acciones: ReturnType<typeof usarFichaDeContrasena> }>();
const { cambio, agregar, quitar, anular } = props.acciones;
</script>

<template>
  <VentanaDeCambioDeContrasena
    v-model="cambio.edicion.value"
    :ficha="ficha"
    :errores="cambio.errores.value"
    :enviando="cambio.enviando.value"
    @cerrar="cambio.cerrar"
    @guardar="cambio.guardar"
  />
  <VentanaParaAgregarDocumentos
    v-model="agregar.edicion.value"
    :disponibles="agregar.disponibles.value"
    :cargando="agregar.cargando.value"
    :impresa="ficha.impresa"
    :error="agregar.errores.value.documentos"
    :enviando="agregar.enviando.value"
    @cerrar="agregar.cerrar"
    @agregar="agregar.agregar"
    @alternar-cargo="agregar.alternarCargo"
    @alternar-nota="agregar.alternarNota"
    @marcar-cargos="agregar.marcarCargos"
    @marcar-notas="agregar.marcarNotas"
  />
  <VentanaDeMotivo
    v-model="quitar.edicion.value"
    titulo="Quitar de la contraseña"
    texto-del-boton="Quitar"
    :errores="quitar.errores.value"
    :enviando="quitar.enviando.value"
    @cerrar="quitar.cerrar"
    @guardar="quitar.confirmar"
  />
  <VentanaDeMotivo
    v-model="anular.edicion.value"
    :titulo="`Anular la contraseña ${ficha.numero}`"
    texto-del-boton="Anular la contraseña"
    :errores="anular.errores.value"
    :enviando="anular.enviando.value"
    @cerrar="anular.cerrar"
    @guardar="anular.confirmar"
  />
</template>
