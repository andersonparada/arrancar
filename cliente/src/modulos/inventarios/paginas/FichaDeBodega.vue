<script setup lang="ts">
import { Pencil, Trash2 } from 'lucide-vue-next';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import DatosDelRegistro from '@/modulos/core/componentes/DatosDelRegistro.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import FichaNoEncontrada from '@/modulos/core/componentes/FichaNoEncontrada.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import UsuariosConAccesoDeBodega from '../componentes/bodegas/UsuariosConAccesoDeBodega.vue';
import { detallesDeBodega } from '../composables/bodegas/detalles-de-bodega';
import { usarFichaDeBodega } from '../composables/bodegas/usar-ficha-de-bodega';
import { usarUsuariosDeBodega } from '../composables/bodegas/usar-usuarios-de-bodega';
import { VENTANAS_INVENTARIOS } from '../textos';

const props = defineProps<{ bodegaId: string }>();

const ventana = VENTANAS_INVENTARIOS.bodegas;
const { registro, cargando, editar, eliminar } = usarFichaDeBodega(props.bodegaId);
const { datos: usuarios, cargando: cargandoUsuarios } = usarUsuariosDeBodega(props.bodegaId);
const volver = { texto: `Volver a ${ventana.titulo}`, ruta: { name: 'inventarios.bodegas' } };
</script>

<template>
  <div v-if="registro" class="space-y-4">
    <EncabezadoPagina :titulo="String(registro.codigo)" descripcion="Bodega" :volver="volver">
      <InsigniaBase v-if="!registro.activo" tono="rojo">Inactiva</InsigniaBase>
      <BotonBase v-permiso="'inventarios.bodegas.editar'" variante="secundario" :icono="Pencil" @click="editar">
        Editar
      </BotonBase>
      <BotonBase v-permiso="'inventarios.bodegas.eliminar'" variante="fantasma" :icono="Trash2" @click="eliminar">
        Eliminar
      </BotonBase>
    </EncabezadoPagina>

    <DatosDelRegistro :detalles="detallesDeBodega(registro)" />
    <UsuariosConAccesoDeBodega
      v-permiso="'inventarios.bodegas.asignar'"
      :usuarios="usuarios"
      :cargando="cargandoUsuarios"
    />
  </div>
  <p v-else-if="cargando" class="text-sm text-tierra-500">Cargando…</p>
  <FichaNoEncontrada v-else titulo="Bodega" :volver="volver" />
</template>
