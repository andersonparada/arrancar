<script setup lang="ts">
import { Pencil, Plus, Tags } from 'lucide-vue-next';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import VentanaDeCategoria from '../componentes/VentanaDeCategoria.vue';
import { usarCategoriasDeProveedor } from '../composables/usar-categorias-de-proveedor';
import { PERMISO_DEL_PAPEL } from '../papeles';
import { VENTANAS_TERCEROS } from '../textos';

const puedeGestionar = usarSesion().puede(PERMISO_DEL_PAPEL.proveedor);
const { categorias, edicion, enviando, errores, abrir, guardar } = usarCategoriasDeProveedor();
</script>

<template>
  <div>
    <EncabezadoPagina
      :titulo="VENTANAS_TERCEROS.categorias.titulo"
      :descripcion="VENTANAS_TERCEROS.categorias.descripcion"
    >
      <BotonBase v-if="puedeGestionar" :icono="Plus" @click="abrir()">Nueva categoría</BotonBase>
    </EncabezadoPagina>

    <EstadoVacio
      v-if="categorias.length === 0"
      :icono="Tags"
      titulo="Sin categorías"
      descripcion="Cree la primera para agrupar a sus proveedores."
    />
    <TarjetaBase v-else>
      <ul class="divide-y divide-tierra-100 dark:divide-tierra-800">
        <li v-for="categoria in categorias" :key="categoria.id" class="flex items-center justify-between gap-3 py-2.5">
          <span class="flex items-center gap-2 font-medium">
            {{ categoria.nombre }}
            <InsigniaBase v-if="!categoria.activo" tono="rojo">Inactiva</InsigniaBase>
          </span>
          <BotonBase
            v-if="puedeGestionar"
            variante="fantasma"
            pequeno
            :icono="Pencil"
            :aria-label="`Editar ${categoria.nombre}`"
            @click="abrir(categoria)"
          />
        </li>
      </ul>
    </TarjetaBase>

    <VentanaDeCategoria
      v-model:nombre="edicion.nombre"
      v-model:activo="edicion.activo"
      :abierta="edicion.abierta"
      :es-nueva="!edicion.id"
      :errores="errores"
      :enviando="enviando"
      @cerrar="edicion.abierta = false"
      @guardar="guardar"
    />
  </div>
</template>
