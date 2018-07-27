import { Point2D, Intersection } from 'kld-intersections'
import isEqual from 'lodash/isEqual'
import flattenDeep from 'lodash/flattenDeep'

const options = {}

export class CDSP extends maptalks.Class {
    constructor(options) {
        super(options)
        this._layerName = `${maptalks.INTERNAL_LAYER_PREFIX}_CDSP`
        this._layerTMP = `${maptalks.INTERNAL_LAYER_PREFIX}_CDSP_TMP`
        this._chooseGeos = []
        this._colorHit = '#ffa400'
        this._colorChoose = '#00bcd4'
    }

    combine(geometry) {
        if (geometry instanceof maptalks.Geometry) {
            this._initialChooseGeos(geometry, 'combine')
            return this
        }
    }

    decompose(geometry) {
        if (geometry instanceof maptalks.GeometryCollection) {
            this._initialChooseGeos(geometry, 'decompose')
            return this
        }
    }

    peel(geometry, targets) {
        if (geometry instanceof maptalks.Polygon) {
            this._insureSafeTask()
            this._task = 'peel'
            this._savePrivateGeometry(geometry)
            if (targets instanceof maptalks.Polygon) targets = [targets]
            if (targets.length > 0) this._peelWithTarget(targets)
            return this
        }
    }

    split(geometry, target) {
        if (geometry instanceof maptalks.Polygon || geometry instanceof maptalks.LineString) {
            this._insureSafeTask()
            this._task = 'split'
            this._savePrivateGeometry(geometry)
            if (target instanceof maptalks.LineString) this._splitWithTarget(target)
            else this._splitWithOutTarget()
            return this
        }
    }

    submit(callback = () => false) {
        switch (this._task) {
            case 'combine':
                this._submitCombine(callback)
                break
            case 'decompose':
                this._submitDecompose(callback)
                break
            case 'peel':
                this._submitPeel(callback)
                break
            default:
                break
        }
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
        delete this._task
        delete this._tmpLayer
        delete this._chooseLayer
        delete this._mousemove
        delete this._click
        delete this._dblclick
    }

    _initialChooseGeos(geometry, task) {
        this._insureSafeTask()

        this._task = task
        this._savePrivateGeometry(geometry)

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
        switch (this._task) {
            case 'combine':
                geos = this.layer.identify(e.coordinate)
                break
            case 'decompose':
                geos = this._tmpLayer.identify(e.coordinate)
                break
            case 'peel':
                const coordThis = this.geometry.getCoordinates()
                this.layer.identify(e.coordinate).forEach((geo) => {
                    const coord = geo.getCoordinates()
                    if (!isEqual(coord, coordThis)) geos.push(geo)
                })
                break
            default:
                break
        }
        this._updateHitGeo(geos)
    }

    _updateHitGeo(geos) {
        const id = '_hit'
        if (this._needRefreshSymbol) {
            const hitGeoCopy = this._chooseLayer.getGeometryById(id)
            if (hitGeoCopy) {
                hitGeoCopy.remove()
                delete this.hitGeo
            }
            this._needRefreshSymbol = false
        }
        if (geos && geos.length > 0 && !this._needRefreshSymbol) {
            this._needRefreshSymbol = true
            this.hitGeo = geos[0]
            if (this._checkIsSameType(this.hitGeo)) {
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
            case 'peel':
                this._clickPeel()
                break
            default:
                break
        }
    }

    _clickCombine() {
        if (this.hitGeo) {
            const coordHit = this.hitGeo.getCoordinates()
            const coordThis = this.geometry.getCoordinates()
            if (isEqual(coordHit, coordThis)) return null
            this._setChooseGeosExceptHit(coordHit)
            this._updateChooseGeos()
        }
    }

    _setChooseGeosExceptHit(coordHit, hasTmp) {
        let chooseNext = []
        this._chooseGeos.forEach((geo) => {
            const coord = geo.getCoordinates()
            if (!isEqual(coordHit, coord)) chooseNext.push(geo)
        })
        if (!hasTmp || chooseNext.length === this._chooseGeos.length)
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
            const coordHit = geo.getCoordinates()
            this._setChooseGeosExceptHit(coordHit, true)
            geo.remove()
        } else if (this.hitGeo) this._chooseGeos.push(this.hitGeo)
        this._updateChooseGeos()
    }

