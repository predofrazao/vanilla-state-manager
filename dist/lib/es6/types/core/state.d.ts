type StorageMethods = "session" | "local";
type Key = string[];
type State = [Key, any];
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
declare class StateManager {
    #private;
    private _STATE_CHANGE_CUSTOM_EVENT;
    private _WAITING_FIRST_CHANGE_LISTENERS;
    private _default_storage_key;
    private _default_storage_method;
    private _persistAll;
    private _findAllPersistedStates;
    private _alwaysDispatchFirstChange;
    private _states;
    private _listeners;
    constructor({ defaultStorageKey, defaultStorageMethod, persistAll, findAllPersistedStates, alwaysDispatchFirstChange, }?: IStateManager);
    create<T>({ key, defaultValue, persist, findPersistedValue, dispatchFirstChange, }: IStateCreate<T>): ((newState: (currentState: T) => T) => void)[];
    listen(key: Key, callback: (state: unknown, firstChange: boolean) => void): void;
    /**
     * Returns the value of the persisted state(s) that match the provided key.
     * @param exactlyMatch If true will return only the state that the key is exactly as the provided key. If false, will return all states that the key starts with the provided key.
     */
    get(key: Key, exactlyMatch?: boolean): State[];
    remove(key: Key): void;
}
export { StateManager };
