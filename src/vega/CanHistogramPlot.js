import { createClassFromSpec } from "react-vega";

const canHistogramSpec = {
  $schema: "https://vega.github.io/schema/vega/v3.0.json",
  width: 1000,
  height: 100,
  padding: 5,

  signals: [
    {
      name: "segment"
    }
  ],
  data: [
    {
      name: "binned"
    }
  ],

  scales: [
    {
      name: "xscale",
      type: "linear",
      zero: false,
      range: "width",
      domain: { data: "binned", field: "startTime" }
    },
    {
      name: "xrelscale",
      type: "linear",
      zero: false,
      range: "width",
      domain: { data: "binned", field: "relStartTime" }
    },
    {
      name: "yscale",
      type: "linear",
      range: "height",
      round: true,
      domain: { data: "binned", field: "count" },
      zero: true,
      nice: true
    }
  ],

  axes: [
    { orient: "bottom", scale: "xrelscale", zindex: 1, tickCount: 10 },
    { orient: "left", scale: "yscale", tickCount: 5, zindex: 1 }
  ],

  marks: [
    {
      type: "group",
      name: "histogram",
      interactive: true,
      encode: {
        enter: {
          height: { value: 75 },
          width: { value: 1000 },
          fill: { value: "transparent" }
        }
      },
      signals: [
        {
          name: "brush",
          value: 0,
          on: [
            {
              events: "@bins:mousedown",
              update: "[x(), x()]"
            },
            {
              events: "[@bins:mousedown, window:mouseup] > window:mousemove!",
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
              events: { signal: "brush" },
              update: "span(brush) ? invert('xscale', brush) : null"
            }
          ]
        }
      ],
      marks: [
        {
          type: "rect",
          interactive: true,
          from: { data: "binned" },
          name: "bins",
          encode: {
            update: {
              x: { scale: "xscale", field: "startTime" },
              x2: {
                scale: "xscale",
                field: "endTime",
                offset: 0
              },
              y: { scale: "yscale", field: "count" },
              y2: { scale: "yscale", value: 0 },
              fill: { value: "steelblue" }
            },
            hover: {
              fill: { value: "goldenrod" },
              cursor: { value: "ew-resize" }
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
              height: { value: 100 },
              fill: { value: "#333" },
              fillOpacity: { value: 0.2 }
            },
            update: {
              x: { signal: "brush[0]" },
              x2: { signal: "brush[1]" }
            }
          }
        },
        {
          type: "rect",
          interactive: false,
          encode: {
            enter: {
              y: { value: 0 },
              height: { value: 100 },
              width: { value: 2 },
              fill: { value: "firebrick" }
            },
            update: {
              x: { signal: "brush[0]" }
            }
          }
        },
        {
          type: "rect",
          interactive: false,
          encode: {
            enter: {
              y: { value: 0 },
              height: { value: 100 },
              width: { value: 2 },
              fill: { value: "firebrick" }
            },
            update: {
              x: { signal: "brush[1]" }
            }
          }
        }
      ]
    }
  ]
};

export default createClassFromSpec(canHistogramSpec);
