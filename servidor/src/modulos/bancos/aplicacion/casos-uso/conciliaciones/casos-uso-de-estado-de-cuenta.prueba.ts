import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { FaltaElEstadoDeCuenta } from '../../../dominio/errores-de-estado-de-cuenta.js';
import { ConciliacionNoEstaEnProceso } from '../../../dominio/errores.js';
import { ConciliacionSinEstadoDeCuenta } from '../../errores-de-estado-de-cuenta.js';
import {
  agregarMovimiento,
  casosDeUsoDeConciliaciones,
  inicio,
  marcarSaldoInicial,
  operador,
  otroOperador,
} from './soporte-de-pruebas-de-conciliaciones.js';

let entorno: ReturnType<typeof casosDeUsoDeConciliaciones>;

const PDF = Buffer.from('%PDF-1.7 de prueba');
const subida = (conciliacionId: string, nombre: string | null = 'banco.pdf') => ({
  conciliacionId,
  contenido: PDF,
  nombre,
});

async function iniciarConSaldo(): Promise<string> {
  const iniciada = await entorno.casos.iniciar.ejecutar(operador, inicio());
  await entorno.casos.marcar.ejecutar(operador, {
    conciliacionId: iniciada.id,
    movimientoIds: marcarSaldoInicial(iniciada.candidatos),
  });
  await entorno.casos.transcribirSaldo.ejecutar(operador, { conciliacionId: iniciada.id, saldo: '1000.00' });
  return iniciada.id;
}

beforeEach(async () => {
  entorno = casosDeUsoDeConciliaciones();
  await agregarMovimiento(entorno.movimientos, { fecha: '2026-01-01', monto: '1000.00', saldoInicial: true });
});

describe('subir el estado de cuenta', () => {
  it('lo adjunta y el DTO lo muestra sin ruta ni id', async () => {
    const id = await iniciarConSaldo();

    const dto = await entorno.casos.subirEstadoDeCuenta.ejecutar(operador, subida(id));

    expect(dto.estadoDeCuenta).toMatchObject({ tipoMime: 'application/pdf', nombreOriginal: 'banco.pdf' });
    expect(Object.keys(dto.estadoDeCuenta!)).not.toContain('id');
    expect(entorno.documentos.guardados.size).toBe(1);
    expect(entorno.auditoria.entradas).toHaveLength(0);
  });

  it('reemplazar borra el anterior y deja la auditoría con su huella', async () => {
    const id = await iniciarConSaldo();
    await entorno.casos.subirEstadoDeCuenta.ejecutar(operador, subida(id, 'primero.pdf'));
    const primeraHuella = (await entorno.conciliaciones.estadoDeCuentaDe(id))!.sha256;

    await entorno.casos.subirEstadoDeCuenta.ejecutar(operador, subida(id, 'segundo.pdf'));

    expect(entorno.documentos.guardados.size).toBe(1);
    expect(entorno.auditoria.acciones()).toEqual(['bancos.conciliaciones:quitar']);
    expect(entorno.auditoria.entradas[0]!.anterior).toMatchObject({
      estadoDeCuenta: { nombreOriginal: 'primero.pdf', sha256: primeraHuella },
    });
  });

  it('en una conciliación elaborada falla enseguida y la revisión no corre', async () => {
    const id = await iniciarConSaldo();
    await entorno.casos.terminar.ejecutar(operador, id);

    await expect(entorno.casos.subirEstadoDeCuenta.ejecutar(operador, subida(id))).rejects.toThrow(
      ConciliacionNoEstaEnProceso,
    );
    expect(entorno.documentos.revisiones).toBe(0);
  });

  it('si el archivo no se acepta no queda nada guardado', async () => {
    const id = await iniciarConSaldo();
    entorno.documentos.errorAlRevisar = new Error('no aceptado');

    await expect(entorno.casos.subirEstadoDeCuenta.ejecutar(operador, subida(id))).rejects.toThrow('no aceptado');
    expect(entorno.documentos.guardados.size).toBe(0);
  });
});

