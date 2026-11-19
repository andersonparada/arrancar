<script setup lang="ts">
import { computed } from 'vue';
import { Pencil } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import SeccionDeConversiones from '../componentes/articulos/SeccionDeConversiones.vue';
import SeccionDeLotes from '../componentes/articulos/SeccionDeLotes.vue';
import VentanaDeConversiones from '../componentes/articulos/VentanaDeConversiones.vue';
import VentanaDeLote from '../componentes/articulos/VentanaDeLote.vue';
import { detallesDeArticulo } from '../composables/articulos/detalles-de-articulo';
import { usarFichaDeArticulo } from '../composables/articulos/usar-ficha-de-articulo';
import { VENTANAS_INVENTARIOS } from '../textos';

const props = defineProps<{ articuloId: string }>();

const ventana = VENTANAS_INVENTARIOS.articulos;
const { registro, cargando, editar, cambiarEstado, eliminar, conversiones, lotes } = usarFichaDeArticulo(
  props.articuloId,
);
const volver = { texto: `Volver a ${ventana.titulo}`, ruta: { name: 'inventarios.articulos' } };
const detalles = computed(() => (registro.value ? detallesDeArticulo(registro.value) : []));
</script>

<template>
  <div v-if="registro" class="space-y-4">
    <EncabezadoPagina :titulo="registro.codigo" descripcion="Artículo" :volver="volver">
      <InsigniaBase v-if="!registro.activo" tono="rojo">Inactivo</InsigniaBase>
      <BotonBase v-permiso="'inventarios.articulos.editar'" variante="secundario" :icono="Pencil" @click="editar">
        Editar
      </BotonBase>
      <BotonBase v-permiso="'inventarios.articulos.editar'" variante="secundario" @click="cambiarEstado(registro)">
        {{ registro.activo ? 'Inactivar' : 'Reactivar' }}
      </BotonBase>
      <BotonBase v-permiso="'inventarios.articulos.eliminar'" variante="secundario" @click="eliminar(registro)">
        Eliminar
      </BotonBase>
    </EncabezadoPagina>

    <DatosDelRegistro :detalles="detalles" />
    <SeccionDeConversiones
      :conversiones="conversiones.conversiones.value"
      :unidad-base="registro.unidadBaseNombre"
      @cambiar="conversiones.abrir"
    />
    <SeccionDeLotes
      v-if="registro.manejaLotes"
      :lotes="lotes.lotes.value"
      :maneja-vencimiento="registro.manejaVencimiento"
      @registrar="lotes.abrir"
    />

    <VentanaDeConversiones
      v-model="conversiones.edicion.value"
      :unidad-base="registro.unidadBaseNombre"
      :errores="conversiones.errores.value"
      :enviando="conversiones.enviando.value"
      :disponibles="conversiones.disponibles"
      @cerrar="conversiones.edicion.value.abierta = false"
      @guardar="conversiones.guardar"
      @agregar="conversiones.agregar"
      @quitar="conversiones.quitar"
      @marcar-para-compras="conversiones.marcarParaCompras"
    />
    <VentanaDeLote
      v-model="lotes.edicion.value"
      :errores="lotes.errores.value"
      :enviando="lotes.enviando.value"
      :vencimiento-obligatorio="registro.manejaVencimiento"
      @cerrar="lotes.edicion.value.abierta = false"
      @guardar="lotes.guardar"
    />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
</template>
