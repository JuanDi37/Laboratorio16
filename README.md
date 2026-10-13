# LAB #16 · 20230285 · PactTrail

Proyecto Node.js del fallback permitido: Hyperswarm para discovery y mensajes; Hypercore para archivos. Abre [index.html](index.html) para el informe y sus evidencias. No requiere API keys. El HTML es un artefacto local; no se ha publicado un sitio ni enviado mensajes al chat del curso.

## 1. Preparación (Windows / PowerShell)

```powershell
npm.cmd install --cache .npm-cache --no-audit --no-fund
npm.cmd run check
npm.cmd run sample
npm.cmd test
```

Node >=22. Se usa npm.cmd porque PowerShell puede bloquear npm.ps1. En Linux/macOS usa npm. `.npm-cache` está dentro del proyecto para funcionar con permisos restringidos. Si el entorno bloquea el registro npm, instala desde una terminal con acceso permitido; no cambies la política de ejecución ni el firewall automáticamente. No se incluye package-lock.json hasta lograr una instalación válida: npm lo creará para fijar versiones; consérvalo en tu entrega y luego usa npm ci.

La configuración está en [lab.config.json](lab.config.json): carnet `20230285`, topic **propuesto** `cs031-s19-20261013`. El hash SHA-256 da los 32 bytes. Acuerda ese texto con el compañero: inventar un topic distinto al del aula impide encontrar a sus peers. No contiene el carnet. No es contraseña ni control de acceso.

## 2. Kickoff: dos laptops, mismo topic

Terminal tuya:

```powershell
npm.cmd run chat -- --scope class --timeout 60000
```

Terminal del compañero (el mismo proyecto):

```powershell
npm.cmd run chat -- --scope class --carnet CARNET_DEL_COMPANERO --topic cs031-s19-20261013 --timeout 60000
```

Al conectar cada lado envía su ping, registra recepción y acusa recibo. Si quieres escribir más mensajes usa la terminal interactiva. `/quit` o Ctrl+C termina. El programa imprime las dos líneas solicitadas para que **tú** las pegues en el chat del lab. No las envía automáticamente.

Los archivos `evidence/*.jsonl` registran timestamp UTC, runId, scope, public key truncada, payload y dirección remota observable del socket. `remote.host: null` significa que la API no expuso una dirección; no se inventa una IP. Un endpoint de loopback no prueba una IP pública, holepunch ni relay. El carnet del mensaje identifica al remitente declarado; la key autentica el transporte, no la identidad civil.

Pide al compañero **su log real** y cópialo a `evidence/companion/`. Ambos logs deben contener el mismo topicId y mensajes coincidentes por messageId. Si hay timeout, conserva el log y agrega en [evidence/NOTAS.md](evidence/NOTAS.md) red, versión, coordinación y pruebas autorizadas. No concluyas “UDP bloqueado” solamente porque no hubo peers. Hotspot solo si lo autoriza el instructor.

## 3. Archivo propio de 768 KiB

`npm.cmd run sample` crea `samples/lab16.txt`: 786432 bytes (768 KiB), texto sintético original, sin PII ni contenido de terceros. El protocolo también rechaza archivos mayores que 1,000,000 bytes, límite conservador de 1 MB.

Laptop A, seeder:

```powershell
npm.cmd run seed -- --file samples/lab16.txt --scope class --timeout 300000
```

Copia el valor `CORE_KEY` mostrado en stderr o el campo `key` de `.runtime/handoff.json`. Es la **clave pública del core**, distinta de la key del peer y del topic del kickoff. No compartas el directorio `.runtime`, que contiene almacenamiento y claves de escritura.

Laptop B, downloader (reemplaza PUBLIC_KEY):

```powershell
npm.cmd run download -- --key PUBLIC_KEY --scope class --delay 150 --block-timeout 15000 --timeout 120000
```

Usan el discoveryKey del Hypercore como topic separado para el archivo. El bloque 0 es el manifest firmado; los siguientes son fragmentos de 16 KiB. Hypercore valida su estructura autenticada y el downloader comprueba tamaño y SHA-256 del archivo reconstruido. `transfer_complete` y `verified: true` son la evidencia de integridad. El output se guarda en `downloads/`, sin sobrescribir archivos existentes.

