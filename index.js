import { Point2D, Intersection } from 'kld-intersections'

const options = {}

export class CDSP extends maptalks.Class {
    constructor(options) {
        super(options)
        this._layerName = `${maptalks.INTERNAL_LAYER_PREFIX}_CDSP`
    }
}

CDSP.mergeOptions(options)
