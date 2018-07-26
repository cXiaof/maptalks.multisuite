const map = new maptalks.Map('map', {
    center: [121.387, 31.129],
    zoom: 14,
    baseLayer: new maptalks.TileLayer('base', {
        urlTemplate:
            'https://webrd{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
        subdomains: ['01', '02', '03', '04'],
        maxAvailableZoom: 18,
        placeholder: true
    })
})

const layer = new maptalks.VectorLayer('sketchPad').addTo(map)

const cdmp = new maptalks.CDSP()

const drawTool = new maptalks.DrawTool({ mode: 'Point' }).addTo(map).disable()
drawTool.on('drawend', (param) => {
    const { geometry } = param
    geometry.addTo(layer)
    geometry.on('contextmenu', () => geometry.setMenu(getOptions(geometry)).openMenu())
})

const modes = ['Point', 'LineString', 'Polygon', 'Rectangle', 'Circle', 'Ellipse']
let children = []
modes.map((item) => children.push({ item, click: () => drawTool.setMode(item).enable() }))

const toolbar = new maptalks.control.Toolbar({
    items: [
        {
            item: 'Draw',
            children
        },
        {
            item: 'Stop',
            click: () => drawTool.disable()
        },
        {
            item: 'Clear',
            click: () => {
                layer.clear()
                peels = []
                split = undefined
            }
        }
    ]
}).addTo(map)

let peels = []
let split = undefined

const getOptions = (geometry) => {
    return {
        items: [
            {
                item: 'combine',
                click: () => {
                    console.log('combine')
                    cdmp.combine(geometry)
                }
            },
            '-',
            {
                item: 'decompose',
                click: () => {
                    console.log('decompose')
                    cdmp.decompose(geometry)
                }
            },
            '-',
            {
                item: 'split',
                click: () => {
                    console.log('split')
                    cdmp.split(geometry, split)
                }
            },
            '-',
            {
                item: 'used to split',
                click: () => {
                    console.log('used to split')
                    split = geometry
                }
            },
            {
                item: 'peel',
                click: () => {
                    console.log('peel')
                    cdmp.peel(geometry, peels)
                }
            },
            '-',
            {
                item: 'push to peelArr',
                click: () => {
                    console.log('push to peelArr')
                    peels.push(geometry)
                }
            },
            '-',
            {
                item: 'submit',
                click: () => {
                    console.log('submit')
                    cdmp.submit((result, deals) => {
                        layer
                            .getGeometries()
                            .forEach((geo) =>
                                geo.on('contextmenu', () => geo.setMenu(getOptions(geo)).openMenu())
                            )
                        console.log(result, deals)
                        peels = []
                        split = undefined
                    })
                }
            },
            '-',
            {
                item: 'cancel',
                click: () => {
                    console.log('cancel')
                    cdmp.cancel()
                }
            }
        ]
    }
}
