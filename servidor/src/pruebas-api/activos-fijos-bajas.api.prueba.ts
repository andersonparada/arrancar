/**
 * Bajas y ventas (AF-9): lo que se congela, la venta con sus resultados (A1), componentes, anular
 * y aislamiento entre cuentas; el acta, la denuncia y los permisos, en `activos-fijos-bajas-documentos`.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { claseDe, datosDeActivo } from './soporte/escenario-de-activos.js';
import { activoEnUsoDe, baja, DATOS_DE_VENTA, venta } from './soporte/escenario-de-bajas-de-activos.js';

const ACTIVOS = '/api/activos-fijos/activos';
const BAJAS = '/api/activos-fijos/bajas';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let ajena: CuentaDePrueba;
let vehiculosId: string;

const activoEnUso = (monto?: string, cambios?: Record<string, unknown>) =>
  activoEnUsoDe(cuenta, vehiculosId, { monto, cambios });

const auditoria = (accion: string, registroId: string) =>
  comoPropietario<{ anterior: Record<string, unknown>; motivo: string | null }>(
    "select anterior, motivo from core.auditoria where recurso = 'activos-fijos.bajas' and accion = $1 and registro_id = $2 order by creado_en",
    [accion, registroId],
  );

const fichaDe = async (id: string) => (await cuenta.propietario.get(`${ACTIVOS}/${id}`)).cuerpo;

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Bajas', usuario: 'propietariobajas', modulos });
  ajena = await darDeAltaCuenta(entorno, { nombre: 'Bajas ajena', usuario: 'propietariobajasajeno', modulos });
  vehiculosId = await claseDe(cuenta, 'Vehículos');
});

describe('dar de baja', () => {
  it('congela costo, acumuladas y valor en libros con los meses abiertos, y deja al activo dado de baja', async () => {
    const id = await activoEnUso();

    const respuesta = await cuenta.propietario.post(BAJAS, baja(id));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      causa: 'destruccion',
      estado: 'vigente',
      costo: '250000.00',
      depreciacionAcumuladaContable: '8333.34',
      valorEnLibros: '241666.66',
      costoFiscal: '250000.00',
      baseFiscal: '250000.00',
      depreciacionAcumuladaFiscal: '8333.34',
      valorFiscalPorDepreciar: '241666.66',
      resultadoContable: null,
      tieneActa: false,
    });
    expect(respuesta.cuerpo.avisos.map((a: { codigo: string }) => a.codigo)).toEqual([
      'sin_acta',
      'destruccion_sin_acta_notarial',
    ]);
    const ficha = await fichaDe(id);
    expect(ficha).toMatchObject({ estado: 'dado_de_baja', fechaDeBaja: '2026-11-20' });
    expect(ficha.baja).toMatchObject({ id: respuesta.cuerpo.id, valorEnLibros: '241666.66' });
    const leida = await cuenta.propietario.get(`${BAJAS}/${respuesta.cuerpo.id}`);
    expect(leida.cuerpo).toMatchObject({ numero: respuesta.cuerpo.numero, activo: { id } });
    expect(Object.keys(leida.cuerpo.activo)).not.toContain('empresaId');
  });

  it('los números de acta van seguidos y la base garantiza el valor en libros', async () => {
    const a = await cuenta.propietario.post(BAJAS, baja(await activoEnUso()));
    const b = await cuenta.propietario.post(
      BAJAS,
      baja(await activoEnUso(), { causa: 'robo', numeroDeDenuncia: 'MP-77' }),
    );

    expect(b.cuerpo.numero).toBe(a.cuerpo.numero + 1);
    const filas = await comoPropietario<{ ok: boolean }>(
      'select valor_en_libros = costo - depreciacion_acumulada_contable as ok from activos_fijos.bajas where id = $1',
      [b.cuerpo.id],
    );
    expect(filas[0]!.ok).toBe(true);
    expect(b.cuerpo.avisos.map((x: { codigo: string }) => x.codigo)).toEqual(['sin_acta', 'sin_denuncia']);
  });

  it('un activo dado de baja no se da de baja otra vez ni se le registran movimientos', async () => {
    const id = await activoEnUso();
    await cuenta.propietario.post(BAJAS, baja(id));

    const otra = await cuenta.propietario.post(BAJAS, baja(id));
    const costo = await cuenta.propietario.post(`${ACTIVOS}/${id}/costos`, {
      claseDeCosto: 'adquisicion',
      fecha: '2026-11-21',
      monto: '10.00',
      documentoDeSoporte: 'X',
    });

    expect(otra.estado).toBe(422);
    expect(otra.cuerpo.error.codigo).toBe('activo_dado_de_baja');
    expect(costo.estado).toBe(422);
  });

  it('dos bajas a la vez del mismo activo: solo una gana', async () => {
    const id = await activoEnUso();

    const [a, b] = await Promise.all([
      cuenta.propietario.post(BAJAS, baja(id)),
      cuenta.propietario.post(BAJAS, baja(id, { causa: 'robo' })),
    ]);

    expect([a.estado, b.estado].sort()).toEqual([201, 422]);
    const filas = await comoPropietario(
      "select 1 from activos_fijos.bajas where activo_id = $1 and estado = 'vigente'",
      [id],
    );
    expect(filas).toHaveLength(1);
  });

  it('rechaza una venta como baja, fecha futura, causa mala y un activo en construcción', async () => {
    const id = await activoEnUso();
    const construccion = (await cuenta.propietario.post(ACTIVOS, datosDeActivo(vehiculosId))).cuerpo.id as string;

    const comoVenta = await cuenta.propietario.post(BAJAS, baja(id, { causa: 'venta' }));
    const futura = await cuenta.propietario.post(BAJAS, baja(id, { fecha: '2099-01-01' }));
    const causa = await cuenta.propietario.post(BAJAS, baja(id, { causa: 'regalo' }));
    const obra = await cuenta.propietario.post(BAJAS, baja(construccion));

    expect(comoVenta.estado).toBe(400);
    expect(comoVenta.cuerpo.error.codigo).toBe('baja_invalida');
    expect(futura.cuerpo.error.codigo).toBe('baja_invalida');
    expect(causa.estado).toBe(400);
    expect(obra.cuerpo.error.codigo).toBe('activo_no_en_uso');
  });
});

describe('vender', () => {
  it('guarda la venta con sus resultados contable y fiscal y avisa de la pérdida de capital', async () => {
    const id = await activoEnUso();

    const respuesta = await cuenta.propietario.post(BAJAS, venta(id));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      causa: 'venta',
      comprador: 'Transportes del Norte, S. A.',
      precio: '100000.00',
      iva: '12000.00',
      numeroFel: '98765',
      valorEnLibros: '241666.66',
      resultadoContable: '-141666.66',
      resultadoFiscal: '-141666.66',
    });
    const codigos = respuesta.cuerpo.avisos.map((a: { codigo: string }) => a.codigo);
    expect(codigos).toEqual(['sin_acta', 'venta_con_iva', 'perdida_de_capital']);
    const [fila] = await comoPropietario<{ causa: string; resultado_fiscal: string }>(
      'select causa, resultado_fiscal from activos_fijos.bajas where id = $1',
      [respuesta.cuerpo.id],
    );
    expect(fila).toMatchObject({ causa: 'venta', resultado_fiscal: '-141666.66' });
  });

  it('una venta sin datos de venta, con NIT inválido o con precio cero se rechaza', async () => {
    const id = await activoEnUso();
    const datos = DATOS_DE_VENTA;

    const sin = await cuenta.propietario.post(BAJAS, baja(id, { causa: 'venta' }));
    const nit = await cuenta.propietario.post(BAJAS, venta(id, { venta: { ...datos, nitDelComprador: '1234567-1' } }));
    const cero = await cuenta.propietario.post(BAJAS, venta(id, { venta: { ...datos, precio: '0.00' } }));
    const uuid = await cuenta.propietario.post(BAJAS, venta(id, { venta: { ...datos, autorizacionFel: 'xyz' } }));

    expect([sin.estado, nit.estado, cero.estado, uuid.estado]).toEqual([400, 400, 400, 400]);
    expect(nit.cuerpo.error.codigo).toBe('baja_invalida');
    expect(await comoPropietario('select 1 from activos_fijos.bajas where activo_id = $1', [id])).toHaveLength(0);
  });

  it('vender un principal con su componente reparte el precio en proporción al costo', async () => {
    const principal = await activoEnUso('75000.00');
    const hijo = await activoEnUso('25000.00', { activoPadreId: principal });

    const respuesta = await cuenta.propietario.post(BAJAS, venta(principal));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.componentes).toMatchObject([{ activoId: hijo }]);
    const filas = await comoPropietario<{ activo_id: string; precio: string; iva: string; numero: number }>(
      'select activo_id, precio, iva, numero from activos_fijos.bajas where activo_id = any($1)',
      [[principal, hijo]],
    );
    const delHijo = filas.find((fila) => fila.activo_id === hijo)!;
    expect(delHijo).toMatchObject({ precio: '25000.00', iva: '3000.00' });
    expect(filas[0]!.numero).toBe(filas[1]!.numero);
    expect((await fichaDe(hijo)).estado).toBe('dado_de_baja');
  });
});

describe('anular', () => {
  it('devuelve el activo a uso, audita con la baja como estaba y permite darlo de baja otra vez', async () => {
    const id = await activoEnUso();
    const creada = await cuenta.propietario.post(BAJAS, baja(id));

    const anulada = await cuenta.propietario.post(`${BAJAS}/${creada.cuerpo.id}/anular`, {
      motivo: 'Era otro vehículo',
    });

    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);
    expect(anulada.cuerpo).toMatchObject({ estado: 'anulada', motivoDeAnulacion: 'Era otro vehículo' });
    expect(await fichaDe(id)).toMatchObject({ estado: 'en_uso', fechaDeBaja: null, baja: null });
    const filas = await auditoria('anular', creada.cuerpo.id);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({
      motivo: 'Era otro vehículo',
      anterior: { estado: 'vigente', costo: '250000.00' },
    });
    const otra = await cuenta.propietario.post(BAJAS, baja(id));
    expect(otra.estado, JSON.stringify(otra.cuerpo)).toBe(201);
    const repetida = await cuenta.propietario.post(`${BAJAS}/${creada.cuerpo.id}/anular`, { motivo: 'Otra vez' });
    expect(repetida.cuerpo.error.codigo).toBe('baja_no_anulable');
  });

  it('anular al principal devuelve a sus componentes; un componente no se anula con su principal dado de baja', async () => {
    const principal = await activoEnUso('75000.00');
    const hijo = await activoEnUso('25000.00', { activoPadreId: principal });
    const creada = await cuenta.propietario.post(BAJAS, baja(principal));
    const delHijo = await comoPropietario<{ id: string }>('select id from activos_fijos.bajas where activo_id = $1', [
      hijo,
    ]);

    const soloElHijo = await cuenta.propietario.post(`${BAJAS}/${delHijo[0]!.id}/anular`, { motivo: 'Solo el motor' });
    await cuenta.propietario.post(`${BAJAS}/${creada.cuerpo.id}/anular`, { motivo: 'Todo' });

    expect(soloElHijo.cuerpo.error.codigo).toBe('baja_de_componente_con_su_principal');
    expect((await fichaDe(principal)).estado).toBe('en_uso');
    expect((await fichaDe(hijo)).estado).toBe('en_uso');
    expect(await auditoria('anular', delHijo[0]!.id)).toHaveLength(1);
  });

  it('exige motivo y una baja de la empresa', async () => {
    const id = await activoEnUso();
    const creada = await cuenta.propietario.post(BAJAS, baja(id));

    const sinMotivo = await cuenta.propietario.post(`${BAJAS}/${creada.cuerpo.id}/anular`, { motivo: ' ' });
    const ajenaAnula = await ajena.propietario.post(`${BAJAS}/${creada.cuerpo.id}/anular`, { motivo: 'Intento' });
    const ajenaLee = await ajena.propietario.get(`${BAJAS}/${creada.cuerpo.id}`);

    expect(sinMotivo.estado).toBe(400);
    expect([ajenaAnula.estado, ajenaLee.estado]).toEqual([404, 404]);
  });
});
