import isEqual from 'lodash/isEqual'

const options = {
    enableCollection: false
}

export class CDSP extends maptalks.Class {
    constructor(options) {
        super(options)
        this._layerName = `${maptalks.INTERNAL_LAYER_PREFIX}_CDSP`
        this._layerTMP = `${maptalks.INTERNAL_LAYER_PREFIX}_CDSP_TMP`
        this._chooseGeos = []
        this._colorHit = '#ffa400'
        this._colorChoose = '#00bcd4'
        this._updateSameType()
    }

    enableCollection(need) {
        this._updateSameType(need)
        return this
    }

    combine(geometry) {
        if (map._map_tool && map._map_tool.isEnabled()) throw new Error('drawTool still enable')
        if (geometry instanceof maptalks.Geometry) {
            if (this.geometry) this.remove()
            this._task = 'combine'
            this.geometry = geometry
            this.layer = geometry._layer
            if (geometry.type.startsWith('Multi')) this.layer = geometry._geometries[0]._layer
            this._addTo(this.layer.map)
            this._chooseGeos = [geometry]
            this._updateChooseGeos()
        }
        return this
    }

    decompose(geometry) {
        if (map._map_tool && map._map_tool.isEnabled()) throw new Error('drawTool still enable')
        if (geometry instanceof maptalks.GeometryCollection) {
            if (this.geometry) this.remove()
            this._task = 'decompose'
            this.geometry = geometry
            this.layer = geometry._layer
            if (geometry.type.startsWith('Multi')) this.layer = geometry._geometries[0]._layer
            this._addTo(this.layer.map)
            geometry._geometries.forEach((geo) => geo.copy().addTo(this._tmpLayer))
            this._chooseGeos = this._tmpLayer.getGeometries()
            this._updateChooseGeos()
        }
        return this
    }

    submit(callback = () => false) {
        switch (this._task) {
            case 'combine':
                this._submitCombine(callback)
                break
            case 'decompose':
                this._submitDecompose(callback)
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
        this._offMapEvents()
        delete this._task
        delete this._tmpLayer
        delete this._chooseLayer
        delete this._mousemove
        delete this._click
        delete this._dblclick
    }

    _updateSameType(need) {
        need = need !== undefined ? need : this.options['enableCollection']
        need = need !== undefined ? need : options.enableCollection
        this._enableCollection = need
    }

    _addTo(map) {
        if (this._chooseLayer) this.remove()
        this._map = map
        this._tmpLayer = new maptalks.VectorLayer(this._layerTMP).addTo(map)
        this._chooseLayer = new maptalks.VectorLayer(this._layerName).addTo(map)
        this._tmpLayer.bringToFront()
        this._chooseLayer.bringToFront()
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
        const map = this._map
        map.off('mousemove', this._mousemove, this)
        map.off('click', this._click, this)
    }

    _mousemoveEvents(e) {
        switch (this._task) {
            case 'combine':
                this._mousemoveCombine(e)
                break
            case 'decompose':
                this._mousemoveDecompose(e)
                break
            default:
                break
        }
    }

    _mousemoveCombine(e) {
        const geos = this.layer.identify(e.coordinate)
        const id = '_hit'
        if (this._needRefreshSymbol) {
            const hitGeoCopy = this._chooseLayer.getGeometryById(id)
            if (hitGeoCopy) {
                hitGeoCopy.remove()
                delete this.hitGeo
            }
            this._needRefreshSymbol = false
        }
        if (geos.length > 0 && !this._needRefreshSymbol) {
            this._needRefreshSymbol = true
            this.hitGeo = geos[0]
            if (this._checkIsSameType(this.hitGeo)) {
                const hitSymbol = this._getSymbolOrDefault(this.hitGeo, 'Hit')
                this._copyGeoUpdateSymbol(this.hitGeo, hitSymbol).setId(id)
            } else delete this.hitGeo
        }
    }

    _checkIsSameType(geo) {
        if (this._enableCollection) return true
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
        const layer = this._chooseLayer
        geo = geo.copy().updateSymbol(symbol)
        return geo.addTo(layer)
    }

    _mousemoveDecompose(e) {
        const geos = this._tmpLayer.identify(e.coordinate)
        const id = '_hit'
        if (this._needRefreshSymbol) {
            const hitGeoCopy = this._chooseLayer.getGeometryById(id)
            if (hitGeoCopy) {
                hitGeoCopy.remove()
                delete this.hitGeo
            }
            this._needRefreshSymbol = false
        }
        if (geos.length > 0 && !this._needRefreshSymbol) {
            this._needRefreshSymbol = true
            this.hitGeo = geos[0]
            const hitSymbol = this._getSymbolOrDefault(this.hitGeo, 'Hit')
            this._copyGeoUpdateSymbol(this.hitGeo, hitSymbol).setId(id)
        }
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
                break
        }
    }

    _clickCombine() {
        if (this.hitGeo) {
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
            let chooseNext = []
            this._chooseGeos.forEach((geo) => {
                const coord = geo.getCoordinates()
                if (!isEqual(coordHit, coord)) chooseNext.push(geo)
            })
            this._chooseGeos = chooseNext
            geo.remove()
        } else if (this.hitGeo) this._chooseGeos.push(this.hitGeo)
        this._updateChooseGeos()
    }

    _submitCombine(callback) {
        let deals = []
        this._chooseGeos.forEach((geo) => {
            deals.push(geo.copy())
            geo.remove()
        })
        let geos = []
        this._chooseLayer.getGeometries().forEach((geo) => {
            if (geo.getId() !== '_hit') {
                if (geo.type.startsWith('Multi'))
                    geo._geometries.forEach((item) => geos.push(item.copy()))
                else geos.push(geo.copy())
            }
        })
        const result = this._compositResultGeo(geos)
        callback(result, deals)
    }

    _compositResultGeo(geos) {
        let combine
        if (this._enableCollection) combine = new maptalks.GeometryCollection(geos)
        else
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
        const symbol = this.geometry.getSymbol()
        const properties = this.geometry.getProperties()
        combine.setSymbol(symbol)
        combine.setProperties(properties)
        combine.addTo(this.layer)
        return combine
    }

    _submitDecompose(callback) {
        let geos = []
        let deals = []
        let geosCoords = []
        this._chooseLayer.getGeometries().forEach((geo) => {
            if (geo.getId() !== '_hit') {
                geos.push(geo.copy())
                geosCoords.push(JSON.stringify(geo.getCoordinates()))
            }
        })
        this._tmpLayer.getGeometries().forEach((geo) => {
            const coord = JSON.stringify(geo.getCoordinates())
            if (!geosCoords.includes(coord)) {
                geo = geo.copy().addTo(this.layer)
                deals.push(geo)
            }
        })
        this.geometry.remove()
        const result = this._compositResultGeo(geos)
        callback(result, deals)
    }
}

CDSP.mergeOptions(options)
