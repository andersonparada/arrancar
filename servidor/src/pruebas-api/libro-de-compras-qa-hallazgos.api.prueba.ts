import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  documentoDePrueba,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

/**
 * Hallazgos del QA en el navegador (informe-qa-2026-10-19), corregidos; cada caso queda como regresión.
 */
const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;

beforeAll(async () => {
  // Sin instalar el destino falso: así es hoy la instalación, sin Cuentas por pagar.
  escenario = await prepararEscenario(entorno, 'qahallazgos');
});

describe('hallazgos del QA de Libro de compras (R1-7 y R2-9)', () => {
  it('el listado de proveedores trae el id del papel de proveedor, que el formulario de documentos usa', async () => {
    const lista = await escenario.cuenta.propietario.get('/api/terceros?papel=proveedor');

    expect(lista.estado).toBe(200);
    const fila = lista.cuerpo.find((t: { id: string }) => t.id === escenario.terceroId);
    expect(fila.proveedor.id).toBe(escenario.proveedorId);
  });

  it('la vista previa funciona aunque no haya destino instalado (solo registrar se bloquea)', async () => {
    const previa = await escenario.cuenta.propietario.post(`${RUTA_DOCUMENTOS}/calcular`, documentoDePrueba(escenario));

    expect(previa.estado).toBe(200);
    expect(previa.cuerpo.documento.totales.iva).toBe('120.00');
  });

  it('la vista previa calcula con un destino vacío o inexistente', async () => {
    const sinDestino = { ...documentoDePrueba(escenario), destino: undefined };
    const inexistente = { ...documentoDePrueba(escenario), destino: 'no-existe' };

    const primera = await escenario.cuenta.propietario.post(`${RUTA_DOCUMENTOS}/calcular`, sinDestino);
    const segunda = await escenario.cuenta.propietario.post(`${RUTA_DOCUMENTOS}/calcular`, inexistente);

    expect(primera.estado).toBe(200);
    expect(segunda.estado).toBe(200);
  });

  it('la vista previa con un destino conocido pero inactivo calcula y avisa', async () => {
    const previa = await escenario.cuenta.propietario.post(`${RUTA_DOCUMENTOS}/calcular`, documentoDePrueba(escenario));

    expect(previa.cuerpo.avisos.some((aviso: string) => aviso.includes('no está activo'))).toBe(true);
  });

  it('registrar sin destino instalado avisa y no guarda nada', async () => {
    const respuesta = await escenario.cuenta.propietario.post(RUTA_DOCUMENTOS, documentoDePrueba(escenario));

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('destino_no_disponible');
  });
});
