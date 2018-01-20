import React from "react";

import FIELDS from "./FIELDS";
import NumberField from "./NumberField";
import StringField from "./StringField";
import OptionField from "./OptionField";

const FieldMap = {
  number: NumberField,
  option: OptionField,
  string: StringField
};

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
        const Node = FieldMap[field.type];
        return (
          <div className="signals-legend-entry-form-field" key={field.field}>
            <Node
              fieldSpec={field}
              signal={signal}
              isExpanded={isExpanded}
              signalEdited={getSignalEdited(field.field)}
              updateField={update}
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
