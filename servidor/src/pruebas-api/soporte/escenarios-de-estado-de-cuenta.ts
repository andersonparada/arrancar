import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { configuracion } from '../../configuracion.js';
import { pdfDePrueba } from '../../modulos/core/archivos/pruebas/pdfs-de-prueba.js';
import type { ClienteApi } from './cliente-api.js';
import { comoPropietario } from './consultas-de-propietario.js';
import { crearCuentaBancaria } from './escenarios-de-bancos.js';
import type { Imagen } from './imagenes.js';

/** Un PDF de prueba (hace falta qpdf para que el servidor lo acepte). */
export const pdf = (nombre = 'banco.pdf', paginas = 1): Imagen => ({
  nombreArchivo: nombre,
  tipoMime: 'application/pdf',
  contenido: pdfDePrueba({ paginas }),
});

/** Inicia la conciliación de enero de una cuenta nueva (saldo Q 1,000.00) con el saldo inicial marcado y transcrito. */
export async function iniciarConciliacionConSaldo(usuario: ClienteApi, nombre: string): Promise<string> {
  const cuentaBancariaId = await crearCuentaBancaria(usuario, nombre);
  const iniciada = await usuario.post('/api/bancos/conciliaciones', { cuentaBancariaId, anio: 2026, mes: 1 });
  const id = iniciada.cuerpo.id as string;
  const inicial = (iniciada.cuerpo.candidatos as Array<{ id: string; saldoInicial: boolean }>).find(
    (m) => m.saldoInicial,
  )!;
  const ruta = `/api/bancos/conciliaciones/${id}`;
  await usuario.put(`${ruta}/marcas`, { movimientoIds: [inicial.id] });
  await usuario.put(`${ruta}/saldo-del-estado-de-cuenta`, { saldoEstadoDeCuenta: '1000.00' });
  return id;
}

/** Los archivos de estados de cuenta de la empresa, vistos como propietario de la base (sin RLS). */
export function archivosDelEstadoDeCuenta(empresaId: string) {
  return comoPropietario<{ id: string; ruta_original: string; sha256: string }>(
    "select id, ruta_original, sha256 from core.archivos where recurso_dueno = 'bancos.conciliaciones' and empresa_id = $1",
    [empresaId],
  );
}

/** Si el archivo sigue en el disco de pruebas. */
export const enDisco = (ruta: string): boolean => existsSync(resolve(configuracion.RUTA_ALMACENAMIENTO, ruta));
