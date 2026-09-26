<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { House, ImageUp, Palette, RotateCcw, Save, Sparkles, Trash2, TriangleAlert, Users } from 'lucide-vue-next';
import { usarApariencia } from '../almacenes/apariencia';
import { usarAvisos } from '../almacenes/avisos';
import BotonBase from '../componentes/BotonBase.vue';
import CampoColor from '../componentes/CampoColor.vue';
import CampoTexto from '../componentes/CampoTexto.vue';
import EncabezadoPagina from '../componentes/EncabezadoPagina.vue';
import Tarjeta from '../componentes/Tarjeta.vue';
import { usarFormulario } from '../composables/usar-formulario';
import { aparienciaApi } from '../servicios/apariencia.api';
import { contraste, sugerirColoresDeImagen, variablesTema } from '../utilidades/colores';

const apariencia = usarApariencia();
const avisos = usarAvisos();
const formulario = usarFormulario();
const selectorLogo = ref<HTMLInputElement | null>(null);
const urlLogoLocal = ref<string | null>(null);

const borrador = reactive({
  nombreAplicacion: apariencia.apariencia.nombreAplicacion,
  colorPrincipal: apariencia.apariencia.colorPrincipal,
  colorAcento: apariencia.apariencia.colorAcento,
});

const PALETAS = [
  { nombre: 'Campo', principal: '#1f4d2c', acento: '#e9c46a' },
  { nombre: 'Tierra', principal: '#5b3a24', acento: '#e0a458' },
  { nombre: 'Cielo', principal: '#1e3a5f', acento: '#7cc6fe' },
  { nombre: 'Vino', principal: '#5e1f2e', acento: '#f2c14e' },
  { nombre: 'Grafito', principal: '#2b2d31', acento: '#4ade80' },
  { nombre: 'Arena', principal: '#eadfc8', acento: '#7a4b2a' },
];

const estiloVistaPrevia = computed(() => variablesTema(borrador.colorPrincipal, borrador.colorAcento));
const logoVistaPrevia = computed(() => urlLogoLocal.value ?? apariencia.urlLogo);
const acentoPocoVisible = computed(() => contraste(borrador.colorPrincipal, borrador.colorAcento) < 1.6);
const hayCambios = computed(
  () =>
    borrador.nombreAplicacion !== apariencia.apariencia.nombreAplicacion ||
    borrador.colorPrincipal !== apariencia.apariencia.colorPrincipal ||
    borrador.colorAcento !== apariencia.apariencia.colorAcento,
);

function usarPaleta(paleta: (typeof PALETAS)[number]): void {
  borrador.colorPrincipal = paleta.principal;
  borrador.colorAcento = paleta.acento;
}

async function sugerirDesdeLogo(): Promise<void> {
  try {
    const sugerencia = await sugerirColoresDeImagen(logoVistaPrevia.value);
    if (!sugerencia) {
      avisos.info('El logo no tiene colores suficientes para sugerir una paleta.');
      return;
    }
    borrador.colorPrincipal = sugerencia.principal;
    borrador.colorAcento = sugerencia.acento;
    avisos.info('Colores sugeridos a partir del logo. Revise la vista previa y guarde.');
  } catch {
    avisos.error('No se pudo leer el logo.');
  }
}

async function subirLogo(evento: Event): Promise<void> {
  const archivo = (evento.target as HTMLInputElement).files?.[0];
  if (!archivo) return;
  if (urlLogoLocal.value) URL.revokeObjectURL(urlLogoLocal.value);
  urlLogoLocal.value = URL.createObjectURL(archivo);

  let resultado: Awaited<ReturnType<typeof aparienciaApi.cambiarLogo>> | undefined;
  const exito = await formulario.enviar(async () => (resultado = await aparienciaApi.cambiarLogo(archivo)));
  if (exito && resultado) {
    apariencia.establecer(resultado);
    avisos.exito('Logo actualizado.');
    await sugerirDesdeLogo();
  }
  if (selectorLogo.value) selectorLogo.value.value = '';
}

