import type { ClienteApi } from './cliente-api.js';
import { RUTA_DE_CAJA_CHICA } from './caja-chica-comprobantes.js';
import { RUTA_DE_FONDOS } from './caja-chica-fondos.js';
import { comoPropietario } from './consultas-de-propietario.js';

/** Quien arquea: ve los fondos asignados y registra arqueos. */
export const PERMISOS_PARA_ARQUEAR = ['caja-chica.fondos.ver', 'caja-chica.arqueos.crear'];

/** Un conteo de `cantidad` billetes de Q200. */
export const ducientos = (cantidad: number) => [{ denominacionCentavos: 20_000, cantidad }];

/** El cuerpo de un arqueo completo y sin diferencia por omisión; `cambios` lo ajusta. */
export const cuerpoDeArqueo = (cambios: Record<string, unknown> = {}) => ({
  conteo: ducientos(15),
  comprobantesCompletos: true,
  ...cambios,
});

export const arquear = (fondoId: string, cliente: ClienteApi, cambios: Record<string, unknown> = {}) =>
  cliente.post(`${RUTA_DE_FONDOS}/${fondoId}/arqueos`, cuerpoDeArqueo(cambios));

export const anularArqueo = (
  arqueoId: string,
  cliente: ClienteApi,
  cuerpo: Record<string, unknown> = { motivo: 'Se contó mal' },
) => cliente.post(`${RUTA_DE_CAJA_CHICA}/arqueos/${arqueoId}/anular`, cuerpo);

/** La fila del arqueo en la base. */
export async function arqueoEnBase(arqueoId: string) {
  const [fila] = await comoPropietario<{
    numero: number;
    estado: string;
    efectivo_contado: string;
    efectivo_esperado: string;
    diferencia: string;
    motivo_de_diferencia: string | null;
    lo_hizo_el_custodio: boolean;
    fecha_de_anulacion: string | null;
  }>(
    `select numero, estado, efectivo_contado::text, efectivo_esperado::text, diferencia::text, motivo_de_diferencia,
            lo_hizo_el_custodio, fecha_de_anulacion::text
       from caja_chica.arqueos where id = $1`,
    [arqueoId],
  );
  return fila!;
}

/** El faltante o sobrante del arqueo en la base (nada si no hubo diferencia). */
export async function ajusteDelArqueoEnBase(arqueoId: string) {
  const [fila] = await comoPropietario<{
    id: string;
    clase: string;
    monto: string;
    resta: boolean;
    estado: string;
    destino_del_faltante: string | null;
    fondo_id: string;
  }>(
    `select id, clase, monto::text, resta, estado, destino_del_faltante, fondo_id
       from caja_chica.comprobantes where arqueo_id = $1`,
    [arqueoId],
  );
  return fila;
}

/** Las entradas de auditoría de un arqueo, la más antigua primero. */
export const auditoriaDelArqueo = (arqueoId: string) =>
  comoPropietario<{ accion: string; motivo: string | null; anterior: any }>(
    `select accion, motivo, anterior from core.auditoria
      where recurso = 'caja-chica.arqueos' and registro_id = $1 order by creado_en, id`,
    [arqueoId],
  );
