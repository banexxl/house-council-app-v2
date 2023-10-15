export const objFromArray = (arr: any[], key = '_id'): Record<string, any> =>
          arr.reduce((accumulator, current) => {
                    accumulator[current[key]] = current;
                    return accumulator;
          }, {});