    _submitCombine(callback) {
        let deals = []
        this._chooseGeos.forEach((geo) => deals.push(geo.copy()))

        let geosCoords = this._getGeoStringifyCoords(this._chooseGeos)

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
        const result = this._compositResultGeo(geos)
        callback(result, deals)
    }

    _getGeoStringifyCoords(geo) {
        if (geo instanceof Array) {
            let arr = []
            geo.forEach((item) => arr.push(JSON.stringify(item.getCoordinates())))
            return arr
        }
        return JSON.stringify(geo.getCoordinates())
    }

    _compositResultGeo(geos) {
        const { length } = geos
        if (!length || length === 0) return null
        let combine
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
        combine.setSymbol(this.geometry.getSymbol())
        combine.setProperties(this.geometry.getProperties())
        combine.addTo(this.layer)
        return combine
    }

    _submitDecompose(callback) {
        let geosCoords = []
        this._chooseLayer.getGeometries().forEach((geo) => {
            if (geo.getId() !== '_hit') geosCoords.push(this._getGeoStringifyCoords(geo))
        })

        let geos = []
        let deals = []
        this._tmpLayer.getGeometries().forEach((geo) => {
            const coord = this._getGeoStringifyCoords(geo)
            if (geosCoords.includes(coord)) geos.push(geo.copy())
            else {
                geo = geo.copy().addTo(this.layer)
                deals.push(geo)
            }
        })
        this.geometry.remove()
        const result = this._compositResultGeo(geos)
        callback(result, deals)
    }

    _peelWithTarget(targets) {
        const geometry = this.geometry
        let arr = [geometry.getCoordinates()[0]]
        let deals = []
        targets.forEach((geo) => {
            if (geo instanceof maptalks.MultiPolygon)
                geo._geometries.forEach((item) => arr.push(item.getCoordinates()[0]))
            else arr.push(geo.getCoordinates()[0])
            deals.push(geo.copy())
            geo.remove()
        })
        const result = new maptalks.MultiPolygon([arr], {
            symbol: geometry.getSymbol(),
            properties: geometry.getProperties()
        }).addTo(geometry._layer)
        geometry.remove()
        this.remove()
        return [result, deals]
    }

    _clickPeel() {
        if (this.hitGeo) {
            const coordHit = this.hitGeo.getCoordinates()
            this._setChooseGeosExceptHit(coordHit)
            this._updateChooseGeos()
        }
    }

    _submitPeel(callback) {
        const [result, deals] = this._peelWithTarget(this._chooseGeos)
        callback(result, deals)
    }

    _splitWithTarget(target) {
        const geometry = this.geometry
        if (geometry instanceof maptalks.Polygon) {
            let result
            if (target.getCoordinates().length === 2) result = this._splitWithTargetCommon(target)
            else result = this._splitWithTargetMore(target)
            const deals = this.geometry.copy()
            this.geometry.remove()
            target.remove()
            this.remove()
        }
    }

    _splitWithTargetCommon(target) {
        const coords0 = this.geometry.getCoordinates()[0]
        const polyline = this._getPoint2dFromCoords(target)
        let forward = true
        let main = []
        let child = []
        let children = []
        for (let i = 0; i < coords0.length - 1; i++) {
            const line = new maptalks.LineString([coords0[i], coords0[i + 1]])
            const polylineTmp = this._getPoint2dFromCoords(line)
            const { points } = Intersection.intersectPolylinePolyline(polyline, polylineTmp)
            const [ects] = this._getCoordsFromPoints(points)
            if (isEqual(coords0[i], ects) || points.length > 0) {
                if (forward) {
                    main.push(coords0[i], ects)
                    child.push(ects)
                } else {
                    main.push(ects)
                    child.push(coords0[i], ects)
                    children.push(child)
                    child = []
                }
                forward = !forward
            } else {
                if (forward) main.push(coords0[i])
                else child.push(coords0[i])
            }
        }
        let result = []
        const symbol = this.geometry.getSymbol()
        const properties = this.geometry.getProperties()
        let geo = new maptalks.Polygon(main, { symbol, properties }).addTo(this.layer)
        result.push(geo)
        children.forEach((childCoord) => {
            geo = new maptalks.Polygon(childCoord, { symbol, properties }).addTo(this.layer)
            result.push(geo)
        })
        return result
    }

