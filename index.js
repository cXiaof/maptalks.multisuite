import isEqual from 'lodash/isEqual'
import unionWith from 'lodash/unionWith'
import flattenDeep from 'lodash/flattenDeep'

const options = {}

export class MultiSuite extends maptalks.Class {
    constructor(options) {
        super(options)
        this._layerName = `${maptalks.INTERNAL_LAYER_PREFIX}_CDSP`
        this._layerTMP = `${maptalks.INTERNAL_LAYER_PREFIX}_CDSP_TMP`
        this._chooseGeos = []
        this._colorHit = '#ffa400'
        this._colorChoose = '#00bcd4'
    }

    combine(geometry, targets) {
        if (geometry instanceof maptalks.Geometry) {
            this._initialTaskWithGeo(geometry, 'combine')
            if (targets instanceof maptalks.Geometry) targets = [targets]
            if (targets instanceof Array && targets.length > 0) this._compositWithTargets(targets)
            else this._initialChooseGeos(geometry)
            return this
        }
    }

    decompose(geometry, targets) {
        if (geometry instanceof maptalks.GeometryCollection) {
            this._initialTaskWithGeo(geometry, 'decompose')
            if (targets instanceof maptalks.Geometry) targets = [targets]
            if (targets instanceof Array && targets.length > 0) this._decomposeWithTargets(targets)
            else this._initialChooseGeos(geometry)
            return this
        }
    }

    peel(geometry, targets) {
        if (geometry instanceof maptalks.Polygon) {
            this._initialTaskWithGeo(geometry, 'peel')
            if (targets instanceof maptalks.Polygon) targets = [targets]
            if (targets instanceof Array && targets.length > 0) {
                this._peelWithTargets(targets)
                this.remove()
            }
            return this
        }
    }

    fill(geometry, targets, fillAll) {
        if (geometry instanceof maptalks.MultiPolygon) {
            this._initialTaskWithGeo(geometry, 'fill')
            if (fillAll) {
                this._fillAll()
                this.remove()
            } else {
                if (targets instanceof maptalks.Polygon) targets = [targets]
                if (targets instanceof Array && targets.length > 0) {
                    this._fillWithTargets(targets)
                    this.remove()
                } else {
                    const coords0 = this.geometry.getCoordinates()[0]
                    const symbol = this.geometry.getSymbol()
                    symbol.polygonOpacity = 0
                    coords0.forEach((coord, index) => {
                        if (index > 0)
                            new maptalks.Polygon([coords0[index]], { symbol }).addTo(this._tmpLayer)
                    })
                }
            }
            return this
        }
    }

    submit(callback = () => false) {
        switch (this._task) {
            case 'combine':
                this._submitCombine()
                break
            case 'decompose':
                this._submitDecompose()
                break
            case 'peel':
                this._submitPeel()
                break
            case 'fill':
                this._submitFill()
                break
            default:
                break
        }
        callback(this._result, this._deals, this._task)
        this.remove()
    }

    cancel() {
        this.remove()
    }

    remove() {
        const map = this._map
        if (this._tmpLayer) this._tmpLayer.remove()
        if (this._chooseLayer) this._chooseLayer.remove()
        this._chooseGeos = []
        this._offMapEvents()
        delete this._result
        delete this._deals
        delete this._task
        delete this._tmpLayer
        delete this._chooseLayer
        delete this._mousemove
        delete this._click
        delete this._dblclick
    }

    _initialTaskWithGeo(geometry, task) {
        this._insureSafeTask()
        this._task = task
        this._savePrivateGeometry(geometry)
    }

    _initialChooseGeos(geometry) {
        switch (this._task) {
            case 'combine':
                this._chooseGeos = [geometry]
                break
            case 'decompose':
                geometry._geometries.forEach((geo) => geo.copy().addTo(this._tmpLayer))
                this._chooseGeos = this._tmpLayer.getGeometries()
                break
            default:
                break
        }
        this._updateChooseGeos()
    }

    _insureSafeTask() {
        if (map._map_tool && drawTool instanceof maptalks.DrawTool) drawTool.disable()
        if (this.geometry) this.remove()
    }

    _savePrivateGeometry(geometry) {
        this.geometry = geometry
        this.layer = geometry._layer
        if (geometry.type.startsWith('Multi')) this.layer = geometry._geometries[0]._layer
        this._addTo(this.layer.map)
    }

    _addTo(map) {
        if (this._chooseLayer) this.remove()
        this._map = map
        this._tmpLayer = new maptalks.VectorLayer(this._layerTMP).addTo(map).bringToFront()
        this._chooseLayer = new maptalks.VectorLayer(this._layerName).addTo(map).bringToFront()
        this._registerMapEvents()
        return this
    }

    _registerMapEvents() {
        if (!this._mousemove) {
            const map = this._map
            this._mousemove = (e) => this._mousemoveEvents(e)
            this._click = (e) => this._clickEvents(e)
            map.on('mousemove', this._mousemove, this)
            map.on('click', this._click, this)
        }
    }

