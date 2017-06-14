import {createClassFromSpec} from 'react-vega';

export default createClassFromSpec('CanPlot', {
  "$schema": "https://vega.github.io/schema/vega/v3.0.json",
  "width": 500,
  "height": 200,
  "padding": 5,
  "signals": [
    {
      "name": "tipTime",
      "on": [{
        "events": "mousemove",
        "update": "invert('xrelscale', x())"
      }]
    },
    {"name": "clickTime",
     "on": [{
        "events": "mouseup",
        "update": "invert('xrelscale', x())"
     }]
    },
    {"name": "videoTime"},
    {"name": "segment", "value": {"data": "table", "field": "xRel"}}
  ],
  "data": [
    {
      "name": "table"
    },
    {
      "name": "tooltip",
      "source": "table",
      "transform": [
        {
          "type": "filter",
          "expr": "abs(datum.xRel - tipTime) <= 0.1"
        },
        {
          "type": "aggregate",
          "fields": ["xRel", "y", "unit"],
          "ops": ["min", "argmin", "argmin"],
          "as": ["min", "argmin", "argmin"]
        }
      ]
    }
  ],
  "scales": [
    {
      "name": "xscale",
      "type": "linear",
      "range": "width",
      "domain": {"data": "table", "field": "x"},
      "zero": false
    },
    {
      "name": "xrelscale",
      "type": "linear",
      "range": "width",
      "domain": {"data": "table", "field": "xRel"},
      "zero": false,
      "clamp": true,
      "domainRaw": {"signal": "segment"}
    },
    {
      "name": "yscale",
      "type": "linear",
      "range": "height",
      "zero": true,
      "domain": {"data": "table", "field": "y"}
    }
  ],
  "axes": [
    {"orient": "bottom", "scale": "xrelscale"},
    {"orient": "left", "scale": "yscale"}
  ],
  "marks": [
    {
      "type": "line",
      "from": {"data": "table"},
      "interactive": true,
      "encode": {
        "update": {
          "x": {"scale": "xrelscale", "field": "xRel"},
          "y": {"scale": "yscale", "field": "y"}
        },
        "hover": {
          "fillOpacity": {"value": 0.5}
        },
        "enter": {
          "clip": {"value": true}
        }
      }
    },
    {
      "type": "rule",
      "encode": {
        "update": {
          "y": {"value": 0},
          "y2": {"field": {"group": "height"}},
          "stroke": {"value": "#000"},
          "strokeWidth": {"value": 2},
          "x": {"scale": "xrelscale",
                "signal": "videoTime", "offset": 0.5}
        }
      }
    },
    {
      "type": "symbol",
      "from": {"data": "tooltip"},
      "encode": {
        "update": {
          "x": {"scale": "xrelscale", "field": "argmin.xRel"},
          "y": {"scale": "yscale", "field": "argmin.y"},
          "size": {"value": 50},
          "fill": {"value": "black"}
        }
      }
    },
    {
      "type": "group",
      "from": {"data": "tooltip"},
      "interactive": false,
      "encode": {
        "update": {
          "x": {"scale": "xrelscale", "field": "argmin.xRel"},
          "y": {"scale": "yscale", "field": "argmin.y"},
          "height": {"value": 20},
          "width": {"value": 150},
          "fill": {"value": "#fff"},
          "fillOpacity": {"value": 0.85},
          "stroke": {"value": "#aaa"},
          "strokeWidth": {"value": 0.5}
        }
      },
      "marks": [
        {
          "type": "text",
          "interactive": false,
          "encode": {
            "update": {
              "text": {"signal": "parent.argmin.xRel + ': ' + parent.argmin.y + ' ' + parent.argmin.unit"},
              "fill": {"value": "black"},
              "fontWeight": {"value": "bold"}
            }
          }
        }
      ]
    }
  ]
});
