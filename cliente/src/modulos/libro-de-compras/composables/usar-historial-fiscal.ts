import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiLibroDeCompras, type VigenciaFiscal } from '../servicios/libro-de-compras.api';
import { usarFichaFiscalDeEmpresa } from './usar-datos-fiscales';
import { resumenDeQuitarVigencia } from './vigencia-fiscal';

/** Pide confirmar con el resumen de lo que pasará al quitar la vigencia. */
const confirmarQuitar = (vigencia: VigenciaFiscal, historial: VigenciaFiscal[]) =>
  usarAvisos().confirmar({
    titulo: 'Quitar vigencia',
    mensaje: resumenDeQuitarVigencia(historial, vigencia),
    textoConfirmar: 'Quitar',
    peligroso: true,
  });

/** La ficha fiscal de la empresa con su historial y la acción de quitar una vigencia (con confirmación). */
export function usarHistorialFiscalDeEmpresa(empresaId: () => string) {
  const ficha = usarFichaFiscalDeEmpresa(empresaId);
  const avisos = usarAvisos();
  const quitando = ref<string | null>(null);

  async function quitar(vigencia: VigenciaFiscal): Promise<void> {
    if (!(await confirmarQuitar(vigencia, ficha.datos.value?.historial ?? []))) return;
    quitando.value = vigencia.id;
    try {
      await apiLibroDeCompras.quitarVigenciaFiscalDeEmpresa(empresaId(), vigencia.id);
      avisos.exito('Se quitó la vigencia.');
      await ficha.cargar();
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo quitar la vigencia.');
    } finally {
      quitando.value = null;
    }
  }

  return { ...ficha, quitando, quitar };
}
