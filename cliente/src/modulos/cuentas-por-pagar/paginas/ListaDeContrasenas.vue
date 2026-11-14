<script setup lang="ts">
import { ClipboardCheck, Plus } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeRegistro from '@/modulos/core/componentes/TarjetaDeRegistro.vue';
import FiltrosDeContrasenas from '../componentes/FiltrosDeContrasenas.vue';
import PaginacionDeLista from '../componentes/PaginacionDeLista.vue';
import { detallesDeContrasena, marcaDeContrasena } from '../composables/contrasenas/filtros-de-contrasenas';
import { usarContrasenas } from '../composables/contrasenas/usar-contrasenas';
import { VENTANAS_CUENTAS_POR_PAGAR } from '../textos';

const ventana = VENTANAS_CUENTAS_POR_PAGAR.contrasenas;
const lista = usarContrasenas();
const rutaDeNueva = { name: 'cuentas-por-pagar.contrasenas.nueva' };
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <span v-permiso="'cuentas-por-pagar.contrasenas.crear'" class="contents">
        <BotonBase :icono="Plus" @click="$router.push(rutaDeNueva)">{{ ventana.nueva }}</BotonBase>
      </span>
    </EncabezadoPagina>

    <FiltrosDeContrasenas
      v-model="lista.filtros"
      :proveedores="lista.proveedores.value"
      @quitar="lista.quitarFiltros"
    />

    <p
      v-if="lista.cargando.value && lista.contrasenas.value.length === 0"
      class="text-sm text-tierra-500"
      role="status"
    >
      Cargando…
    </p>
    <EstadoVacio
      v-else-if="lista.contrasenas.value.length === 0"
      :icono="ClipboardCheck"
      titulo="No hay contraseñas con estos filtros"
      descripcion="Una contraseña es el comprobante que se entrega al proveedor con las facturas que se le pagarán y la fecha prometida."
    >
      <div class="flex flex-wrap justify-center gap-2">
        <BotonBase variante="secundario" @click="lista.quitarFiltros">Quitar filtros</BotonBase>
        <span v-permiso="'cuentas-por-pagar.contrasenas.crear'" class="contents">
          <BotonBase :icono="Plus" @click="$router.push(rutaDeNueva)">{{ ventana.nueva }}</BotonBase>
        </span>
      </div>
    </EstadoVacio>
    <template v-else>
      <ul
        class="grid grid-cols-1 gap-3 transition-opacity md:grid-cols-2 xl:grid-cols-3"
        :class="{ 'opacity-60': lista.cargando.value }"
        :aria-busy="lista.cargando.value"
      >
        <li v-for="contrasena in lista.contrasenas.value" :key="contrasena.id">
          <TarjetaDeRegistro
            :titulo="`Contraseña ${contrasena.numero}`"
            :detalles="detallesDeContrasena(contrasena)"
            permiso="cuentas-por-pagar.contrasenas.ver"
            :insignia="marcaDeContrasena(contrasena)"
            :class="{ 'opacity-80': contrasena.estado === 'anulada' }"
            :destino="{ name: 'cuentas-por-pagar.contrasenas.ficha', params: { id: contrasena.id } }"
            solo-lectura
          />
        </li>
      </ul>
      <PaginacionDeLista
        v-model="lista.pagina.value"
        :paginas="lista.paginas.value"
        :limite="lista.limite"
        :total="lista.total.value"
      />
    </template>
  </div>
</template>
