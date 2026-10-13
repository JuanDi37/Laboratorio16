# Transferencia y kill-seeder · 20230285

## Estado de la evidencia

La instalación en este entorno falló con EACCES al acceder a npm. No se observó todavía transferencia ni kill real. Los escenarios siguientes son procedimientos y predicciones, **no resultados de clase**. Después de ejecutar, `npm.cmd run report` mostrará los eventos reales en el HTML y P2P.md. Agrega debajo el log del compañero y tus observaciones.

## Diseño

- Archivo: `samples/lab16.txt`, generado por `npm.cmd run sample`, **786432 bytes / 768 KiB** de texto propio sin PII ni copyright ajeno.
- Protocolo: Hypercore, manifest en bloque 0, **48 bloques de archivo de 16384 bytes**. Discovery por `core.discoveryKey`.
- Integridad: Merkle/firma del core más SHA-256 final; el manifest contiene el digest esperado. Ver [sample.json](samples/sample.json).
- Estado inicial: storage nuevo por downloader; no reutilizar una descarga previa para probar el kill.
- Momento del kill: cerca de 50%, con datos de red todavía pendientes. Registrar `networkBytesAtKill`; no usar solo bytes leídos.

## Escenarios automáticos locales

```powershell
npm.cmd run experiment -- --scenario all
npm.cmd run report
```

| Escenario | Peers con todo el archivo antes del kill | Acción | Predicción a contrastar |
| --- | --- | --- | --- |
| baseline | Seeder A | No matar | B verifica y completa |
| single | Solo A | Matar A a 50% | B espera/falla por bloques faltantes |
| replica | A y C, replica completa | Matar A a 50% | B puede completar desde C |

El controlador arranca una DHT privada en loopback y procesos separados, captura logs por rol, mata únicamente el seeder hijo con SIGKILL y guarda `scenario_result`. La prueba es de disponibilidad y replicación locales. No demuestra Internet, holepunch ni un compañero de clase. Si no faltaban bytes al kill, `validKill` será false. El proceso C tiene una copia de lectura que permite servir bloques, sin la clave privada del escritor.

## Registro manual con otro alumno

Sigue [README.md §4](README.md). Completa con hechos:

| Dato | Observación real |
| --- | --- |
| Identificador del compañero | Pendiente |
| Fecha UTC / red / topicId | Pendiente |
| Log de seeder A | Pendiente; enlazar JSONL |
| Log de downloader B | Pendiente; enlazar JSONL |
| Hora de kill y PID exacto | Pendiente |
| Último bloque y bytes de red al kill | Pendiente |
| ¿Quedó otro seeder completo? | Pendiente; nombrar evidencia de replica_ready |
| ¿Completó? ¿SHA-256 coincidió? | Pendiente |
| ¿Qué vio B? Desconexión, espera, cambio de peer | Pendiente |
| Endpoint visto por B / A | Pendiente; conservar dato de socket o null |

Cuando se dispone de dos peers solamente, un resultado sin completar puede ser el hallazgo esperado. Para completar tras la muerte de A debe haber copia suficiente en algún peer accesible o todo el contenido ya debe haber llegado. El sistema DHT descubre fuentes; no reconstruye bloques que nadie conserva.