describe('quitar el estado de cuenta', () => {
  it('lo borra y deja la auditoría', async () => {
    const id = await iniciarConSaldo();
    await entorno.casos.subirEstadoDeCuenta.ejecutar(operador, subida(id));

    const dto = await entorno.casos.quitarEstadoDeCuenta.ejecutar(operador, id);

    expect(dto.estadoDeCuenta).toBeNull();
    expect(entorno.documentos.guardados.size).toBe(0);
    expect(entorno.auditoria.acciones()).toEqual(['bancos.conciliaciones:quitar']);
  });

  it('sin archivo responde no encontrado y en elaborada no se puede', async () => {
    const id = await iniciarConSaldo();
    await expect(entorno.casos.quitarEstadoDeCuenta.ejecutar(operador, id)).rejects.toThrow(
      ConciliacionSinEstadoDeCuenta,
    );

    await entorno.casos.subirEstadoDeCuenta.ejecutar(operador, subida(id));
    await entorno.casos.terminar.ejecutar(operador, id);
    await expect(entorno.casos.quitarEstadoDeCuenta.ejecutar(operador, id)).rejects.toThrow(
      ConciliacionNoEstaEnProceso,
    );
  });
});

describe('abrir el estado de cuenta', () => {
  it('arma el nombre con el periodo y nunca usa el del usuario', async () => {
    const id = await iniciarConSaldo();
    await entorno.casos.subirEstadoDeCuenta.ejecutar(operador, subida(id, '../../etc/passwd.pdf'));

    const abierto = await entorno.casos.abrirEstadoDeCuenta.ejecutar(otroOperador, id);

    expect(abierto.nombre).toBe('estado-de-cuenta-2026-01.pdf');
    expect(abierto.contenido).toBeInstanceOf(Readable);
  });

  it('sin archivo o con una conciliación que no existe responde no encontrado', async () => {
    const id = await iniciarConSaldo();
    await expect(entorno.casos.abrirEstadoDeCuenta.ejecutar(operador, id)).rejects.toThrow(
      ConciliacionSinEstadoDeCuenta,
    );
    await expect(entorno.casos.abrirEstadoDeCuenta.ejecutar(operador, crypto.randomUUID())).rejects.toThrow(
      RecursoNoEncontrado,
    );
  });
});

describe('terminar con la variable de la empresa', () => {
  it('encendida y sin archivo responde 400; con el archivo termina', async () => {
    const id = await iniciarConSaldo();
    entorno.politicaDeEstadoDeCuenta.exige = true;
    await expect(entorno.casos.terminar.ejecutar(operador, id)).rejects.toThrow(FaltaElEstadoDeCuenta);

    await entorno.casos.subirEstadoDeCuenta.ejecutar(operador, subida(id));

    expect((await entorno.casos.terminar.ejecutar(operador, id)).estado).toBe('elaborada');
  });

  it('apagada termina sin archivo y una elaborada sin archivo se autoriza aunque se encienda después', async () => {
    const id = await iniciarConSaldo();
    await entorno.casos.terminar.ejecutar(operador, id);
    entorno.politicaDeEstadoDeCuenta.exige = true;

    expect((await entorno.casos.autorizar.ejecutar(otroOperador, id)).estado).toBe('autorizada');
  });
});

describe('eliminar la conciliación con estado de cuenta', () => {
  it('borra el archivo y la auditoría conserva su huella', async () => {
    const id = await iniciarConSaldo();
    await entorno.casos.subirEstadoDeCuenta.ejecutar(operador, subida(id));
    const huella = (await entorno.conciliaciones.estadoDeCuentaDe(id))!.sha256;

    await entorno.casos.eliminar.ejecutar(operador, { conciliacionId: id, motivo: 'Se repite' });

    expect(entorno.documentos.guardados.size).toBe(0);
    expect(entorno.auditoria.entradas.at(-1)!.anterior).toMatchObject({ estadoDeCuenta: { sha256: huella } });
  });
});
