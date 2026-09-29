---
title: Utilidades
sidebarPosition: 12
description: Utilidades de padding, centrado y ancho de terminal compatibles con ANSI.
---

import TerminalPreview from '../../../../components/TerminalPreview'

```ts
import { padCenter, padRight, fitWidth, terminalWidth, stripAnsi, visibleLength } from '@bdocs/dui'
```

### padCenter

```ts
padCenter(s: string, width: number): string
```

<Field name="s" type="string">El string a centrar.</Field>
<Field name="width" type="number">Ancho visible objetivo en columnas.</Field>

Centra un string a un ancho visible dado (consciente de ANSI).

```ts
padCenter('hola', 11) // "   hola    "
```

### padRight

```ts
padRight(s: string, width: number): string
```

<Field name="s" type="string">El string a padding a la derecha.</Field>
<Field name="width" type="number">Ancho visible objetivo en columnas.</Field>

Añade padding a la derecha de un string hasta un ancho visible dado.

```ts
padRight('hola', 8) // "hola    "
```

### fitWidth

```ts
fitWidth(s: string, width: number): string
```

<Field name="s" type="string">El string a padding.</Field>
<Field name="width" type="number">Ancho visible objetivo en columnas.</Field>

Ajusta un string exactamente al ancho visible dado.

```ts
fitWidth('hi', 5) // "hi   "
```

### terminalWidth

```ts
terminalWidth(): number
```

Devuelve el ancho actual de la terminal en columnas. Vuelve a `80`.

```ts
terminalWidth() // 80 (o columnas reales de la terminal)
```

### stripAnsi

```ts
stripAnsi(s: string): string
```

<Field name="s" type="string">Un string con códigos de escape ANSI.</Field>

Elimina todas las secuencias de escape ANSI (SGR + OSC hyperlinks + códigos Fe).

```ts
stripAnsi('\x1b[31mrojo\x1b[0m') // "rojo"
stripAnsi('\x1b]8;;https://x.com\x07a\x1b]8;;\x07') // "a"
```

### visibleLength

```ts
visibleLength(s: string): number
```

<Field name="s" type="string">El string a medir.</Field>

Devuelve la longitud del string excluyendo códigos ANSI.

```ts
visibleLength('\x1b[31mrojo\x1b[0m') // 4
```

### wrapAnsiWord

```ts
wrapAnsiWord(text: string, maxWidth: number): string[]
```

<Field name="text" type="string">Texto a envolver, puede contener códigos ANSI.</Field>
<Field name="maxWidth" type="number">Ancho visible máximo por línea.</Field>

Word-wrapping consciente de ANSI. Preserva color/estilos a través de saltos de línea.

```ts
wrapAnsiWord('hola mundo', 5) // ['hola', 'mundo']
```

<TerminalPreview command="node utils.js">
{`   hello
hello
hi
80
red
3`}
</TerminalPreview>

### splitGraphemes

```ts
splitGraphemes(text: string): string[]
```

Divide el texto en **caracteres percibidos por el usuario** (clústeres de
grafemas). A diferencia de `Array.from`, que divide por codepoint de
Unicode, mantiene las secuencias ZWJ (`👨‍👩‍👧`), las marcas combinantes
(`é`) y las banderas como una sola unidad — así los loops basados en
ancho nunca parten un carácter a la mitad:

```ts
splitGraphemes('👨‍👩‍👧')   // ['👨‍👩‍👧']   (Array.from da 5)
splitGraphemes('áb')    // ['á', 'b']
```

Respaldado por `Intl.Segmenter` con fallback de codepoints en Node viejo.

### truncateByCells

```ts
truncateByCells(text: string, maxCells: number): string
```

Truncado consciente de celdas que reserva una celda para la elipsis `…`
y nunca parte un grafema (CJK, emoji ZWJ y marcas combinantes quedan
enteros):

```ts
truncateByCells('中文标题标题', 6) // '中文标题…'
truncateByCells('👨‍👩‍👧 tail', 3)   // '👨‍👩‍👧…'
```

Devuelve la entrada tal cual cuando ya cabe en `maxCells`.
