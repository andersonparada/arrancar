<script setup lang="ts">
import { VENTANAS_CORE } from '../textos';
import { onMounted, reactive, ref } from 'vue';
import { Blocks, Building, Plus } from 'lucide-vue-next';
import { usarAvisos } from '../almacenes/avisos';
import { usarSesion } from '../almacenes/sesion';
import BotonBase from '../componentes/BotonBase.vue';
import CampoInterruptor from '../componentes/CampoInterruptor.vue';
import CampoTexto from '../componentes/CampoTexto.vue';
import EncabezadoPagina from '../componentes/EncabezadoPagina.vue';
import EstadoVacio from '../componentes/EstadoVacio.vue';
import InsigniaBase from '../componentes/InsigniaBase.vue';
import TarjetaBase from '../componentes/TarjetaBase.vue';
import VentanaModal from '../componentes/VentanaModal.vue';
import { usarFormulario } from '../composables/usar-formulario';
import { apiPlataforma, type CuentaPlataforma, type EstadoModulo } from '../servicios/plataforma.api';
import { formatearFechaHora } from '../utilidades/formato';

const sesion = usarSesion();
const avisos = usarAvisos();
const formulario = usarFormulario();

const cuentas = ref<CuentaPlataforma[]>([]);
const catalogo = ref<EstadoModulo[]>([]);

const alta = reactive({
  abierta: false,
  nombreCuenta: '',
  empresa: '',
  nit: '',
  nombres: '',
  apellidos: '',
  usuario: '',
  correo: '',
  contrasena: '',
  modulos: [] as string[],
});

const gestion = reactive({ abierta: false, cuenta: null as CuentaPlataforma | null, modulos: [] as EstadoModulo[] });

const nombreModulo = (clave: string) => catalogo.value.find((m) => m.clave === clave)?.nombre ?? clave;

async function cargar(): Promise<void> {
  try {
    [cuentas.value, catalogo.value] = await Promise.all([
      apiPlataforma.listarCuentas(),
      apiPlataforma.catalogoModulos(),
    ]);
  } catch (error) {
    avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar las cuentas.');
  }
}

function abrirAlta(): void {
  Object.assign(alta, {
    abierta: true,
    nombreCuenta: '',
    empresa: '',
    nit: '',
    nombres: '',
    apellidos: '',
    usuario: '',
    correo: '',
    contrasena: '',
    modulos: [],
  });
  formulario.errores.value = {};
}

async function darDeAlta(): Promise<void> {
  let resultado: Awaited<ReturnType<typeof apiPlataforma.crearCuenta>> | undefined;
  const exito = await formulario.enviar(async () => {
    resultado = await apiPlataforma.crearCuenta({
      nombreCuenta: alta.nombreCuenta,
      empresa: { nombre: alta.empresa, nit: alta.nit || undefined },
      propietario: {
        nombres: alta.nombres,
        apellidos: alta.apellidos,
        usuario: alta.usuario.trim().toLowerCase() || undefined,
        correo: alta.correo || null,
        contrasena: alta.contrasena || undefined,
      },
      modulos: alta.modulos,
    });
  });
  if (!exito || !resultado) return;
  const { propietario } = resultado;
  avisos.exito(
    propietario.existente
      ? `Cuenta creada. "${propietario.usuario}" ya existía y ahora también es propietario de esta cuenta.`
      : `Cuenta creada. El propietario inicia sesión como "${propietario.usuario}".`,
  );
  alta.abierta = false;
  await Promise.all([cargar(), sesion.cargar()]);
}

async function abrirGestion(cuenta: CuentaPlataforma): Promise<void> {
  try {
    gestion.modulos = await apiPlataforma.modulosDeCuenta(cuenta.id);
    gestion.cuenta = cuenta;
    gestion.abierta = true;
  } catch (error) {
    avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar los módulos.');
  }
}

async function cambiarModulo(modulo: EstadoModulo, activar: boolean): Promise<void> {
  const cuenta = gestion.cuenta;
  if (!cuenta) return;
  await formulario.enviar(async () => {
    gestion.modulos = activar
      ? await apiPlataforma.activarModulo(cuenta.id, modulo.clave)
      : await apiPlataforma.desactivarModulo(cuenta.id, modulo.clave);
  });
}

async function cambiarEstadoCuenta(cuenta: CuentaPlataforma, activa: boolean): Promise<void> {
  if (!activa) {
    const aceptado = await avisos.confirmar({
      titulo: 'Suspender cuenta',
      mensaje: `Nadie de "${cuenta.nombre}" podrá entrar hasta que se reactive. Los datos se conservan.`,
      textoConfirmar: 'Suspender',
      peligroso: true,
    });
    if (!aceptado) return;
  }
  const exito = await formulario.enviar(() => apiPlataforma.actualizarCuenta(cuenta.id, { activa }));
  if (exito) await cargar();
}

onMounted(cargar);
</script>

