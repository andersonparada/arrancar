import ExcelJS from 'exceljs';
import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';
import type { EntornoApi } from './entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './escenarios.js';

/** La ruta de los saldos iniciales con partidas. */
export const RUTA_DE_APERTURA = '/api/bancos/saldos-iniciales';
export const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Una empresa con Bancos y su fecha de inicio puesta (el corte es el día anterior): la carga queda abierta. */
export async function empresaConInicio(
  entorno: EntornoApi,
  datos: { nombre: string; usuario: string; fechaDeInicio?: string; modulos?: string[] },
): Promise<CuentaDePrueba> {
  const cuenta = await darDeAltaCuenta(entorno, {
    nombre: datos.nombre,
    usuario: datos.usuario,
    modulos: datos.modulos ?? ['bancos'],
  });
  const puesta = await cuenta.propietario.put(`/api/empresas/${cuenta.empresaId}/carga-inicial`, {
    fechaDeInicio: datos.fechaDeInicio ?? '2026-01-01',
  });
  expect(puesta.estado).toBe(200);
  return cuenta;
}

/**
 * Crea o corrige la cabecera: con un texto, solo el saldo según el estado de cuenta al corte; con un objeto, el cuerpo
 * completo (con también el saldo de los libros anteriores y las observaciones).
 */
export const guardarSaldo = (usuario: ClienteApi, cuentaId: string, saldo: string | Record<string, unknown>) =>
  usuario.put(
    `${RUTA_DE_APERTURA}/${cuentaId}`,
    typeof saldo === 'string' ? { saldoSegunEstadoDeCuenta: saldo } : saldo,
  );

/** Una partida con lo mínimo de su parte; lo demás se cambia con `cambios`. */
export function partida(parte: string, cambios: Record<string, unknown> = {}) {
  const esCheque = parte === 'cheque_en_circulacion' || parte === 'cheque_posfechado';
  return {
    parte,
    fecha: parte === 'cheque_posfechado' ? '2026-02-10' : '2025-12-20',
    monto: '100.00',
    ...(esCheque ? { numeroDeCheque: 1, beneficiario: 'Proveedor Uno' } : {}),
    ...(parte === 'error_del_banco' ? { sentido: 'credito', referencia: 'Cargo duplicado' } : {}),
    ...cambios,
  };
}

export const agregarPartida = (usuario: ClienteApi, cuentaId: string, cuerpo: Record<string, unknown>) =>
  usuario.post(`${RUTA_DE_APERTURA}/${cuentaId}/partidas`, cuerpo);

/** La ficha de la cuenta (todas sus partidas, su cuadre). */
export async function fichaDe(usuario: ClienteApi, cuentaId: string) {
  const respuesta = await usuario.get(`${RUTA_DE_APERTURA}/${cuentaId}`);
  expect(respuesta.estado).toBe(200);
  return respuesta.cuerpo;
}

/** Las partidas de la ficha de una cuenta de una parte. */
export const partidasDe = (ficha: { partidas: Array<{ parte: string; tipo: string }> }, parte: string) =>
  ficha.partidas.filter((candidata) => candidata.parte === parte);

/** La plantilla bajada de la ruta con las filas dadas: cada valor va en la columna de su título. */
export async function libroConFilas(
  usuario: ClienteApi,
  ruta: string,
  filas: Array<Record<string, unknown>>,
): Promise<Buffer> {
  const plantilla = (await usuario.get(`${ruta}/plantilla`)).cuerpo as Buffer;
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(plantilla as unknown as ExcelJS.Buffer);
  const hoja = libro.worksheets[0]!;
  filas.forEach((valores, indice) => {
    hoja.getRow(1).eachCell((celda, columna) => {
      const titulo = String(celda.value).replace('*', '').trim();
      if (valores[titulo] !== undefined)
        hoja.getRow(indice + 2).getCell(columna).value = valores[titulo] as ExcelJS.CellValue;
    });
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}

export const importarExcel = (
  usuario: ClienteApi,
  ruta: string,
  { contenido, ensayo }: { contenido: Buffer; ensayo: boolean },
) =>
  usuario.subirImagen('POST', `${ruta}/importar?ensayo=${ensayo}`, {
    nombreArchivo: 'apertura.xlsx',
    tipoMime: TIPO_EXCEL,
    contenido,
  });

/** Lo que dice cada celda de la primera hoja de un Excel exportado, por fila (la primera son los encabezados). */
export async function filasDeExcel(contenido: Buffer): Promise<unknown[][]> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(contenido as unknown as ExcelJS.Buffer);
  const filas: unknown[][] = [];
  libro.worksheets[0]!.eachRow((fila) => filas.push((fila.values as unknown[]).slice(1)));
  return filas;
}