    _getPoint2dFromCoords(geo) {
        const map = this._map
        const zoom = map.getZoom()
        const coords = geo.getCoordinates()
        let points = []
        flattenDeep(coords).forEach((coord) => points.push(map.coordinateToPoint(coord, zoom)))
        return points
    }

    _getCoordsFromPoints(points) {
        if (!(points instanceof Array)) points = [points]
        const map = this._map
        const zoom = map.getZoom()
        let coords = []
        points.forEach((point2d) => coords.push(map.pointToCoordinate(point2d, zoom)))
        return coords
    }

    _splitWithTargetMore(target) {
        const polygon = this._getPoint2dFromCoords(this.geometry)
        const polyline = this._getPoint2dFromCoords(target)
        const { points } = Intersection.intersectPolygonPolyline(polygon, polyline)
        let result
        if (points.length === 2) result = this._splitWithTargetMoreTwo(target, points)
        // else result = this._splitWithTargetMore(target)
        return result
    }

    _splitWithTargetMoreTwo(target, pointsPolygon) {
        const coords0 = this.geometry.getCoordinates()[0]
        const polyline = this._getPoint2dFromCoords(target)
        let forward = true
        let main = []
        let child = []
        let gap = []
        for (let i = 0; i < coords0.length - 1; i++) {
            const line = new maptalks.LineString([coords0[i], coords0[i + 1]])
            const polylineTmp = this._getPoint2dFromCoords(line)
            const { points } = Intersection.intersectPolylinePolyline(polyline, polylineTmp)
            const ects = this._getCoordsFromPoints(points)
            const [ect] = ects
            if (isEqual(coords0[i], ect) || points.length > 0) {
                if (forward) main.push(coords0[i], ect)
                else main.push(ect)
                if (gap.length === 0) {
                    gap = this._getTargetGap(target)
                    if (gap.length > 0) {
                        main.push(...gap)
                        child.push(...gap.reverse())
                    }
                }
                if (forward) child.push(ect)
                else child.push(coords0[i], ect)
                if (ects.length > 1) {
                    main.push(ects[1])
                    child.push(ects[1])
                } else forward = !forward
            } else {
                if (forward) main.push(coords0[i])
                else child.push(coords0[i])
            }
        }
        let result = []
        const symbol = this.geometry.getSymbol()
        const properties = this.geometry.getProperties()
        let geo = new maptalks.Polygon(main, { symbol, properties }).addTo(this.layer)
        result.push(geo)
        geo = new maptalks.Polygon(child, { symbol, properties }).addTo(this.layer)
        result.push(geo)
        return result
    }

    _getTargetGap(target) {
        const coords = target.getCoordinates()
        const polygon = this._getPoint2dFromCoords(this.geometry)
        let record = false
        let index = []
        let indexStart
        this._tmpLayer.hide()
        for (let i = 0; i < coords.length - 1; i++) {
            if (record) index.push(i)
            const line = new maptalks.LineString([coords[i], coords[i + 1]])
            const polyline = this._getPoint2dFromCoords(line)
            const { points } = Intersection.intersectPolygonPolyline(polygon, polyline)
            if (points.length > 0) {
                if (!indexStart) indexStart = i + 1
                record = !record
            }
        }
        this._tmpLayer.clear().show()
        if (index[0] !== indexStart) index.reverse()
        let gap = []
        index.forEach((i) => gap.push(coords[i]))
        return gap
    }
}

CDSP.mergeOptions(options)
