<script setup lang="ts">
import { Search } from 'lucide-vue-next';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import ResultadoDeContacto from '../componentes/ResultadoDeContacto.vue';
import { usarBusquedaDeContactos } from '../composables/usar-busqueda-de-contactos';
import { RUTAS_DEL_PAPEL } from '../papeles';
import type { ContactoEncontrado } from '../servicios/terceros.api';
import { VENTANAS_TERCEROS } from '../textos';

const { texto, encontrados, buscando, minimo } = usarBusquedaDeContactos();

/** Si es proveedor y no cliente, su ficha se abre desde Proveedores. */
const fichaDe = (encontrado: ContactoEncontrado) => ({
  name: `${RUTAS_DEL_PAPEL[encontrado.esProveedor && !encontrado.esCliente ? 'proveedor' : 'cliente']}.ficha`,
  params: { terceroId: encontrado.terceroId },
});
</script>

<template>
  <div>
    <EncabezadoPagina
      :titulo="VENTANAS_TERCEROS.buscarContacto.titulo"
      :descripcion="VENTANAS_TERCEROS.buscarContacto.descripcion"
    />
    <TarjetaBase class="mb-4">
      <CampoTexto
        v-model="texto"
        etiqueta="Buscar"
        tipo="search"
        placeholder="Nombre, teléfono o correo"
        :ayuda="`Escriba al menos ${minimo} letras o números.`"
      />
    </TarjetaBase>

    <EstadoVacio
      v-if="!buscando && texto.trim().length >= minimo && encontrados.length === 0"
      :icono="Search"
      titulo="Sin resultados"
      descripcion="Nadie coincide con lo que escribió. Pruebe con otra parte del nombre o del número."
    />
    <ul v-else class="grid gap-3 sm:grid-cols-2">
      <li v-for="(encontrado, indice) in encontrados" :key="`${encontrado.terceroId}-${indice}`">
        <ResultadoDeContacto :encontrado="encontrado" :ficha="fichaDe(encontrado)" />
      </li>
    </ul>
  </div>
</template>