La pausa está **entre solicitudes secuenciales**: deja tiempo para detener el seeder y evita solicitar todo el archivo de golpe. `block_downloaded` mide datos recibidos; `progress` mide datos consumidos. Si todo llegó antes del kill, terminar después no prueba que sobrevivió la red.

## 4. Kill-seeder manual entre compañeros

1. Empieza con un downloader nuevo (el programa crea storage único). Mantén solo el seeder A y el downloader B en ese discoveryKey.
2. En B espera a `progress` cerca de 50%. En A detén **ese** proceso Node a la fuerza. En Windows: `Stop-Process -Id PID_DEL_SEEDER -Force`; en Unix: `kill -9 PID_DEL_SEEDER`. Obtén el PID de la terminal que iniciaste; no mates todos los procesos Node.
3. Anota hora UTC del kill, PID, último bloque recibido y bytes pendientes. Guarda consola/log del seeder aunque no tenga cierre limpio. B debería registrar desconexión y timeout si nadie tiene los bloques faltantes; documenta lo que realmente ocurra.
4. Contrasta con una tercera laptop C: primero descarga todo con `--stay --delay 0`; espera `replica_ready`. Luego inicia B de cero y mata A a mitad. C permanece sirviendo el core aunque no tiene private key para escribir. Comprueba `transfer_complete` y qué IP/peer sirvió los bloques después del kill.
5. El número de conexiones no equivale al número de seeders completos. Un leecher solo ofrece bloques que tiene. Una DHT no aloja mágicamente tu archivo.

No se ha ejecutado una transferencia con un compañero desde este entorno. No presentes los resultados esperados como observados.

## 5. Experimento automático local (procesos reales)

```powershell
npm.cmd run experiment -- --scenario all
```

Arranca una DHT privada con bootstrap y nodo persistente en `127.0.0.1`, dos procesos de chat y tres escenarios: baseline sin kill, single sin otro seeder, replica con otro seeder completo. El controlador mata únicamente su proceso hijo al 50%, verifica que aún faltaban bytes de red y registra el resultado real. Scope `local-automated`: **no equivale al kickoff entre compañeros** ni prueba NAT/holepunch de Internet. Sin dependencias o UDP permitido esta prueba no se puede ejecutar.

Para ejecutar uno: `--scenario chat`, `baseline`, `single` o `replica`. Logs separados por suite en `evidence/local-*/`. La alternativa de otra laptop se documenta en §4; el controlador automático no administra procesos ajenos.

## 6. Informe y entrega

```powershell
npm.cmd run report
npm.cmd run serve
```

Abre `http://127.0.0.1:8080` o directamente `index.html`. El reporte es HTML estático, sin dependencias, y también funciona mediante doble clic. `serve` es un visor local del informe, no transporta los mensajes/archivos P2P. Solo expone documentos, fuentes y evidence; bloquea `.runtime`, node_modules y traversal. No publica IPs a Internet.

`report` escanea logs existentes, incluye previews y enlaces, calcula pares de mensajes coincidentes, marca local vs class y actualiza el bloque automático de P2P.md. Ejecuta otra vez después de recibir el log del compañero. `.runtime` y `downloads` no entran al reporte público. Los logs pueden revelar IPs y carnet: revisa con el compañero antes de publicar en el carnet; conserva originales privados si debes redactar una copia.

Entrega: enlace **LAB #16 → index.html / P2P.md**, logs de ambos lados y nota del kill. [P2P.md](P2P.md), [KILL-SEEDER.md](KILL-SEEDER.md), [VENTURE.md](VENTURE.md), [REFLEXIONES.md](REFLEXIONES.md), [evidence/NOTAS.md](evidence/NOTAS.md). El memo y el journal usan PactTrail; la postura y el tally requieren tu revisión y los votos reales de clase.

## Qué sí verifica este entorno

`npm.cmd test` comprueba límites del protocolo, hash, muestras, paths, consistencia del reporte con logs y respuesta HTTP del visor, incluyendo bloqueo de claves y rutas privadas. `npm.cmd run check` valida sintaxis y captura disponibilidad de dependencias. Ni estas pruebas ni un intento fallido de npm certifican un intercambio P2P real. La preparación fallida se documenta en `evidence/preparation.jsonl`.
