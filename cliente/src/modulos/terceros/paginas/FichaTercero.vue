<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { Briefcase, HardHat, Pencil, Plus, ShoppingCart, Trash2, Users } from 'lucide-vue-next';
import { useRoute } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import BotonBase from '@/modulos/core/componentes/BotonBase.vue';
import CampoInterruptor from '@/modulos/core/componentes/CampoInterruptor.vue';
import CampoSelector from '@/modulos/core/componentes/CampoSelector.vue';
import CampoTexto from '@/modulos/core/componentes/CampoTexto.vue';
import EncabezadoPagina from '@/modulos/core/componentes/EncabezadoPagina.vue';
import Insignia from '@/modulos/core/componentes/Insignia.vue';
import Tarjeta from '@/modulos/core/componentes/Tarjeta.vue';
import VentanaModal from '@/modulos/core/componentes/VentanaModal.vue';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import { geografiaApi, type Departamento, type Municipio } from '@/modulos/core/servicios/geografia.api';
import {
  tercerosApi,
  type CategoriaProveedor,
  type ClaseCliente,
  type DatosTercero,
  type FichaTercero,
} from '../servicios/terceros.api';

const route = useRoute();
const avisos = usarAvisos();
const sesion = usarSesion();
const formulario = usarFormulario();
const formularioContacto = usarFormulario();
const formularioPapel = usarFormulario();

const terceroId = computed(() => route.params.terceroId as string);
const ficha = ref<FichaTercero | null>(null);
const departamentos = ref<Departamento[]>([]);
const municipios = ref<Municipio[]>([]);
const categoriasProveedor = ref<CategoriaProveedor[]>([]);

const puedeVerTrabajador = computed(() => sesion.puede('trabajadores.ver') || sesion.puede('trabajadores.gestionar'));

async function cargar(): Promise<void> {
  try {
    ficha.value = await tercerosApi.obtener(terceroId.value);
    if (ficha.value.departamentoCodigo) municipios.value = await geografiaApi.listarMunicipios(ficha.value.departamentoCodigo);
  } catch (error) {
    avisos.error(error instanceof Error ? error.message : 'No se pudo cargar el tercero.');
  }
}

onMounted(async () => {
  departamentos.value = await geografiaApi.listarDepartamentos();
  if (sesion.puede('proveedores.gestionar') || sesion.puede('terceros.ver')) {
    categoriasProveedor.value = await tercerosApi.listarCategoriasProveedor().catch(() => []);
  }
  await cargar();
});

// --- Datos generales ---
const edicion = reactive({ abierta: false, datos: null as DatosTercero | null });

function abrirEdicion(): void {
  if (!ficha.value) return;
  edicion.datos = {
    tipo: ficha.value.tipo,
    nombres: ficha.value.nombres,
    apellidos: ficha.value.apellidos,
    razonSocial: ficha.value.razonSocial,
    nombreComercial: ficha.value.nombreComercial,
    nit: ficha.value.nit,
    dpi: ficha.value.dpi,
    telefono: ficha.value.telefono,
    whatsapp: ficha.value.whatsapp,
    correo: ficha.value.correo,
    departamentoCodigo: ficha.value.departamentoCodigo,
    municipioCodigo: ficha.value.municipioCodigo,
    direccion: ficha.value.direccion,
    fotoArchivoId: ficha.value.fotoArchivoId,
    notas: ficha.value.notas,
    activo: ficha.value.activo,
  };
  formulario.errores.value = {};
  edicion.abierta = true;
}

watch(
  () => edicion.datos?.departamentoCodigo,
  async (codigo) => {
    municipios.value = codigo ? await geografiaApi.listarMunicipios(codigo) : [];
    if (edicion.datos && edicion.datos.municipioCodigo && !municipios.value.some((m) => m.codigo === edicion.datos!.municipioCodigo)) {
      edicion.datos.municipioCodigo = null;
    }
  },
);

async function guardarEdicion(confirmarDuplicado = false): Promise<void> {
  if (!edicion.datos) return;
  const exito = await formulario.enviar(async () => {
    try {
      await tercerosApi.actualizar(terceroId.value, { ...edicion.datos!, confirmarDuplicado });
    } catch (error) {
      if (error instanceof ErrorApi && error.codigo === 'conflicto' && window.confirm(`${error.message}\n\n¿Desea guardarlo de todas formas?`)) {
        await tercerosApi.actualizar(terceroId.value, { ...edicion.datos!, confirmarDuplicado: true });
        return;
      }
      throw error;
    }
  });
  if (!exito) return;
  edicion.abierta = false;
  avisos.exito('Tercero actualizado.');
  await cargar();
}

