var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _StateManager_instances, _StateManager__GetMemoryState, _StateManager__GetAllPersistedStates, _StateManager__GetPersistedState, _StateManager__CheckStateKeyEquality, _StateManager__FindAlreadyPersistedStateIndex, _StateManager__SaveState, _StateManager__ReplacePersistedState, _StateManager__PersistState, _StateManager__RemovePersistedState, _StateManager__DefineWindowListener, _StateManager__DispatchChangeEvent;
const STORAGE_METHODS = {
    session: "sessionStorage",
    local: "localStorage",
};
class StateManager {
    constructor({ defaultStorageKey, defaultStorageMethod, persistAll, findAllPersistedStates, alwaysDispatchFirstChange, } = {}) {
        _StateManager_instances.add(this);
        this._STATE_CHANGE_CUSTOM_EVENT = "_state_manager_state_change";
        this._WAITING_FIRST_CHANGE_LISTENERS = [];
        this._states = [];
        this._listeners = [];
        this._default_storage_key = defaultStorageKey !== null && defaultStorageKey !== void 0 ? defaultStorageKey : "state_manager";
        this._default_storage_method = defaultStorageMethod !== null && defaultStorageMethod !== void 0 ? defaultStorageMethod : "session";
        this._persistAll = persistAll !== null && persistAll !== void 0 ? persistAll : false;
        this._findAllPersistedStates = findAllPersistedStates !== null && findAllPersistedStates !== void 0 ? findAllPersistedStates : false;
        this._alwaysDispatchFirstChange = alwaysDispatchFirstChange !== null && alwaysDispatchFirstChange !== void 0 ? alwaysDispatchFirstChange : false;
        __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__DefineWindowListener).call(this);
        return this;
    }
    create({ key, defaultValue, persist, findPersistedValue, dispatchFirstChange, }) {
        var _a, _b;
        const _STATE_INDEX = this._states.length;
        const getValue = () => {
            return this._states[_STATE_INDEX][1];
        };
        const setValue = (newState) => {
            var _a, _b;
            const _STATE = newState((_b = (_a = this._states[_STATE_INDEX]) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : null);
            if (this._states[_STATE_INDEX]) {
                this._states[_STATE_INDEX][1] = _STATE;
            }
            else {
                this._states.push([key, _STATE]);
            }
            if (this._persistAll || persist) {
                __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__PersistState).call(this, key, _STATE);
            }
            __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__DispatchChangeEvent).call(this, key, _STATE, false);
        };
        if (this._findAllPersistedStates || findPersistedValue) {
            defaultValue = (_b = (_a = __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__GetPersistedState).call(this, key)[0]) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : defaultValue;
        }
        setValue(() => defaultValue);
        if (this._alwaysDispatchFirstChange || dispatchFirstChange) {
            this._WAITING_FIRST_CHANGE_LISTENERS.push(key);
        }
        return [getValue, setValue];
    }
    listen(key, callback) {
        this._listeners.push([key, callback]);
        if (this._WAITING_FIRST_CHANGE_LISTENERS.length) {
            const _WAITING_LISTENER_INDEX = this._WAITING_FIRST_CHANGE_LISTENERS.findIndex((listenerKey) => __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__CheckStateKeyEquality).call(this, key, listenerKey));
            if (_WAITING_LISTENER_INDEX === -1) {
                return;
            }
            __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__DispatchChangeEvent).call(this, key, __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__GetMemoryState).call(this, key)[1], true);
            this._WAITING_FIRST_CHANGE_LISTENERS.splice(_WAITING_LISTENER_INDEX, 1);
        }
    }
    /**
     * Returns the value of the persisted state(s) that match the provided key.
     * @param exactlyMatch If true will return only the state that the key is exactly as the provided key. If false, will return all states that the key starts with the provided key.
     */
    get(key, exactlyMatch = true) {
        return __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__GetPersistedState).call(this, key, exactlyMatch);
    }
    remove(key) {
        const _ALL_PERSISTED_STATES = __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__GetAllPersistedStates).call(this);
        const _PERSISTED_STATE_INDEX = __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__FindAlreadyPersistedStateIndex).call(this, key, _ALL_PERSISTED_STATES);
        if (_PERSISTED_STATE_INDEX !== -1) {
            __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__RemovePersistedState).call(this, _PERSISTED_STATE_INDEX, _ALL_PERSISTED_STATES);
            __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__DispatchChangeEvent).call(this, key, _ALL_PERSISTED_STATES[_PERSISTED_STATE_INDEX][1], false);
        }
    }
}
_StateManager_instances = new WeakSet(), _StateManager__GetMemoryState = function _StateManager__GetMemoryState(key) {
    return this._states.find(([stateKey]) => __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__CheckStateKeyEquality).call(this, key, stateKey));
}, _StateManager__GetAllPersistedStates = function _StateManager__GetAllPersistedStates() {
    const _CACHED_DATA = window[STORAGE_METHODS[this._default_storage_method]].getItem(this._default_storage_key);
    if (_CACHED_DATA) {
        return JSON.parse(_CACHED_DATA);
    }
    else {
        return [];
    }
}, _StateManager__GetPersistedState = function _StateManager__GetPersistedState(key, exactlyMatch = true) {
    return __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__GetAllPersistedStates).call(this).filter(([persistedStateKey]) => {
        if (exactlyMatch && !__classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__CheckStateKeyEquality).call(this, key, persistedStateKey)) {
            return false;
        }
        for (let i = 0; i < key.length; i++) {
            if (persistedStateKey[i] !== key[i]) {
                return false;
            }
        }
        return true;
    });
}, _StateManager__CheckStateKeyEquality = function _StateManager__CheckStateKeyEquality(key1, key2) {
    if (key1.length !== key2.length) {
        return false;
    }
    for (let i = 0; i < key1.length; i++) {
        if (key1[i] !== key2[i]) {
            return false;
        }
    }
    return true;
}, _StateManager__FindAlreadyPersistedStateIndex = function _StateManager__FindAlreadyPersistedStateIndex(key, allPersistedStates) {
    const _ALL_PERSISTED_STATES_KEYS = (allPersistedStates !== null && allPersistedStates !== void 0 ? allPersistedStates : __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__GetAllPersistedStates).call(this)).map(([persistedStatesKeys]) => persistedStatesKeys);
    return _ALL_PERSISTED_STATES_KEYS.findIndex((persistedStateKey) => __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__CheckStateKeyEquality).call(this, key, persistedStateKey));
}, _StateManager__SaveState = function _StateManager__SaveState(data) {
    window[STORAGE_METHODS[this._default_storage_method]].setItem(this._default_storage_key, JSON.stringify(data));
}, _StateManager__ReplacePersistedState = function _StateManager__ReplacePersistedState(index, newStateValue, allPersistedStates) {
    const _ALL_PERSISTED_STATES = allPersistedStates !== null && allPersistedStates !== void 0 ? allPersistedStates : __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__GetAllPersistedStates).call(this);
    _ALL_PERSISTED_STATES[index][1] = newStateValue;
    __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__SaveState).call(this, _ALL_PERSISTED_STATES);
}, _StateManager__PersistState = function _StateManager__PersistState(key, value) {
    const _ALL_PERSISTED_STATES = __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__GetAllPersistedStates).call(this);
    const _PERSISTED_STATE_INDEX = __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__FindAlreadyPersistedStateIndex).call(this, key, _ALL_PERSISTED_STATES);
    if (_PERSISTED_STATE_INDEX !== -1) {
        __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__ReplacePersistedState).call(this, _PERSISTED_STATE_INDEX, value, _ALL_PERSISTED_STATES);
        return;
    }
    const _STATE = [key, value];
    __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__SaveState).call(this, [..._ALL_PERSISTED_STATES, _STATE]);
}, _StateManager__RemovePersistedState = function _StateManager__RemovePersistedState(index, allPersistedStates) {
    const _ALL_PERSISTED_STATES = allPersistedStates !== null && allPersistedStates !== void 0 ? allPersistedStates : __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__GetAllPersistedStates).call(this);
    _ALL_PERSISTED_STATES.splice(index, 1);
    __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__SaveState).call(this, _ALL_PERSISTED_STATES);
}, _StateManager__DefineWindowListener = function _StateManager__DefineWindowListener() {
    window.addEventListener(this._STATE_CHANGE_CUSTOM_EVENT, ({ detail: { data: [stateKey, stateValue], firstChange, }, }) => {
        this._listeners.forEach(([listenerKey, listenerCallback]) => __classPrivateFieldGet(this, _StateManager_instances, "m", _StateManager__CheckStateKeyEquality).call(this, stateKey, listenerKey) &&
            listenerCallback(stateValue, firstChange));
    });
}, _StateManager__DispatchChangeEvent = function _StateManager__DispatchChangeEvent(key, value, firstChange) {
    const _CUSTOM_EVENT = new CustomEvent(this._STATE_CHANGE_CUSTOM_EVENT, {
        detail: { data: [key, value], firstChange },
    });
    window.dispatchEvent(_CUSTOM_EVENT);
};
export { StateManager };
