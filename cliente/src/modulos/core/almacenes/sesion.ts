import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { ErrorApi } from '../servicios/cliente-http';
import { sesionApi, type ResumenSesion } from '../servicios/sesion.api';

/** Estado de la sesión: usuario, empresa activa, módulos y permisos efectivos. */
export const usarSesion = defineStore('sesion', () => {
  const resumen = ref<ResumenSesion | null>(null);
  const cargada = ref(false);

  const usuario = computed(() => resumen.value?.usuario ?? null);
  const empresa = computed(() => resumen.value?.empresa ?? null);
  const autenticado = computed(() => resumen.value !== null);
  const esSuperacceso = computed(() => resumen.value?.usuario.esSuperacceso ?? false);
  const empresasDisponibles = computed(() => resumen.value?.empresasDisponibles ?? []);
  const permisos = computed(() => new Set(resumen.value?.permisos ?? []));
  const modulosActivos = computed(() => new Set(resumen.value?.modulosActivos ?? []));

  /** Indica si el usuario tiene el permiso en la empresa activa. */
  function puede(permiso: string): boolean {
    return permisos.value.has(permiso);
  }

  function moduloActivo(clave: string): boolean {
    return modulosActivos.value.has(clave);
  }

  /** Valor efectivo de una variable de configuración pública, o `predeterminado` si no llegó. */
  function config<T>(clave: string, predeterminado: T): T {
    const valor = resumen.value?.configuracion[clave];
    return valor === undefined ? predeterminado : (valor as T);
  }

  /** Carga la sesión desde el servidor; si no hay sesión, queda como no autenticado. */
  async function cargar(): Promise<void> {
    try {
      resumen.value = await sesionApi.obtener();
    } catch (error) {
      if (!(error instanceof ErrorApi) || error.estado !== 401) throw error;
      resumen.value = null;
    } finally {
      cargada.value = true;
    }
  }

  async function iniciarSesion(usuario: string, contrasena: string): Promise<void> {
    await sesionApi.iniciarSesion(usuario, contrasena);
    await cargar();
  }

  async function cerrarSesion(): Promise<void> {
    await sesionApi.cerrarSesion().catch(() => undefined);
    limpiar();
  }

  async function cambiarEmpresa(empresaId: string): Promise<void> {
    resumen.value = await sesionApi.cambiarEmpresa(empresaId);
  }

  function limpiar(): void {
    resumen.value = null;
  }

  return {
    cargada,
    usuario,
    empresa,
    autenticado,
    esSuperacceso,
    empresasDisponibles,
    rolNombre: computed(() => resumen.value?.rolNombre ?? null),
    puede,
    moduloActivo,
    config,
    cargar,
    iniciarSesion,
    cerrarSesion,
    cambiarEmpresa,
    limpiar,
  };
});
