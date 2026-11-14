/**
 * Visit types that are not started from the customers page. An injury on duty is recorded from the OPD
 * encounter where the injury is seen (the encounter's ⋮ menu), so it is not offered as a visit service there.
 * The OH queue and the visit-type settings still list every type.
 */
export const NON_STARTABLE_FROM_CUSTOMERS: readonly string[] = ["injury_on_duty"];

export function startableFromCustomers<T extends { code?: string | null }>(
  types: readonly T[],
): T[] {
  return types.filter((type) => !NON_STARTABLE_FROM_CUSTOMERS.includes(type.code ?? ""));
}
