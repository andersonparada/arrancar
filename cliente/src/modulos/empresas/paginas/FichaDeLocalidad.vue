<script setup lang="ts">
import { Pencil, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import { detallesDeLocalidad } from '../composables/localidades/detalles-de-localidad';
import { usarFichaDeLocalidad } from '../composables/localidades/usar-ficha-de-localidad';
import { VENTANAS_EMPRESAS } from '../textos';

const props = defineProps<{ localidadId: string }>();

const ventana = VENTANAS_EMPRESAS.localidades;
const { registro, cargando, editar, eliminar } = usarFichaDeLocalidad(props.localidadId);
const volver = { texto: `Volver a ${ventana.titulo}`, ruta: { name: 'empresas.localidades' } };
</script>

<template>
  <div v-if="registro" class="space-y-4">
    <EncabezadoPagina :titulo="String(registro.nombre)" descripcion="Localidad" :volver="volver">
      <InsigniaBase v-if="!registro.activo" tono="rojo">Inactivo</InsigniaBase>
      <BotonBase v-permiso="'empresas.localidades.editar'" variante="secundario" :icono="Pencil" @click="editar">
        Editar
      </BotonBase>
      <BotonBase v-permiso="'empresas.localidades.eliminar'" variante="fantasma" :icono="Trash2" @click="eliminar">
        Eliminar
      </BotonBase>
    </EncabezadoPagina>

    <DatosDelRegistro :detalles="detallesDeLocalidad(registro)" />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
</template>
