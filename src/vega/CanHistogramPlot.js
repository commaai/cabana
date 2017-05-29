import {createClassFromSpec} from 'react-vega';

const canHistogramSpec = {
  "$schema": "https://vega.github.io/schema/vega/v3.0.json",
  "width": 1000,
  "height": 100,
  "padding": 5,

  "signals": [
    {
      "name": "segment"
    }
  ],
  "data": [
    {
      "name": "points"
    },
    {
      "name": "binned",
      "source": "points",
      "transform": [
        {
            "type": "extent",
            "field": "time",
            "signal": "extent"
        },
        {
          "type": "bin", "field": "time",
          "extent": {"signal": "extent"},
          "nice": false
        },
        {
          "type": "aggregate",
          "key": "bin0", "groupby": ["bin0", "bin1"],
          "fields": ["bin0"], "ops": ["count"], "as": ["count"]
        }
      ]
    }
  ],

  "scales": [
    {
      "name": "xscale",
      "type": "linear",
      "zero": false,
      "range": "width",
      "domain": {"data": "points", "field": "time"}
    },
    {
      "name": "yscale",
      "type": "linear",
      "range": "height", "round": true,
      "domain": {"data": "binned", "field": "count"},
      "zero": true, "nice": true
    }
  ],

  "axes": [
    {"orient": "bottom", "scale": "xscale", "zindex": 1},
    {"orient": "left", "scale": "yscale", "tickCount": 5, "zindex": 1}
  ],

  "marks": [
    {"type": "group",
     "name": "histogram",
     "encode": {
      "enter": {
        "height": {"value": 75},
        "width": {"value": 1000},
        "fill": {"value": "transparent"}
      }
     },
     "signals": [
        {
          "name": "brush", "value": 0,
          "on": [
            {
              "events": "@histogram:mousedown",
              "update": "[x(), x()]"
            },
            {
              "events": "[@histogram:mousedown, window:mouseup] > window:mousemove!",
              "update": "[brush[0], clamp(x(), 0, width)]"
            },
            {
              "events": {"signal": "delta"},
              "update": "clampRange([anchor[0] + delta, anchor[1] + delta], 0, width)"
            }
          ]
        },
        {
          "name": "anchor", "value": null,
          "on": [{"events": "@brush:mousedown", "update": "slice(brush)"}]
        },
        {
          "name": "xdown", "value": 0,
          "on": [{"events": "@brush:mousedown", "update": "x()"}]
        },
        {
          "name": "delta", "value": 0,
          "on": [
            {
              "events": "[@brush:mousedown, window:mouseup] > window:mousemove!",
              "update": "x() - xdown"
            }
          ]
        },
        {
          "name": "segment",
          "push": "outer",
          "on": [
            {
              "events": {"signal": "brush"},
              "update": "span(brush) ? invert('xscale', brush) : null"
            }
          ]
        }
     ],
     "marks": [
       {
          "type": "rect",
          "from": {"data": "binned"},
          "interactive": false,
          "encode": {
            "update": {
              "x": {"scale": "xscale", "field": "bin0"},
              "x2": {"scale": "xscale", "field": "bin1",
                     "offset": 0},
              "y": {"scale": "yscale", "field": "count"},
              "y2": {"scale": "yscale", "value": 0},
              "fill": {"value": "steelblue"}
            }
          }
        },
        {
          "type": "rect",
          "from": {"data": "points"},
          "encode": {
            "enter": {
              "x": {"scale": "xscale", "field": "time"},
              "width": {"value": 1},
              "y": {"value": 25, "offset": {"signal": "height"}},
              "height": {"value": 5},
              "fill": {"value": "steelblue"},
              "fillOpacity": {"value": 0.4}
            }
          }
        },
        {
          "type": "rect",
          "name": "brush",
          "encode": {
            "enter": {
              "y": {"value": 0},
              "height": {"value": 100},
              "fill": {"value": "#333"},
              "fillOpacity": {"value": 0.2}
            },
            "update": {
              "x": {"signal": "brush[0]"},
              "x2": {"signal": "brush[1]"}
            }
          }
        },
        {
          "type": "rect",
          "interactive": false,
          "encode": {
            "enter": {
              "y": {"value": 0},
              "height": {"value": 100},
              "width": {"value": 2},
              "fill": {"value": "firebrick"}
            },
            "update": {
              "x": {"signal": "brush[0]"}
            }
          }
        },
        {
          "type": "rect",
          "interactive": false,
          "encode": {
            "enter": {
              "y": {"value": 0},
              "height": {"value": 100},
              "width": {"value": 2},
              "fill": {"value": "firebrick"}
            },
            "update": {
              "x": {"signal": "brush[1]"}
            }
          }
        }
      ]
    }
  ]
};

export default createClassFromSpec(canHistogramSpec);