// --- Contactos ---
const contacto = reactive({
  abierto: false,
  id: null as string | null,
  nombre: '',
  cargo: '',
  telefono: '',
  whatsapp: '',
  correo: '',
  notas: '',
});

function abrirContacto(existente?: FichaTercero['contactos'][number]): void {
  contacto.abierto = true;
  contacto.id = existente?.id ?? null;
  contacto.nombre = existente?.nombre ?? '';
  contacto.cargo = existente?.cargo ?? '';
  contacto.telefono = existente?.telefono ?? '';
  contacto.whatsapp = existente?.whatsapp ?? '';
  contacto.correo = existente?.correo ?? '';
  contacto.notas = existente?.notas ?? '';
  formularioContacto.errores.value = {};
}

async function guardarContacto(): Promise<void> {
  const datos = {
    nombre: contacto.nombre,
    cargo: contacto.cargo || null,
    telefono: contacto.telefono || null,
    whatsapp: contacto.whatsapp || null,
    correo: contacto.correo || null,
    notas: contacto.notas || null,
  };
  const exito = await formularioContacto.enviar(() =>
    contacto.id ? tercerosApi.actualizarContacto(terceroId.value, contacto.id!, datos) : tercerosApi.crearContacto(terceroId.value, datos),
  );
  if (!exito) return;
  contacto.abierto = false;
  await cargar();
}

async function eliminarContacto(contactoId: string): Promise<void> {
  if (!window.confirm('¿Eliminar este contacto?')) return;
  try {
    await tercerosApi.eliminarContacto(terceroId.value, contactoId);
    await cargar();
  } catch (error) {
    avisos.error(error instanceof Error ? error.message : 'No se pudo eliminar el contacto.');
  }
}

// --- Papel cliente ---
const cliente = reactive({ abierto: false, clase: 'directo' as ClaseCliente, activo: true, notas: '' });

function abrirCliente(): void {
  cliente.abierto = true;
  cliente.clase = ficha.value?.cliente?.clase ?? 'directo';
  cliente.activo = ficha.value?.cliente?.activo ?? true;
  cliente.notas = ficha.value?.cliente?.notas ?? '';
  formularioPapel.errores.value = {};
}

async function guardarCliente(): Promise<void> {
  const exito = await formularioPapel.enviar(() =>
    tercerosApi.asignarCliente(terceroId.value, { clase: cliente.clase, activo: cliente.activo, notas: cliente.notas || null }),
  );
  if (!exito) return;
  cliente.abierto = false;
  await cargar();
}

async function quitarCliente(): Promise<void> {
  if (!window.confirm('¿Quitar el papel de cliente?')) return;
  await tercerosApi.quitarCliente(terceroId.value);
  await cargar();
}

// --- Papel proveedor ---
const proveedor = reactive({ abierto: false, categoriaId: '' as string | '', activo: true, notas: '' });

function abrirProveedor(): void {
  proveedor.abierto = true;
  proveedor.categoriaId = ficha.value?.proveedor?.categoriaId ?? '';
  proveedor.activo = ficha.value?.proveedor?.activo ?? true;
  proveedor.notas = ficha.value?.proveedor?.notas ?? '';
  formularioPapel.errores.value = {};
}

async function guardarProveedor(): Promise<void> {
  const exito = await formularioPapel.enviar(() =>
    tercerosApi.asignarProveedor(terceroId.value, {
      categoriaId: proveedor.categoriaId || null,
      activo: proveedor.activo,
      notas: proveedor.notas || null,
    }),
  );
  if (!exito) return;
  proveedor.abierto = false;
  await cargar();
}

async function quitarProveedor(): Promise<void> {
  if (!window.confirm('¿Quitar el papel de proveedor?')) return;
  await tercerosApi.quitarProveedor(terceroId.value);
  await cargar();
}

