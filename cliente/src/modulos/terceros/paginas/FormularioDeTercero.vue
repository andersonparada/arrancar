<script setup lang="ts">
import { useRouter } from 'vue-router';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import SeccionesAportadas from '@/modulos/core/componentes/SeccionesAportadas.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import CamposDeDatosGenerales from '../componentes/CamposDeDatosGenerales.vue';
import CamposDelPapel from '../componentes/CamposDelPapel.vue';
import EditorDeContactos from '../componentes/EditorDeContactos.vue';
import { usarFormularioDeTercero } from '../composables/usar-formulario-de-tercero';
import { PERMISOS_DEL_PAPEL, RUTAS_DEL_PAPEL, volverALaFicha, volverALaLista } from '../papeles';
import type { PapelTercero } from '../servicios/terceros.api';
import { VENTANA_DEL_PAPEL } from '../textos';

/** Alta y edición en página completa; sin `terceroId` es un registro nuevo. */
const props = defineProps<{ papel: PapelTercero; terceroId?: string }>();

const router = useRouter();
const sesion = usarSesion();
const formulario = usarFormularioDeTercero(props.papel, props.terceroId ?? null);
const {
  datos,
  papeles,
  contactos,
  categorias,
  departamentos,
  municipios,
  esNuevo,
  nombreActual,
  secciones,
  proveedorId,
} = formulario;
const ventana = VENTANA_DEL_PAPEL[props.papel];
const permisosDelPapel = PERMISOS_DEL_PAPEL[props.papel];
const puedeGestionarElPapel = sesion.puede(esNuevo ? permisosDelPapel.crear : permisosDelPapel.editar);
const titulo = esNuevo ? ventana.nuevo : ventana.editar;
const volver = props.terceroId ? volverALaFicha(props.papel, props.terceroId) : volverALaLista(props.papel);

async function guardar(): Promise<void> {
  const id = await formulario.guardar();
  if (id) await router.push({ name: `${RUTAS_DEL_PAPEL[props.papel]}.ficha`, params: { terceroId: id } });
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="guardar">
    <EncabezadoPagina :titulo="titulo" :descripcion="esNuevo ? undefined : nombreActual" :volver="volver" />

    <TarjetaBase>
      <h2 class="mb-4 font-semibold">Datos generales</h2>
      <CamposDeDatosGenerales
        v-model="datos"
        :departamentos="departamentos"
        :municipios="municipios"
        :errores="formulario.errores.value"
      />
    </TarjetaBase>

    <TarjetaBase v-if="puedeGestionarElPapel">
      <h2 class="mb-4 font-semibold">Como {{ papel }}</h2>
      <CamposDelPapel v-model="papeles" :papel="papel" :categorias="categorias" />
    </TarjetaBase>

    <SeccionesAportadas
      v-if="papel === 'proveedor' && puedeGestionarElPapel"
      v-model="secciones"
      en="proveedor"
      :registro-id="proveedorId"
      :errores="formulario.errores.value"
      tarjetas
    />

    <TarjetaBase v-if="esNuevo">
      <h2 class="mb-4 font-semibold">Contactos</h2>
      <EditorDeContactos v-model="contactos" />
    </TarjetaBase>

    <div class="flex justify-end gap-2">
      <BotonBase variante="secundario" @click="router.back()">Cancelar</BotonBase>
      <BotonBase tipo="submit" :cargando="formulario.enviando.value">Guardar</BotonBase>
    </div>
  </form>
</template>
