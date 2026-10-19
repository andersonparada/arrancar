import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import {
  DatosFiscalesDeEmpresa,
  type PropiedadesFiscalesDeEmpresa,
} from '../../../dominio/datos-fiscales-de-empresa.js';
import { DatosFiscalesInvalidos } from '../../../dominio/errores.js';
import type { HistorialFiscalDeEmpresa } from '../../../dominio/historial-fiscal-de-empresa.js';
import { problemasDeLaDerogacion, problemasDeLaFechaDeVigencia } from '../../../dominio/vigencia-fiscal-de-empresa.js';
import type { LectorDeConfiguracionFiscal } from '../../puertos/puertos-de-documentos.js';
import type { RepositorioDeDatosFiscalesDeEmpresa } from '../../puertos/repositorios-de-datos-fiscales.js';
import type { CambiosAlHistorialFiscal } from './cambios-al-historial-fiscal.js';
import { historialParaAuditoria } from './dtos-de-datos-fiscales.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioDeDatosFiscalesDeEmpresa;
  cambios: CambiosAlHistorialFiscal;
  auditoria: Auditoria;
  reloj: Reloj;
  configuracion: LectorDeConfiguracionFiscal;
}

export interface CambioDeDatosFiscales {
  empresaId: string;
  datos: PropiedadesFiscalesDeEmpresa;
  /**
   * Desde qué mes rigen los datos (`aaaa-mm-01`), o `null` para «desde el inicio». Si no llega, rigen desde la
   * vigencia de hoy: así quien no lo manda nunca crea escalones por accidente.
   */
  vigenteDesde?: string | null;
}

/**
 * Guarda la sección fiscal de una empresa. La llama el aviso `empresas.empresa_guardada`, dentro de la
 * transacción del formulario de Empresas, con esa empresa como empresa del operador.
 */
export class GuardarDatosFiscalesDeEmpresa {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * «Estos datos rigen desde `vigenteDesde` hasta la siguiente vigencia que ya exista» (ver `HistorialFiscalDeEmpresa`):
   * alta de la base, corrección de una vigencia, cambio a partir de un mes, o nada si no cambia nada. Todo cambio
   * se audita como `corregir` con el historial anterior; el alta no.
   * @throws DatosFiscalesInvalidos si los datos se contradicen o la fecha no es válida.
   * @throws VigenciaFiscalEnUso si el cambio tocaría meses con documentos vigentes.
   */
  async ejecutar(operador: Operador, cambio: CambioDeDatosFiscales): Promise<void> {
    const { unidadDeTrabajo, repositorio, cambios, auditoria, reloj, configuracion } = this.dependencias;
    const { empresaId } = cambio;
    const datos = DatosFiscalesDeEmpresa.crear(cambio.datos);
    await unidadDeTrabajo.ejecutar(operador, async () => {
      await repositorio.bloquear(empresaId, 'actualizar');
      const antes = await repositorio.historial(empresaId);
      const vigenteDesde = this.vigenteDesde(cambio, antes, await reloj.hoy(operador));
      const { fechaDeDerogacion } = await configuracion.paraEmpresa(operador);
      this.exigirSinRegimenDerogado({ datos, vigenteDesde, fechaDeDerogacion });
      const despues = antes.aplicar({ vigenteDesde, datos });
      if (antes.esIgualA(despues)) return;
      if (!antes.estaVacio()) await cambios.exigirSinDocumentosAfectados(empresaId, antes, despues);
      await cambios.escribir(empresaId, antes, despues);
      if (antes.estaVacio()) return;
      await auditoria.registrar({
        recurso: 'libro-de-compras.datos-fiscales-de-empresa',
        registroId: empresaId,
        accion: 'corregir',
        anterior: historialParaAuditoria(empresaId, antes),
      });
    });
  }

  private exigirSinRegimenDerogado(cambio: {
    datos: DatosFiscalesDeEmpresa;
    vigenteDesde: string | null;
    fechaDeDerogacion: string;
  }): void {
    const { datos, vigenteDesde, fechaDeDerogacion } = cambio;
    const problemas = problemasDeLaDerogacion(datos.instantanea().regimenIva, vigenteDesde, fechaDeDerogacion);
    if (problemas.length > 0) throw new DatosFiscalesInvalidos(problemas);
  }

  private vigenteDesde(cambio: CambioDeDatosFiscales, historial: HistorialFiscalDeEmpresa, hoy: string) {
    if (cambio.vigenteDesde === undefined) return historial.vigenteEn(hoy)?.vigenteDesde ?? null;
    const problemas = problemasDeLaFechaDeVigencia(cambio.vigenteDesde, hoy);
    if (problemas.length > 0) throw new DatosFiscalesInvalidos(problemas);
    return cambio.vigenteDesde;
  }
}