async function nuevaCategoria(): Promise<void> {
  const nombre = window.prompt('Nombre de la nueva categoría de proveedor:');
  if (!nombre) return;
  const categoria = await tercerosApi.crearCategoriaProveedor(nombre);
  categoriasProveedor.value.push(categoria);
  proveedor.categoriaId = categoria.id;
}

// --- Papel trabajador ---
const trabajador = reactive({ abierto: false, cargo: '', fechaIngreso: '', fechaSalida: '', activo: true, notas: '' });

function abrirTrabajador(): void {
  trabajador.abierto = true;
  trabajador.cargo = ficha.value?.trabajador?.cargo ?? '';
  trabajador.fechaIngreso = ficha.value?.trabajador?.fechaIngreso ?? '';
  trabajador.fechaSalida = ficha.value?.trabajador?.fechaSalida ?? '';
  trabajador.activo = ficha.value?.trabajador?.activo ?? true;
  trabajador.notas = ficha.value?.trabajador?.notas ?? '';
  formularioPapel.errores.value = {};
}

async function guardarTrabajador(): Promise<void> {
  const exito = await formularioPapel.enviar(() =>
    tercerosApi.asignarTrabajador(terceroId.value, {
      cargo: trabajador.cargo || null,
      fechaIngreso: trabajador.fechaIngreso || null,
      fechaSalida: trabajador.fechaSalida || null,
      activo: trabajador.activo,
      notas: trabajador.notas || null,
    }),
  );
  if (!exito) return;
  trabajador.abierto = false;
  await cargar();
}

async function quitarTrabajador(): Promise<void> {
  if (!window.confirm('¿Quitar el papel de trabajador?')) return;
  await tercerosApi.quitarTrabajador(terceroId.value);
  await cargar();
}
</script>

