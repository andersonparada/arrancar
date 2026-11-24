<script setup lang="ts">
import { computed } from 'vue';
import { Pencil, Power, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import ValoresDelInmueble from '../componentes/inmuebles/ValoresDelInmueble.vue';
import { detallesDeInmueble } from '../composables/inmuebles/detalles-de-inmueble';
import { usarFichaDeInmueble } from '../composables/inmuebles/usar-ficha-de-inmueble';
import { usarValoresDeInmueble } from '../composables/inmuebles/valores/usar-valores-de-inmueble';
import { usarNombresDeUbicacion } from '../composables/localidades/usar-nombres-de-ubicacion';
import { VENTANAS_EMPRESAS } from '../textos';

const props = defineProps<{ inmuebleId: string }>();

const ventana = VENTANAS_EMPRESAS.inmuebles;
const { registro, cargando, editar, cambiarEstado, eliminar } = usarFichaDeInmueble(props.inmuebleId);
const nombres = usarNombresDeUbicacion(computed(() => (registro.value ? [registro.value] : [])));
const valores = usarValoresDeInmueble(props.inmuebleId);
const volver = { texto: `Volver a ${ventana.titulo}`, ruta: { name: 'empresas.inmuebles' } };
</script>

<template>
  <div v-if="registro" class="space-y-4">
    <EncabezadoPagina :titulo="String(registro.nombre)" descripcion="Inmueble" :volver="volver">
      <InsigniaBase v-if="!registro.activo" tono="rojo">Inactivo</InsigniaBase>
      <BotonBase v-permiso="'empresas.inmuebles.editar'" variante="secundario" :icono="Pencil" @click="editar">
        Editar
      </BotonBase>
      <BotonBase v-permiso="'empresas.inmuebles.editar'" variante="secundario" :icono="Power" @click="cambiarEstado">
        {{ registro.activo ? 'Inactivar' : 'Reactivar' }}
      </BotonBase>
      <BotonBase v-permiso="'empresas.inmuebles.eliminar'" variante="fantasma" :icono="Trash2" @click="eliminar">
        Eliminar
      </BotonBase>
    </EncabezadoPagina>

    <DatosDelRegistro :detalles="detallesDeInmueble(registro, nombres)" />
    <ValoresDelInmueble
      v-model="valores.edicion.value"
      :series="valores.series.value"
      :errores="valores.errores.value"
      :enviando="valores.enviando.value"
      @registrar="valores.abrir"
      @eliminar="valores.eliminar"
      @guardar="valores.guardar"
    />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
</template>
