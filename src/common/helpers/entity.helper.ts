/**
 * Replace each field in target by its value from source
 * @param target
 * @param source
 * @returns Affected fields
 */
export function assignPartialObjectToEntity<T>(
  target: T,
  source: Partial<T>,
): number {
  if (!source || !Object.keys(source).length) return 0;
  let affected = 0;
  Object.keys(source).forEach(key => {
    target[key] = source[key];
    affected++;
  });

  return affected;
}
