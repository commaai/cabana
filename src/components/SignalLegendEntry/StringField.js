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
    valueCol = (
      <input
        id={htmlFor}
        type="text"
        value={signalEdited || ""}
        onChange={e => {
          updateField(fieldSpec, e.target.value);
        }}
      />
    );
  } else {
    valueCol = <span>{signal[field]}</span>;
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
