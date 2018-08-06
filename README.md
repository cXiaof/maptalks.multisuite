# maptalks.multisuite

An Suite to Combine <-> Decompose, Peel <-> Fill MultiPolygon.

## Examples

### [DEMO](https://cxiaof.github.io/maptalks.multisuite/demo/index.html)

## Tips

Combine <-> Decompose with Circle also has bug of maptalks, see the [issue](https://github.com/maptalks/maptalks.js/issues/725)

## Install

-   Install with npm: `npm install maptalks.multisuite`.
-   Download from [dist directory](https://github.com/cXiaof/maptalks.multisuite/tree/master/dist).
-   Use unpkg CDN: `https://unpkg.com/maptalks.multisuite/dist/maptalks.multisuite.min.js`

## Usage

As a plugin, `maptalks.multisuite` must be loaded after `maptalks.js` in browsers. You can also use `'import { MultiSuite } from "maptalks.multisuite"` when developing with webpack.

```html
<script type="text/javascript" src="https://unpkg.com/maptalks/dist/maptalks.min.js"></script>
<script type="text/javascript" src="https://unpkg.com/maptalks.multisuite/dist/maptalks.multisuite.min.js"></script>
<script>
    // new MultiSuite and layer
    const ms = new maptalks.MultiSuite()
    const layer = new maptalks.VectorLayer('v').addTo(map)

    // use MultiSuite API, targets is not necessary parameters and if no targets user will choose geometry on the map
    // get details in API Reference
</script>
```

## API Reference

```javascript
new maptalks.MultiSuite()
```

-   options
    -   none

`combine(geometry, targets)`
`decompose(geometry, targets)`
`peel(geometry, targets)`
`fill(geometry, targets, fillAll)` if fillAll, the result is An Polygon, else is always MultiPolygon
`submit(callback)` callback can get two attr, the result and deals which be remove in task
`cancel()`
`remove()`

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

## More Things

-   [maptalks.autoadsorb](https://github.com/cXiaof/maptalks.autoadsorb/issues)
-   [maptalks.multisuite](https://github.com/cXiaof/maptalks.multisuite/issues)
-   [maptalks.geosplit](https://github.com/cXiaof/maptalks.geosplit/issues)
-   [maptalks.polygonbool](https://github.com/cXiaof/maptalks.polygonbool/issues)
