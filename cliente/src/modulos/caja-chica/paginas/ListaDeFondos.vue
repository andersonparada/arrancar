<script setup lang="ts">
import { Landmark, Plus, UsersRound } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import TarjetaDeFondo from '../componentes/TarjetaDeFondo.vue';
import VentanaDeAccesosAFondos from '../componentes/VentanaDeAccesosAFondos.vue';
import VentanaDeFondo from '../componentes/VentanaDeFondo.vue';
import { usarAccesosAFondos } from '../composables/accesos/usar-accesos-a-fondos';
import { usarListaDeFondos } from '../composables/fondos/usar-lista-de-fondos';
import { VENTANAS_CAJA_CHICA } from '../textos';

const ventana = VENTANAS_CAJA_CHICA.fondos;
const { estado, fondos, cargando, apertura, catalogos } = usarListaDeFondos();
const accesos = usarAccesosAFondos();
const usuarioId = accesos.usuarioId;
const opciones = [
  { valor: 'abierto', texto: 'Abiertos' },
  { valor: 'cerrado', texto: 'Cerrados' },
  { valor: 'todos', texto: 'Todos' },
];
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="ventana.titulo" :descripcion="ventana.descripcion">
      <BotonBase
        v-permiso="'caja-chica.fondos.asignar'"
        variante="secundario"
        :icono="UsersRound"
        :cargando="accesos.cargando.value"
        @click="accesos.abrir"
      >
        Accesos
      </BotonBase>
      <BotonBase v-permiso="'caja-chica.fondos.crear'" :icono="Plus" @click="apertura.abrir">
        {{ ventana.abrir }}
      </BotonBase>
    </EncabezadoPagina>

    <div class="mb-4 max-w-xs">
      <CampoSelector v-model="estado" etiqueta="Mostrar" :opciones="opciones" />
    </div>
    <p v-if="cargando && fondos.elementos.length === 0" class="text-sm text-tierra-500" role="status">Cargando…</p>
    <EstadoVacio
      v-else-if="fondos.elementos.length === 0"
      :icono="Landmark"
      :titulo="estado === 'abierto' ? 'No hay fondos abiertos' : 'No hay fondos en esta vista'"
      descripcion="Abra un fondo para que un custodio tenga efectivo para gastos menores. Si ya existen y no los ve, pida que se los asignen."
    />
    <ul v-else class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" :aria-busy="cargando">
      <li v-for="fondo in fondos.elementos" :key="fondo.id">
        <TarjetaDeFondo :fondo="fondo" />
      </li>
    </ul>

    <VentanaDeFondo
      v-model="apertura.edicion.value"
      :abierta="apertura.abierta.value"
      :enviando="apertura.enviando.value"
      :cargando="catalogos.cargando.value"
      :errores="apertura.errores.value"
      :chequeras="catalogos.chequeras.value"
      :cuentas="catalogos.cuentas.value"
      :localidades="catalogos.localidades.value"
      :usuarios="catalogos.usuarios.value"
      @cerrar="apertura.cerrar"
      @guardar="apertura.guardar"
    />
    <VentanaDeAccesosAFondos
      v-model:usuario-id="usuarioId"
      :abierta="accesos.abierta.value"
      :cargando="accesos.cargando.value"
      :enviando="accesos.enviando.value"
      :usuario="accesos.usuario.value"
      :opciones="accesos.opciones.value"
      :fondos="accesos.ordenados.value"
      :seleccion="accesos.seleccion.value"
      :resumen="accesos.resumen.value"
      :es-propio="accesos.esPropio.value"
      @cerrar="accesos.cerrar"
      @alternar="accesos.alternar"
      @marcar="accesos.marcar"
      @guardar="accesos.guardar"
    />
  </div>
</template>
