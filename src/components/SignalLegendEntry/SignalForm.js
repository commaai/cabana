import React from "react";

import Field from "./Field";
import FIELDS from "./FIELDS";
import { swapKeysAndValues } from "../../utils/object";

export default ({
  signal,
  onSignalRemove,
  isExpanded,
  getSignalEdited,
  update
}) => {
  return (
    <div className="signals-legend-entry-form">
      {FIELDS.map(field => {
        // console.log(field, getSignalEdited(field.field))
        return (
          <div className="signals-legend-entry-form-field" key={field.field}>
            <FieldNode
              field={field}
              signal={signal}
              isExpanded={isExpanded}
              signalEdited={getSignalEdited(field)}
              update={update}
            />
          </div>
        );
      })}
      <div className="signals-legend-entry-form-remove">
        <button
          className="button--tiny button--alpha"
          onClick={() => onSignalRemove(signal)}
        >
          Remove Signal
        </button>
      </div>
    </div>
  );
};

const NumberField = ({
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

const StringField = ({
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

const OptionField = ({
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

const FieldNode = ({ field, signal, isExpanded, signalEdited, update }) => {
  switch (field.type) {
    case "number":
      return (
        <NumberField
          fieldSpec={field}
          signal={signal}
          isExpanded={isExpanded}
          signalEdited={signalEdited}
          updateField={update}
        />
      );
    case "option":
      return (
        <OptionField
          fieldSpec={field}
          signal={signal}
          isExpanded={isExpanded}
          signalEdited={signalEdited}
          updateField={update}
        />
      );
    case "string":
      return (
        <StringField
          fieldSpec={field}
          signal={signal}
          isExpanded={isExpanded}
          signalEdited={signalEdited}
          updateField={update}
        />
      );
    default:
      return undefined;
  }
};
