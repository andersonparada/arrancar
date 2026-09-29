<script setup lang="ts">
import { computed } from 'vue';
import { Briefcase, Plus, Search, ShoppingCart } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import FiltrosDelListado from '../componentes/FiltrosDelListado.vue';
import TarjetaDeTercero from '../componentes/TarjetaDeTercero.vue';
import { usarListadoDeTerceros } from '../composables/usar-listado-de-terceros';
import { PERMISOS_DEL_PAPEL, RUTAS_DEL_PAPEL } from '../papeles';
import type { PapelTercero, TerceroEnListado } from '../servicios/terceros.api';
import { CLASES_DE_CLIENTE, VENTANA_DEL_PAPEL } from '../textos';

/** La misma pantalla lista clientes o proveedores; la ruta indica cuál. */
const props = defineProps<{ papel: PapelTercero }>();

const router = useRouter();
const sesion = usarSesion();
const { terceros, cargando, filtros } = usarListadoDeTerceros(props.papel);
const ventana = VENTANA_DEL_PAPEL[props.papel];
const rutas = RUTAS_DEL_PAPEL[props.papel];
const icono = props.papel === 'cliente' ? ShoppingCart : Briefcase;
const puedeRegistrar = computed(
  () => sesion.puede('terceros.crear') && sesion.puede(PERMISOS_DEL_PAPEL[props.papel].crear),
);

/** Lo propio del papel: la clase del cliente o la categoría del proveedor. */
function detalle({ cliente, proveedor }: TerceroEnListado): string {
  const [texto, activo] =
    props.papel === 'cliente'
      ? [cliente ? CLASES_DE_CLIENTE[cliente.clase] : '', cliente?.activo]
      : [proveedor?.categoriaNombre ?? 'Sin categoría', proveedor?.activo];
  return activo === false ? `${texto} · papel inactivo` : texto;
}
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <BotonBase v-if="puedeRegistrar" :icono="Plus" @click="router.push({ name: `${rutas}.nuevo` })">
        {{ ventana.nuevo }}
      </BotonBase>
    </EncabezadoPagina>

    <FiltrosDelListado v-model="filtros" />

    <EstadoVacio
      v-if="!cargando && terceros.length === 0"
      :icono="Search"
      titulo="Sin resultados"
      :descripcion="`No hay ${ventana.titulo.toLowerCase()} que coincidan con la búsqueda.`"
    />
    <ul v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="tercero in terceros" :key="tercero.id">
        <TarjetaDeTercero
          :tercero="tercero"
          :detalle="detalle(tercero)"
          :icono="icono"
          :destino="{ name: `${rutas}.ficha`, params: { terceroId: tercero.id } }"
        />
      </li>
    </ul>
  </div>
</template>