async function quitarLogo(): Promise<void> {
  const aceptado = await avisos.confirmar({ mensaje: '¿Quitar el logo propio y volver al de Arrancar?', textoConfirmar: 'Quitar' });
  if (!aceptado) return;
  let resultado: Awaited<ReturnType<typeof aparienciaApi.quitarLogo>> | undefined;
  if (await formulario.enviar(async () => (resultado = await aparienciaApi.quitarLogo())) && resultado) {
    urlLogoLocal.value = null;
    apariencia.establecer(resultado);
  }
}

async function guardar(): Promise<void> {
  let resultado: Awaited<ReturnType<typeof aparienciaApi.guardar>> | undefined;
  const exito = await formulario.enviar(async () => (resultado = await aparienciaApi.guardar({ ...borrador })));
  if (exito && resultado) {
    apariencia.establecer(resultado);
    avisos.exito('Apariencia guardada para toda la instalación.');
  }
}

async function restablecer(): Promise<void> {
  const aceptado = await avisos.confirmar({
    titulo: 'Restablecer apariencia',
    mensaje: 'Se volverá al nombre y los colores originales. El logo no cambia.',
    textoConfirmar: 'Restablecer',
  });
  if (!aceptado) return;
  let resultado: Awaited<ReturnType<typeof aparienciaApi.restablecer>> | undefined;
  if (await formulario.enviar(async () => (resultado = await aparienciaApi.restablecer())) && resultado) {
    apariencia.establecer(resultado);
    Object.assign(borrador, {
      nombreAplicacion: resultado.nombreAplicacion,
      colorPrincipal: resultado.colorPrincipal,
      colorAcento: resultado.colorAcento,
    });
  }
}

onBeforeUnmount(() => {
  if (urlLogoLocal.value) URL.revokeObjectURL(urlLogoLocal.value);
});
</script>

