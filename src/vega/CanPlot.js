export default {
  $schema: "https://vega.github.io/schema/vega/v5.6.json",
  width: 400,
  height: 200,
  padding: {
    top: 5,
    left: 30,
    right: 5,
    bottom: 10
  },
  signals: [
    {
      name: "tipTime",
      on: [
        {
          events: "mousemove",
          update: "invert('xrelscale', x())"
        }
      ]
    },
    {
      name: "clickTime",
      on: [
        {
          events: "click",
          update: "invert('xrelscale', x())"
        }
      ]
    },
    { name: "videoTime" },
    {
      name: "segment",
      value: { data: "table", field: "relTime" }
    }
  ],
  data: [
    {
      name: "table"
    },
    {
      name: "segment"
    },
    {
      name: "tooltip",
      source: "table",
      transform: [
        {
          type: "filter",
          expr: "abs(datum.relTime - tipTime) <= 0.01"
        },
        {
          type: "aggregate",
          fields: ["relTime", "y", "unit"],
          ops: ["min", "argmin", "argmin"],
          as: ["min", "argmin", "argmin"]
        }
      ]
    },
    {
      name: "ySegmentScale",
      source: "table",
      transform: [
        {
          type: "filter",
          expr:
            "length(segment) != 2 || (datum.relTime >= segment[0] && datum.relTime <= segment[1])"
        },
        { type: "extent", field: "y", signal: "ySegment" }
      ]
    }
  ],
  scales: [
    {
      name: "xscale",
      type: "linear",
      range: "width",
      domain: { data: "table", field: "x" },
      zero: false
    },
    {
      name: "xrelscale",
      type: "linear",
      range: "width",
      domain: { data: "table", field: "relTime" },
      zero: false,
      clamp: true,
      domainRaw: { signal: "segment" }
    },
    {
      name: "yscale",
      type: "linear",
      range: "height",
      clamp: true,
      zero: false,
      domain: { signal: "ySegment" }
    },
    {
      name: "color",
      type: "ordinal",
      domain: { data: "table", field: "color" },
      range: { data: "table", field: "color" }
    }
  ],
  axes: [
    { orient: "bottom", scale: "xrelscale", labelOverlap: true },
    { orient: "left", scale: "yscale" }
  ],
  marks: [
    {
      type: "group",
      name: "plot",
      interactive: true,
      encode: {
        enter: {
          width: { signal: "width" },
          height: { signal: "height" },
          fill: { value: "transparent" }
        }
      },
      signals: [
        {
          name: "brush",
          value: 0,
          on: [
            {
              events: "@boundingRect:mousedown",
              update: "[x(), x()]"
            },
            {
              events:
                "[@boundingRect:mousedown, window:mouseup] > window:mousemove!",
              update: "[brush[0], clamp(x(), 0, width)]"
            },
            {
              events: { signal: "delta" },
              update:
                "clampRange([anchor[0] + delta, anchor[1] + delta], 0, width)"
            }
          ]
        },
        {
          name: "anchor",
          value: null,
          on: [{ events: "@brush:mousedown", update: "slice(brush)" }]
        },
        {
          name: "xdown",
          value: 0,
          on: [{ events: "@brush:mousedown", update: "x()" }]
        },
        {
          name: "xup",
          value: 0,
          on: [{ events: "@brush:mouseup", update: "x()" }]
        },
        {
          name: "delta",
          value: 0,
          on: [
            {
              events: "[@brush:mousedown, window:mouseup] > window:mousemove!",
              update: "x() - xdown"
            }
          ]
        },

        {
          name: "segment",
          push: "outer",
          on: [
            {
              events: "window:mouseup",
              update:
                "span(brush) && span(brush) > 15 ? invert('xrelscale', brush) : segment"
            }
          ]
        }
      ],
      marks: [
        {
          type: "group",
          from: {
            facet: {
              name: "series",
              data: "table",
              groupby: "signalUid"
            }
          },
          marks: {
            type: "line",
            name: "lineMark",
            from: { data: "series" },
            interactive: true,
            encode: {
              update: {
                interpolate: { value: "step" },
                x: { scale: "xrelscale", field: "relTime" },
                y: { scale: "yscale", field: "y" }
              },
              hover: {
                fillOpacity: { value: 0.5 }
              },
              enter: {
                clip: { value: true },
                stroke: { scale: "color", field: "color" },
                strokeWidth: { value: 2 }
              }
            }
          }
        },
        {
          type: "rect",
          interactive: true,
          name: "brush",
          encode: {
            enter: {
              y: { value: 0 },
              height: { signal: "height" },
              fill: { value: "#333" },
              fillOpacity: { value: 0.2 }
            },
            update: {
              x: { signal: "brush[0]" },
              x2: { signal: "brush[1]" }
            }
          }
        },
        // {
        //   "type": "rect",
        //   "interactive": false,
        //   "encode": {
        //     "enter": {
        //       "y": {"value": 0},
        //       "height": {"value": 200},
        //       "width": {"value": 2},
        //       "fill": {"value": "firebrick"}
        //     },
        //     "update": {
        //       "x": {"signal": "brush[0]"}
        //     }
        //   }
        // },
        // {
        //   "type": "rect",
        //   "interactive": false,
        //   "encode": {
        //     "enter": {
        //       "y": {"value": 0},
        //       "height": {"value": 200},
        //       "width": {"value": 2},
        //       "fill": {"value": "firebrick"}
        //     },
        //     "update": {
        //       "x": {"signal": "brush[1]"}
        //     }
        //   }
        // },
        {
          type: "rule",
          encode: {
            update: {
              y: { value: 0 },
              y2: { field: { group: "height" } },
              stroke: { value: "#000" },
              strokeWidth: { value: 2 },
              x: {
                scale: "xrelscale",
                signal: "videoTime",
                offset: 0.5
              }
            }
          }
        },
        {
          type: "symbol",
          from: { data: "tooltip" },
          encode: {
            update: {
              x: { scale: "xrelscale", field: "argmin.relTime" },
              y: { scale: "yscale", field: "argmin.y" },
              size: { value: 50 },
              fill: { value: "black" }
            }
          }
        },
        {
          type: "group",
          from: { data: "tooltip" },
          interactive: false,
          name: "tooltipGroup",
          encode: {
            update: {
              x: [
                {
                  test:
                    "inrange(datum.argmin.relTime + 80, domain('xrelscale'))",
                  scale: "xrelscale",
                  field: "argmin.relTime"
                },
                { scale: "xrelscale", field: "argmin.relTime", offset: -80 }
              ],
              y: { scale: "yscale", field: "argmin.y" },
              height: { value: 20 },
              width: { value: 80 },
              fill: { value: "#fff" },
              fillOpacity: { value: 0.85 },
              stroke: { value: "#aaa" },
              strokeWidth: { value: 0.5 }
            }
          },
          marks: [
            {
              type: "text",
              interactive: false,
              encode: {
                update: {
                  text: {
                    signal:
                      "format(parent.argmin.relTime, ',.2f') + ': ' + format(parent.argmin.y, ',.2f') + ' ' + parent.argmin.unit"
                  },
                  fill: { value: "black" },
                  fontWeight: { value: "bold" },
                  y: { value: 20 }
                }
              }
            }
          ]
        },
        {
          type: "rect",
          name: "boundingRect",
          interactive: true,
          encode: {
            enter: {
              width: { signal: "width" },
              height: { signal: "height" },
              fill: { value: "transparent" }
            }
          }
        }
      ]
    }
  ]
};
