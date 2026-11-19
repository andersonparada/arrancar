import { auditarCambioDeEstado, type Auditoria } from '../../../compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../compartido/aplicacion/errores.js';
import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import { CodigoDelBanguatNoOfrecido } from '../../dominio/errores.js';
import { aplicarCambios, type CambiosDeMoneda } from '../../dominio/moneda.js';
import { CodigoDelBanguatConOtraSerie, CodigoDelBanguatEnUso } from '../errores.js';
import type { CatalogoDeMonedas, MonedaDto, MonedasDelBanguat } from '../puertos/monedas.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  catalogo: CatalogoDeMonedas;
  delBanguat: MonedasDelBanguat;
  auditoria: Auditoria;
  excluidos: ReadonlySet<number>;
  /** Se avisa, ya con la transacción confirmada, cuando la moneda quedó activa con código y hay que traer su serie. */
  alQuedarParaCargar?: (moneda: string) => void;
}

/** Quedó activa con código y es nuevo: se le unió el código o se activó (el dólar y las demás se cargan igual). */
function quedoParaCargar(antes: MonedaDto, despues: MonedaDto): boolean {
  if (!despues.activa || despues.codigoBanguat === null) return false;
  return !antes.activa || antes.codigoBanguat !== despues.codigoBanguat;
}

/**
 * Soporte activa o desactiva una moneda, le une su código del Banguat (lo que hace que se cargue su tipo de cambio) y
 * le pone las letras del monto. Desactivar y quitar o cambiar el código quedan en la auditoría.
 */
export class EditarMoneda {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado si la moneda no existe.
   * @throws CodigoDelBanguatNoOfrecido, CodigoDelBanguatEnUso o CodigoDelBanguatConOtraSerie según el código.
   */
  async ejecutar(operador: Operador, codigo: string, cambios: CambiosDeMoneda): Promise<MonedaDto> {
    const { unidadDeTrabajo, catalogo } = this.dependencias;
    const { antes, despues } = await unidadDeTrabajo.ejecutar(operador, async () => {
      const antes = await catalogo.buscar(codigo);
      if (!antes) throw new RecursoNoEncontrado('La moneda');
      const despues = aplicarCambios(antes, cambios);
      if (despues.codigoBanguat !== antes.codigoBanguat) await this.revisarCodigo(antes, despues.codigoBanguat);
      await catalogo.actualizar(codigo, cambios);
      await this.auditar(antes, despues);
      return { antes, despues: (await catalogo.buscar(codigo))! };
    });
    if (quedoParaCargar(antes, despues)) this.dependencias.alQuedarParaCargar?.(codigo);
    return despues;
  }

  /** Desactivar o reactivar, y quitar o cambiar el código (la moneda deja de cargarse): quedan en la auditoría. */
  private async auditar(antes: MonedaDto, despues: MonedaDto): Promise<void> {
    const { auditoria } = this.dependencias;
    const base = { recurso: 'core.monedas', registroId: antes.codigo, anterior: antes };
    await auditarCambioDeEstado(auditoria, { ...base, activoAntes: antes.activa, activoDespues: despues.activa });
    if (antes.codigoBanguat !== null && despues.codigoBanguat !== antes.codigoBanguat)
      await auditoria.registrar({ ...base, accion: 'corregir' });
  }

  /** El código nuevo debe ofrecerlo el Banguat, estar libre y no mezclar dos series de la misma moneda. */
  private async revisarCodigo(moneda: MonedaDto, codigoNuevo: number | null): Promise<void> {
    if (codigoNuevo === null) return;
    const { catalogo } = this.dependencias;
    await this.exigirOfrecido(codigoNuevo);
    const duena = await catalogo.duenaDelCodigo(codigoNuevo);
    if (duena && duena !== moneda.codigo) throw new CodigoDelBanguatEnUso(codigoNuevo, duena);
    const serie = await catalogo.codigoDeLaSerie(moneda.codigo);
    if (serie !== null && serie !== codigoNuevo) throw new CodigoDelBanguatConOtraSerie(moneda.codigo, serie);
  }

  private async exigirOfrecido(codigo: number): Promise<void> {
    const { delBanguat, excluidos } = this.dependencias;
    const ofrecido = await delBanguat.buscar(codigo);
    if (!ofrecido?.disponible || excluidos.has(codigo)) throw new CodigoDelBanguatNoOfrecido(codigo);
  }
}