<template>
  <div>
    <EncabezadoPagina
      titulo="Apariencia"
      descripcion="Nombre, logo y colores de esta instalación. Se aplican a todas las cuentas del servidor: menú, encabezados e inicio de sesión."
    >
      <BotonBase variante="secundario" :icono="RotateCcw" @click="restablecer">Restablecer</BotonBase>
      <BotonBase :icono="Save" :cargando="formulario.enviando.value" :deshabilitado="!hayCambios" @click="guardar">Guardar</BotonBase>
    </EncabezadoPagina>

    <div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div class="space-y-4">
        <Tarjeta class="space-y-4">
          <h2 class="font-semibold">Identidad</h2>
          <CampoTexto v-model="borrador.nombreAplicacion" etiqueta="Nombre de la aplicación" requerido :error="formulario.errores.value.nombreAplicacion" />

          <div class="flex flex-wrap items-center gap-4">
            <img :src="logoVistaPrevia" alt="Logo actual" class="size-16 rounded-xl bg-tierra-100 object-contain p-1.5 dark:bg-tierra-800" />
            <div class="flex flex-wrap gap-2">
              <BotonBase variante="secundario" :icono="ImageUp" @click="selectorLogo?.click()">Subir logo</BotonBase>
              <BotonBase v-if="apariencia.apariencia.urlLogo" variante="fantasma" :icono="Trash2" @click="quitarLogo">Quitar</BotonBase>
              <BotonBase variante="fantasma" :icono="Sparkles" @click="sugerirDesdeLogo">Colores del logo</BotonBase>
            </div>
            <input ref="selectorLogo" type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" class="hidden" @change="subirLogo" />
          </div>
          <p class="text-xs text-tierra-500">SVG o PNG con fondo transparente se ven mejor. Se ajusta a un cuadrado de 512 px.</p>
        </Tarjeta>

        <Tarjeta class="space-y-4">
          <h2 class="flex items-center gap-2 font-semibold"><Palette class="size-5 text-tierra-500" aria-hidden="true" />Colores</h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <CampoColor v-model="borrador.colorPrincipal" etiqueta="Color principal" ayuda="Menú lateral, encabezado y fondo del inicio de sesión." />
            <CampoColor v-model="borrador.colorAcento" etiqueta="Color de acento" ayuda="Resaltados: opción activa del menú, iniciales del usuario." />
          </div>
          <p v-if="acentoPocoVisible" class="flex items-center gap-2 rounded-lg bg-trigo-300/30 px-3 py-2 text-sm">
            <TriangleAlert class="size-4 shrink-0 text-trigo-500" aria-hidden="true" />
            El acento casi no se distingue del color principal.
          </p>
          <div>
            <p class="mb-2 text-sm font-medium text-tierra-700 dark:text-tierra-200">Paletas sugeridas</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="paleta in PALETAS"
                :key="paleta.nombre"
                type="button"
                class="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm ring-1 ring-tierra-200 hover:ring-tierra-400 dark:ring-tierra-700"
                @click="usarPaleta(paleta)"
              >
                <span class="flex">
                  <span class="size-5 rounded-full ring-2 ring-white dark:ring-tierra-900" :style="{ background: paleta.principal }" />
                  <span class="-ml-1.5 size-5 rounded-full ring-2 ring-white dark:ring-tierra-900" :style="{ background: paleta.acento }" />
                </span>
                {{ paleta.nombre }}
              </button>
            </div>
          </div>
          <p class="text-xs text-tierra-500">
            Los botones, avisos y formularios conservan sus colores para que la app sea igual de clara en todas las instalaciones.
          </p>
        </Tarjeta>
      </div>

      <div class="space-y-3 lg:sticky lg:top-8 lg:self-start">
        <p class="text-sm font-semibold tracking-wider text-tierra-500 uppercase">Vista previa</p>
        <div :style="estiloVistaPrevia" class="overflow-hidden rounded-2xl ring-1 ring-tierra-200 dark:ring-tierra-700" aria-hidden="true">
          <div class="flex h-72">
            <div class="flex w-44 flex-col bg-marca p-3 text-marca-texto">
              <div class="mb-3 flex items-center gap-2">
                <img :src="logoVistaPrevia" alt="" class="size-6 object-contain" />
                <span class="truncate text-sm font-bold">{{ borrador.nombreAplicacion || 'Sin nombre' }}</span>
              </div>
              <div class="mb-3 rounded-md bg-marca-oscuro/60 px-2 py-1.5 text-xs ring-1 ring-marca-texto/15">Rancho San José</div>
              <p class="mb-1 text-[10px] font-semibold tracking-wider text-marca-texto/60 uppercase">General</p>
              <div class="relative mb-1 flex items-center gap-2 rounded-md bg-marca-texto/15 px-2 py-1.5 text-xs">
                <span class="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-acento" />
                <House class="size-3.5" />Inicio
              </div>
              <div class="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-marca-texto/85"><Users class="size-3.5" />Usuarios</div>
              <div class="mt-auto flex items-center gap-2 border-t border-marca-texto/10 pt-2">
                <span class="flex size-6 items-center justify-center rounded-full bg-acento text-[10px] font-bold text-acento-texto">DD</span>
                <span class="truncate text-xs">Dueño Demo</span>
              </div>
            </div>
            <div class="flex-1 space-y-2 bg-tierra-50 p-3 dark:bg-tierra-900">
              <div class="h-3 w-24 rounded bg-tierra-300 dark:bg-tierra-700" />
              <div class="h-14 rounded-lg bg-white ring-1 ring-tierra-200 dark:bg-tierra-800 dark:ring-tierra-700" />
              <div class="h-14 rounded-lg bg-white ring-1 ring-tierra-200 dark:bg-tierra-800 dark:ring-tierra-700" />
            </div>
          </div>
          <div class="flex flex-col items-center gap-1 bg-linear-to-b from-marca to-marca-oscuro py-5 text-marca-texto">
            <img :src="logoVistaPrevia" alt="" class="size-10 object-contain" />
            <span class="text-sm font-bold">{{ borrador.nombreAplicacion || 'Sin nombre' }}</span>
            <span class="text-[11px] text-marca-texto/75">Pantalla de inicio de sesión</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
