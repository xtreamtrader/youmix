export const toCapitalize = (str: string) => {
  return str
    .trim()
    .toLowerCase()
    .split(/ +/)
    .reduce((acc, cur) => {
      const charArr = cur.split('');
      charArr[0] = charArr[0].toUpperCase();
      return (acc += charArr.join('') + ' ');
    }, '')
    .trim();
};

export const camelCaseToSnakeCase = (str: string) =>
  str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
