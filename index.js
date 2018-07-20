import { Point2D, Intersection } from 'kld-intersections'
import isEqual from 'lodash/isEqual'

const options = {
    enableCollection: false,
    symbol: {
        markerFill: '#00bcd4',
        lineColor: '#00bcd4',
        lineWidth: 4
    }
}

export class CDSP extends maptalks.Class {
    constructor(options) {
        super(options)
        this._updateSameType()
        this._updateUpdateSymbol()
        this._layerName = `${maptalks.INTERNAL_LAYER_PREFIX}_CDSP`
        this._chooseGeos = []
        this._hitSymbol = {
            markerFill: '#ffa400',
            lineColor: '#ffa400',
            lineWidth: 4
        }
    }

    combine(geometry) {
        this._mask = 'combine'
        if (geometry instanceof maptalks.Geometry) {
            if (this.geometry) this.remove()
            this._task = 'combine'
            this.geometry = geometry
            let layer
            if (geometry instanceof maptalks.MultiPolygon) layer = geometry._geometries[0]._layer
            else layer = geometry._layer
            this.layer = layer
            const map = layer.map
            this._addTo(map)
            this._chooseGeos = [geometry]
            this._updateChooseGeos()
        }
        return this
    }

    submit(callback = () => false) {
        switch (this._mask) {
            case 'combine':
                this._submitCombine(callback)
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
        const layer = map.getLayer(this._layerName)
        if (layer) layer.remove()
        map.config({ doubleClickZoom: this.doubleClickZoom })
        this._offMapEvents()
        this._chooseLayer.remove()
        delete this._task
        delete this._chooseLayer
        delete this.geometry
        delete this.doubleClickZoom
        delete this._chooseGeos
        delete this._mousemove
        delete this._click
        delete this._dblclick
    }

    enableCollection(need) {
        this._updateSameType(need)
        return this
    }

    setSymbol(symbol) {
        this._updateUpdateSymbol(symbol)
        return this
    }

    _updateSameType(need) {
        need = need !== undefined ? need : this.options['enableCollection']
        need = need !== undefined ? need : options.enableCollection
        this._enableCollection = need
    }

    _updateUpdateSymbol(symbol) {
        this._chooseSymbol = symbol || this.options['symbol'] || options.symbol
    }

    _addTo(map) {
        const layer = map.getLayer(this._layerName)
        if (layer) this.remove()
        this.doubleClickZoom = !!map.options.doubleClickZoom
        map.config({ doubleClickZoom: false })
        this._map = map
        this._chooseLayer = new maptalks.VectorLayer(this._layerName).addTo(map)
        this._chooseLayer.bringToFront()
        this._registerMapEvents()
        return this
    }

    _registerMapEvents() {
        if (!this._mousemove) {
            const map = this._map
            this._mousemove = (e) => this._mousemoveEvents(e)
            this._click = () => this._clickEvents()
            map.on('mousemove', this._mousemove, this)
            map.on('click', this._click, this)
        }
    }

    _offMapEvents() {
        const map = this._map
        map.off('mousemove', this._mousemove, this)
        map.off('click', this._click, this)
    }

    _mousemoveEvents(e) {
        const geos = this.layer.identify(e.coordinate)
        const _layer = this._chooseLayer
        const id = '_hit'
        if (this._needRefreshSymbol) {
            const hitGeoCopy = _layer.getGeometryById(id)
            if (hitGeoCopy) {
                hitGeoCopy.remove()
                delete this.hitGeo
            }
            this._needRefreshSymbol = false
        }
        if (geos.length > 0) {
            this._needRefreshSymbol = true
            this.hitGeo = geos[0]
            if (this._checkIsSameType(this.hitGeo)) {
                this.hitGeo
                    .copy()
                    .setId(id)
                    .updateSymbol(this._hitSymbol)
                    .addTo(_layer)
            } else this.hitGeo = undefined
        }
    }

    _checkIsSameType(geo) {
        if (!this._enableCollection) {
            const typeHit = geo.type
            const typeThis = this.geometry.type
            if (typeHit !== typeThis) {
                const polygonType = ['Polygon', 'MultiPolygon']
                if (!polygonType.includes(typeHit) || !polygonType.includes(typeThis)) return false
            }
        }
        return true
    }

    _clickEvents() {
        const drawing = map._map_tool && map._map_tool.isEnabled()
        if (!drawing && this.hitGeo) {
            const coordHit = this.hitGeo.getCoordinates()
            const coordThis = this.geometry.getCoordinates()
            if (isEqual(coordHit, coordThis)) return null
            let chooseNext = []
            this._chooseGeos.forEach((geo) => {
                const coord = geo.getCoordinates()
                if (!isEqual(coordHit, coord)) chooseNext.push(geo)
            })
            if (chooseNext.length === this._chooseGeos.length) this._chooseGeos.push(this.hitGeo)
            else this._chooseGeos = chooseNext
            this._updateChooseGeos()
        }
    }

    _updateChooseGeos() {
        const layer = this._chooseLayer
        layer.clear()
        this._chooseGeos.forEach((geo) => {
            if (geo.type === 'MultiPolygon') {
                let geos = []
                geo._geometries.forEach((item) => geos.push(item.copy()))
                new maptalks.MultiPolygon(geos, { symbol: this._chooseSymbol }).addTo(layer)
            } else
                geo.copy()
                    .updateSymbol(this._chooseSymbol)
                    .addTo(layer)
        })
    }

    _submitCombine(callback) {
        this._chooseGeos.forEach((geo) => geo.remove())
        let geos = []
        this._chooseLayer.getGeometries().forEach((geo) => {
            if (geo.getId() !== '_hit') {
                if (geo instanceof maptalks.MultiPolygon)
                    geo._geometries.forEach((item) => geos.push(item.copy()))
                else geos.push(geo.copy())
            }
        })
        let combine
        if (this._enableCollection) {
        } else combine = this._compositMultiGeo(geos)
        callback(combine)
    }

    _compositMultiGeo(geos) {
        const symbol = this.geometry.getSymbol()
        const properties = this.geometry.getProperties()
        const options = { symbol, properties }
        let combine
        switch (geos[0].type) {
            case 'Point':
                if (!symbol) {
                    let points = []
                    geos.forEach((geo) => {
                        const coord = geo.getCoordinates()
                        const prop = geo.getProperties()
                        geo = new maptalks.Marker(coord, { properties: prop })
                        points.push(geo)
                    })
                    geos = points
                }
                combine = new maptalks.MultiPoint(geos, options)
                break
            case 'LineString':
                combine = new maptalks.MultiLineString(geos, options)
                break
            default:
                break
                combine = new maptalks.MultiPolygon(geos, options)
                break
        }
        return combine
    }
}

CDSP.mergeOptions(options)