<template>
  <div>
    <EncabezadoPagina :titulo="VENTANAS_CORE.cuentas.titulo" :descripcion="VENTANAS_CORE.cuentas.descripcion">
      <BotonBase :icono="Plus" @click="abrirAlta">Nueva cuenta</BotonBase>
    </EncabezadoPagina>

    <EstadoVacio v-if="!cuentas.length" :icono="Building" titulo="Todavía no hay cuentas" />
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="cuenta in cuentas" :key="cuenta.id">
        <TarjetaBase class="flex h-full flex-col gap-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="font-semibold">{{ cuenta.nombre }}</p>
              <p class="text-sm text-tierra-500">
                {{ cuenta.totalEmpresas }} empresas · desde {{ formatearFechaHora(cuenta.creadoEn) }}
              </p>
            </div>
            <InsigniaBase :tono="cuenta.activa ? 'campo' : 'rojo'">{{
              cuenta.activa ? 'Activa' : 'Suspendida'
            }}</InsigniaBase>
          </div>
          <div class="mt-auto flex flex-wrap justify-end gap-2">
            <BotonBase variante="secundario" pequeno :icono="Blocks" @click="abrirGestion(cuenta)">Módulos</BotonBase>
            <BotonBase variante="fantasma" pequeno @click="cambiarEstadoCuenta(cuenta, !cuenta.activa)">
              {{ cuenta.activa ? 'Suspender' : 'Reactivar' }}
            </BotonBase>
          </div>
        </TarjetaBase>
      </li>
    </ul>

    <VentanaModal :abierta="alta.abierta" titulo="Nueva cuenta" ancha @cerrar="alta.abierta = false">
      <form id="form-alta" class="space-y-5" @submit.prevent="darDeAlta">
        <CampoTexto
          v-model="alta.nombreCuenta"
          etiqueta="Nombre de la cuenta"
          placeholder="Ej. Familia Pérez"
          requerido
          :error="formulario.errores.value.nombreCuenta"
        />
        <fieldset class="grid gap-4 sm:grid-cols-2">
          <legend class="mb-2 text-sm font-semibold">Primera empresa</legend>
          <CampoTexto
            v-model="alta.empresa"
            etiqueta="Nombre"
            requerido
            :error="formulario.errores.value['empresa.nombre']"
          />
          <CampoTexto v-model="alta.nit" etiqueta="NIT" :error="formulario.errores.value['empresa.nit']" />
        </fieldset>
        <fieldset class="grid gap-4 sm:grid-cols-2">
          <legend class="mb-2 text-sm font-semibold">Propietario</legend>
          <CampoTexto
            v-model="alta.nombres"
            etiqueta="Nombres"
            requerido
            :error="formulario.errores.value['propietario.nombres']"
          />
          <CampoTexto
            v-model="alta.apellidos"
            etiqueta="Apellidos"
            :error="formulario.errores.value['propietario.apellidos']"
          />
          <CampoTexto
            v-model="alta.usuario"
            etiqueta="Usuario (opcional)"
            sin-correccion
            ayuda="Vacío: se genera a partir del nombre. Si escribe uno que ya existe, esa persona será la propietaria."
            :error="formulario.errores.value['propietario.usuario']"
          />
          <CampoTexto
            v-model="alta.correo"
            etiqueta="Correo (opcional)"
            tipo="email"
            :error="formulario.errores.value['propietario.correo']"
          />
          <CampoTexto
            v-model="alta.contrasena"
            etiqueta="Contraseña inicial"
            tipo="password"
            autocompletar="new-password"
            ayuda="Obligatoria si el usuario es nuevo."
            :error="formulario.errores.value['propietario.contrasena']"
          />
        </fieldset>
        <fieldset v-if="catalogo.some((m) => !m.esencial)">
          <legend class="mb-2 text-sm font-semibold">Módulos contratados</legend>
          <label
            v-for="modulo in catalogo.filter((m) => !m.esencial)"
            :key="modulo.clave"
            class="flex items-start gap-2.5 py-1.5"
          >
            <input
              v-model="alta.modulos"
              type="checkbox"
              :value="modulo.clave"
              class="mt-0.5 size-4 accent-campo-700"
            />
            <span class="text-sm">
              {{ modulo.nombre }}
              <span v-if="modulo.dependeDe.length" class="block text-xs text-tierra-500"
                >Requiere: {{ modulo.dependeDe.map(nombreModulo).join(', ') }}</span
              >
            </span>
          </label>
        </fieldset>
      </form>
      <template #pie>
        <BotonBase variante="secundario" @click="alta.abierta = false">Cancelar</BotonBase>
        <BotonBase tipo="submit" form="form-alta" :cargando="formulario.enviando.value">Crear cuenta</BotonBase>
      </template>
    </VentanaModal>

    <VentanaModal
      :abierta="gestion.abierta"
      :titulo="`Módulos de ${gestion.cuenta?.nombre ?? ''}`"
      @cerrar="gestion.abierta = false"
    >
      <ul class="divide-y divide-tierra-100 dark:divide-tierra-800">
        <li v-for="modulo in gestion.modulos" :key="modulo.clave" class="py-3">
          <CampoInterruptor
            :model-value="modulo.activo"
            :etiqueta="modulo.nombre + (modulo.esencial ? ' (esencial)' : '')"
            :descripcion="
              modulo.descripcion +
              (modulo.dependeDe.length ? ` Requiere: ${modulo.dependeDe.map(nombreModulo).join(', ')}.` : '')
            "
            :deshabilitado="modulo.esencial || formulario.enviando.value"
            @update:model-value="cambiarModulo(modulo, $event)"
          />
        </li>
      </ul>
    </VentanaModal>
  </div>
</template>
