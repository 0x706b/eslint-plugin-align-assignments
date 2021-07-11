# automatically aligns assignments (`align-assignments`)

The `--fix` option on the command line can automatically fix some of the problems reported by this rule.

## Rule Details

This rule enforces a consistent alignment of assignment operators.

## Options

- `maxRows`, which defines how many rows a multi-line assignment can stretch before a new alignment group is create (default: `1`)
- `maxColumns`, which defines how many columns an assignment operator may be shifted (default: `20`)

## Usage

examples of **incorrect** code for this rule with the default options:

```javascript
/* eslint @0x706b/align-assignments/align-assignments: "error" */
const x = 0
const aLongerName = 1
```

examples of **correct** code for this rule with the default options:

```javascript
/* eslint @0x706b/align-assignments/align-assignments: "error" */
const x           = 0
const aLongerName = 1

const y = 0
const anExtremelyLongVariableName = 1

const z = {
  a: 'multiline',
  b: 'assignment expression'
}
const theLineAfter = 'correct'
```

examples of **incorrect** code for this rule with the `maxRows` option:

```javascript
/* eslint @0x706b/align-assignments/align-assignments: ["error", { "maxRows": 4 }] */
const z = {
  a: 'multiline',
  b: 'assignment expression'
}
const theLineAfter = 'now incorrect'
```

examples of **correct** code for this rule with the `maxRows` option:

```javascript
/* eslint @0x706b/align-assignments/align-assignments: ["error", { "maxRows": 4 }] */
const z            = {
  a: 'multiline',
  b: 'assignment expression'
}
const theLineAfter = 'now correct'
```

examples of **incorrect** code for this rule with the `maxColumns` option:

```javascript
/* eslint @0x706b/align-assignments/align-assignments: ["error", { "maxColumns": 30 }] */
const y = 0
const anExtremelyLongVariableName = 1
```

examples of **correct** code for this rule with the `maxRows` option:

```javascript
/* eslint @0x706b/align-assignments/align-assignments: ["error", { "maxColumns": 30 }] */
const y                           = 0
const anExtremelyLongVariableName = 1
```