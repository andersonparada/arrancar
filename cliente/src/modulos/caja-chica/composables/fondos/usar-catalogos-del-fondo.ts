import { ref } from 'vue';
import {
  catalogosDeCajaChica,
  type ChequeraParaElFondo,
  type CuentaParaElFondo,
  type LocalidadParaElFondo,
  type UsuarioParaElFondo,
} from '../../servicios/catalogos.api';

/**
 * Lo que se elige al abrir un fondo o moverle el dinero: cuentas, chequeras, localidades y usuarios. Se traen la
 * primera vez que se pide; lo que el usuario no tiene permiso de ver queda vacío y el formulario sigue funcionando.
 */
export function usarCatalogosDelFondo() {
  const cuentas = ref<CuentaParaElFondo[]>([]);
  const chequeras = ref<ChequeraParaElFondo[]>([]);
  const localidades = ref<LocalidadParaElFondo[]>([]);
  const usuarios = ref<UsuarioParaElFondo[]>([]);
  const cargando = ref(false);
  let cargado = false;

  async function cargar(): Promise<void> {
    if (cargado) return;
    cargado = true;
    cargando.value = true;
    const c = catalogosDeCajaChica;
    const resultados = await Promise.allSettled([c.cuentas(), c.chequeras(), c.localidades(), c.usuarios()]);
    const [deCuentas, deChequeras, deLocalidades, deUsuarios] = resultados;
    if (deCuentas.status === 'fulfilled') cuentas.value = deCuentas.value;
    if (deChequeras.status === 'fulfilled') chequeras.value = deChequeras.value;
    if (deLocalidades.status === 'fulfilled') localidades.value = deLocalidades.value;
    if (deUsuarios.status === 'fulfilled') usuarios.value = deUsuarios.value;
    cargando.value = false;
  }

  return { cuentas, chequeras, localidades, usuarios, cargando, cargar };
}
