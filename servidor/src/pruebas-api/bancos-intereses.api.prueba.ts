import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { conceptoGeneral, crearCuentaBancaria, saldoDe } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA_NOTAS = '/api/bancos/notas';
const RUTA_REPORTE = '/api/bancos/intereses-y-retenciones';
const RANGO = 'desde=2026-01-01&hasta=2026-12-31';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let cuentaId = '';
let cuentaAparteId = '';
let conceptoGeneralId = '';
let conceptoInteresesId = '';

const nota = (cambios: Record<string, unknown> = {}) => ({
  cuentaBancariaId: cuentaId,
  tipo: 'credito',
  fecha: '2026-03-31',
  monto: '90.00',
  referencia: 'Intereses de marzo',
  beneficiario: null,
  observaciones: null,
  conceptoId: conceptoInteresesId,
  interesBruto: '100.00',
  isrRetenido: '10.00',
  ...cambios,
});

const reporte = async (consulta = RANGO) => {
  const respuesta = await cuenta.propietario.get(`${RUTA_REPORTE}?${consulta}`);
  expect(respuesta.estado).toBe(200);
  return respuesta.cuerpo;
};

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Intereses ISR',
    usuario: 'propietariointeresesisr',
    modulos: ['bancos'],
  });
  conceptoGeneralId = await conceptoGeneral(cuenta.propietario);
  const concepto = await cuenta.propietario.post('/api/bancos/conceptos', {
    nombre: 'Intereses ganados de prueba',
    aplicaA: 'credito',
    actividadDeFlujo: 'operacion',
    grupoDeFlujo: null,
    esCargoBancario: false,
    pideDatosDeIntereses: true,
    admiteFactura: false,
    activo: true,
  });
  expect(concepto.estado).toBe(201);
  conceptoInteresesId = concepto.cuerpo.id;
  cuentaId = await crearCuentaBancaria(cuenta.propietario, 'Intereses principal');
  cuentaAparteId = await crearCuentaBancaria(cuenta.propietario, 'Intereses aparte');
});

describe('notas de intereses con ISR retenido, por API', () => {
  it('guarda el bruto y el ISR, el monto es el neto y suma al saldo solo el neto', async () => {
    const respuesta = await cuenta.propietario.post(RUTA_NOTAS, nota());

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({ monto: '90.00', interesBruto: '100.00', isrRetenido: '10.00' });
    expect(await saldoDe(cuenta.propietario, cuentaId)).toBe('1090.00');
  });

  it('rechaza lo que no cuadra, lo que falta y lo que sobra, con su código', async () => {
    const noCuadra = await cuenta.propietario.post(RUTA_NOTAS, nota({ interesBruto: '101.00' }));
    const falta = await cuenta.propietario.post(RUTA_NOTAS, nota({ isrRetenido: null }));
    const sobra = await cuenta.propietario.post(
      RUTA_NOTAS,
      nota({ conceptoId: conceptoGeneralId, monto: '90.00', interesBruto: '100.00', isrRetenido: '10.00' }),
    );

    expect(noCuadra.estado).toBe(400);
    expect(noCuadra.cuerpo.error.codigo).toBe('intereses_no_cuadran');
    expect(falta.cuerpo.error.codigo).toBe('datos_de_intereses_obligatorios');
    expect(sobra.cuerpo.error.codigo).toBe('datos_de_intereses_no_aplican');
    expect(await saldoDe(cuenta.propietario, cuentaId)).toBe('1090.00');
  });

  it('la base también hace cumplir el cuadre, aunque alguien se salte la API', async () => {
    const creada = await cuenta.propietario.post(RUTA_NOTAS, nota({ referencia: 'Para el check' }));

    await expect(
      comoPropietario('update bancos.movimientos set isr_retenido = 5.00 where id = $1', [creada.cuerpo.id]),
    ).rejects.toThrow(/movimientos_intereses_cuadran/);
    await expect(
      comoPropietario('update bancos.movimientos set interes_bruto = null where id = $1', [creada.cuerpo.id]),
    ).rejects.toThrow(/movimientos_intereses_cuadran/);
  });

  it('corregir cambia los datos con la misma revisión y queda en la auditoría', async () => {
    const creada = await cuenta.propietario.post(RUTA_NOTAS, nota({ referencia: 'Para corregir' }));
    const ruta = `${RUTA_NOTAS}/${creada.cuerpo.id}`;

    const corregida = await cuenta.propietario.put(
      ruta,
      nota({ referencia: 'Para corregir', monto: '91.00', isrRetenido: '9.00' }),
    );
    const invalida = await cuenta.propietario.put(ruta, nota({ interesBruto: '500.00' }));

    expect(corregida.estado).toBe(200);
    expect(corregida.cuerpo).toMatchObject({ monto: '91.00', isrRetenido: '9.00', interesBruto: '100.00' });
    expect(invalida.cuerpo.error.codigo).toBe('intereses_no_cuadran');
  });
});

