/**
 * @category Outcome
 */
export interface OutcomeInit<ValueT = unknown> {
    value?: ValueT;
    ok?: boolean;
    status?: number | null;
    errorCode?: string | null;
    errors?: Error[];
}