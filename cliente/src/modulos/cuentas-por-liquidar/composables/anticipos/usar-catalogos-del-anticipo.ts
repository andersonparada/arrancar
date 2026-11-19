import { computed, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { apiUsuarios, type Usuario } from '@/modulos/core/servicios/usuarios.api';
import { apiAnticipos, type AnticipoResumen } from '../../servicios/anticipos.api';
import { apiOpciones, type Beneficiario, type MediosParaElegir } from '../../servicios/opciones.api';
import { opcionesDeBeneficiarios, opcionesDeUsuarios } from './opciones-del-beneficiario';

/** Las listas traídas de Bancos, Terceros y Usuarios; lo que el usuario no puede ver queda vacío. */
function usarListasDelAnticipo() {
  const sesion = usarSesion();
  const medios = ref<MediosParaElegir | null>(null);
  const terceros = ref<Beneficiario[]>([]);
  const usuarios = ref<Usuario[]>([]);
  const cargando = ref(false);

  async function traer(fecha: string): Promise<void> {
    cargando.value = true;
    try {
      medios.value = await apiOpciones.mediosParaEntregar(fecha);
      if (sesion.puede('terceros.ver')) terceros.value = await apiOpciones.beneficiarios();
      if (sesion.puede('usuarios.ver') && usuarios.value.length === 0) usuarios.value = await apiUsuarios.listar();
    } catch (error) {
      usarAvisos().error(error instanceof Error ? error.message : 'No se pudieron cargar las cuentas de Bancos.');
    } finally {
      cargando.value = false;
    }
  }

  /** Cambia solo el saldo mostrado cuando se cambia la fecha de la entrega. */
  async function actualizarSaldos(fecha: string): Promise<void> {
    medios.value = await apiOpciones.mediosParaEntregar(fecha).catch(() => medios.value);
  }

  return { sesion, medios, terceros, usuarios, cargando, traer, actualizarSaldos };
}

/**
 * Lo que la ventana de entrega necesita de otros módulos: las cuentas y chequeras (con el saldo a la fecha), los terceros y
 * los usuarios, ya como opciones de selector, con los permisos que dicen qué se puede hacer con ellos.
 */
export function usarCatalogosDelAnticipo() {
  const { sesion, medios, terceros, usuarios, cargando, traer, actualizarSaldos } = usarListasDelAnticipo();
  const nombreDelBeneficiario = (id: string): string =>
    terceros.value.find((tercero) => tercero.id === id)?.nombreMostrar ?? '';
  return {
    medios,
    cargando,
    traer,
    actualizarSaldos,
    nombreDelBeneficiario,
    beneficiarios: computed(() => opcionesDeBeneficiarios(terceros.value)),
    puedeVerTerceros: computed(() => sesion.puede('terceros.ver')),
    puedeCrearTerceros: computed(() => sesion.puede('terceros.crear')),
    usuarios: computed(() => opcionesDeUsuarios(usuarios.value, sesion.empresa?.id ?? null)),
    puedeElegirUsuario: computed(() => sesion.puede('usuarios.ver') && usuarios.value.length > 0),
    agregarBeneficiario: (nuevo: Beneficiario) => terceros.value.push(nuevo),
  };
}

/** Los anticipos vencidos y abiertos de un beneficiario: se le avisa antes de entregarle otro. */
export async function vencidosDelBeneficiario(beneficiarioId: string): Promise<AnticipoResumen[]> {
  if (!beneficiarioId) return [];
  const pagina = await apiAnticipos
    .listar({ estado: 'abierto', beneficiarioId, vencidos: true, pagina: 1, limite: 20 })
    .catch(() => null);
  return pagina?.elementos ?? [];
}
