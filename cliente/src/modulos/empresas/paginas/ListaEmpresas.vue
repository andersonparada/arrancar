<script setup lang="ts">
import { VENTANAS_EMPRESAS } from '../textos';
import { onMounted, reactive, ref } from 'vue';
import { Building2, Mail, MapPin, Pencil, Phone, Plus } from 'lucide-vue-next';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import InsigniaBase from '@/modulos/core/componentes/InsigniaBase.vue';
import TarjetaBase from '@/modulos/core/componentes/TarjetaBase.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { formatearTelefono } from '@/modulos/core/utilidades/formato';
import { apiEmpresas, type Empresa } from '../servicios/empresas.api';

const sesion = usarSesion();
const avisos = usarAvisos();
const formulario = usarFormulario();
const empresas = ref<Empresa[]>([]);

const edicion = reactive({
  abierta: false,
  empresaId: null as string | null,
  nombre: '',
  nit: '',
  direccion: '',
  telefono: '',
  correo: '',
  activa: true,
});

async function cargar(): Promise<void> {
  try {
    empresas.value = await apiEmpresas.listar();
  } catch (error) {
    avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar las empresas.');
  }
}

function abrir(empresa?: Empresa): void {
  Object.assign(edicion, {
    abierta: true,
    empresaId: empresa?.id ?? null,
    nombre: empresa?.nombre ?? '',
    nit: empresa?.nit ?? '',
    direccion: empresa?.direccion ?? '',
    telefono: empresa?.telefono ?? '',
    correo: empresa?.correo ?? '',
    activa: empresa?.activa ?? true,
  });
  formulario.errores.value = {};
}

async function guardar(): Promise<void> {
  const datos = {
    nombre: edicion.nombre,
    nit: edicion.nit || null,
    direccion: edicion.direccion || null,
    telefono: edicion.telefono || null,
    correo: edicion.correo || null,
    activa: edicion.activa,
  };
  const exito = await formulario.enviar(() =>
    edicion.empresaId ? apiEmpresas.actualizar(edicion.empresaId, datos) : apiEmpresas.crear(datos),
  );
  if (!exito) return;
  avisos.exito(edicion.empresaId ? 'Empresa actualizada.' : 'Empresa creada. Ya puede elegirla en el selector.');
  edicion.abierta = false;
  await Promise.all([cargar(), sesion.cargar()]);
}

onMounted(cargar);
</script>

<template>
  <div>
    <EncabezadoPagina
      :titulo="VENTANAS_EMPRESAS.empresas.titulo"
      :descripcion="VENTANAS_EMPRESAS.empresas.descripcion(sesion.empresa?.cuentaNombre ?? '')"
    >
      <BotonBase v-permiso="'empresas.gestionar'" :icono="Plus" @click="abrir()">Nueva empresa</BotonBase>
    </EncabezadoPagina>

    <ul class="grid gap-3 md:grid-cols-2">
      <li v-for="empresa in empresas" :key="empresa.id">
        <TarjetaBase class="flex h-full flex-col gap-3">
          <div class="flex items-start gap-3">
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-campo-100 text-campo-800 dark:bg-campo-900 dark:text-campo-200"
            >
              <Building2 class="size-5" aria-hidden="true" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold">{{ empresa.nombre }}</p>
              <p class="text-sm text-tierra-500">NIT {{ empresa.nit ?? 'sin registrar' }} · {{ empresa.monedaBase }}</p>
            </div>
            <InsigniaBase v-if="empresa.id === sesion.empresa?.id" tono="campo">Activa ahora</InsigniaBase>
            <InsigniaBase v-else-if="!empresa.activa" tono="rojo">Desactivada</InsigniaBase>
          </div>
          <ul class="space-y-1 text-sm text-tierra-600 dark:text-tierra-300">
            <li v-if="empresa.direccion" class="flex items-center gap-2">
              <MapPin class="size-4 shrink-0" aria-hidden="true" />{{ empresa.direccion }}
            </li>
            <li v-if="empresa.telefono" class="flex items-center gap-2">
              <Phone class="size-4 shrink-0" aria-hidden="true" />{{ formatearTelefono(empresa.telefono) }}
            </li>
            <li v-if="empresa.correo" class="flex items-center gap-2">
              <Mail class="size-4 shrink-0" aria-hidden="true" />{{ empresa.correo }}
            </li>
          </ul>
          <div v-permiso="'empresas.gestionar'" class="mt-auto flex justify-end">
            <BotonBase variante="fantasma" pequeno :icono="Pencil" @click="abrir(empresa)">Editar</BotonBase>
          </div>
        </TarjetaBase>
      </li>
    </ul>

    <VentanaModal
      :abierta="edicion.abierta"
      :titulo="edicion.empresaId ? 'Editar empresa' : 'Nueva empresa'"
      @cerrar="edicion.abierta = false"
    >
      <form id="form-empresa" class="space-y-4" @submit.prevent="guardar">
        <CampoTexto
          v-model="edicion.nombre"
          etiqueta="Nombre"
          placeholder="Ej. Rancho San José"
          requerido
          :error="formulario.errores.value.nombre"
        />
        <CampoTexto
          v-model="edicion.nit"
          etiqueta="NIT"
          placeholder="Ej. 1234567-8"
          :error="formulario.errores.value.nit"
        />
        <CampoTexto v-model="edicion.direccion" etiqueta="Dirección" :error="formulario.errores.value.direccion" />
        <div class="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            v-model="edicion.telefono"
            etiqueta="Teléfono"
            tipo="tel"
            :error="formulario.errores.value.telefono"
          />
          <CampoTexto
            v-model="edicion.correo"
            etiqueta="Correo"
            tipo="email"
            :error="formulario.errores.value.correo"
          />
        </div>
        <CampoInterruptor
          v-if="edicion.empresaId"
          v-model="edicion.activa"
          etiqueta="Empresa activa"
          descripcion="Una empresa desactivada no aparece en el selector."
        />
      </form>
      <template #pie>
        <BotonBase variante="secundario" @click="edicion.abierta = false">Cancelar</BotonBase>
        <BotonBase tipo="submit" form="form-empresa" :cargando="formulario.enviando.value">Guardar</BotonBase>
      </template>
    </VentanaModal>
  </div>
</template>
