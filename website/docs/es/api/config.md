---
title: Config
sidebarPosition: 1
description: Configura la identidad de DUI — prefijo, títulos de servidor y comando de actualización.
---

import TerminalPreview from '../../../components/TerminalPreview'

## configure

```ts
configure(opts: Partial<DuiConfig>): void
```

Sobrescribe uno o más valores de configuración. Se fusiona con la configuración existente.

```ts
import { configure } from '@bdocs/dui'

configure({
  prefix: 'mytool',
})
```

Llama a esto una vez en el punto de entrada de tu CLI, antes que cualquier otra función de DUI. El prefijo `prefix` no debe estar vacío (cadena vacía o solo espacios en blanco), de lo contrario se lanzará un error.

## getConfig

```ts
getConfig(): Readonly<DuiConfig>
```

Devuelve una copia de solo lectura de la configuración actual.

```ts
import { getConfig } from '@bdocs/dui'
console.log(getConfig().prefix)
```

## resetConfig

```ts
resetConfig(): void
```

Restaura la configuración global a sus valores por defecto (`{ prefix: 'dui' }`).

```ts
import { resetConfig, getConfig } from '@bdocs/dui'

resetConfig()
console.log(getConfig().prefix) // 'dui'
```

## DuiConfig

<Field name="prefix" type="string" default="'dui'">Prefijo mostrado en cada línea de log, ej. `[mytool]`.</Field>
<Field name="theme" type="DuiTheme">Sobrescrituras de tema global. Ver [Theme](./theme).</Field>

<TerminalPreview command="node config.js">
{`\x1b[1m[mytool]\x1b[0m Starting build...`}
</TerminalPreview>
