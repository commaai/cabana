import React from "react";
import Field from "./Field";

import { swapKeysAndValues } from "../../utils/object";

export default ({
  fieldSpec,
  signal,
  isExpanded,
  signalEdited,
  updateField
}) => {
  let valueCol;
  const { field, title } = fieldSpec;
  const htmlFor = `${signal.name}_${field}`;
  const { options, optionValues } = fieldSpec.options;
  let valueOptions = swapKeysAndValues(optionValues);

  if (isExpanded) {
    const optionEles = options.map(opt => (
      <option key={opt} value={optionValues[opt]}>
        {opt}
      </option>
    ));
    valueCol = (
      <select
        id={htmlFor}
        defaultValue={signalEdited}
        onChange={e => {
          updateField(fieldSpec, e.target.value === "true");
        }}
      >
        {optionEles}
      </select>
    );
  } else {
    valueCol = <span>{valueOptions[signal[field]]}</span>;
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
