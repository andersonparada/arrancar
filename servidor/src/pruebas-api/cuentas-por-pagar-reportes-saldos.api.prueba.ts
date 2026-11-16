/**
 * Reportes de saldos a una fecha de corte (CP5-2): R1 por NIT y R2 de documentos. Un solo escenario con fechas fijas
 * (empresa iniciada el 2026-01-01, corte del 2026-10-31); lo sembrado en la base lleva las fechas que cada regla necesita.
 * Las anulaciones posteriores al corte van al final de este archivo porque cambian lo sembrado.
 */
import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import { anularAjuste } from './soporte/cuentas-por-pagar-notas.js';
import {
  anularDocumentoEnLaBase,
  anularPagoEnLaBase,
  anularReintegroEnLaBase,
} from './soporte/cuentas-por-pagar-reportes.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { HOY, nitValido } from './soporte/escenario-de-documentos.js';
import { CORTE, prepararMundoDeSaldos, type MundoDeSaldos } from './soporte/escenario-de-reportes-de-saldos.js';
import { darDeAltaCuenta } from './soporte/escenarios.js';

const RUTA = '/api/cuentas-por-pagar/reportes';
const R1 = `${RUTA}/saldos-por-proveedor`;
const R2 = `${RUTA}/documentos`;
const entorno = usarEntornoApi();
let m: MundoDeSaldos;

beforeAll(async () => {
  m = await prepararMundoDeSaldos(entorno, 'cxprepsaldos');
}, 60_000);

