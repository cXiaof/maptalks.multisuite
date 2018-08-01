# maptalks.cdsp

An Edit Suite with Combine<->Decompose,Peel<->Fill,Split.

## Examples

### [DEMO](https://cxiaof.github.io/maptalks.cdsp/demo/index.html)

## Install

-   Install with npm: `npm install maptalks.cdsp`.
-   Download from [dist directory](https://github.com/cXiaof/maptalks.cdsp/tree/master/dist).
-   Use unpkg CDN: `https://unpkg.com/maptalks.cdsp/dist/maptalks.cdsp.min.js`

## Usage

As a plugin, `maptalks.cdsp` must be loaded after `maptalks.js` in browsers. You can also use `'import { cdsp } from "maptalks.cdsp"` when developing with webpack.

```html
<script type="text/javascript" src="https://unpkg.com/maptalks/dist/maptalks.min.js"></script>
<script type="text/javascript" src="https://unpkg.com/maptalks.cdsp/dist/maptalks.cdsp.min.js"></script>
<script>

</script>
```

## API Reference

```javascript
new maptalks.CDSP(options)
```

-   options **Object** options

## Contributing

We welcome any kind of contributions including issue reportings, pull requests, documentation corrections, feature requests and any other helps.

## Develop

The only source file is `index.js`.

It is written in ES6, transpiled by [babel](https://babeljs.io/) and tested with [mocha](https://mochajs.org) and [expect.js](https://github.com/Automattic/expect.js).

### Scripts

-   Install dependencies

```shell
$ npm install
```

-   Watch source changes and generate runnable bundle repeatedly

```shell
$ gulp watch
```

-   Tests

```shell
$ npm test
```

-   Watch source changes and run tests repeatedly

```shell
$ gulp tdd
```

-   Package and generate minified bundles to dist directory

```shell
$ gulp minify
```

-   Lint

```shell
$ npm run lint
```
