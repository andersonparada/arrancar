/**
 * La bancarización compartida vista desde Caja chica (CC-3, §5.4 h y §13.1): Caja chica responde la pregunta
 * `libro-de-compras.pagado_al_proveedor_en_el_mes` con lo asignado a los fondos, por `monto + monto_retenido` (el valor antes
 * de retenciones), con todos los fondos aunque el usuario no los vea; y asignar un documento llama la orden
 * `libro-de-compras.evaluar_bancarizacion` y marca o avisa según el resultado.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import '../modulos/core/contratos/libro-de-compras.contratos.js';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import { dependenciasCompartidas } from '../modulos/core/compartido/infraestructura/dependencias-compartidas.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import {
  comprobanteEnBase,
  EscenarioDeComprobantes,
  LINEA_CON_RETENCION,
  usuarioIdDe,
} from './soporte/caja-chica-comprobantes.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { HOY } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeComprobantes;
let fondoId: string;
let ajenoId: string;
let usuarioSinFondos: string;

const MES = `${HOY.slice(0, 7)}-01`;
const MOTIVO = 'Compra en el pueblo, solo efectivo';

const operadorDe = (usuarioId: string): Operador => ({
  usuarioId,
  cuentaId: e.caja.cuenta.cuentaId,
  empresaId: e.caja.cuenta.empresaId,
  esSuperacceso: false,
});

/** Corre algo dentro de una unidad de trabajo como ese usuario (lo que hace el libro al preguntar). */
const comoUsuario = <T>(usuarioId: string, trabajo: (operador: Operador) => Promise<T>): Promise<T> => {
  const operador = operadorDe(usuarioId);
  return dependenciasCompartidas().unidadDeTrabajo.ejecutar(operador, () => trabajo(operador));
};

const preguntar = (usuarioId: string, proveedorId = e.proveedorId, mes = MES) =>
  comoUsuario(usuarioId, (operador) =>
    mediador.preguntarATodos(operador, 'libro-de-compras.pagado_al_proveedor_en_el_mes', { proveedorId, mes }),
  );

beforeAll(async () => {
  e = await EscenarioDeComprobantes.preparar(entorno, 'cajachicabanc');
  fondoId = (await e.abrirFondo('Caja de la bancarización', { monto: '40000.00', topePorComprobante: '40000.00' })).id;
  ajenoId = (await e.abrirFondo('Otra caja de la bancarización', { monto: '5000.00', topePorComprobante: '5000.00' }))
    .id;
  await crearUsuarioConPermisos(entorno, e.caja.cuenta, {
    nombres: 'Sin',
    apellidos: 'Fondos',
    permisos: ['caja-chica.fondos.ver'],
  });
  usuarioSinFondos = await usuarioIdDe(e.caja.cuenta.empresaId, 'Sin');
});

