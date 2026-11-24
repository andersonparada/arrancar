<script setup lang="ts">
import { Flag, ListTree, Plus } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import AccionesDeIntercambio from '@/modulos/core/componentes/intercambio/AccionesDeIntercambio.vue';
import VentanaDeImportacion from '@/modulos/core/componentes/intercambio/VentanaDeImportacion.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import ArbolDeCuentas from '../componentes/ArbolDeCuentas.vue';
import BarraDeNomenclatura from '../componentes/BarraDeNomenclatura.vue';
import VentanaDeCuenta from '../componentes/VentanaDeCuenta.vue';
import { usarNomenclatura } from '../composables/usar-nomenclatura';
import { VENTANAS_CONTABILIDAD } from '../textos';

const sesion = usarSesion();
const puedeCrear = sesion.puede('contabilidad.cuentas.crear');
const n = usarNomenclatura();
const permisosDeExcel = { importar: 'contabilidad.cuentas.importar', exportar: 'contabilidad.cuentas.exportar' };
</script>

<template>
  <div>
    <EncabezadoPagina
      :titulo="VENTANAS_CONTABILIDAD.nomenclatura.titulo"
      :descripcion="VENTANAS_CONTABILIDAD.nomenclatura.descripcion"
    >
      <AccionesDeIntercambio
        :permisos="permisosDeExcel"
        @exportar="n.intercambio.exportar"
        @importar="n.intercambio.abrir"
      />
      <BotonBase v-if="puedeCrear && n.inicio.value" :icono="Plus" @click="n.abrirNueva(null)">Nueva cuenta</BotonBase>
    </EncabezadoPagina>

    <EstadoVacio
      v-if="!n.cargando.value && !n.inicio.value"
      :icono="Flag"
      titulo="Primero inicie la contabilidad"
      descripcion="La nomenclatura necesita la fecha de inicio y la máscara de los códigos de cuenta."
    >
      <RouterLink
        v-if="sesion.puede('contabilidad.inicio.ver')"
        :to="{ name: 'contabilidad.inicio' }"
        class="text-sm font-medium text-campo-700 underline dark:text-campo-300"
      >
        Ir al inicio de la contabilidad
      </RouterLink>
    </EstadoVacio>
    <EstadoVacio
      v-else-if="!n.cargando.value && n.cuentas.value.length === 0"
      :icono="ListTree"
      titulo="Sin cuentas todavía"
      descripcion="Cree la primera cuenta de primer nivel (por ejemplo, 1 Activo) o importe su nomenclatura desde Excel."
    />
    <template v-else-if="n.inicio.value">
      <BarraDeNomenclatura
        v-model:texto="n.texto.value"
        v-model:con-inactivas="n.conInactivas.value"
        @expandir="n.expandirTodo"
        @plegar="n.plegarTodo"
      />
      <EstadoVacio
        v-if="n.filas.value.length === 0"
        :icono="ListTree"
        titulo="Ninguna cuenta coincide"
        descripcion="Pruebe con otro código o nombre, o active «Ver inactivas»."
      />
      <TarjetaBase v-else>
        <ArbolDeCuentas
          :filas="n.filas.value"
          :mascara="n.mascara.value"
          :puede-editar="sesion.puede('contabilidad.cuentas.editar')"
          :puede-crear="puedeCrear"
          @alternar="n.alternar"
          @editar="n.abrirEdicion"
          @agregar="n.abrirNueva"
        />
      </TarjetaBase>
    </template>

    <VentanaDeCuenta
      v-model="n.edicion"
      :mascara="n.mascara.value"
      :enviando="n.enviando.value"
      :errores="n.errores.value"
      :puede-eliminar="sesion.puede('contabilidad.cuentas.eliminar')"
      @cerrar="n.edicion.abierta = false"
      @guardar="n.guardar"
      @eliminar="n.eliminar"
    />
    <VentanaDeImportacion
      :estado="n.intercambio.estado"
      titulo="Importar nomenclatura"
      @elegir="n.intercambio.elegir"
      @plantilla="n.intercambio.bajarPlantilla"
      @importar="n.intercambio.importar"
      @cerrar="n.intercambio.cerrar"
    />
  </div>
</template>
