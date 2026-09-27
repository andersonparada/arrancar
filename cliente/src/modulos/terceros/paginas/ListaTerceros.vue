<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { Plus, Search, Users } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import EstadoVacio from '@/modulos/core/componentes/EstadoVacio.vue';
import Insignia from '@/modulos/core/componentes/Insignia.vue';
import Tarjeta from '@/modulos/core/componentes/Tarjeta.vue';
import AltaRapidaTercero from '../componentes/AltaRapidaTercero.vue';
import { tercerosApi, type PapelTercero, type Tercero, type TerceroEnListado } from '../servicios/terceros.api';

const router = useRouter();
const avisos = usarAvisos();

const terceros = ref<TerceroEnListado[]>([]);
const cargando = ref(false);
const altaAbierta = ref(false);

const filtros = reactive({
  texto: '',
  papel: '' as PapelTercero | '',
  activo: 'true' as 'true' | 'false' | '',
});

async function cargar(): Promise<void> {
  cargando.value = true;
  try {
    terceros.value = await tercerosApi.listar({
      texto: filtros.texto || undefined,
      papel: filtros.papel || undefined,
      activo: filtros.activo === '' ? undefined : filtros.activo === 'true',
    });
  } catch (error) {
    avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar los terceros.');
  } finally {
    cargando.value = false;
  }
}

let temporizador: ReturnType<typeof setTimeout> | undefined;
watch(filtros, () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(cargar, 300);
});

function irAFicha(tercero: Tercero): void {
  void router.push({ name: 'terceros.ficha', params: { terceroId: tercero.id } });
}

function alCrear(tercero: Tercero): void {
  altaAbierta.value = false;
  irAFicha(tercero);
}

onMounted(cargar);
</script>

<template>
  <div>
    <EncabezadoPagina titulo="Terceros" descripcion="Clientes, proveedores y trabajadores de la cuenta.">
      <BotonBase v-permiso="'terceros.gestionar'" :icono="Plus" @click="altaAbierta = true">Nuevo tercero</BotonBase>
    </EncabezadoPagina>

    <Tarjeta class="mb-4">
      <div class="grid gap-3 sm:grid-cols-3">
        <CampoTexto v-model="filtros.texto" etiqueta="Buscar" placeholder="Nombre, NIT, DPI o teléfono" ocultar-etiqueta />
        <CampoSelector
          v-model="filtros.papel"
          etiqueta="Papel"
          ocultar-etiqueta
          :opciones="[
            { valor: '', texto: 'Todos los papeles' },
            { valor: 'cliente', texto: 'Clientes' },
            { valor: 'proveedor', texto: 'Proveedores' },
            { valor: 'trabajador', texto: 'Trabajadores' },
          ]"
        />
        <CampoSelector
          v-model="filtros.activo"
          etiqueta="Estado"
          ocultar-etiqueta
          :opciones="[
            { valor: 'true', texto: 'Activos' },
            { valor: 'false', texto: 'Inactivos' },
            { valor: '', texto: 'Todos' },
          ]"
        />
      </div>
    </Tarjeta>

    <EstadoVacio
      v-if="!cargando && terceros.length === 0"
      :icono="Search"
      titulo="Sin resultados"
      descripcion="No hay terceros que coincidan con la búsqueda o los filtros."
    />

    <ul v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="tercero in terceros" :key="tercero.id">
        <Tarjeta class="flex h-full cursor-pointer flex-col gap-2" @click="irAFicha(tercero)">
          <div class="flex items-start gap-3">
            <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-campo-100 text-campo-800 dark:bg-campo-900 dark:text-campo-200">
              <Users class="size-5" aria-hidden="true" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold">{{ tercero.nombreMostrar }}</p>
              <p class="text-sm text-tierra-500">{{ tercero.nit ?? 'Sin NIT' }}</p>
            </div>
            <Insignia v-if="!tercero.activo" tono="rojo">Inactivo</Insignia>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <Insignia v-if="tercero.papeles.cliente" tono="campo">Cliente</Insignia>
            <Insignia v-if="tercero.papeles.proveedor" tono="trigo">Proveedor</Insignia>
            <Insignia v-if="tercero.papeles.trabajador" tono="tierra">Trabajador</Insignia>
          </div>
        </Tarjeta>
      </li>
    </ul>

    <AltaRapidaTercero :abierta="altaAbierta" @cerrar="altaAbierta = false" @creado="alCrear" />
  </div>
</template>
