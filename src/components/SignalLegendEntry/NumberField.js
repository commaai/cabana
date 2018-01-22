import React from "react";
import Field from "./Field";

export default ({
  fieldSpec,
  signal,
  isExpanded,
  signalEdited,
  updateField
}) => {
  const { field, title } = fieldSpec;
  const htmlFor = `${signal.name}_${field}`;
  let valueCol;

  if (isExpanded) {
    let value = signalEdited;
    if (value !== "") {
      let num = Number(value);
      value = isNaN(num) ? "" : num;
    }
    valueCol = (
      <input
        id={htmlFor}
        type="number"
        value={value}
        onChange={e => {
          updateField(fieldSpec, e.target.value);
        }}
      />
    );
  } else {
    let value = signal[field];
    valueCol = <span>{value}</span>;
  }
  return (
    <Field
      title={typeof title === "function" ? title(signal) : title}
      htmlFor={htmlFor}
    >
      {valueCol}
    </Field>
  );
};