<template>
  <div v-if="ficha" class="space-y-4">
    <EncabezadoPagina :titulo="ficha.nombreMostrar" :descripcion="ficha.tipo === 'individual' ? 'Persona individual' : 'Persona jurídica'">
      <Insignia v-if="!ficha.activo" tono="rojo">Inactivo</Insignia>
      <BotonBase v-permiso="'terceros.gestionar'" variante="secundario" :icono="Pencil" @click="abrirEdicion">Editar</BotonBase>
    </EncabezadoPagina>

    <Tarjeta>
      <h2 class="mb-3 font-semibold">Datos generales</h2>
      <dl class="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt class="text-tierra-500">NIT</dt><dd>{{ ficha.nit ?? 'Sin registrar' }}</dd></div>
        <div><dt class="text-tierra-500">DPI</dt><dd>{{ ficha.dpi ?? 'Sin registrar' }}</dd></div>
        <div><dt class="text-tierra-500">Teléfono</dt><dd>{{ ficha.telefono ?? 'Sin registrar' }}</dd></div>
        <div><dt class="text-tierra-500">WhatsApp</dt><dd>{{ ficha.whatsapp ?? 'Sin registrar' }}</dd></div>
        <div><dt class="text-tierra-500">Correo</dt><dd>{{ ficha.correo ?? 'Sin registrar' }}</dd></div>
        <div><dt class="text-tierra-500">Dirección</dt><dd>{{ ficha.direccion ?? 'Sin registrar' }}</dd></div>
      </dl>
      <p v-if="ficha.notas" class="mt-3 text-sm text-tierra-600 dark:text-tierra-300">{{ ficha.notas }}</p>
    </Tarjeta>

    <Tarjeta>
      <div class="mb-3 flex items-center justify-between">
        <h2 class="font-semibold">Contactos</h2>
        <BotonBase v-permiso="'terceros.gestionar'" variante="secundario" pequeno :icono="Plus" @click="abrirContacto()">Agregar</BotonBase>
      </div>
      <p v-if="ficha.contactos.length === 0" class="text-sm text-tierra-500">Sin contactos registrados.</p>
      <ul v-else class="divide-y divide-tierra-100 dark:divide-tierra-800">
        <li v-for="c in ficha.contactos" :key="c.id" class="flex items-center justify-between gap-3 py-2">
          <div class="min-w-0">
            <p class="truncate font-medium">{{ c.nombre }}<span v-if="c.cargo" class="text-tierra-500"> · {{ c.cargo }}</span></p>
            <p class="truncate text-sm text-tierra-500">{{ [c.telefono, c.correo].filter(Boolean).join(' · ') || 'Sin datos de contacto' }}</p>
          </div>
          <div v-permiso="'terceros.gestionar'" class="flex shrink-0 gap-1">
            <BotonBase variante="fantasma" pequeno :icono="Pencil" @click="abrirContacto(c)" />
            <BotonBase variante="fantasma" pequeno :icono="Trash2" @click="eliminarContacto(c.id)" />
          </div>
        </li>
      </ul>
    </Tarjeta>

    <!-- Papel cliente -->
    <Tarjeta>
      <div class="mb-3 flex items-center justify-between">
        <h2 class="flex items-center gap-2 font-semibold"><ShoppingCart class="size-4" aria-hidden="true" /> Cliente</h2>
        <div v-permiso="'clientes.gestionar'" class="flex gap-2">
          <BotonBase variante="secundario" pequeno :icono="Pencil" @click="abrirCliente">{{ ficha.cliente ? 'Editar' : 'Asignar' }}</BotonBase>
          <BotonBase v-if="ficha.cliente" variante="fantasma" pequeno @click="quitarCliente">Quitar</BotonBase>
        </div>
      </div>
      <p v-if="!ficha.cliente" class="text-sm text-tierra-500">No tiene el papel de cliente.</p>
      <dl v-else class="grid gap-2 text-sm sm:grid-cols-2">
        <div><dt class="text-tierra-500">Clase</dt><dd>{{ ficha.cliente.clase }}</dd></div>
        <div><dt class="text-tierra-500">Estado</dt><dd>{{ ficha.cliente.activo ? 'Activo' : 'Inactivo' }}</dd></div>
      </dl>
    </Tarjeta>

    <!-- Papel proveedor -->
    <Tarjeta>
      <div class="mb-3 flex items-center justify-between">
        <h2 class="flex items-center gap-2 font-semibold"><Briefcase class="size-4" aria-hidden="true" /> Proveedor</h2>
        <div v-permiso="'proveedores.gestionar'" class="flex gap-2">
          <BotonBase variante="secundario" pequeno :icono="Pencil" @click="abrirProveedor">{{ ficha.proveedor ? 'Editar' : 'Asignar' }}</BotonBase>
          <BotonBase v-if="ficha.proveedor" variante="fantasma" pequeno @click="quitarProveedor">Quitar</BotonBase>
        </div>
      </div>
      <p v-if="!ficha.proveedor" class="text-sm text-tierra-500">No tiene el papel de proveedor.</p>
      <dl v-else class="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-tierra-500">Categoría</dt>
          <dd>{{ categoriasProveedor.find((c) => c.id === ficha!.proveedor!.categoriaId)?.nombre ?? 'Sin categoría' }}</dd>
        </div>
        <div><dt class="text-tierra-500">Estado</dt><dd>{{ ficha.proveedor.activo ? 'Activo' : 'Inactivo' }}</dd></div>
      </dl>
    </Tarjeta>

    <!-- Papel trabajador -->
    <Tarjeta v-if="puedeVerTrabajador">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="flex items-center gap-2 font-semibold"><HardHat class="size-4" aria-hidden="true" /> Trabajador</h2>
        <div v-permiso="'trabajadores.gestionar'" class="flex gap-2">
          <BotonBase variante="secundario" pequeno :icono="Pencil" @click="abrirTrabajador">{{ ficha.trabajador ? 'Editar' : 'Asignar' }}</BotonBase>
          <BotonBase v-if="ficha.trabajador" variante="fantasma" pequeno @click="quitarTrabajador">Quitar</BotonBase>
        </div>
      </div>
      <p v-if="!ficha.trabajador" class="text-sm text-tierra-500">No tiene el papel de trabajador.</p>
      <dl v-else class="grid gap-2 text-sm sm:grid-cols-2">
        <div><dt class="text-tierra-500">Cargo</dt><dd>{{ ficha.trabajador.cargo ?? 'Sin registrar' }}</dd></div>
        <div><dt class="text-tierra-500">Fecha de ingreso</dt><dd>{{ ficha.trabajador.fechaIngreso ?? 'Sin registrar' }}</dd></div>
        <div><dt class="text-tierra-500">Estado</dt><dd>{{ ficha.trabajador.activo ? 'Activo' : 'Inactivo' }}</dd></div>
      </dl>
    </Tarjeta>

    <!-- Modal: editar datos generales -->
    <VentanaModal :abierta="edicion.abierta" titulo="Editar tercero" ancha @cerrar="edicion.abierta = false">
      <form v-if="edicion.datos" id="form-editar-tercero" class="space-y-4" @submit.prevent="guardarEdicion()">
        <CampoSelector
          v-model="edicion.datos.tipo"
          etiqueta="Tipo"
          :opciones="[
            { valor: 'individual', texto: 'Persona individual' },
            { valor: 'juridica', texto: 'Persona jurídica (empresa)' },
          ]"
        />
        <template v-if="edicion.datos.tipo === 'individual'">
          <CampoTexto v-model="edicion.datos.nombres" etiqueta="Nombres" requerido :error="formulario.errores.value.nombres" />
          <CampoTexto v-model="edicion.datos.apellidos" etiqueta="Apellidos" :error="formulario.errores.value.apellidos" />
        </template>
        <CampoTexto v-else v-model="edicion.datos.razonSocial" etiqueta="Razón social" requerido :error="formulario.errores.value.razonSocial" />
        <CampoTexto v-model="edicion.datos.nombreComercial" etiqueta="Nombre comercial" :error="formulario.errores.value.nombreComercial" />
        <div class="grid gap-4 sm:grid-cols-2">
          <CampoTexto v-model="edicion.datos.nit" etiqueta="NIT" placeholder="CF si no tiene" :error="formulario.errores.value.nit" />
          <CampoTexto v-model="edicion.datos.dpi" etiqueta="DPI" :error="formulario.errores.value.dpi" />
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <CampoTexto v-model="edicion.datos.telefono" etiqueta="Teléfono" tipo="tel" :error="formulario.errores.value.telefono" />
          <CampoTexto v-model="edicion.datos.whatsapp" etiqueta="WhatsApp" tipo="tel" :error="formulario.errores.value.whatsapp" />
        </div>
        <CampoTexto v-model="edicion.datos.correo" etiqueta="Correo" tipo="email" :error="formulario.errores.value.correo" />
        <div class="grid gap-4 sm:grid-cols-2">
          <CampoSelector
            v-model="edicion.datos.departamentoCodigo"
            etiqueta="Departamento"
            :opciones="[{ valor: null, texto: 'Sin registrar' }, ...departamentos.map((d) => ({ valor: d.codigo, texto: d.nombre }))]"
          />
          <CampoSelector
            v-model="edicion.datos.municipioCodigo"
            etiqueta="Municipio"
            :opciones="[{ valor: null, texto: 'Sin registrar' }, ...municipios.map((m) => ({ valor: m.codigo, texto: m.nombre }))]"
          />
        </div>
        <CampoTexto v-model="edicion.datos.direccion" etiqueta="Dirección" :error="formulario.errores.value.direccion" />
        <CampoTexto v-model="edicion.datos.notas" etiqueta="Notas" multilinea :error="formulario.errores.value.notas" />
        <CampoInterruptor v-model="edicion.datos.activo" etiqueta="Tercero activo" descripcion="Al inactivarlo, se inactivan también sus papeles." />
      </form>
      <template #pie>
        <BotonBase variante="secundario" @click="edicion.abierta = false">Cancelar</BotonBase>
        <BotonBase tipo="submit" form="form-editar-tercero" :cargando="formulario.enviando.value">Guardar</BotonBase>
      </template>
    </VentanaModal>

    <!-- Modal: contacto -->
    <VentanaModal :abierta="contacto.abierto" :titulo="contacto.id ? 'Editar contacto' : 'Nuevo contacto'" @cerrar="contacto.abierto = false">
      <form id="form-contacto" class="space-y-4" @submit.prevent="guardarContacto">
        <CampoTexto v-model="contacto.nombre" etiqueta="Nombre" requerido :error="formularioContacto.errores.value.nombre" />
        <CampoTexto v-model="contacto.cargo" etiqueta="Cargo" :error="formularioContacto.errores.value.cargo" />
        <div class="grid gap-4 sm:grid-cols-2">
          <CampoTexto v-model="contacto.telefono" etiqueta="Teléfono" tipo="tel" :error="formularioContacto.errores.value.telefono" />
          <CampoTexto v-model="contacto.whatsapp" etiqueta="WhatsApp" tipo="tel" :error="formularioContacto.errores.value.whatsapp" />
        </div>
        <CampoTexto v-model="contacto.correo" etiqueta="Correo" tipo="email" :error="formularioContacto.errores.value.correo" />
        <CampoTexto v-model="contacto.notas" etiqueta="Notas" multilinea :error="formularioContacto.errores.value.notas" />
      </form>
      <template #pie>
        <BotonBase variante="secundario" @click="contacto.abierto = false">Cancelar</BotonBase>
        <BotonBase tipo="submit" form="form-contacto" :cargando="formularioContacto.enviando.value">Guardar</BotonBase>
      </template>
    </VentanaModal>

    <!-- Modal: papel cliente -->
    <VentanaModal :abierta="cliente.abierto" titulo="Papel de cliente" @cerrar="cliente.abierto = false">
      <form id="form-cliente" class="space-y-4" @submit.prevent="guardarCliente">
        <CampoSelector
          v-model="cliente.clase"
          etiqueta="Clase"
          :opciones="[
            { valor: 'directo', texto: 'Consumidor directo' },
            { valor: 'intermediario', texto: 'Intermediario o acopiador' },
            { valor: 'empresa', texto: 'Empresa compradora' },
            { valor: 'subasta', texto: 'Subasta o feria' },
          ]"
        />
        <CampoTexto v-model="cliente.notas" etiqueta="Notas" multilinea />
        <CampoInterruptor v-model="cliente.activo" etiqueta="Papel activo" />
      </form>
      <template #pie>
        <BotonBase variante="secundario" @click="cliente.abierto = false">Cancelar</BotonBase>
        <BotonBase tipo="submit" form="form-cliente" :cargando="formularioPapel.enviando.value">Guardar</BotonBase>
      </template>
    </VentanaModal>

    <!-- Modal: papel proveedor -->
    <VentanaModal :abierta="proveedor.abierto" titulo="Papel de proveedor" @cerrar="proveedor.abierto = false">
      <form id="form-proveedor" class="space-y-4" @submit.prevent="guardarProveedor">
        <div class="flex items-end gap-2">
          <CampoSelector
            v-model="proveedor.categoriaId"
            etiqueta="Categoría"
            class="flex-1"
            :opciones="[{ valor: '', texto: 'Sin categoría' }, ...categoriasProveedor.map((c) => ({ valor: c.id, texto: c.nombre }))]"
          />
          <BotonBase variante="secundario" :icono="Plus" @click="nuevaCategoria" />
        </div>
        <CampoTexto v-model="proveedor.notas" etiqueta="Notas" multilinea />
        <CampoInterruptor v-model="proveedor.activo" etiqueta="Papel activo" />
      </form>
      <template #pie>
        <BotonBase variante="secundario" @click="proveedor.abierto = false">Cancelar</BotonBase>
        <BotonBase tipo="submit" form="form-proveedor" :cargando="formularioPapel.enviando.value">Guardar</BotonBase>
      </template>
    </VentanaModal>

    <!-- Modal: papel trabajador -->
    <VentanaModal :abierta="trabajador.abierto" titulo="Papel de trabajador" @cerrar="trabajador.abierto = false">
      <form id="form-trabajador" class="space-y-4" @submit.prevent="guardarTrabajador">
        <CampoTexto v-model="trabajador.cargo" etiqueta="Cargo" />
        <div class="grid gap-4 sm:grid-cols-2">
          <CampoTexto v-model="trabajador.fechaIngreso" etiqueta="Fecha de ingreso" placeholder="AAAA-MM-DD" />
          <CampoTexto v-model="trabajador.fechaSalida" etiqueta="Fecha de salida" placeholder="AAAA-MM-DD" />
        </div>
        <CampoTexto v-model="trabajador.notas" etiqueta="Notas" multilinea />
        <CampoInterruptor v-model="trabajador.activo" etiqueta="Papel activo" />
      </form>
      <template #pie>
        <BotonBase variante="secundario" @click="trabajador.abierto = false">Cancelar</BotonBase>
        <BotonBase tipo="submit" form="form-trabajador" :cargando="formularioPapel.enviando.value">Guardar</BotonBase>
      </template>
    </VentanaModal>
  </div>
</template>
