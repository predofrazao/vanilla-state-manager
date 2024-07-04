type StorageMethods = "session" | "local";
type Key = string[];
type State = [Key, any];
type Listener = [Key, (state: any, firstChange: boolean) => void][];

interface IStateManager {
  defaultStorageKey?: string;
  defaultStorageMethod?: StorageMethods;
  persistAll?: boolean;
  findAllPersistedStates?: boolean;
  alwaysDispatchFirstChange?: boolean;
}

interface IStateCreate<T> {
  key: string[];
  defaultValue: T;
  persist?: boolean;
  findPersistedValue?: boolean;
  dispatchFirstChange?: boolean;
}

const STORAGE_METHODS: { [key in StorageMethods]: "sessionStorage" | "localStorage" } = {
  session: "sessionStorage",
  local: "localStorage",
};

class VanillaStateManager {
  private _STATE_CHANGE_CUSTOM_EVENT = "_state_manager_state_change";
  private _WAITING_FIRST_CHANGE_LISTENERS: Key[] = [];

  private _default_storage_key: string;
  private _default_storage_method: StorageMethods;
  private _persistAll: boolean;
  private _findAllPersistedStates: boolean;
  private _alwaysDispatchFirstChange: boolean;
  private _states: State[] = [];
  private _listeners: Listener = [];

  constructor({
    defaultStorageKey,
    defaultStorageMethod,
    persistAll,
    findAllPersistedStates,
    alwaysDispatchFirstChange,
  }: IStateManager = {}) {
    this._default_storage_key = defaultStorageKey ?? "state_manager";
    this._default_storage_method = defaultStorageMethod ?? "session";
    this._persistAll = persistAll ?? false;
    this._findAllPersistedStates = findAllPersistedStates ?? false;
    this._alwaysDispatchFirstChange = alwaysDispatchFirstChange ?? false;

    this.#_DefineWindowListener();

    return this;
  }

  create<T>({
    key,
    defaultValue,
    persist,
    findPersistedValue,
    dispatchFirstChange,
  }: IStateCreate<T>) {
    const _STATE_INDEX = this._states.length;

    const getValue = () => {
      return this._states[_STATE_INDEX][1];
    };

    const setValue = (newState: (currentState: T) => T) => {
      const _STATE = newState(this._states[_STATE_INDEX]?.[1] ?? null);

      if (this._states[_STATE_INDEX]) {
        this._states[_STATE_INDEX][1] = _STATE;
      } else {
        this._states.push([key, _STATE]);
      }

      if (this._persistAll || persist) {
        this.#_PersistState(key, _STATE);
      }

      this.#_DispatchChangeEvent(key, _STATE, false);
    };

    if (this._findAllPersistedStates || findPersistedValue) {
      defaultValue = this.#_GetPersistedState(key)[0]?.[1] ?? defaultValue;
    }

    setValue(() => defaultValue);

    if (this._alwaysDispatchFirstChange || dispatchFirstChange) {
      this._WAITING_FIRST_CHANGE_LISTENERS.push(key);
    }

    return [getValue, setValue];
  }

  listen(key: Key, callback: (state: unknown, firstChange: boolean) => void) {
    this._listeners.push([key, callback]);

    if (this._WAITING_FIRST_CHANGE_LISTENERS.length) {
      const _WAITING_LISTENER_INDEX = this._WAITING_FIRST_CHANGE_LISTENERS.findIndex(
        (listenerKey) => this.#_CheckStateKeyEquality(key, listenerKey)
      );

      if (_WAITING_LISTENER_INDEX === -1) {
        return;
      }

      this.#_DispatchChangeEvent(key, this.#_GetMemoryState(key)[1], true);
      this._WAITING_FIRST_CHANGE_LISTENERS.splice(_WAITING_LISTENER_INDEX, 1);
    }
  }

  /**
   * Returns the state stored in the memory.
   */
  #_GetMemoryState(key: Key) {
    return this._states.find(([stateKey]) => this.#_CheckStateKeyEquality(key, stateKey)) as State;
  }

  /**
   * Returns all the stored states from the default storage method.
   */
  #_GetAllPersistedStates(): State[] {
    const _CACHED_DATA = window[STORAGE_METHODS[this._default_storage_method]].getItem(
      this._default_storage_key
    );