    _offMapEvents() {
        if (this._mousemove) {
            const map = this._map
            map.off('mousemove', this._mousemove, this)
            map.off('click', this._click, this)
        }
    }

    _mousemoveEvents(e) {
        let geos = []
        let notNeedSame = false
        switch (this._task) {
            case 'combine':
                geos = this.layer.identify(e.coordinate)
                break
            case 'decompose':
                geos = this._tmpLayer.identify(e.coordinate)
                break
            case 'peel':
                const coordPeel = this._getSafeCoords()
                this.layer.identify(e.coordinate).forEach((geo) => {
                    const coord = this._getSafeCoords(geo)
                    if (!isEqual(coord, coordPeel)) geos.push(geo)
                })
                break
            case 'fill':
                geos = this._tmpLayer.identify(e.coordinate)
                break
            default:
                break
        }
        this._updateHitGeo(geos, notNeedSame)
    }

    _getSafeCoords(geo = this.geometry) {
        let coords = geo.getCoordinates()
        if (geo.options.numberOfShellPoints) {
            const { options } = geo
            const { numberOfShellPoints } = options
            options.numberOfShellPoints = 300
            geo.setOptions(options)
            coords = [geo.getShell()]
            options.numberOfShellPoints = numberOfShellPoints || 60
            geo.setOptions(options)
        }
        return coords
    }

    _updateHitGeo(geos, notNeedSame) {
        const id = '_hit'
        if (this._needRefreshSymbol) {
            const hitGeoCopy = this._chooseLayer.getGeometryById(id)
            if (hitGeoCopy) {
                hitGeoCopy.remove()
                delete this.hitGeo
            }
            this._needRefreshSymbol = false
        }
        if (geos && geos.length > 0) {
            this._needRefreshSymbol = true
            this.hitGeo = geos[0]
            if (this._checkIsSameType(this.hitGeo) || notNeedSame) {
                const hitSymbol = this._getSymbolOrDefault(this.hitGeo, 'Hit')
                this._copyGeoUpdateSymbol(this.hitGeo, hitSymbol).setId(id)
            } else delete this.hitGeo
        }
    }

    _checkIsSameType(geo) {
        const typeHit = geo.type
        const typeThis = this.geometry.type
        return typeHit.includes(typeThis) || typeThis.includes(typeHit)
    }

    _getSymbolOrDefault(geo, type) {
        let symbol = geo.getSymbol()
        const color = this[`_color${type}`]
        const lineWidth = 4
        if (symbol) {
            for (let key in symbol) {
                if (key.endsWith('Fill') || key.endsWith('Color')) symbol[key] = color
            }
            symbol.lineWidth = lineWidth
        } else {
            if (geo.type.endsWith('Point'))
                symbol = {
                    markerFill: color,
                    markerType: 'path',
                    markerPath: [
                        {
                            path:
                                'M8 23l0 0 0 0 0 0 0 0 0 0c-4,-5 -8,-10 -8,-14 0,-5 4,-9 8,-9l0 0 0 0c4,0 8,4 8,9 0,4 -4,9 -8,14z M3,9 a5,5 0,1,0,0,-0.9Z',
                            fill: '#DE3333'
                        }
                    ],
                    markerPathWidth: 16,
                    markerPathHeight: 23,
                    markerWidth: 24,
                    markerHeight: 34
                }
            else symbol = { lineColor: color, lineWidth }
        }
        return symbol
    }

    _copyGeoUpdateSymbol(geo, symbol) {
        return geo
            .copy()
            .updateSymbol(symbol)
            .addTo(this._chooseLayer)
    }

    _clickEvents(e) {
        switch (this._task) {
            case 'combine':
                this._clickCombine()
                break
            case 'decompose':
                this._clickDecompose(e)
                break
            default:
                if (this.hitGeo) {
                    const coordHit = this._getSafeCoords(this.hitGeo)
                    this._setChooseGeosExceptHit(coordHit)
                    this._updateChooseGeos()
                }
                break
        }
    }

    _clickCombine() {
        if (this.hitGeo) {
            const coordHit = this._getSafeCoords(this.hitGeo)
            const coordThis = this._getSafeCoords()
            if (isEqual(coordHit, coordThis)) return null
            this._setChooseGeosExceptHit(coordHit)
            this._updateChooseGeos()
        }
    }

    _setChooseGeosExceptHit(coordHit, hasTmp) {
        let chooseNext = []
        this._chooseGeos.forEach((geo) => {
            const coord = this._getSafeCoords(geo)
            if (!isEqual(coordHit, coord)) chooseNext.push(geo)
        })
        if (!hasTmp && chooseNext.length === this._chooseGeos.length)
            this._chooseGeos.push(this.hitGeo)
        else this._chooseGeos = chooseNext
    }