const propietario = () => m.escenario.cuenta.propietario;
const ver = async (url: string, consulta = '') => {
  const respuesta = await m.soloVer.get(`${url}?${consulta}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};
const saldos = (consulta: string) => ver(R1, consulta);
const documentos = (consulta: string) => ver(R2, consulta);
const nombres = (filas: Array<{ nombre: string }>) => filas.map((fila) => fila.nombre);

describe('permisos', () => {
  it('pide sesión, el módulo y el permiso de ver o de exportar de cada ruta', async () => {
    const sinModulo = await darDeAltaCuenta(entorno, {
      nombre: 'Sin cxp',
      usuario: 'sincxprepsal',
      modulos: ['terceros'],
    });

    for (const ruta of [R1, R2]) {
      expect((await entorno.nuevoCliente().get(ruta)).estado).toBe(401);
      expect((await sinModulo.propietario.get(ruta)).estado).toBe(403);
      expect((await m.soloExportar.get(ruta)).estado).toBe(403);
      expect((await m.soloVer.get(`${ruta}/exportar`)).estado).toBe(403);
      expect((await m.soloVer.get(ruta)).estado).toBe(200);
      expect((await m.soloExportar.get(`${ruta}/exportar`)).estado).toBe(200);
    }
  });
});

describe('R1: saldos por proveedor al 31 de octubre', () => {
  it('reparte acreedores y deudores con los cargos por tramo, los saldos a favor y el neto', async () => {
    const r1 = await saldos(`corte=${CORTE}`);

    expect(nombres(r1.acreedores)).toEqual(['Alfa S.A.', 'Delta S.A.', 'Épsilon S.A.', 'Veterinaria El Quiroa']);
    expect(nombres(r1.deudores)).toEqual(['Beta S.A.']);
    expect(r1.acreedores[0]).toMatchObject({
      nit: nitValido('5900001'),
      porVencer: '100.00',
      de1a30: '150.00',
      de31a60: '300.00',
      de61a90: '360.00',
      masDe90: '500.00',
      totalCargos: '1410.00',
      saldosAFavor: '200.00',
      saldoNeto: '1210.00',
      comprometido: '100.00',
      disponible: '1110.00',
      sinAutorizar: '1160.00',
    });
    expect(r1.deudores[0]).toMatchObject({ saldoNeto: '200.00', disponible: null });
    expect(r1.totales).toMatchObject({
      saldoNeto: '2880.00',
      totalCargos: '3280.00',
      cargosPorTramo: {
        porVencer: '170.00',
        de1a30: '150.00',
        de31a60: '1100.00',
        de61a90: '360.00',
        masDe90: '1500.00',
      },
      porcentajesPorTramo: { porVencer: '5.18', de1a30: '4.57', de31a60: '33.54', de61a90: '10.98', masDe90: '45.73' },
    });
    expect(r1.totales.acreedores).toMatchObject({
      saldoNeto: '3080.00',
      comprometido: '100.00',
      disponible: '2980.00',
    });
    expect(r1.totales.deudores.saldoNeto).toBe('200.00');
  });

  it('el proveedor en cero solo sale con `incluirSinSaldo` y se puede ordenar por mayor saldo', async () => {
    const sin = await saldos(`corte=${CORTE}`);
    const con = await saldos(`corte=${CORTE}&incluirSinSaldo=true&orden=mayor_saldo`);

    expect(nombres(sin.acreedores)).not.toContain('Gama S.A.');
    expect(nombres(con.acreedores)).toEqual([
      'Alfa S.A.',
      'Veterinaria El Quiroa',
      'Delta S.A.',
      'Épsilon S.A.',
      'Gama S.A.',
    ]);
  });

  it('filtra por proveedor y por autorización de hoy, con su columna «sin autorizar»', async () => {
    const delProveedor = await saldos(`corte=${CORTE}&proveedorId=${m.proveedores.alfa}`);
    const autorizados = await saldos(`corte=${CORTE}&proveedorId=${m.proveedores.alfa}&autorizacion=autorizados`);
    const sinAutorizar = await saldos(`corte=${CORTE}&proveedorId=${m.proveedores.alfa}&autorizacion=sin_autorizar`);

    expect(nombres(delProveedor.acreedores)).toEqual(['Alfa S.A.']);
    expect(autorizados.acreedores[0]).toMatchObject({ totalCargos: '250.00', sinAutorizar: '0.00' });
    expect(sinAutorizar.acreedores[0]).toMatchObject({ totalCargos: '1160.00', sinAutorizar: '1160.00' });
  });

  it('avisa los emitidos antes de la fecha de inicio, los registrados después y la limitación de las aplicaciones', async () => {
    const r1 = await saldos(`corte=${CORTE}`);

    expect(r1.avisos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ codigo: 'emitidos_antes_del_inicio', mensaje: expect.stringContaining('Q1,120.00') }),
        expect.objectContaining({
          codigo: 'registrados_despues_del_corte',
          mensaje: expect.stringContaining('Q80.00'),
        }),
      ]),
    );
    expect(r1.leyendas.join(' ')).toContain('NIIF para las Pymes, sección 11');
  });

  it('el corte anterior al día antes de la fecha de inicio se rechaza y un proveedor ajeno no existe', async () => {
    const rechazo = await m.soloVer.get(`${R1}?corte=2025-12-30`);
    const ajeno = await m.soloVer.get(`${R1}?proveedorId=${crypto.randomUUID()}`);

    expect(rechazo.estado).toBe(400);
    expect(rechazo.cuerpo.error).toMatchObject({ codigo: 'corte_anterior_al_inicio' });
    expect(rechazo.cuerpo.error.mensaje).toContain('31/12/2025');
    expect(ajeno.estado).toBe(404);
  });
});

describe('invariantes entre R1, R2 y el cuadre de saldos iniciales', () => {
  it('1: el saldo neto de R1 es la suma de los saldos de los cargos menos los saldos libres de las notas', async () => {
    const r1 = await saldos(`corte=${CORTE}`);
    const r2 = await documentos(`corte=${CORTE}&limite=200`);

    const notasLibres = 200 + 200;
    expect(Number(r2.totales.saldo) - notasLibres).toBe(Number(r1.totales.saldoNeto));
  });

  it('5: al día antes de la fecha de inicio, el saldo neto de R1 es el del cuadre de saldos iniciales', async () => {
    const cuadre = await propietario().get('/api/cuentas-por-pagar/saldos-iniciales/cuadre');
    const r1 = await propietario().get(`${R1}?corte=2025-12-31`);

    expect(r1.estado).toBe(200);
    expect(cuadre.cuerpo.general.neto).toBe('2620.00');
    expect(r1.cuerpo.totales.saldoNeto).toBe(cuadre.cuerpo.general.neto);
    expect(r1.cuerpo.avisos.map((aviso: { codigo: string }) => aviso.codigo)).not.toContain(
      'emitidos_antes_del_inicio',
    );
  });

  it('3: con el corte de hoy, el disponible de cada cargo es el saldo de la lista de Documentos', async () => {
    const r2 = await documentos(`corte=${HOY}&limite=200`);

    expect(r2.filas.length).toBeGreaterThan(0);
    for (const fila of r2.filas) {
      const ficha = await propietario().get(`/api/cuentas-por-pagar/documentos/${fila.id}`);
      expect(Number(fila.saldo) - Number(fila.comprometido), fila.numero).toBe(Number(ficha.cuerpo.saldo));
    }
  });
});

describe('R2: documentos por pagar al 31 de octubre', () => {
  const numeros = (cuerpo: { filas: Array<{ numero: string }> }) => cuerpo.filas.map((fila) => fila.numero);

  it('trae los cargos con saldo por «Vence», con lo que explica cada saldo y los totales de todo lo filtrado', async () => {
    const r2 = await documentos(`corte=${CORTE}`);

    expect(numeros(r2)).toHaveLength(8);
    expect(r2.total).toBe(8);
    expect(r2.totales).toEqual({
      total: '3600.00',
      retenciones: '130.00',
      pagado: '90.00',
      saldo: '3280.00',
      comprometido: '100.00',
    });
    const f5 = r2.filas.find((fila: { numero: string }) => fila.numero === 'F5');
    expect(f5).toMatchObject({
      origen: 'saldo_inicial',
      tramo: 'mas_de_90',
      diasVencido: 123,
      total: '600.00',
      neto: '600.00',
      anterioresAlInicio: '100.00',
      saldo: '500.00',
      estadoDePago: 'pendiente',
      autorizado: false,
      contrasena: null,
    });
    const f3 = r2.filas.find((fila: { numero: string }) => fila.numero === 'F3');
    expect(f3).toMatchObject({ saldo: '300.00', comprometido: '100.00', estadoDePago: 'en_parte' });
    expect(f3.contrasena).toMatchObject({ pagoPrometido: '2026-03-01' });
  });

  it('las vistas son filtros: vencidos, por vencer, sin contraseña, estado de pago y retenciones por practicar', async () => {
    expect((await documentos(`corte=${CORTE}&vencidos=true`)).total).toBe(6);
    expect(numeros(await documentos(`corte=${CORTE}&venceHasta=2026-11-15`))).toEqual(['F1', 'E1']);
    expect((await documentos(`corte=${CORTE}&sinContrasena=true`)).total).toBe(5);
    expect(numeros(await documentos(`corte=${CORTE}&estadoDePago=pagado`))).toEqual(['G1']);
    expect((await documentos(`corte=${CORTE}&estadoDePago=en_parte`)).total).toBe(3);
    expect(numeros(await documentos(`corte=${CORTE}&conRetencionesPorPracticar=true&origen=saldo_inicial`))).toEqual([
      'E1',
    ]);
    expect(numeros(await documentos(`corte=${CORTE}&origen=libro_de_compras`))).toHaveLength(1);
    expect(numeros(await documentos(`corte=${CORTE}&autorizacion=autorizados`))).toEqual(['F2', 'F1']);
    expect(numeros(await documentos(`corte=${CORTE}&emitidosDesde=2025-12-15&emitidosHasta=2025-12-31`))).toEqual([
      'E1',
    ]);
  });

  it('pagina, y los totales son siempre los de todo lo filtrado', async () => {
    const segunda = await documentos(`corte=${CORTE}&limite=3&pagina=2`);

    expect(segunda.filas).toHaveLength(3);
    expect(segunda).toMatchObject({ total: 8, pagina: 2, limite: 3 });
    expect(segunda.totales.saldo).toBe('3280.00');
  });
});

describe('el Excel', () => {
  async function filasDe(ruta: string) {
    const exportado = await m.soloExportar.get(ruta);
    expect(exportado.estado).toBe(200);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(exportado.cuerpo as unknown as ExcelJS.Buffer);
    const hoja = libro.worksheets[0]!;
    return Array.from({ length: hoja.rowCount }, (_, i) =>
      (hoja.getRow(i + 1).values as unknown[]).slice(1).map((valor) => String(valor ?? '')),
    );
  }

  it('R1 lleva los bloques, el saldo neto, los porcentajes y las notas con el corte y los avisos', async () => {
    const filas = await filasDe(`${R1}/exportar?corte=${CORTE}`);
    const textos = filas.map((fila) => fila.join('|'));

    expect(textos.some((fila) => fila.startsWith(`Acreedores|${nitValido('5900001')}|Alfa S.A.`))).toBe(true);
    expect(textos.some((fila) => fila.startsWith('Total deudores'))).toBe(true);
    expect(textos.some((fila) => fila.startsWith('Saldo neto de Proveedores') && fila.includes('2880'))).toBe(true);
    expect(textos.some((fila) => fila.startsWith('Nota|') && fila.includes('31/10/2026'))).toBe(true);
    expect(textos.some((fila) => fila.includes('Emitidos antes de la fecha de inicio'))).toBe(true);
  });

  it('R2 exporta todo lo filtrado, sin paginar, con el total y las notas', async () => {
    const filas = await filasDe(`${R2}/exportar?corte=${CORTE}&limite=3`);
    const documentosExportados = filas.filter((fila) => fila[0] === 'Documentos');

    expect(documentosExportados).toHaveLength(8);
    expect(filas.some((fila) => fila[0] === 'Total' && fila.includes('8 documentos'))).toBe(true);
  });
});

describe('4: un corte pasado no cambia al anular después', () => {
  it('anular un pago, un ajuste, un reintegro y un documento no mueve el corte, pero sí el saldo de hoy', async () => {
    const antes = await saldos(`corte=${CORTE}`);
    const documentosAntes = await documentos(`corte=${CORTE}&limite=200`);

    await anularPagoEnLaBase(m.pagoQueSeAnula);
    await anularAjuste(m.escenario, m.ajusteQueSeAnula);
    await anularReintegroEnLaBase(m.reintegroQueSeAnula);
    await anularDocumentoEnLaBase(m.delLibro);

    expect(await saldos(`corte=${CORTE}`)).toEqual(antes);
    expect(await documentos(`corte=${CORTE}&limite=200`)).toEqual(documentosAntes);
    const hoy = await saldos(`corte=${HOY}`);
    expect(nombres(hoy.acreedores)).not.toContain('Veterinaria El Quiroa');
    expect(hoy.totales.saldoNeto).toBe('1770.00');
    expect(hoy.deudores[0]).toMatchObject({ nombre: 'Beta S.A.', saldoNeto: '300.00' });
  });
});