    if (_CACHED_DATA) {
      return JSON.parse(_CACHED_DATA);
    } else {
      return [];
    }
  }

  /**
   * Returns the value of all persisted states that starts with the provided key.
   * @param exactlyMatch If true will return only the state that the key is exactly as the provided key. If false, will return all states that the key starts with the provided key.
   */
  #_GetPersistedState(key: Key, exactlyMatch = true) {
    return this.#_GetAllPersistedStates().filter(
      ([persistedStateKey]) => {
        if (exactlyMatch && !this.#_CheckStateKeyEquality(key, persistedStateKey)) {
          return false;
        }

        for (let i = 0; i < key.length; i++) {
          if (persistedStateKey[i] !== key[i]) {
            return false;
          }
        }

        return true;
      }
    );
  }

  /**
   * Returns the value of the persisted state(s) that match the provided key.
   * @param exactlyMatch If true will return only the state that the key is exactly as the provided key. If false, will return all states that the key starts with the provided key.
   */
  get(key: Key, exactlyMatch = true) {
    return this.#_GetPersistedState(key, exactlyMatch);
  }

  /**
   * Performs a restricted key equality comparison.
   * Returns true if keys match or false if doesn't.
   */
  #_CheckStateKeyEquality(key1: Key, key2: Key) {
    if (key1.length !== key2.length) {
      return false;
    }

    for (let i = 0; i < key1.length; i++) {
      if (key1[i] !== key2[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Search for the provided key in the list of all persisted states.
   * Returns the index of the state in the list or -1 if not found.
   */
  #_FindAlreadyPersistedStateIndex(key: Key, allPersistedStates?: State[]) {
    const _ALL_PERSISTED_STATES_KEYS = (allPersistedStates ?? this.#_GetAllPersistedStates()).map(
      ([persistedStatesKeys]) => persistedStatesKeys
    );

    return _ALL_PERSISTED_STATES_KEYS.findIndex((persistedStateKey) =>
      this.#_CheckStateKeyEquality(key, persistedStateKey)
    );
  }

  /**
   * Stringify the list of states and persists it into the default storage method.
   */
  #_SaveState(data: State[]) {
    window[STORAGE_METHODS[this._default_storage_method]].setItem(
      this._default_storage_key,
      JSON.stringify(data)
    );
  }

  /**
   * Updates the value of an already persisted state and save the new list with the updated value.
   */
  #_ReplacePersistedState(index: number, newStateValue: any, allPersistedStates?: State[]) {
    const _ALL_PERSISTED_STATES = allPersistedStates ?? this.#_GetAllPersistedStates();
    _ALL_PERSISTED_STATES[index][1] = newStateValue;

    this.#_SaveState(_ALL_PERSISTED_STATES);
  }

  #_PersistState(key: Key, value: any) {
    const _ALL_PERSISTED_STATES = this.#_GetAllPersistedStates();
    const _PERSISTED_STATE_INDEX = this.#_FindAlreadyPersistedStateIndex(
      key,
      _ALL_PERSISTED_STATES
    );

    if (_PERSISTED_STATE_INDEX !== -1) {
      this.#_ReplacePersistedState(_PERSISTED_STATE_INDEX, value, _ALL_PERSISTED_STATES);
      return;
    }

    const _STATE: State = [key, value];
    this.#_SaveState([..._ALL_PERSISTED_STATES, _STATE]);
  }

  #_RemovePersistedState(index: number, allPersistedStates?: State[]) {
    const _ALL_PERSISTED_STATES = allPersistedStates ?? this.#_GetAllPersistedStates();
    _ALL_PERSISTED_STATES.splice(index, 1);

    this.#_SaveState(_ALL_PERSISTED_STATES);
  }

  remove(key: Key) {
    const _ALL_PERSISTED_STATES = this.#_GetAllPersistedStates();
    const _PERSISTED_STATE_INDEX = this.#_FindAlreadyPersistedStateIndex(
      key,
      _ALL_PERSISTED_STATES
    );

    if (_PERSISTED_STATE_INDEX !== -1) {
      this.#_RemovePersistedState(_PERSISTED_STATE_INDEX, _ALL_PERSISTED_STATES);
      this.#_DispatchChangeEvent(key, _ALL_PERSISTED_STATES[_PERSISTED_STATE_INDEX][1], false);
    }
  }

  #_DefineWindowListener() {
    window.addEventListener(
      this._STATE_CHANGE_CUSTOM_EVENT,
      ({
        detail: {
          data: [stateKey, stateValue],
          firstChange,
        },
      }: any) => {
        this._listeners.forEach(
          ([listenerKey, listenerCallback]) =>
            this.#_CheckStateKeyEquality(stateKey, listenerKey) &&
            listenerCallback(stateValue, firstChange)
        );
      }
    );
  }

  #_DispatchChangeEvent(key: Key, value: any, firstChange: boolean) {
    const _CUSTOM_EVENT = new CustomEvent(this._STATE_CHANGE_CUSTOM_EVENT, {
      detail: { data: [key, value], firstChange },
    });

    window.dispatchEvent(_CUSTOM_EVENT);
  }
}

export default VanillaStateManager;