describe('reporte Intereses y retenciones por API', () => {
  beforeAll(async () => {
    await cuenta.propietario.post(RUTA_NOTAS, nota({ cuentaBancariaId: cuentaAparteId, fecha: '2026-06-30' }));
    await cuenta.propietario.post(
      RUTA_NOTAS,
      nota({ cuentaBancariaId: cuentaAparteId, fecha: '2027-01-15', referencia: 'Del año siguiente' }),
    );
    // Una nota anulada deja de contar: su inverso es un débito y no copia los datos.
    const anulada = await cuenta.propietario.post(RUTA_NOTAS, nota({ referencia: 'Anulada', fecha: '2026-04-30' }));
    const anulacion = await cuenta.propietario.post(`${RUTA_NOTAS}/${anulada.cuerpo.id}/anular`, {
      motivo: 'Error del banco',
      fecha: '2026-05-02',
    });
    expect(anulacion.estado).toBe(200);
  });

  it('suma bruto, ISR y neto sin las anuladas ni lo de otro rango, y agrupa por cuenta', async () => {
    const todo = await reporte();

    const porCuenta = Object.fromEntries(
      todo.porCuenta.map((c: { cuentaBancariaNombre: string }) => [c.cuentaBancariaNombre, c]),
    );
    expect(todo.totalDeNotas).toBe(todo.intereses.length);
    expect(todo.intereses.map((i: { referencia: string }) => i.referencia)).not.toContain('Anulada');
    expect(todo.interesBruto).toBe(`${todo.totalDeNotas * 100}.00`);
    expect(todo.isrRetenido).toMatch(/\.\d\d$/);
    expect(Number(todo.interesBruto) - Number(todo.isrRetenido)).toBeCloseTo(Number(todo.neto), 2);
    expect(porCuenta['Intereses aparte']).toMatchObject({ cantidad: 1, interesBruto: '100.00', isrRetenido: '10.00' });
  });

  it('filtra por cuenta y por rango de fechas', async () => {
    const soloAparte = await reporte(`${RANGO}&cuentaBancariaId=${cuentaAparteId}`);
    const soloMarzo = await reporte('desde=2026-03-01&hasta=2026-03-31');
    const siguiente = await reporte('desde=2027-01-01&hasta=2027-12-31');

    expect(soloAparte.intereses.map((i: { fecha: string }) => i.fecha)).toEqual(['2026-06-30']);
    expect(soloMarzo.intereses.every((i: { fecha: string }) => i.fecha.startsWith('2026-03'))).toBe(true);
    expect(siguiente).toMatchObject({ totalDeNotas: 1, interesBruto: '100.00', neto: '90.00' });
  });

  it('cuenta las notas de un concepto de intereses que no tienen los datos (por ejemplo, reclasificadas)', async () => {
    const suelta = await cuenta.propietario.post(
      RUTA_NOTAS,
      nota({
        conceptoId: conceptoGeneralId,
        interesBruto: null,
        isrRetenido: null,
        monto: '25.00',
        fecha: '2026-07-01',
        referencia: 'Sin datos',
      }),
    );
    expect((await reporte()).notasSinDatos).toBe(0);

    const reclasificada = await cuenta.propietario.post(`${RUTA_NOTAS}/reclasificar`, {
      movimientoIds: [suelta.cuerpo.id],
      conceptoId: conceptoInteresesId,
    });

    expect(reclasificada.estado).toBe(200);
    expect((await reporte()).notasSinDatos).toBe(1);
  });

  it('valida el rango, exige la cuenta y respeta los permisos, con su Excel', async () => {
    const soloVer = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Ve',
      apellidos: 'Intereses',
      permisos: ['bancos.intereses.ver'],
    });
    const sinPermiso = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Sin',
      apellidos: 'Intereses',
      permisos: ['bancos.movimientos.exportar'],
    });

    expect((await cuenta.propietario.get(`${RUTA_REPORTE}?desde=2026-12-01&hasta=2026-01-01`)).estado).toBe(400);
    expect((await cuenta.propietario.get(RUTA_REPORTE)).estado).toBe(400);
    expect(
      (await cuenta.propietario.get(`${RUTA_REPORTE}?${RANGO}&cuentaBancariaId=00000000-0000-4000-8000-000000000001`))
        .estado,
    ).toBe(404);
    expect((await cuenta.propietario.get(`${RUTA_REPORTE}/exportar?${RANGO}`)).estado).toBe(200);
    expect((await soloVer.get(`${RUTA_REPORTE}?${RANGO}`)).estado).toBe(200);
    expect((await soloVer.get(`${RUTA_REPORTE}/exportar?${RANGO}`)).estado).toBe(403);
    expect((await sinPermiso.get(`${RUTA_REPORTE}?${RANGO}`)).estado).toBe(403);
  });

  it('no muestra los intereses de otra empresa', async () => {
    const otra = await darDeAltaCuenta(entorno, {
      nombre: 'Otra de intereses',
      usuario: 'propietariootrainteres',
      modulos: ['bancos'],
    });

    const respuesta = await otra.propietario.get(`${RUTA_REPORTE}?${RANGO}`);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ totalDeNotas: 0, interesBruto: '0.00', notasSinDatos: 0 });
  });
});
