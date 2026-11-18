/**
 * R9 (pagos en efectivo sobre el umbral de bancarización): el mes de un proveedor que llega al umbral con cheque más
 * efectivo, el cargo de Q30,000 o más pagado en dos meses con una parte en efectivo, el IVA completo y el costo no deducible,
 * el pequeño contribuyente (no sale), la excepción con permiso, los 48 meses, el permiso y el Excel.
 */
import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import { pagoEnEfectivo, repartirBien, unRetiro } from './soporte/cuentas-por-pagar-efectivo.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, primerDiaDelMes, HOY } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const RUTA = '/api/cuentas-por-pagar/reportes';
const entorno = usarEntornoApi();
const MES_DE_HOY = HOY.slice(0, 7);
let e: EscenarioDePagos;
let delMes: { proveedorId: string; cargo: string };
let sobreElUmbral: { proveedorId: string; cargo: string; efectivo: string; cheque: string };
let conExcepcion: { proveedorId: string; cargo: string; recibo: string };

const ver = async (consulta = '', cliente = e.propietario()) => {
  const respuesta = await cliente.get(`${RUTA}/bancarizacion${consulta}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

/** El IVA acreditable y el total sin IVA del documento del libro de un cargo, en quetzales con dos decimales. */
async function cifrasDelLibro(cargoId: string): Promise<{ iva: string; sinIva: string }> {
  const [fila] = await consultar<{ iva: string; sin_iva: string }>(
    `select (ld.iva - ld.iva_no_acreditable)::text as iva, (ld.total - ld.iva)::text as sin_iva
       from cuentas_por_pagar.documentos d join libro_de_compras.documentos ld on ld.id = d.documento_id
      where d.id = $1`,
    [cargoId],
  );
  return { iva: fila!.iva, sinIva: fila!.sin_iva };
}

const suma = (...cifras: string[]) =>
  (cifras.reduce((total, c) => total + Math.round(Number(c) * 100), 0) / 100).toFixed(2);

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxprepbancariza');
  const { cuenta } = e.mundo.escenario;
  const inicio = await cuenta.propietario.put(`/api/empresas/${cuenta.empresaId}/carga-inicial`, {
    fechaDeInicio: '2020-01-01',
  });
  expect(inicio.estado, JSON.stringify(inicio.cuerpo)).toBe(200);
  await e.fondear('300000.00');

  // Un proveedor y un mes: efectivo (Q24,000) más un cheque (Q7,000) llevan el mes a Q31,000.
  const proveedor = await e.mundo.unProveedor();
  const [grande, otro] = [
    await e.cargoAutorizado(proveedor, '25000.00'),
    await e.cargoAutorizado(proveedor, '9000.00'),
  ];
  await e.contrasena(proveedor, [grande, otro]);
  const retiro = await unRetiro(e, '25000.00');
  await repartirBien(e.propietario(), retiro.id, [
    pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: grande, monto: '24000.00' }]),
  ]);
  const cheque = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: otro, monto: '7000.00' }]));
  expect(cheque.estado, JSON.stringify(cheque.cuerpo)).toBe(201);
  delMes = { proveedorId: proveedor.proveedorId, cargo: grande };

  // Un cargo de Q30,000: Q1,000 en efectivo un mes y Q5,000 en cheque otro; ningún mes llega al umbral.
  const { proveedor: segundo, cargo: treinta } = await e.proveedorConCargo('30000.00');
  const retiroDos = await unRetiro(e, '1000.00');
  const efectivo = await repartirBien(e.propietario(), retiroDos.id, [
    pagoEnEfectivo(segundo.proveedorId, [{ cargoId: treinta, monto: '1000.00' }], {
      motivoSinBancarizar: 'Solo recibe efectivo',
    }),
  ]);
  const chequeDos = await e.pagar(e.cheque(segundo.proveedorId, [{ cargoId: treinta, monto: '5000.00' }]));
  expect(chequeDos.estado, JSON.stringify(chequeDos.cuerpo)).toBe(201);
  await consultar('update cuentas_por_pagar.pagos set fecha = $2 where id = $1', [
    efectivo.pagos[0].id,
    primerDiaDelMes(-2),
  ]);
  await consultar('update cuentas_por_pagar.pagos set fecha = $2 where id = $1', [
    chequeDos.cuerpo.id,
    primerDiaDelMes(-1),
  ]);
  sobreElUmbral = {
    proveedorId: segundo.proveedorId,
    cargo: treinta,
    efectivo: efectivo.pagos[0].numero,
    cheque: chequeDos.cuerpo.numero,
  };

  // Un cargo de Q40,000 con Q35,000 en efectivo y la excepción: sale por mes y por cargo.
  const { proveedor: tercero, cargo: cuarenta } = await e.proveedorConCargo('40000.00');
  const retiroTres = await unRetiro(e, '35000.00');
  const excepcion = await repartirBien(e.propietario(), retiroTres.id, [
    pagoEnEfectivo(tercero.proveedorId, [{ cargoId: cuarenta, monto: '35000.00' }], {
      motivoSinBancarizar: 'El proveedor solo recibe efectivo',
    }),
  ]);
  conExcepcion = { proveedorId: tercero.proveedorId, cargo: cuarenta, recibo: excepcion.pagos[0].numero };
}, 120_000);

describe('R9: el mes de un proveedor', () => {
  it('un mes con cheque más efectivo que llega al umbral sale con la suma, el efectivo, el IVA completo y el costo', async () => {
    const reporte = await ver(`?proveedorId=${delMes.proveedorId}`);
    const libro = await cifrasDelLibro(delMes.cargo);

    expect(reporte.meses).toHaveLength(1);
    expect(reporte.meses[0]).toMatchObject({
      mes: MES_DE_HOY,
      sumaDelMes: '31000.00',
      efectivo: '24000.00',
      ivaEnRiesgo: libro.iva,
      costoNoDeducible: libro.sinIva,
    });
    expect(reporte.meses[0].pagos[0]).toMatchObject({
      monto: '24000.00',
      sinBancarizar: false,
      retiro: expect.any(String),
    });
    expect(reporte.meses[0].pagos[0].cargos[0].marcas).toEqual([
      'Crédito fiscal en riesgo por bancarización',
      'Costo no deducible',
    ]);
    expect(reporte.documentosSobreElUmbral).toEqual([]);
    expect(reporte.umbral).toBe('30000.00');
    expect(reporte.leyendas.join(' ')).toContain('Arrancar solo suma los pagos registrados en Cuentas por pagar.');
    expect(reporte.leyendas.join(' ')).toContain('Q30,000.00');
  });

  it('con otro mes fuera del rango no sale', async () => {
    const reporte = await ver(
      `?proveedorId=${delMes.proveedorId}&desde=${primerDiaDelMes(-12).slice(0, 7)}&hasta=${primerDiaDelMes(-1).slice(0, 7)}`,
    );

    expect(reporte.meses).toEqual([]);
  });
});

describe('R9: el criterio por cargo', () => {
  it('un cargo de Q30,000 pagado en dos meses con una parte en efectivo sale aunque ningún mes llegue', async () => {
    const reporte = await ver(`?proveedorId=${sobreElUmbral.proveedorId}`);
    const libro = await cifrasDelLibro(sobreElUmbral.cargo);

    expect(reporte.meses).toEqual([]);
    expect(reporte.documentosSobreElUmbral).toHaveLength(1);
    const [documento] = reporte.documentosSobreElUmbral;
    expect(documento).toMatchObject({
      total: '30000.00',
      efectivo: '1000.00',
      ivaEnRiesgo: libro.iva,
      costoNoDeducible: libro.sinIva,
    });
    expect(documento.pagos.map(({ forma, monto }: { forma: string; monto: string }) => [forma, monto])).toEqual([
      ['efectivo', '1000.00'],
      ['cheque', '5000.00'],
    ]);
    expect(reporte.totales.documentos).toMatchObject({ cantidad: 1, efectivo: '1000.00', ivaEnRiesgo: libro.iva });
  });

  it('un cargo que sale por mes y por cargo cuenta una sola vez en el total, y la excepción deja su motivo', async () => {
    const reporte = await ver(`?proveedorId=${conExcepcion.proveedorId}`);
    const libro = await cifrasDelLibro(conExcepcion.cargo);

    expect(reporte.meses).toHaveLength(1);
    expect(reporte.meses[0].pagos[0]).toMatchObject({
      recibo: conExcepcion.recibo,
      sinBancarizar: true,
      motivoSinBancarizar: 'El proveedor solo recibe efectivo',
    });
    expect(reporte.documentosSobreElUmbral).toHaveLength(1);
    expect(reporte.totales.total).toEqual({ ivaEnRiesgo: libro.iva, costoNoDeducible: libro.sinIva });
  });

  it('el reporte de todos suma los tres proveedores sin repetir cargos', async () => {
    const reporte = await ver();
    const a = await cifrasDelLibro(delMes.cargo);
    const b = await cifrasDelLibro(sobreElUmbral.cargo);
    const c = await cifrasDelLibro(conExcepcion.cargo);

    expect(reporte.meses.map(({ sumaDelMes }: { sumaDelMes: string }) => sumaDelMes).sort()).toEqual([
      '31000.00',
      '35000.00',
    ]);
    expect(reporte.documentosSobreElUmbral).toHaveLength(2);
    expect(reporte.totales.total).toEqual({
      ivaEnRiesgo: suma(a.iva, b.iva, c.iva),
      costoNoDeducible: suma(a.sinIva, b.sinIva, c.sinIva),
    });
  });
});

describe('R9: sin efecto fiscal', () => {
  it('un pequeño contribuyente no sale; sin «solo con efecto» sale sin marcas', async () => {
    const pequeno = await EscenarioDePagos.preparar(entorno, 'cxprepbancpeq', {
      regimenIva: 'pequeno_contribuyente',
      agenteDeRetencionIva: 'ninguno',
    });
    const { cuenta } = pequeno.mundo.escenario;
    await cuenta.propietario.put(`/api/empresas/${cuenta.empresaId}/carga-inicial`, { fechaDeInicio: '2020-01-01' });
    await pequeno.fondear('50000.00');
    const { proveedor, cargo } = await pequeno.proveedorConCargo('30000.00');
    const retiro = await unRetiro(pequeno, '35000.00');
    await repartirBien(pequeno.propietario(), retiro.id, [
      pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '1000.00' }]),
    ]);

    const estricto = await ver('', pequeno.propietario());
    const todo = await ver('?soloConEfecto=false', pequeno.propietario());

    expect(estricto.meses).toEqual([]);
    expect(estricto.documentosSobreElUmbral).toEqual([]);
    expect(todo.documentosSobreElUmbral).toHaveLength(1);
    expect(todo.documentosSobreElUmbral[0]).toMatchObject({
      marcas: [],
      ivaEnRiesgo: '0.00',
      costoNoDeducible: '0.00',
    });
    expect(todo.totales.total).toEqual({ ivaEnRiesgo: '0.00', costoNoDeducible: '0.00' });
  });
});

describe('R9: el rango y los permisos', () => {
  it('rechaza un rango de 49 meses y acepta uno de 48', async () => {
    const largo = await e.propietario().get(`${RUTA}/bancarizacion?desde=2022-12&hasta=2026-12`);
    const justo = await e.propietario().get(`${RUTA}/bancarizacion?desde=2023-01&hasta=2026-12`);
    const alReves = await e.propietario().get(`${RUTA}/bancarizacion?desde=2026-05&hasta=2026-04`);

    expect(largo.estado).toBe(400);
    expect(largo.cuerpo.error.codigo).toBe('rango_de_reporte_muy_largo');
    expect(justo.estado).toBe(200);
    expect(alReves.cuerpo.error.codigo).toBe('rango_de_reporte_invalido');
  });

  it('rechaza un mes mal escrito y un proveedor que no existe', async () => {
    expect((await e.propietario().get(`${RUTA}/bancarizacion?desde=2026-13`)).estado).toBe(400);
    const sin = await e.propietario().get(`${RUTA}/bancarizacion?proveedorId=00000000-0000-4000-8000-000000000000`);
    expect(sin.estado).toBe(404);
  });

  it('pide el permiso de control para ver y para exportar', async () => {
    const permiso = (nombre: string, accion: string) =>
      crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
        nombres: nombre,
        apellidos: 'Bancarización',
        permisos: [`cuentas-por-pagar.reportes-de-control.${accion}`],
      });
    const [soloVer, soloExportar] = [await permiso('Solo ve', 'ver'), await permiso('Solo exporta', 'exportar')];
    const dePagos = await crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
      nombres: 'Solo pagos',
      apellidos: 'Bancarización',
      permisos: ['cuentas-por-pagar.reportes-de-pagos.ver', 'cuentas-por-pagar.reportes-de-pagos.exportar'],
    });

    expect((await entorno.nuevoCliente().get(`${RUTA}/bancarizacion`)).estado).toBe(401);
    expect((await soloExportar.get(`${RUTA}/bancarizacion`)).estado).toBe(403);
    expect((await soloVer.get(`${RUTA}/bancarizacion/exportar`)).estado).toBe(403);
    expect((await dePagos.get(`${RUTA}/bancarizacion`)).estado).toBe(403);
    expect((await soloVer.get(`${RUTA}/bancarizacion`)).estado).toBe(200);
    expect((await soloExportar.get(`${RUTA}/bancarizacion/exportar`)).estado).toBe(200);
  });

  it('el Excel lleva los meses, los documentos, los totales y las leyendas', async () => {
    const exportado = await e.propietario().get(`${RUTA}/bancarizacion/exportar`);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(exportado.cuerpo as unknown as ExcelJS.Buffer);
    const hoja = libro.worksheets[0]!;
    const filas = Array.from({ length: hoja.rowCount }, (_, i) =>
      (hoja.getRow(i + 1).values as unknown[])
        .slice(1)
        .map((valor) => String(valor ?? ''))
        .join('|'),
    );

    expect(filas.some((fila) => fila.startsWith('Mes|') && fila.includes(MES_DE_HOY))).toBe(true);
    expect(filas.some((fila) => fila.startsWith('Pago en efectivo|'))).toBe(true);
    expect(filas.some((fila) => fila.startsWith('Documento sobre el umbral|'))).toBe(true);
    expect(filas.some((fila) => fila.startsWith('Total|'))).toBe(true);
    expect(filas.some((fila) => fila.includes('Código Tributario art. 106'))).toBe(true);
  });
});
