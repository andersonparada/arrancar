import type { ClienteApi } from './cliente-api.js';
import { comoPropietario } from './consultas-de-propietario.js';

export const CIERRES = '/api/inventarios/cierres';

export const revisarMes = (cliente: ClienteApi, periodo: string) => cliente.get(`${CIERRES}/${periodo}/revision`);

export const cerrarMes = (cliente: ClienteApi, periodo: string, cuerpo: Record<string, unknown> = {}) =>
  cliente.post(`${CIERRES}/${periodo}/cerrar`, cuerpo);

export const reabrirMes = (cliente: ClienteApi, periodo: string, motivo = 'Faltó registrar una compra') =>
  cliente.post(`${CIERRES}/${periodo}/reabrir`, { motivo });

export const fotoDelMes = (cliente: ClienteApi, periodo: string) => cliente.get(`${CIERRES}/${periodo}/existencias`);

export interface RenglonDeFoto {
  articuloId: string;
  bodegaId: string;
  tipoDeInventario: string;
  enTransitoInterno: boolean;
  cantidad: string;
  costoUnitario: string | null;
  valor: string | null;
}

/** La foto de un mes ya cerrado, que exige que exista (200). */
export async function renglonesDeFoto(cliente: ClienteApi, periodo: string): Promise<RenglonDeFoto[]> {
  const respuesta = await fotoDelMes(cliente, periodo);
  if (respuesta.estado !== 200) throw new Error(`La foto de ${periodo} dio ${respuesta.estado}`);
  return respuesta.cuerpo;
}

/** Suma los valores (en centavos) de una foto: tiene que dar el valor total del cierre. */
export const centavosDe = (renglones: readonly RenglonDeFoto[]): number =>
  renglones.reduce((suma, renglon) => suma + Math.round(Number(renglon.valor) * 100), 0);

/** Lo que dejó el cierre o la reapertura de un mes en la auditoría de la empresa. */
export const auditoriaDeCierres = (empresaId: string, accion: string) =>
  comoPropietario<{ anterior: Record<string, unknown>; motivo: string | null; registro_id: string }>(
    `select anterior, motivo, registro_id from core.auditoria
      where empresa_id = $1 and recurso = 'inventarios.cierres' and accion = $2 order by creado_en`,
    [empresaId, accion],
  );

/** Cuántas filas de foto tiene un mes en la base, vigentes o no. */
export async function filasDeFoto(empresaId: string, periodo: string, vigente: boolean): Promise<number> {
  const [fila] = await comoPropietario<{ filas: string }>(
    `select count(*)::text as filas from inventarios.existencias_al_cierre
      where empresa_id = $1 and periodo = $2 and vigente = $3`,
    [empresaId, periodo, vigente],
  );
  return Number(fila!.filas);
}
