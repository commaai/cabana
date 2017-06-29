import DBC from '../models/can/dbc';

export function fetchPersistedDbc(routeName) {
  const maybeDbc = window.localStorage.getItem(routeName);
  if(maybeDbc !== null) {
    const {dbcFilename, dbcText} = JSON.parse(maybeDbc);
    const dbc = new DBC(dbcText);

    return {dbc, dbcFilename};
  } else return null;
}

export function persistDbc(routeName, {dbcFilename, dbc}) {
  const dbcJson = JSON.stringify({dbcFilename,
                                  dbcText: dbc.text()});
  window.localStorage.setItem(routeName, dbcJson);
}
