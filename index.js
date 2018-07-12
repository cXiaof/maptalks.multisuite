import { Point2D, Intersection } from 'kld-intersections'

const options = {
    needCollection: false,
    symbol: {
        lineColor: 'red',
        lineWidth: 4
    }
}

export class CDSP extends maptalks.Class {
    constructor(options) {
        super(options)
        this._updateSameType()
        this._updateHitSymbol()
    }

    combine(geometry) {
        if (geometry instanceof maptalks.Geometry) {
            const { type, _layer } = geometry
            this.geometry = geometry
            this.geometryType = type
            this.geometrySymbol = geometry.getSymbol()
            this.layer = _layer
            const map = _layer.map
            this._addTo(map)
            this._updateGeometries()
            this._registerMapEvents()
        }
        return this
    }

    setSymbol(symbol) {
        this._updateHitSymbol(symbol)
        return this
    }

    needCollection(need) {
        this._updateSameType(need)
        return this
    }

    remove() {
        if (this.layer) this.layer.show()
        if (this._suiteLayer) this._suiteLayer.remove()
        delete this._suiteLayer
    }

    _updateHitSymbol(symbol) {
        this._hitSymbol = symbol || this.options['symbol'] || options.symbol
    }

    _updateSameType(need) {
        need = need !== undefined ? need : this.options['needCollection']
        need = need !== undefined ? need : options.needCollection
        this._sameType = need
    }

    _addTo(map) {
        if (this._suiteLayer) this.remove()
        const style = this.layer.getStyle()
        this.layer.hide()
        this.geometries = this.layer.getGeometries()
        this._layerName = `${maptalks.INTERNAL_LAYER_PREFIX}_CDSP`
        this._suiteLayer = new maptalks.VectorLayer(this._layerName).addTo(map)
        if (style) this._suiteLayer.setStyle(style)
        this._map = map
        this._updateGeometries()
    }

    _updateGeometries(geometries = this.geometries) {
        if (this._suiteLayer) {
            this._suiteLayer.clear().hide()
            let _geos = []
            geometries.forEach((geo) => {
                const symbol = geo.getSymbol()
                const _geo = geo.copy()
                _geo.setSymbol(symbol).addTo(this._suiteLayer)
                _geos.push(_geo)
            })
            this._geosFrom = _geos
            this._suiteLayer.show()
        }
    }

    _registerMapEvents() {
        if (!this._mousemove) {
            const map = this._map
            this._mousemove = (e) => this._mousemoveEvents(e)
            map.on('mousemove', this._mousemove, this)
        }
    }

    _mousemoveEvents(e) {
        const geos = this._suiteLayer.identify(e.coordinate)
        if (geos.length > 0)
            geos.forEach((geo, index) => {
                if (index === 0) geo.updateSymbol(this._hitSymbol)
                else geo.setSymbol(this.geometrySymbol)
            })
        else this._geosFrom.forEach((geo) => geo.setSymbol(this.geometrySymbol))
    }
}

CDSP.mergeOptions(options)
