import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import {
  enteroValido,
  motivoDeAnulacionDelEnteroValido,
  type DatosDelEntero,
  type PeticionDeEntero,
} from '../../../dominio/retenciones/entero-de-retenciones.js';
import { EnteroYaAnulado, SinRetencionesQueEnterar } from '../../../dominio/retenciones/errores-de-retenciones.js';
import { claveDelGrupo, type GrupoDeEntero } from '../../../dominio/retenciones/grupo-de-entero.js';
import { pagadoDe, retenidoPorGrupo, type EnteroGuardado } from '../../../dominio/retenciones/retencion-del-reporte.js';
import { dtoDeEntero, type ResultadoDeEnteroDto } from '../../dto/retenciones.dto.js';
import type { ConsultasDeEnteros, RepositorioDeEnteros } from '../../puertos/puertos-de-retenciones.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeEnteros;
  repositorio: RepositorioDeEnteros;
  auditoria: Auditoria;
}

const RECURSO = 'libro-de-compras.enteros-de-retenciones';

/** Lo retenido por documentos vigentes en el mes y grupo, en centavos. */
async function retenidoDe(consultas: ConsultasDeEnteros, mes: string, grupo: GrupoDeEntero): Promise<number> {
  const sumas = await consultas.retenidoDelRango(mes, mes);
  return retenidoPorGrupo(sumas).get(claveDelGrupo(mes, grupo)) ?? 0;
}

/** Compara lo pagado con lo retenido: avisa cuánto falta o cuánto sobra (no bloquea). */
async function avisosDelPago(consultas: ConsultasDeEnteros, mes: string, grupo: GrupoDeEntero): Promise<string[]> {
  const retenido = await retenidoDe(consultas, mes, grupo);
  const pagado = pagadoDe(await consultas.delRango(mes, mes), mes, grupo);
  if (pagado < retenido) return [`Falta enterar Q${deCentavos(retenido - pagado)} de lo retenido en ese mes y grupo.`];
  if (pagado > retenido)
    return [`Lo pagado pasa en Q${deCentavos(pagado - retenido)} de lo retenido en ese mes y grupo.`];
  return [];
}

async function buscarEntero(consultas: ConsultasDeEnteros, id: string): Promise<EnteroGuardado> {
  const entero = await consultas.buscar(id, true);
  if (!entero) throw new RecursoNoEncontrado('El entero');
  return entero;
}

/**
 * Marca como enterado un pago de las retenciones de un mes y grupo. Admite varios pagos (el original y los
 * complementarios); guarda una foto de lo retenido cuando se marcó. Un mes y grupo sin retenciones no se entera.
 */
export class RegistrarEntero {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws SinRetencionesQueEnterar y los errores de `enteroValido` (mes, grupo, fecha, formulario, monto). */
  ejecutar(operador: Operador, peticion: PeticionDeEntero): Promise<ResultadoDeEnteroDto> {
    const datos = enteroValido(peticion);
    const { unidadDeTrabajo, consultas, repositorio } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const retenidoAlMarcar = await retenidoDe(consultas, datos.mes, datos.grupo);
      if (retenidoAlMarcar === 0) throw new SinRetencionesQueEnterar();
      const id = await repositorio.crear(operador.empresaId, { ...datos, retenidoAlMarcar });
      const avisos = await avisosDelPago(consultas, datos.mes, datos.grupo);
      return { entero: dtoDeEntero(await buscarEntero(consultas, id)), avisos };
    });
  }
}

/** Corrige lo escrito de un pago (fecha, formulario o boleta, monto, observaciones); se audita `corregir`. */
export class CorregirEntero {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado, EnteroYaAnulado y los errores de `enteroValido`. */
  ejecutar(
    operador: Operador,
    id: string,
    peticion: Omit<PeticionDeEntero, 'mes' | 'grupo'>,
  ): Promise<ResultadoDeEnteroDto> {
    const { unidadDeTrabajo, consultas, repositorio, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const actual = await buscarEntero(consultas, id);
      if (actual.estado === 'anulado') throw new EnteroYaAnulado();
      const datos = enteroValido({ ...peticion, mes: actual.mes, grupo: actual.grupo });
      await auditoria.registrar({
        recurso: RECURSO,
        registroId: id,
        accion: 'corregir',
        anterior: dtoDeEntero(actual),
      });
      await repositorio.corregir(id, soloLoEscrito(datos));
      const avisos = await avisosDelPago(consultas, actual.mes, actual.grupo);
      return { entero: dtoDeEntero(await buscarEntero(consultas, id)), avisos };
    });
  }
}

const soloLoEscrito = ({ fechaDePago, documentoDePago, monto, observaciones }: DatosDelEntero) => ({
  fechaDePago,
  documentoDePago,
  monto,
  observaciones,
});

/** Anula un pago registrado por error: queda como rastro, ya no cuenta y se audita `anular`. */
export class AnularEntero {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado, MotivoDeAnulacionDelEnteroInvalido o EnteroYaAnulado. */
  ejecutar(operador: Operador, peticion: { id: string; motivo: string }): Promise<ResultadoDeEnteroDto> {
    const motivo = motivoDeAnulacionDelEnteroValido(peticion.motivo);
    const { unidadDeTrabajo, consultas, repositorio, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const actual = await buscarEntero(consultas, peticion.id);
      if (actual.estado === 'anulado') throw new EnteroYaAnulado();
      await auditoria.registrar({
        recurso: RECURSO,
        registroId: actual.id,
        accion: 'anular',
        anterior: dtoDeEntero(actual),
        motivo,
      });
      await repositorio.anular(actual.id, { anuladoPor: operador.usuarioId, motivo });
      const avisos = await avisosDelPago(consultas, actual.mes, actual.grupo);
      return { entero: dtoDeEntero(await buscarEntero(consultas, actual.id)), avisos };
    });
  }
}