    _updateChooseGeos() {
        const layer = this._chooseLayer
        layer.clear()
        this._chooseGeos.forEach((geo) => {
            const chooseSymbol = this._getSymbolOrDefault(geo, 'Choose')
            this._copyGeoUpdateSymbol(geo, chooseSymbol)
        })
    }

    _clickDecompose(e) {
        let geos = []
        this._chooseLayer.identify(e.coordinate).forEach((geo) => {
            if (geo.getId() !== '_hit') geos.push(geo)
        })
        if (geos.length > 0) {
            const geo = geos[0]
            const coordHit = this._getSafeCoords(geo)
            this._setChooseGeosExceptHit(coordHit, true)
            geo.remove()
        } else if (this.hitGeo) this._chooseGeos.push(this.hitGeo)
        this._updateChooseGeos()
    }

    _submitCombine() {
        this._compositWithTargets()
    }

    _compositWithTargets(targets = this._chooseGeos) {
        this._deals = []
        targets.forEach((geo) => this._deals.push(geo.copy()))

        let geosCoords = this._getGeoStringifyCoords(targets)

        let geos = []
        this.layer.getGeometries().forEach((geo) => {
            const coord = this._getGeoStringifyCoords(geo)
            if (geosCoords.includes(coord)) {
                if (geo.type.startsWith('Multi'))
                    geo._geometries.forEach((item) => geos.push(item.copy()))
                else geos.push(geo.copy())
                geo.remove()
            }
        })
        this._compositResultGeo(geos)
    }

    _getGeoStringifyCoords(geo) {
        if (geo instanceof Array) {
            let arr = []
            geo.forEach((item) => arr.push(JSON.stringify(this._getSafeCoords(item))))
            return arr
        }
        return JSON.stringify(this._getSafeCoords(geo))
    }

    _compositResultGeo(geos) {
        const { length } = geos
        if (!length || length === 0) return null
        let combine
        if (length > 1)
            switch (geos[0].type) {
                case 'Point':
                    combine = new maptalks.MultiPoint(geos)
                    break
                case 'LineString':
                    combine = new maptalks.MultiLineString(geos)
                    break
                default:
                    combine = new maptalks.MultiPolygon(geos)
                    break
            }
        else combine = geos[0].copy()
        combine.setSymbol(this.geometry.getSymbol())
        combine.setProperties(this.geometry.getProperties())
        combine.addTo(this.layer)
        this._result = combine
    }

    _submitDecompose() {
        this._decomposeWithTargets()
    }

    _decomposeWithTargets(targets = this._chooseLayer.getGeometries()) {
        let geosCoords = []
        targets.forEach((geo) => {
            if (geo.getId() !== '_hit') geosCoords.push(this._getGeoStringifyCoords(geo))
        })

        let geos = []
        this._deals = []
        this._tmpLayer.getGeometries().forEach((geo) => {
            const coord = this._getGeoStringifyCoords(geo)
            if (geosCoords.includes(coord)) geos.push(geo.copy())
            else {
                geo = geo.copy().addTo(this.layer)
                this._deals.push(geo)
            }
        })
        this.geometry.remove()
        this._compositResultGeo(geos)
    }

    _peelWithTargets(targets = this._chooseGeos) {
        const geometry = this.geometry
        let arr = [this._getSafeCoords(geometry)[0]]
        this._deals = []
        targets.forEach((geo) => {
            if (geo instanceof maptalks.MultiPolygon)
                geo._geometries.forEach((item) => arr.push(this._getSafeCoords(item)[0]))
            else arr.push(this._getSafeCoords(geo)[0])
            this._deals.push(geo.copy())
            geo.remove()
        })
        this._result = new maptalks.MultiPolygon([arr], {
            symbol: geometry.getSymbol(),
            properties: geometry.getProperties()
        }).addTo(geometry._layer)
        geometry.remove()
    }

    _submitPeel() {
        this._peelWithTargets()
    }

    _submitFill() {
        this._fillWithTargets()
    }

    _fillAll() {
        const coords = this.geometry.getCoordinates()
        const symbol = this.geometry.getSymbol()
        const properties = this.geometry.getProperties()
        new maptalks.Polygon([coords[0][0]], { symbol, properties }).addTo(this.layer)
        this.geometry.remove()
    }

    _fillWithTargets(targets = this._chooseGeos) {
        const symbol = this.geometry.getSymbol()
        const properties = this.geometry.getProperties()

        let coordsStr = []
        this._deals = []
        targets.forEach((target) => {
            const coordsTarget = JSON.stringify(target.getCoordinates()[0])
            coordsStr.push(coordsTarget)
            this._deals.push(target.setSymbol(symbol).copy())
        })

        let coords = []
        this.geometry.getCoordinates()[0].forEach((coord) => {
            if (!coordsStr.includes(JSON.stringify(coord))) coords.push(coord)
        })
        this._result = new maptalks.MultiPolygon([coords], { symbol, properties }).addTo(this.layer)
        this.geometry.remove()
    }
}

MultiSuite.mergeOptions(options)