describe('lo que Caja chica responde a la pregunta del libro', () => {
  it('sin comprobantes asignados no dice nada (nulo)', async () => {
    const respuestas = await preguntar(await e.propietarioId());

    expect(respuestas.filter(({ modulo }) => modulo === 'caja-chica')).toEqual([]);
  });

  it('una factura con retención cuenta el total (monto + retención), no el neto; la de la bandeja no cuenta', async () => {
    const retenida = await e.registrarEnElLibro({ total: LINEA_CON_RETENCION });
    const idRetenida = (await e.enLaBandeja(retenida.documentoId)).id;
    await e.registrarEnElLibro({ total: '1120.00' });

    const enLaBandeja = await preguntar(await e.propietarioId());
    await e.asignarBien(fondoId, [{ comprobanteId: idRetenida, motivoConRetencion: MOTIVO }]);
    const asignada = await preguntar(await e.propietarioId());

    expect(enLaBandeja.some(({ modulo }) => modulo === 'caja-chica')).toBe(false);
    const delFondo = asignada.find(({ modulo }) => modulo === 'caja-chica')!.respuesta;
    expect(delFondo).toEqual({
      efectivoCentavos: 560_000,
      bancarizadoCentavos: 0,
      comprobantes: ['Caja chica: 1 comprobante'],
    });
    expect((await comprobanteEnBase(idRetenida)).monto).toBe('5510.00');
  });

  it('suma todos los fondos, también los que el usuario no ve; no cuenta notas, anulados ni otro proveedor ni otro mes', async () => {
    const primero = await e.registrarEnElLibro({ referenciaDeDestino: ajenoId });
    const mismo = await e.registrarEnElLibro({ referenciaDeDestino: ajenoId });
    const nota = await e.registrarEnElLibro({
      tipoDte: 'NCRE',
      serie: 'N',
      documentoAfectadoId: mismo.documentoId,
      total: '560.00',
      referenciaDeDestino: ajenoId,
    });
    const anulado = await e.registrarEnElLibro({ referenciaDeDestino: ajenoId });
    await e.propietario().post(`/api/libro-de-compras/documentos/${anulado.documentoId}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Mal capturado',
    });

    const sinFondos = await preguntar(usuarioSinFondos);
    const delMesPasado = await preguntar(usuarioSinFondos, e.proveedorId, '2020-01-01');
    const deOtro = await preguntar(usuarioSinFondos, crypto.randomUUID());

    expect(nota.avisos).toEqual([]);
    expect(primero.avisos).toEqual([]);
    // 5,600.00 de la retenida + 1,120.00 de cada uno de los tres vigentes (la nota resta y el anulado no cuenta).
    const total = sinFondos.find(({ modulo }) => modulo === 'caja-chica')!.respuesta;
    expect(total.efectivoCentavos).toBe(560_000 + 2 * 112_000);
    expect(total.comprobantes).toEqual(['Caja chica: 3 comprobantes']);
    expect(delMesPasado.some(({ modulo }) => modulo === 'caja-chica')).toBe(false);
    expect(deOtro.some(({ modulo }) => modulo === 'caja-chica')).toBe(false);
  });
});

describe('la orden que evalúa la bancarización ve lo de Caja chica', () => {
  it('lo pagado por los fondos entra en lo que el libro reporta del mes', async () => {
    const evaluacion = await comoUsuario(await e.propietarioId(), (operador) =>
      mediador.enviar(operador, 'libro-de-compras.evaluar_bancarizacion', {
        proveedorId: e.proveedorId,
        proveedorNombre: 'Veterinaria El Quiroa',
        fecha: HOY,
        montoEnEfectivoCentavos: 100,
        cargos: [],
      }),
    );

    expect(evaluacion.pagadoEnElMesCentavos).toBe(560_000 + 2 * 112_000);
  });

  it('asignar un documento que lleva lo pagado al proveedor en el mes a Q30,000.00 o más lo marca sin bancarizar y avisa', async () => {
    const grande = await e.registrarEnElLibro({ total: '31000.00' });
    const idGrande = (await e.enLaBandeja(grande.documentoId)).id;

    const resultado = await e.asignarBien(fondoId, [{ comprobanteId: idGrande, motivoConRetencion: MOTIVO }]);

    // Los Q7,840.00 de antes más los Q31,000.00 de este (el valor antes de retenciones, no el neto que salió del fondo).
    expect(resultado.avisos).toHaveLength(1);
    expect(resultado.avisos[0]).toMatch(/^Bancarización .* llega a Q\s?38,840\.00/);
    expect(resultado.comprobantes[0]).toMatchObject({ fondoId, sinBancarizar: true });
    expect((await comprobanteEnBase(idGrande)).sin_bancarizar).toBe(true);
  });

  it('devolverlo a la bandeja le quita la marca', async () => {
    const [marcado] = (await e.delFondo(fondoId)).elementos.filter((c: any) => c.sinBancarizar);

    const devuelto = await e
      .propietario()
      .post(`/api/caja-chica/comprobantes/${marcado.id}/devolver-a-la-bandeja`, { motivo: 'Se paga con cheque' });

    expect(devuelto.cuerpo).toMatchObject({ fondoId: null, sinBancarizar: false });
    expect((await comprobanteEnBase(marcado.id)).sin_bancarizar).toBe(false);
  });
});
