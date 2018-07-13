import { Point2D, Intersection } from 'kld-intersections'
import isEqual from 'lodash/isEqual'

const options = {
    needCollection: false,
    symbol: {
        lineColor: '#00bcd4',
        lineWidth: 4
    }
}

export class CDSP extends maptalks.Class {
    constructor(options) {
        super(options)
        this._updateSameType()
        this._updateUpdateSymbol()
        this._needRefreshSymbol = false
        this._hitSymbol = {
            lineColor: 'red',
            lineWidth: 4
        }
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
            this._setDblclickZoom()
            this._updateGeometries()
            this._registerMapEvents()
        }
        return this
    }

    setSymbol(symbol) {
        this._updateUpdateSymbol(symbol)
        return this
    }

    needCollection(need) {
        this._updateSameType(need)
        return this
    }

    remove() {
        this._offMapEvents()
        if (this.layer) {
            const geos = this._suiteLayer.getGeometries()
            this.layer.clear()
            geos.forEach((geo) =>
                geo
                    .copy()
                    .setSymbol(this.geometrySymbol)
                    .addTo(this.layer)
            )
            this.layer.show()
        }
        if (this._suiteLayer) this._suiteLayer.remove()
        if (this._doubleClickZoom !== undefined) {
            map.config({ doubleClickZoom: this._doubleClickZoom })
            delete this._doubleClickZoom
        }
        delete this._geosFrom
        delete this._chooseGeos
        delete this._suiteLayer
    }

    _updateUpdateSymbol(symbol) {
        this._chooseSymbol = symbol || this.options['symbol'] || options.symbol
    }

    _updateSameType(need) {
        need = need !== undefined ? need : this.options['needCollection']
        need = need !== undefined ? need : options.needCollection
        this._sameType = need
    }

    _setDblclickZoom() {
        const map = this._map
        if (map._map_tool instanceof maptalks.DrawTool) map._map_tool.disable()
        this._doubleClickZoom = map.options.doubleClickZoom
        map.config({ doubleClickZoom: false })
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
        this._chooseGeos = []
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
            this._click = () => this._clickEvents()
            map.on('click', this._click, this)
            this._dblclick = () => this._dblclickEvents()
            map.on('dblclick', this._dblclick, this)
        }
    }

    _offMapEvents() {
        const map = this._map
        map.off('mousemove', this._mousemove, this)
        map.off('click', this._click, this)
        map.off('dblclick', this._dblclick, this)
    }

    _mousemoveEvents(e) {
        const geos = this._suiteLayer.identify(e.coordinate)
        if (this._needRefreshSymbol) this._updateChooseSymbol()
        if (geos.length > 0) {
            this._needRefreshSymbol = true
            const geo = geos[0]
            this._hitGeo = geo
            geo.updateSymbol(this._hitSymbol)
        }
    }

    _clickEvents(e) {
        const map = this._map
        const drawing = map._map_tool && map._map_tool.isEnabled()
        if (!drawing && this._hitGeo) {
            const hitCoord = this._hitGeo.getCoordinates()
            let hitGeosArr = []
            this._chooseGeos.forEach((geo) => {
                const coord = geo.getCoordinates()
                if (!isEqual(hitCoord, coord)) hitGeosArr.push(geo)
            })
            if (hitGeosArr.length === this._chooseGeos.length) this._chooseGeos.push(this._hitGeo)
            else this._chooseGeos = hitGeosArr
        }
    }

    _updateChooseSymbol() {
        this._suiteLayer.hide()
        this._geosFrom.forEach((geo) => geo.setSymbol(this.geometrySymbol))
        this._chooseGeos.forEach((geo) => geo.setSymbol(this._chooseSymbol))
        this._needRefreshSymbol = false
        this._suiteLayer.show()
    }

    _dblclickEvents() {
        this.remove()
    }
}

CDSP.mergeOptions(options)
