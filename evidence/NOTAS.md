# Evidencia y diagnóstico

Los JSONL de esta carpeta contienen solamente eventos registrados por los scripts o un fallo de preparación observado. No se incluyen ejemplos de connection inventados.

- `scope: preparation`: instalación/check del entorno. No es una prueba de red Hyperswarm.
- `scope: local-automated`: procesos locales en una DHT privada. No son dos alumnos.
- `scope: class`: ejecución que el usuario marcó como prueba de clase. Requiere revisar el origen; la etiqueta por sí sola no lo demuestra.
- `scope: manual`: otras ejecuciones. No se cuentan automáticamente como kickoff.

Para diagnosticar no peers, registra: fecha, duración, Node/npm, topic exacto en ambos lados, que ambos procesos estuvieron online simultáneamente, tipo de red (sin contraseñas), captive portal y mensajes de error. Si no puedes confirmar la causa, escribe “causa no determinada”. Conserva el timeout. Probar un hotspot requiere autorización del instructor.

## Compañero

Copia el archivo real recibido a `evidence/companion/` y ejecuta `npm.cmd run report`. No cambies timestamps, payloads o keys para forzar coincidencias. Si redacciones una IP para el carnet, conserva una copia original privada y explica la redacción. No incluyas directorios de storage/keys privadas.

## Observaciones de aula

Pendientes: compañero, red, ejecución simultánea, topic confirmado, endpoint remoto, logs de ambos lados, hora del kill y resultado. El HTML mostrará únicamente los archivos existentes.
